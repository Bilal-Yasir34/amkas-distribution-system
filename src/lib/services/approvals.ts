import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TABLES } from '@/lib/supabase';
import { ensureUUID, safeUUID } from '@/lib/utils';
import type {
  ApprovalQueueItem,
  BankAccount,
  CustomerReceipt,
  JournalEntry,
  Product,
  PurchaseInvoice,
  PurchaseReturn,
  SalesInvoice,
  SalesReturn,
  VendorBill,
  VendorPayment,
} from '@/lib/types';
import {
  deleteRowById,
  insertOrUpsertRow,
  invalidateTableAndRelated,
  updateRowById,
} from './dbHelpers';

const ALL_APPROVAL_AFFECTED_TABLES = [
  TABLES.approvalQueue,
  TABLES.salesInvoices,
  TABLES.salesInvoiceItems,
  TABLES.purchaseInvoices,
  TABLES.purchaseInvoiceItems,
  TABLES.vendorBills,
  TABLES.vendorBillItems,
  TABLES.salesReturns,
  TABLES.purchaseReturns,
  TABLES.customerReceipts,
  TABLES.vendorPayments,
  TABLES.products,
  TABLES.stockLedger,
  TABLES.accountLedger,
  TABLES.journalEntries,
  TABLES.bankAccounts,
  TABLES.customers,
  TABLES.vendors,
  TABLES.salesCommissions,
] as const;

/**
 * Direct database-verified approval execution fallback (used only if `review_approval` SQL RPC
 * has not yet been installed in Supabase SQL Editor). Never reads from client arrays; queries
 * the target document directly from the database and throws if the target document is missing.
 */
