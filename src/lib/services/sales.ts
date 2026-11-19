import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TABLES } from '@/lib/supabase';
import { ensureUUID, safeUUID } from '@/lib/utils';
import type {
  BankAccount,
  CreditNote,
  Customer,
  CustomerReceipt,
  JournalEntry,
  Quotation,
  SalesCommission,
  SalesInvoice,
  SalesOrder,
  SalesReturn,
} from '@/lib/types';
import {
  deleteRowById,
  insertOrUpsertRow,
  invalidateTableAndRelated,
  softOrHardDeleteRow,
  updateRowById,
} from './dbHelpers';
import { allocateNextDocumentNumber } from './numbering';

export interface CreateSalesInvoiceInput extends Omit<SalesInvoice, 'id' | 'invoice_no'> {
  id?: string;
  invoice_no?: string;
  requested_by?: string;
  requested_by_name?: string;
  requested_by_role?: string;
  items_summary?: string;
}

export function useSalesInvoiceMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (inv: CreateSalesInvoiceInput) => {
      const id = ensureUUID(inv.id || safeUUID());
      const customerId = inv.customer_id ? ensureUUID(inv.customer_id) : null;
      const warehouseId = inv.warehouse_id ? ensureUUID(inv.warehouse_id) : null;

      // 1. Try atomic Postgres RPC `create_sales_invoice` first
      const rpcPayload = {
        ...inv,
        id,
        customer_id: customerId,
        warehouse_id: warehouseId,
        items: (inv.items || []).map((it) => ({
          ...it,
          id: ensureUUID(it.id || safeUUID()),
          sales_invoice_id: id,
          product_id: it.product_id ? ensureUUID(it.product_id) : null,
        })),
      };

      const { data: rpcData, error: rpcErr } = await supabase.rpc('create_sales_invoice', {
        payload: rpcPayload,
      });

      if (!rpcErr && rpcData) {
        return rpcData as unknown as SalesInvoice;
      }

      if (rpcErr && rpcErr.code !== 'PGRST202') {
        throw new Error(rpcErr.message || 'Failed to create sales invoice.');
      }

      // 2. Database-verified sequenced fallback if `create_sales_invoice` RPC is not yet installed
      let invoiceNo = (inv.invoice_no || '').trim();
      if (invoiceNo) {
        const { data: existingNo } = await supabase
          .from(TABLES.salesInvoices)
          .select('id')
          .eq('invoice_no', invoiceNo)
          .limit(1);
        if (existingNo && existingNo.length > 0) {
          invoiceNo = '';
        }
      }
      if (!invoiceNo) {
        invoiceNo = await allocateNextDocumentNumber('SL');
      } else {
        // Also advance document_sequences so next allocation is above this number
        await allocateNextDocumentNumber('SL');
      }

      const row: SalesInvoice = {
        ...inv,
        id,
        invoice_no: invoiceNo,
        customer_id: customerId,
        warehouse_id: warehouseId,
        created_at: inv.created_at || new Date().toISOString(),
      };

      // Insert by primary key `id` (NEVER overwrite an existing invoice on `invoice_no`)
      await insertOrUpsertRow(
        TABLES.salesInvoices,
        {
          ...row,
          items: row.items || [],
        } as unknown as Record<string, unknown>,
        'id'
      );

      // Sync child sales_invoice_items rows
      if (row.items && row.items.length > 0) {
        await supabase.from(TABLES.salesInvoiceItems).delete().eq('sales_invoice_id', id);
        for (const item of row.items) {
          await insertOrUpsertRow(
            TABLES.salesInvoiceItems,
            {
              id: ensureUUID(item.id || safeUUID()),
              sales_invoice_id: id,
              product_id: item.product_id ? ensureUUID(item.product_id) : null,
              article_id: item.article_id || null,
              colour: item.colour || null,
              description: item.description || null,
              unit: item.unit || 'PCS',
              base_unit: item.base_unit || 'PCS',
              base_rate: item.base_rate || 0,
              qty: item.qty || 0,
              length: item.length || 0,
              width: item.width || 0,
              rate: item.rate || 0,
              discount: item.discount || 0,
              tax_pct: item.tax_pct || 0,
              line_total: item.line_total || 0,
            },
            'id'
          );
        }
      }

      // Accrue sales commission if commission_rate > 0
      if (row.commission_rate && row.commission_rate > 0) {
        const customers = queryClient.getQueryData<Customer[]>([TABLES.customers]) || [];
        const cust = customers.find((c) => c.id === row.customer_id);
        const commRow: SalesCommission = {
          id: safeUUID(),
          invoice_no: row.invoice_no,
          customer_name: cust?.name || row.customer_name || row.party_name || 'Customer',
          salesperson: row.salesperson || 'admin',
          rate_pct: row.commission_rate,
          commission_amount: (row.total_amount * row.commission_rate) / 100,
          status: row.status === 'POSTED' ? 'APPROVED' : 'ACCRUED',
          created_at: new Date().toISOString(),
        };
        await insertOrUpsertRow(
          TABLES.salesCommissions,
          commRow as unknown as Record<string, unknown>,
          'id'
        );
      }

      // If PENDING_APPROVAL, guarantee the approval_queue row exists with matching entity_id = id & record_no = invoiceNo
      if (row.status === 'PENDING_APPROVAL') {
        const itemsSummary =
          inv.items_summary ||
          (row.items || [])
            .map((it) => `${it.description || 'Product'} (Qty: ${it.qty})`)
            .join(', ') ||
          `${row.items?.length || 0} items`;

        const { data: existingQ } = await supabase
          .from(TABLES.approvalQueue)
          .select('id')
          .eq('entity_type', 'sales_invoice')
          .eq('entity_id', id)
          .maybeSingle();

        await insertOrUpsertRow(
          TABLES.approvalQueue,
          {
            id: existingQ?.id || safeUUID(),
            module: 'Sales',
            entity_type: 'sales_invoice',
            entity_id: id,
            record_id: id,
            record_no: row.invoice_no,
            voucher_no: row.invoice_no,
            requested_by: inv.requested_by || row.created_by || 'admin',
            requested_by_name: inv.requested_by_name || 'Admin',
            requested_by_role: inv.requested_by_role || 'Super Admin',
            amount: row.total_amount,
            status: 'PENDING',
            party_name: row.customer_name || row.party_name || 'Customer',
            warehouse_id: warehouseId,
            items_summary: itemsSummary,
            created_at: row.created_at,
          },
          'id'
        );
      } else if (row.status === 'POSTED') {
        const { error: postRpcErr } = await supabase.rpc('post_sales_invoice', {
          p_invoice_id: id,
        });
        if (postRpcErr) {
          const jeRow: JournalEntry = {
            id: safeUUID(),
            entry_no: `JV-${row.invoice_no}`,
            entry_date: row.invoice_date,
            reference_no: row.invoice_no,
            source: 'Sales Invoice',
            narration: `Sales Invoice ${row.invoice_no} posted to ${row.account_head || 'Sales Revenue'}`,
            total_debit: row.total_amount,
            total_credit: row.total_amount,
            status: 'POSTED',
            created_at: new Date().toISOString(),
          };
          await insertOrUpsertRow(
            TABLES.journalEntries,
            jeRow as unknown as Record<string, unknown>,
            'entry_no'
          );
        }
      }

      return row;
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.salesInvoices,
        TABLES.salesInvoiceItems,
        TABLES.approvalQueue,
        TABLES.documentSequences,
      ]),
    onSettled: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.salesInvoices,
        TABLES.salesInvoiceItems,
        TABLES.approvalQueue,
        TABLES.documentSequences,
      ]),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SalesInvoice> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.salesInvoices, targetId, patch as Record<string, unknown>);

      if (patch.items) {
        await supabase.from(TABLES.salesInvoiceItems).delete().eq('sales_invoice_id', targetId);
        for (const item of patch.items) {
          await insertOrUpsertRow(
            TABLES.salesInvoiceItems,
            {
              id: ensureUUID(item.id || safeUUID()),
              sales_invoice_id: targetId,
              product_id: item.product_id ? ensureUUID(item.product_id) : null,
              article_id: item.article_id || null,
              colour: item.colour || null,
              description: item.description || null,
              unit: item.unit || 'PCS',
              base_unit: item.base_unit || 'PCS',
              base_rate: item.base_rate || 0,
              qty: item.qty || 0,
              length: item.length || 0,
              width: item.width || 0,
              rate: item.rate || 0,
              discount: item.discount || 0,
              tax_pct: item.tax_pct || 0,
              line_total: item.line_total || 0,
            },
            'id'
          );
        }
      }
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesInvoices),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesInvoices),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const invoices = queryClient.getQueryData<SalesInvoice[]>([TABLES.salesInvoices]) || [];
      const target = invoices.find((i) => i.id === id || i.invoice_no === id);
      const targetId = ensureUUID(target?.id || id);
      const invNo = target?.invoice_no;

      await softOrHardDeleteRow(TABLES.salesInvoices, targetId, 'invoice_no', invNo);
      await supabase.from(TABLES.approvalQueue).delete().eq('entity_id', targetId);
      if (invNo) {
        await supabase.from(TABLES.approvalQueue).delete().eq('voucher_no', invNo);
        await supabase.from(TABLES.salesCommissions).delete().eq('invoice_no', invNo);
        await supabase.from(TABLES.journalEntries).delete().eq('reference_no', invNo);
      }
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesInvoices),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesInvoices),
  });

  const postMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const targetId = ensureUUID(invoiceId);
      const { error } = await supabase.rpc('post_sales_invoice', { p_invoice_id: targetId });
      if (error) {
        await updateRowById(TABLES.salesInvoices, targetId, { status: 'POSTED' });
      }
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesInvoices),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesInvoices),
  });

  return {
    addInvoice: (inv: CreateSalesInvoiceInput) => {
      addMutation.mutate(inv);
    },
    createSalesInvoiceAsync: (inv: CreateSalesInvoiceInput) => addMutation.mutateAsync(inv),
    updateInvoice: (id: string, patch: Partial<SalesInvoice>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteInvoice: (id: string) => {
      deleteMutation.mutate(id);
    },
    postInvoiceMutation: postMutation,
    deleteInvoiceMutation: deleteMutation,
  };
}