async function executeDatabaseVerifiedApproval({
  queueId,
  status,
  note,
  reviewer,
}: {
  queueId: string;
  status: 'APPROVED' | 'REJECTED';
  note?: string;
  reviewer?: string;
}): Promise<void> {
  const targetQueueId = ensureUUID(queueId);

  // 1. Fetch the queue row directly from the database
  const { data: qData, error: qErr } = await supabase
    .from(TABLES.approvalQueue)
    .select('*')
    .eq('id', targetQueueId)
    .maybeSingle();

  if (qErr || !qData) {
    throw new Error(`Approval queue item ${targetQueueId} not found in database.`);
  }

  const item = qData as ApprovalQueueItem;
  if (item.status === status) {
    // Idempotent no-op if already in requested status
    return;
  }

  const targetId = item.entity_id || item.record_id;
  const targetNo = item.record_no || item.voucher_no;
  const targetDocStatus = status === 'APPROVED' ? 'POSTED' : 'REJECTED';
  let resolvedEntityId: string | null = null;
  let resolvedDocNo: string | null = targetNo || null;

  if (item.entity_type === 'sales_invoice' || item.entity_type === 'SALE_INVOICE') {
    let { data: invRow } = targetId
      ? await supabase.from(TABLES.salesInvoices).select('*').eq('id', ensureUUID(targetId)).maybeSingle()
      : { data: null };
    if (!invRow && targetNo) {
      const byNo = await supabase.from(TABLES.salesInvoices).select('*').eq('invoice_no', targetNo).maybeSingle();
      invRow = byNo.data;
    }
    if (!invRow) {
      throw new Error(`Target sales invoice (${targetNo || targetId}) not found in database.`);
    }
    const inv = invRow as SalesInvoice;
    resolvedEntityId = inv.id;
    resolvedDocNo = inv.invoice_no;

    await updateRowById(TABLES.salesInvoices, inv.id, { status: targetDocStatus });

    if (status === 'APPROVED' && inv.status !== 'POSTED') {
      const { data: dbItems } = await supabase
        .from(TABLES.salesInvoiceItems)
        .select('*')
        .eq('sales_invoice_id', inv.id);
      const lineItems = (dbItems && dbItems.length > 0 ? dbItems : inv.items) || [];

      for (const line of lineItems) {
        if (!line.product_id) continue;
        const prodId = ensureUUID(line.product_id);
        const { data: prodRow } = await supabase
          .from(TABLES.products)
          .select('id,stock_quantity')
          .eq('id', prodId)
          .maybeSingle();
        if (prodRow) {
          const nextQty = Math.max(0, Number(prodRow.stock_quantity || 0) - Number(line.qty || 0));
          await updateRowById(TABLES.products, prodId, { stock_quantity: nextQty });
        }
        await insertOrUpsertRow(
          TABLES.stockLedger,
          {
            id: safeUUID(),
            product_id: prodId,
            warehouse_id: inv.warehouse_id ? ensureUUID(inv.warehouse_id) : null,
            voucher_no: inv.invoice_no,
            voucher_type: 'SALE_INVOICE',
            transaction_date: inv.invoice_date,
            qty_in: 0,
            qty_out: Number(line.qty || 0),
            unit_cost: Number(line.rate || 0),
            total_cost: Number(line.line_total || Number(line.qty || 0) * Number(line.rate || 0)),
          },
          'id'
        );
      }

      const jeRow: JournalEntry = {
        id: safeUUID(),
        entry_no: `JV-${inv.invoice_no}`,
        entry_date: inv.invoice_date,
        reference_no: inv.invoice_no,
        source: 'Sales Invoice',
        narration: `Sales Invoice ${inv.invoice_no} approved & posted to ${inv.account_head || 'Sales Revenue'}`,
        total_debit: Number(inv.total_amount || 0),
        total_credit: Number(inv.total_amount || 0),
        status: 'POSTED',
        created_at: new Date().toISOString(),
      };
      await insertOrUpsertRow(TABLES.journalEntries, jeRow as unknown as Record<string, unknown>, 'entry_no');
    }
  } else if (item.entity_type === 'purchase_invoice') {
    let { data: piRow } = targetId
      ? await supabase.from(TABLES.purchaseInvoices).select('*').eq('id', ensureUUID(targetId)).maybeSingle()
      : { data: null };
    if (!piRow && targetNo) {
      const byNo = await supabase
        .from(TABLES.purchaseInvoices)
        .select('*')
        .or(`invoice_no.eq.${targetNo},grn_no.eq.${targetNo}`)
        .maybeSingle();
      piRow = byNo.data;
    }
    if (!piRow) {
      throw new Error(`Target purchase invoice (${targetNo || targetId}) not found in database.`);
    }
    const pi = piRow as PurchaseInvoice;
    resolvedEntityId = pi.id;
    resolvedDocNo = pi.grn_no || pi.invoice_no || targetNo || null;

    await updateRowById(TABLES.purchaseInvoices, pi.id, { status: targetDocStatus });

    if (status === 'APPROVED' && pi.status !== 'POSTED') {
      const lineItems = Array.isArray(pi.items) ? pi.items : [];
      for (const line of lineItems) {
        if (!line.product_id) continue;
        const prodId = ensureUUID(line.product_id);
        const { data: prodRow } = await supabase
          .from(TABLES.products)
          .select('id,stock_quantity')
          .eq('id', prodId)
          .maybeSingle();
        if (prodRow) {
          const nextQty = Number(prodRow.stock_quantity || 0) + Number(line.qty || 0);
          await updateRowById(TABLES.products, prodId, { stock_quantity: nextQty });
        }
        await insertOrUpsertRow(
          TABLES.stockLedger,
          {
            id: safeUUID(),
            product_id: prodId,
            warehouse_id: pi.warehouse_id ? ensureUUID(pi.warehouse_id) : null,
            voucher_no: resolvedDocNo,
            voucher_type: 'PURCHASE_INVOICE',
            transaction_date: pi.received_date || pi.document_date,
            qty_in: Number(line.qty || 0),
            qty_out: 0,
            unit_cost: Number(line.rate || 0),
            total_cost: Number(line.line_total || Number(line.qty || 0) * Number(line.rate || 0)),
          },
          'id'
        );
      }

      if (resolvedDocNo) {
        const jeRow: JournalEntry = {
          id: safeUUID(),
          entry_no: `JV-${resolvedDocNo}`,
          entry_date: pi.received_date || pi.document_date || new Date().toISOString().split('T')[0],
          reference_no: resolvedDocNo,
          source: 'Purchase Invoice',
          narration: `Purchase Invoice ${resolvedDocNo} approved & posted to ${pi.account_head || 'Inventory Purchases'}`,
          total_debit: Number(pi.total_amount || 0),
          total_credit: Number(pi.total_amount || 0),
          status: 'POSTED',
          created_at: new Date().toISOString(),
        };
        await insertOrUpsertRow(TABLES.journalEntries, jeRow as unknown as Record<string, unknown>, 'entry_no');
      }
    }
  } else if (item.entity_type === 'vendor_bill') {
    let { data: vbRow } = targetId
      ? await supabase.from(TABLES.vendorBills).select('*').eq('id', ensureUUID(targetId)).maybeSingle()
      : { data: null };
    if (!vbRow && targetNo) {
      const byNo = await supabase.from(TABLES.vendorBills).select('*').eq('bill_no', targetNo).maybeSingle();
      vbRow = byNo.data;
    }
    if (!vbRow) {
      throw new Error(`Target vendor bill (${targetNo || targetId}) not found in database.`);
    }
    const vb = vbRow as VendorBill;
    resolvedEntityId = vb.id;
    resolvedDocNo = vb.bill_no;
    await updateRowById(TABLES.vendorBills, vb.id, { status: targetDocStatus });

    if (status === 'APPROVED' && vb.status !== 'POSTED') {
      for (const line of vb.items || []) {
        if (!line.product_id) continue;
        const prodId = ensureUUID(line.product_id);
        const { data: prodRow } = await supabase
          .from(TABLES.products)
          .select('id,stock_quantity')
          .eq('id', prodId)
          .maybeSingle();
        if (prodRow) {
          const nextQty = Number(prodRow.stock_quantity || 0) + Number(line.qty || 0);
          await updateRowById(TABLES.products, prodId, { stock_quantity: nextQty });
        }
      }
    }
  } else if (item.entity_type === 'sales_return') {
    let { data: srRow } = targetId
      ? await supabase.from(TABLES.salesReturns).select('*').eq('id', ensureUUID(targetId)).maybeSingle()
      : { data: null };
    if (!srRow && targetNo) {
      const byNo = await supabase.from(TABLES.salesReturns).select('*').eq('return_no', targetNo).maybeSingle();
      srRow = byNo.data;
    }
    if (!srRow) {
      throw new Error(`Target sales return (${targetNo || targetId}) not found in database.`);
    }
    const sr = srRow as SalesReturn;
    resolvedEntityId = sr.id;
    resolvedDocNo = sr.return_no;
    await updateRowById(TABLES.salesReturns, sr.id, { status: targetDocStatus });

    if (status === 'APPROVED' && sr.status !== 'POSTED') {
      for (const line of sr.items || []) {
        if (!line.product_id) continue;
        const prodId = ensureUUID(line.product_id);
        const { data: prodRow } = await supabase
          .from(TABLES.products)
          .select('id,stock_quantity')
          .eq('id', prodId)
          .maybeSingle();
        if (prodRow) {
          const nextQty = Number(prodRow.stock_quantity || 0) + Number(line.qty || 0);
          await updateRowById(TABLES.products, prodId, { stock_quantity: nextQty });
        }
      }
    }
  } else if (item.entity_type === 'purchase_return') {
    let { data: prRow } = targetId
      ? await supabase.from(TABLES.purchaseReturns).select('*').eq('id', ensureUUID(targetId)).maybeSingle()
      : { data: null };
    if (!prRow && targetNo) {
      const byNo = await supabase.from(TABLES.purchaseReturns).select('*').eq('return_no', targetNo).maybeSingle();
      prRow = byNo.data;
    }
    if (!prRow) {
      throw new Error(`Target purchase return (${targetNo || targetId}) not found in database.`);
    }
    const pr = prRow as PurchaseReturn;
    resolvedEntityId = pr.id;
    resolvedDocNo = pr.return_no;
    await updateRowById(TABLES.purchaseReturns, pr.id, { status: targetDocStatus });

    if (status === 'APPROVED' && pr.status !== 'POSTED') {
      for (const line of pr.items || []) {
        if (!line.product_id) continue;
        const prodId = ensureUUID(line.product_id);
        const { data: prodRow } = await supabase
          .from(TABLES.products)
          .select('id,stock_quantity')
          .eq('id', prodId)
          .maybeSingle();
        if (prodRow) {
          const nextQty = Math.max(0, Number(prodRow.stock_quantity || 0) - Number(line.qty || 0));
          await updateRowById(TABLES.products, prodId, { stock_quantity: nextQty });
        }
      }
    }
  } else if (item.entity_type === 'customer_receipt' || item.entity_type === 'payment_receipt') {
    let { data: crRow } = targetId
      ? await supabase.from(TABLES.customerReceipts).select('*').eq('id', ensureUUID(targetId)).maybeSingle()
      : { data: null };
    if (!crRow && targetNo) {
      const byNo = await supabase.from(TABLES.customerReceipts).select('*').eq('receipt_no', targetNo).maybeSingle();
      crRow = byNo.data;
    }
    if (!crRow) {
      throw new Error(`Target customer receipt (${targetNo || targetId}) not found in database.`);
    }
    const cr = crRow as CustomerReceipt;
    resolvedEntityId = cr.id;
    resolvedDocNo = cr.receipt_no;
    await updateRowById(TABLES.customerReceipts, cr.id, { status: targetDocStatus });

    if (status === 'APPROVED' && cr.status !== 'POSTED') {
      if (cr.customer_id) {
        const { data: unpaidInvs } = await supabase
          .from(TABLES.salesInvoices)
          .select('*')
          .eq('customer_id', cr.customer_id)
          .neq('status', 'CANCELLED')
          .order('invoice_date', { ascending: true });
        let remaining = Number(cr.amount || 0);
        for (const inv of (unpaidInvs || []) as SalesInvoice[]) {
          if (remaining <= 0) break;
          const due = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
          if (due > 0) {
            const alloc = Math.min(remaining, due);
            const newPaid = Number(inv.paid_amount || 0) + alloc;
            remaining -= alloc;
            await updateRowById(TABLES.salesInvoices, inv.id, {
              paid_amount: newPaid,
              status: newPaid >= Number(inv.total_amount || 0) ? 'POSTED' : inv.status,
            });
          }
        }
      }

      const { data: bankRows } = await supabase.from(TABLES.bankAccounts).select('*');
      const bank = ((bankRows || []) as BankAccount[]).find(
        (b) => b.id === cr.deposit_account_id || b.account_name === cr.deposit_to
      );
      if (bank) {
        await updateRowById(TABLES.bankAccounts, bank.id, {
          current_balance: Number(bank.current_balance || 0) + Number(cr.amount || 0),
        });
      }

      const depositName = cr.deposit_to || bank?.account_name || 'Cash in Hand';
      const jeRow: JournalEntry = {
        id: safeUUID(),
        entry_no: `JV-${cr.receipt_no}`,
        entry_date: cr.receipt_date,
        reference_no: cr.receipt_no,
        source: 'Customer Payment',
        narration: `Customer payment ${cr.receipt_no} deposited to ${depositName}`,
        total_debit: Number(cr.amount || 0),
        total_credit: Number(cr.amount || 0),
        status: 'POSTED',
        created_at: new Date().toISOString(),
      };
      await insertOrUpsertRow(TABLES.journalEntries, jeRow as unknown as Record<string, unknown>, 'entry_no');
    }
  } else if (item.entity_type === 'vendor_payment' || item.entity_type === 'payment_voucher') {
    let { data: vpRow } = targetId
      ? await supabase.from(TABLES.vendorPayments).select('*').eq('id', ensureUUID(targetId)).maybeSingle()
      : { data: null };
    if (!vpRow && targetNo) {
      const byNo = await supabase.from(TABLES.vendorPayments).select('*').eq('payment_no', targetNo).maybeSingle();
      vpRow = byNo.data;
    }
    if (!vpRow) {
      throw new Error(`Target vendor payment (${targetNo || targetId}) not found in database.`);
    }
    const vp = vpRow as VendorPayment;
    resolvedEntityId = vp.id;
    resolvedDocNo = vp.payment_no;
    await updateRowById(TABLES.vendorPayments, vp.id, { status: targetDocStatus });

    if (status === 'APPROVED' && vp.status !== 'POSTED') {
      if (vp.vendor_id) {
        const { data: unpaidBills } = await supabase
          .from(TABLES.vendorBills)
          .select('*')
          .eq('vendor_id', vp.vendor_id)
          .neq('status', 'CANCELLED')
          .order('bill_date', { ascending: true });
        let remaining = Number(vp.amount || 0);
        for (const bill of (unpaidBills || []) as VendorBill[]) {
          if (remaining <= 0) break;
          const due = Number(bill.total_amount || 0) - Number(bill.paid_amount || 0);
          if (due > 0) {
            const alloc = Math.min(remaining, due);
            const newPaid = Number(bill.paid_amount || 0) + alloc;
            remaining -= alloc;
            await updateRowById(TABLES.vendorBills, bill.id, {
              paid_amount: newPaid,
              status: newPaid >= Number(bill.total_amount || 0) ? 'POSTED' : bill.status,
            });
          }
        }
      }

      const { data: bankRows } = await supabase.from(TABLES.bankAccounts).select('*');
      const bank = ((bankRows || []) as BankAccount[]).find(
        (b) => b.id === vp.paid_from_account_id || b.account_name === vp.pay_from || b.account_name === vp.payment_method
      );
      if (bank) {
        await updateRowById(TABLES.bankAccounts, bank.id, {
          current_balance: Math.max(0, Number(bank.current_balance || 0) - Number(vp.amount || 0)),
        });
      }

      const payFromName = vp.pay_from || vp.payment_method || bank?.account_name || 'Cash in Hand';
      const jeRow: JournalEntry = {
        id: safeUUID(),
        entry_no: `JV-${vp.payment_no}`,
        entry_date: vp.payment_date,
        reference_no: vp.payment_no,
        source: 'Vendor Payment',
        narration: `Payment ${vp.payment_no} paid from ${payFromName}`,
        total_debit: Number(vp.amount || 0),
        total_credit: Number(vp.amount || 0),
        status: 'POSTED',
        created_at: new Date().toISOString(),
      };
      await insertOrUpsertRow(TABLES.journalEntries, jeRow as unknown as Record<string, unknown>, 'entry_no');
    }
  } else {
    throw new Error(`Unsupported entity_type "${item.entity_type}" in approval queue.`);
  }

  // Finally update the approval_queue row only AFTER the target document is POSTED/REJECTED
  await updateRowById(TABLES.approvalQueue, targetQueueId, {
    status,
    entity_id: resolvedEntityId || targetId,
    record_id: resolvedEntityId || targetId,
    record_no: resolvedDocNo,
    voucher_no: resolvedDocNo,
    review_note: note || null,
    reviewed_by: reviewer || 'Administrator',
    reviewed_at: new Date().toISOString(),
  });
}