export function useQuotationMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (q: Omit<Quotation, 'id'> & { id?: string }) => {
      const id = ensureUUID(q.id || safeUUID());
      let quotationNo = (q.quotation_no || '').trim();
      if (!quotationNo) {
        quotationNo = await allocateNextDocumentNumber('MQ');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.quotations)
          .select('id')
          .eq('quotation_no', quotationNo)
          .limit(1);
        if (existing && existing.length > 0) {
          quotationNo = await allocateNextDocumentNumber('MQ');
        }
      }

      const row: Quotation = {
        ...q,
        id,
        quotation_no: quotationNo,
        customer_id: q.customer_id ? ensureUUID(q.customer_id) : null,
        document_date: q.document_date || q.quotation_date,
        created_at: q.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.quotations,
        row as unknown as Record<string, unknown>,
        'id'
      );
      if (row.items && row.items.length > 0) {
        await supabase.from(TABLES.quotationItems).delete().eq('quotation_id', id);
        for (const item of row.items) {
          await insertOrUpsertRow(
            TABLES.quotationItems,
            {
              id: ensureUUID(item.id || safeUUID()),
              quotation_id: id,
              product_id: item.product_id ? ensureUUID(item.product_id) : null,
              description: item.description || null,
              qty: item.qty || 1,
              rate: item.rate || 0,
              discount: item.discount || 0,
              tax_pct: item.tax_pct || 0,
              line_total: item.line_total || 0,
            },
            'id'
          );
        }
      }
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, [TABLES.quotations, TABLES.quotationItems]),
    onSettled: () => invalidateTableAndRelated(queryClient, [TABLES.quotations, TABLES.quotationItems]),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Quotation> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.quotations, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.quotations),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.quotations),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await deleteRowById(TABLES.quotations, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.quotations),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.quotations),
  });

  return {
    addQuotation: (q: Omit<Quotation, 'id'> & { id?: string }) => {
      addMutation.mutate(q);
    },
    updateQuotation: (id: string, patch: Partial<Quotation>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteQuotation: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useSalesOrderMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (so: Omit<SalesOrder, 'id'> & { id?: string }) => {
      const id = ensureUUID(so.id || safeUUID());
      let orderNo = (so.order_no || '').trim();
      if (!orderNo) {
        orderNo = await allocateNextDocumentNumber('MSO');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.salesOrders)
          .select('id')
          .eq('order_no', orderNo)
          .limit(1);
        if (existing && existing.length > 0) {
          orderNo = await allocateNextDocumentNumber('MSO');
        }
      }

      const row: SalesOrder = {
        ...so,
        id,
        order_no: orderNo,
        customer_id: so.customer_id ? ensureUUID(so.customer_id) : null,
        document_date: so.document_date || so.order_date,
        created_at: so.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.salesOrders,
        row as unknown as Record<string, unknown>,
        'id'
      );
      if (row.items && row.items.length > 0) {
        await supabase.from(TABLES.salesOrderItems).delete().eq('sales_order_id', id);
        for (const item of row.items) {
          await insertOrUpsertRow(
            TABLES.salesOrderItems,
            {
              id: ensureUUID(item.id || safeUUID()),
              sales_order_id: id,
              product_id: item.product_id ? ensureUUID(item.product_id) : null,
              description: item.description || null,
              qty: item.qty || 1,
              rate: item.rate || 0,
              discount: item.discount || 0,
              tax_pct: item.tax_pct || 0,
              line_total: item.line_total || 0,
            },
            'id'
          );
        }
      }
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, [TABLES.salesOrders, TABLES.salesOrderItems]),
    onSettled: () => invalidateTableAndRelated(queryClient, [TABLES.salesOrders, TABLES.salesOrderItems]),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SalesOrder> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.salesOrders, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesOrders),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesOrders),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await deleteRowById(TABLES.salesOrders, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesOrders),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesOrders),
  });

  return {
    addSalesOrder: (so: Omit<SalesOrder, 'id'> & { id?: string }) => {
      addMutation.mutate(so);
    },
    updateSalesOrder: (id: string, patch: Partial<SalesOrder>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteSalesOrder: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useCreditNoteMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (cn: Omit<CreditNote, 'id'> & { id?: string }) => {
      const id = ensureUUID(cn.id || safeUUID());
      let cnNo = (cn.credit_note_no || '').trim();
      if (!cnNo) {
        cnNo = await allocateNextDocumentNumber('MCN');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.creditNotes)
          .select('id')
          .eq('credit_note_no', cnNo)
          .limit(1);
        if (existing && existing.length > 0) {
          cnNo = await allocateNextDocumentNumber('MCN');
        }
      }

      const row: CreditNote = {
        ...cn,
        id,
        credit_note_no: cnNo,
        customer_id: cn.customer_id ? ensureUUID(cn.customer_id) : null,
        document_date: cn.document_date || cn.note_date,
        created_at: cn.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.creditNotes,
        row as unknown as Record<string, unknown>,
        'id'
      );

      if (row.status === 'POSTED') {
        const jeRow: JournalEntry = {
          id: safeUUID(),
          entry_no: `JV-${row.credit_note_no}`,
          entry_date: row.document_date || row.note_date,
          reference_no: row.credit_note_no,
          source: 'Credit Note',
          narration: `Credit Note ${row.credit_note_no} posted for customer balance adjustment`,
          total_debit: row.total_amount,
          total_credit: row.total_amount,
          status: 'POSTED',
          created_at: new Date().toISOString(),
        };
        await insertOrUpsertRow(
          TABLES.journalEntries,
          jeRow as unknown as Record<string, unknown>,
          'entry_no'
        );
      }
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, [TABLES.creditNotes, TABLES.journalEntries]),
    onSettled: () => invalidateTableAndRelated(queryClient, [TABLES.creditNotes, TABLES.journalEntries]),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CreditNote> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.creditNotes, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.creditNotes),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.creditNotes),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await softOrHardDeleteRow(TABLES.creditNotes, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.creditNotes),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.creditNotes),
  });

  return {
    addCreditNote: (cn: Omit<CreditNote, 'id'> & { id?: string }) => {
      addMutation.mutate(cn);
    },
    updateCreditNote: (id: string, patch: Partial<CreditNote>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteCreditNote: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useSalesReturnMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (sr: Omit<SalesReturn, 'id'> & { id?: string }) => {
      const id = ensureUUID(sr.id || safeUUID());
      let returnNo = (sr.return_no || '').trim();
      if (!returnNo) {
        returnNo = await allocateNextDocumentNumber('SR');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.salesReturns)
          .select('id')
          .eq('return_no', returnNo)
          .limit(1);
        if (existing && existing.length > 0) {
          returnNo = await allocateNextDocumentNumber('SR');
        }
      }

      const row: SalesReturn = {
        ...sr,
        id,
        return_no: returnNo,
        customer_id: sr.customer_id ? ensureUUID(sr.customer_id) : null,
        warehouse_id: sr.warehouse_id ? ensureUUID(sr.warehouse_id) : null,
        created_at: sr.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.salesReturns,
        {
          ...row,
          date: row.document_date,
          tax_amount: row.tax_total || 0,
        } as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesReturns),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesReturns),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SalesReturn> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.salesReturns, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesReturns),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesReturns),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await softOrHardDeleteRow(TABLES.salesReturns, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesReturns),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesReturns),
  });

  return {
    addSalesReturn: (sr: Omit<SalesReturn, 'id'> & { id?: string }) => {
      addMutation.mutate(sr);
    },
    updateSalesReturn: (id: string, patch: Partial<SalesReturn>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteSalesReturn: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useCustomerReceiptMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (r: Omit<CustomerReceipt, 'id'> & { id?: string }) => {
      const id = ensureUUID(r.id || safeUUID());
      let receiptNo = (r.receipt_no || '').trim();
      if (!receiptNo) {
        receiptNo = await allocateNextDocumentNumber('CR');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.customerReceipts)
          .select('id')
          .eq('receipt_no', receiptNo)
          .limit(1);
        if (existing && existing.length > 0) {
          receiptNo = await allocateNextDocumentNumber('CR');
        }
      }

      const banks = queryClient.getQueryData<BankAccount[]>([TABLES.bankAccounts]) || [];
      const matchedBank = banks.find(
        (b) => b.id === r.deposit_account_id || b.account_name === r.deposit_to
      );
      const depositToName = r.deposit_to || matchedBank?.account_name || 'Cash in Hand';

      const row: CustomerReceipt = {
        ...r,
        id,
        receipt_no: receiptNo,
        customer_id: r.customer_id ? ensureUUID(r.customer_id) : null,
        deposit_to: depositToName,
        created_at: r.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.customerReceipts,
        row as unknown as Record<string, unknown>,
        'id'
      );

      if (row.status === 'POSTED') {
        const { error: rpcErr } = await supabase.rpc('post_customer_receipt', {
          p_receipt_id: id,
        });
        if (rpcErr) {
          if (matchedBank) {
            await updateRowById(TABLES.bankAccounts, matchedBank.id, {
              current_balance: (matchedBank.current_balance || 0) + (row.amount || 0),
            });
          }
          const jeRow: JournalEntry = {
            id: safeUUID(),
            entry_no: `JV-${row.receipt_no}`,
            entry_date: row.receipt_date,
            reference_no: row.receipt_no,
            source: 'Customer Payment',
            narration: `Customer payment ${row.receipt_no} deposited to ${depositToName}`,
            total_debit: row.amount,
            total_credit: row.amount,
            status: 'POSTED',
            created_at: new Date().toISOString(),
          };
          await insertOrUpsertRow(
            TABLES.journalEntries,
            jeRow as unknown as Record<string, unknown>,
            'entry_no'
          );
        }
      }
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.customerReceipts),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.customerReceipts),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CustomerReceipt> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.customerReceipts, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.customerReceipts),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.customerReceipts),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await softOrHardDeleteRow(TABLES.customerReceipts, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.customerReceipts),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.customerReceipts),
  });

  return {
    addCustomerReceipt: (r: Omit<CustomerReceipt, 'id'> & { id?: string }) => {
      addMutation.mutate(r);
    },
    updateCustomerReceipt: (id: string, patch: Partial<CustomerReceipt>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteCustomerReceipt: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useCommissionMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (c: Omit<SalesCommission, 'id'> & { id?: string }) => {
      const id = ensureUUID(c.id || safeUUID());
      const row: SalesCommission = {
        ...c,
        id,
        created_at: c.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.salesCommissions,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesCommissions),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesCommissions),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SalesCommission> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.salesCommissions, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesCommissions),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesCommissions),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await deleteRowById(TABLES.salesCommissions, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.salesCommissions),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.salesCommissions),
  });

  return {
    addCommission: (c: Omit<SalesCommission, 'id'> & { id?: string }) => {
      addMutation.mutate(c);
    },
    updateCommission: (id: string, patch: Partial<SalesCommission>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteCommission: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}