export function useApprovalMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (item: Omit<ApprovalQueueItem, 'id'> & { id?: string }) => {
      const id = ensureUUID(item.id || safeUUID());
      const et = (item.entity_type || '').toLowerCase();
      const mod = (item.module || '').toLowerCase();
      const rec = (item.record_no || item.voucher_no || '').toLowerCase();
      const isPayment =
        et.includes('receipt') ||
        et.includes('payment') ||
        et.includes('voucher') ||
        et.includes('receive') ||
        et.includes('pay') ||
        mod.includes('receipt') ||
        mod.includes('payment') ||
        mod.includes('receive') ||
        mod.includes('pay') ||
        rec.startsWith('cr') ||
        rec.startsWith('cp') ||
        rec.startsWith('pv') ||
        rec.startsWith('rv') ||
        rec.startsWith('pay') ||
        rec.startsWith('rec');

      const recordId = ensureUUID(item.record_id || item.entity_id || id);
      const recordNo = item.record_no || item.voucher_no || null;

      // Check database directly for an existing queue item for the same entity_id
      const { data: existingInDb } = await supabase
        .from(TABLES.approvalQueue)
        .select('id')
        .eq('entity_type', item.entity_type || 'sales_invoice')
        .eq('entity_id', recordId)
        .maybeSingle();

      const finalId = existingInDb?.id ? ensureUUID(existingInDb.id) : id;

      const row: ApprovalQueueItem = {
        ...item,
        id: finalId,
        entity_type: item.entity_type || 'sales_invoice',
        entity_id: recordId,
        record_id: recordId,
        voucher_no: recordNo,
        record_no: recordNo || undefined,
        warehouse_id: isPayment ? null : item.warehouse_id || null,
        items_summary: isPayment ? null : item.items_summary || null,
        status: 'PENDING',
        review_note: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: item.created_at || new Date().toISOString(),
      };

      await insertOrUpsertRow(
        TABLES.approvalQueue,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, ALL_APPROVAL_AFFECTED_TABLES),
    onSettled: () => invalidateTableAndRelated(queryClient, ALL_APPROVAL_AFFECTED_TABLES),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      note,
      reviewer,
    }: {
      id: string;
      status: 'APPROVED' | 'REJECTED';
      note?: string;
      reviewer?: string;
    }) => {
      const targetQueueId = ensureUUID(id);

      // 1. Call atomic Postgres RPC `review_approval` (NO optimistic UI patch beforehand)
      const { error: rpcError } = await supabase.rpc('review_approval', {
        p_queue_id: targetQueueId,
        p_status: status,
        p_note: note || null,
        p_reviewer: reviewer || 'Administrator',
      });

      if (!rpcError) return;

      // If RPC threw a domain error (e.g., Target document not found), propagate it immediately!
      if (rpcError.code !== 'PGRST202') {
        throw new Error(rpcError.message || 'Database rejected approval operation.');
      }

      // 2. If `review_approval` RPC is not yet installed in DB (PGRST202), run database-verified approval
      await executeDatabaseVerifiedApproval({
        queueId: targetQueueId,
        status,
        note,
        reviewer,
      });
    },
    onSuccess: () => {
      invalidateTableAndRelated(queryClient, ALL_APPROVAL_AFFECTED_TABLES);
      queryClient.invalidateQueries({ queryKey: ['system_integrity_check'] });
    },
    onSettled: () => {
      invalidateTableAndRelated(queryClient, ALL_APPROVAL_AFFECTED_TABLES);
      queryClient.invalidateQueries({ queryKey: ['system_integrity_check'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await deleteRowById(TABLES.approvalQueue, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, ALL_APPROVAL_AFFECTED_TABLES),
    onSettled: () => invalidateTableAndRelated(queryClient, ALL_APPROVAL_AFFECTED_TABLES),
  });

  return {
    addApprovalQueueItem: (item: Omit<ApprovalQueueItem, 'id'> & { id?: string }): string => {
      const id = ensureUUID(item.id || safeUUID());
      addMutation.mutate({ ...item, id });
      return id;
    },
    addApprovalQueueItemAsync: (item: Omit<ApprovalQueueItem, 'id'> & { id?: string }) =>
      addMutation.mutateAsync(item),
    reviewApproval: (
      id: string,
      status: 'APPROVED' | 'REJECTED',
      note?: string,
      reviewer?: string
    ) => {
      reviewMutation.mutate({ id, status, note, reviewer });
    },
    reviewApprovalAsync: (
      id: string,
      status: 'APPROVED' | 'REJECTED',
      note?: string,
      reviewer?: string
    ) => reviewMutation.mutateAsync({ id, status, note, reviewer }),
    deleteApprovalQueueItem: (id: string) => {
      deleteMutation.mutate(id);
    },
    reviewApprovalMutation: reviewMutation,
  };
}
