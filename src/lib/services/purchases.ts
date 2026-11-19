import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TABLES } from '@/lib/supabase';
import { ensureUUID, safeUUID } from '@/lib/utils';
import type {
  BankAccount,
  DebitNote,
  JournalEntry,
  PurchaseInvoice,
  PurchaseOrder,
  PurchaseRequest,
  PurchaseReturn,
  VendorBill,
  VendorPayment,
} from '@/lib/types';
import {
  deleteRowById,
  insertOrUpsertRow,
  invalidateTableAndRelated,
  softOrHardDeleteRow,
  updateRowById,
} from './dbHelpers';
import { allocateNextDocumentNumber } from './numbering';

export interface CreatePurchaseInvoiceInput extends Omit<PurchaseInvoice, 'id' | 'grn_no' | 'invoice_no'> {
  id?: string;
  grn_no?: string;
  invoice_no?: string;
  created_by?: string;
  requested_by?: string;
  requested_by_name?: string;
  requested_by_role?: string;
  items_summary?: string;
}

export function usePurchaseRequestMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (pr: Omit<PurchaseRequest, 'id'> & { id?: string }) => {
      const id = ensureUUID(pr.id || safeUUID());
      let requestNo = (pr.request_no || '').trim();
      if (!requestNo) {
        requestNo = await allocateNextDocumentNumber('PR');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.purchaseRequests)
          .select('id')
          .eq('request_no', requestNo)
          .limit(1);
        if (existing && existing.length > 0) {
          requestNo = await allocateNextDocumentNumber('PR');
        }
      }

      const row: PurchaseRequest = {
        ...pr,
        id,
        request_no: requestNo,
        document_date: pr.document_date || pr.request_date,
        created_at: pr.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.purchaseRequests,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseRequests),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseRequests),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PurchaseRequest> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.purchaseRequests, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseRequests),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseRequests),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await deleteRowById(TABLES.purchaseRequests, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseRequests),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseRequests),
  });

  return {
    addPurchaseRequest: (pr: Omit<PurchaseRequest, 'id'> & { id?: string }) => {
      addMutation.mutate(pr);
    },
    updatePurchaseRequest: (id: string, patch: Partial<PurchaseRequest>) => {
      updateMutation.mutate({ id, patch });
    },
    deletePurchaseRequest: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function usePurchaseOrderMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (po: Omit<PurchaseOrder, 'id'> & { id?: string }) => {
      const id = ensureUUID(po.id || safeUUID());
      let poNo = (po.po_no || '').trim();
      if (!poNo) {
        poNo = await allocateNextDocumentNumber('PO');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.purchaseOrders)
          .select('id')
          .eq('po_no', poNo)
          .limit(1);
        if (existing && existing.length > 0) {
          poNo = await allocateNextDocumentNumber('PO');
        }
      }

      const row: PurchaseOrder = {
        ...po,
        id,
        po_no: poNo,
        vendor_id: po.vendor_id ? ensureUUID(po.vendor_id) : null,
        document_date: po.document_date || po.po_date,
        expected_date: po.expected_date || po.expected_delivery || null,
        created_at: po.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.purchaseOrders,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseOrders),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseOrders),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PurchaseOrder> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.purchaseOrders, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseOrders),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseOrders),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await deleteRowById(TABLES.purchaseOrders, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseOrders),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseOrders),
  });

  return {
    addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'> & { id?: string }) => {
      addMutation.mutate(po);
    },
    updatePurchaseOrder: (id: string, patch: Partial<PurchaseOrder>) => {
      updateMutation.mutate({ id, patch });
    },
    deletePurchaseOrder: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function usePurchaseInvoiceMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (pi: CreatePurchaseInvoiceInput) => {
      const id = ensureUUID(pi.id || safeUUID());
      const vendorId = pi.vendor_id ? ensureUUID(pi.vendor_id) : null;
      const warehouseId = pi.warehouse_id ? ensureUUID(pi.warehouse_id) : null;

      // 1. Try atomic Postgres RPC `create_purchase_invoice` first
      const rpcPayload = {
        ...pi,
        id,
        vendor_id: vendorId,
        warehouse_id: warehouseId,
        items: (pi.items || []).map((it) => ({
          ...it,
          id: ensureUUID(it.id || safeUUID()),
          purchase_invoice_id: id,
          product_id: it.product_id ? ensureUUID(it.product_id) : null,
        })),
      };

      const { data: rpcData, error: rpcErr } = await supabase.rpc('create_purchase_invoice', {
        payload: rpcPayload,
      });

      if (!rpcErr && rpcData) {
        return rpcData as unknown as PurchaseInvoice;
      }

      if (rpcErr && rpcErr.code !== 'PGRST202') {
        throw new Error(rpcErr.message || 'Failed to create purchase invoice.');
      }

      // 2. Database-verified sequenced fallback if `create_purchase_invoice` RPC is not yet installed
      let docNo = (pi.invoice_no || pi.grn_no || '').trim();
      if (docNo) {
        const { data: existingNo } = await supabase
          .from(TABLES.purchaseInvoices)
          .select('id')
          .or(`invoice_no.eq.${docNo},grn_no.eq.${docNo}`)
          .limit(1);
        if (existingNo && existingNo.length > 0) {
          docNo = '';
        }
      }
      if (!docNo) {
        docNo = await allocateNextDocumentNumber('PI');
      } else {
        await allocateNextDocumentNumber('PI');
      }

      const row: PurchaseInvoice = {
        ...pi,
        id,
        grn_no: docNo,
        invoice_no: docNo,
        vendor_id: vendorId,
        warehouse_id: warehouseId,
        document_date: pi.document_date || pi.received_date,
        created_at: pi.created_at || new Date().toISOString(),
      };

      // Insert by primary key `id` (NEVER overwrite an existing row on `invoice_no`)
      await insertOrUpsertRow(
        TABLES.purchaseInvoices,
        row as unknown as Record<string, unknown>,
        'id'
      );

      if (row.items && row.items.length > 0) {
        await supabase.from(TABLES.purchaseInvoiceItems).delete().eq('purchase_invoice_id', id);
        for (const item of row.items) {
          await insertOrUpsertRow(
            TABLES.purchaseInvoiceItems,
            {
              id: ensureUUID(item.id || safeUUID()),
              purchase_invoice_id: id,
              product_id: item.product_id ? ensureUUID(item.product_id) : null,
              article_id: item.article_id || null,
              colour: item.colour || null,
              description: item.description || null,
              qty: item.qty || 0,
              rate: item.rate || 0,
              discount: item.discount || 0,
              tax_pct: item.tax_pct || 0,
              line_total: item.line_total || 0,
            },
            'id'
          );
        }
      }

      if (row.status === 'PENDING_APPROVAL') {
        const itemsSummary =
          pi.items_summary ||
          (row.items || [])
            .map((it) => `${it.description || 'Product'} (Qty: ${it.qty})`)
            .join(', ') ||
          `${row.items?.length || 0} items`;

        const { data: existingQ } = await supabase
          .from(TABLES.approvalQueue)
          .select('id')
          .eq('entity_type', 'purchase_invoice')
          .eq('entity_id', id)
          .maybeSingle();

        await insertOrUpsertRow(
          TABLES.approvalQueue,
          {
            id: existingQ?.id || safeUUID(),
            module: 'Purchase',
            entity_type: 'purchase_invoice',
            entity_id: id,
            record_id: id,
            record_no: docNo,
            voucher_no: docNo,
            requested_by: pi.requested_by || 'admin',
            requested_by_name: pi.requested_by_name || 'Admin',
            requested_by_role: pi.requested_by_role || 'Super Admin',
            amount: row.total_amount || 0,
            status: 'PENDING',
            party_name: row.vendor_name || row.party_name || 'Vendor',
            warehouse_id: warehouseId,
            items_summary: itemsSummary,
            created_at: row.created_at,
          },
          'id'
        );
      }

      return row;
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.purchaseInvoices,
        TABLES.purchaseInvoiceItems,
        TABLES.approvalQueue,
        TABLES.documentSequences,
      ]),
    onSettled: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.purchaseInvoices,
        TABLES.purchaseInvoiceItems,
        TABLES.approvalQueue,
        TABLES.documentSequences,
      ]),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PurchaseInvoice> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.purchaseInvoices, targetId, patch as Record<string, unknown>);
      if (patch.items) {
        await supabase
          .from(TABLES.purchaseInvoiceItems)
          .delete()
          .eq('purchase_invoice_id', targetId);
        for (const item of patch.items) {
          await insertOrUpsertRow(
            TABLES.purchaseInvoiceItems,
            {
              id: ensureUUID(item.id || safeUUID()),
              purchase_invoice_id: targetId,
              product_id: item.product_id ? ensureUUID(item.product_id) : null,
              article_id: item.article_id || null,
              colour: item.colour || null,
              description: item.description || null,
              qty: item.qty || 0,
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
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseInvoices),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseInvoices),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const list = queryClient.getQueryData<PurchaseInvoice[]>([TABLES.purchaseInvoices]) || [];
      const target = list.find((p) => p.id === id || p.grn_no === id || p.invoice_no === id);
      const targetId = ensureUUID(target?.id || id);
      const docNo = target?.invoice_no || target?.grn_no;

      await softOrHardDeleteRow(TABLES.purchaseInvoices, targetId, 'invoice_no', docNo);
      await supabase.from(TABLES.approvalQueue).delete().eq('entity_id', targetId);
      if (docNo) {
        await supabase.from(TABLES.approvalQueue).delete().eq('voucher_no', docNo);
        await supabase.from(TABLES.journalEntries).delete().eq('reference_no', docNo);
      }
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseInvoices),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseInvoices),
  });

  return {
    addPurchaseInvoice: (pi: CreatePurchaseInvoiceInput) => {
      addMutation.mutate(pi);
    },
    createPurchaseInvoiceAsync: (pi: CreatePurchaseInvoiceInput) => addMutation.mutateAsync(pi),
    updatePurchaseInvoice: (id: string, patch: Partial<PurchaseInvoice>) => {
      updateMutation.mutate({ id, patch });
    },
    deletePurchaseInvoice: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useVendorBillMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (vb: Omit<VendorBill, 'id'> & { id?: string }) => {
      const id = ensureUUID(vb.id || safeUUID());
      let billNo = (vb.bill_no || '').trim();
      if (!billNo) {
        billNo = await allocateNextDocumentNumber('VB');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.vendorBills)
          .select('id')
          .eq('bill_no', billNo)
          .limit(1);
        if (existing && existing.length > 0) {
          billNo = await allocateNextDocumentNumber('VB');
        }
      }

      const row: VendorBill = {
        ...vb,
        id,
        bill_no: billNo,
        vendor_id: vb.vendor_id ? ensureUUID(vb.vendor_id) : null,
        warehouse_id: vb.warehouse_id ? ensureUUID(vb.warehouse_id) : null,
        document_date: vb.document_date || vb.bill_date,
        created_at: vb.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.vendorBills,
        row as unknown as Record<string, unknown>,
        'id'
      );

      if (row.items && row.items.length > 0) {
        await supabase.from(TABLES.vendorBillItems).delete().eq('vendor_bill_id', id);
        for (const item of row.items) {
          await insertOrUpsertRow(
            TABLES.vendorBillItems,
            {
              id: ensureUUID(item.id || safeUUID()),
              vendor_bill_id: id,
              product_id: item.product_id ? ensureUUID(item.product_id) : null,
              description: item.description || null,
              qty: item.qty || 0,
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
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.vendorBills),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.vendorBills),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<VendorBill> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.vendorBills, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.vendorBills),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.vendorBills),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const list = queryClient.getQueryData<VendorBill[]>([TABLES.vendorBills]) || [];
      const target = list.find((b) => b.id === id || b.bill_no === id);
      const targetId = ensureUUID(target?.id || id);
      const billNo = target?.bill_no;

      await softOrHardDeleteRow(TABLES.vendorBills, targetId, 'bill_no', billNo);
      await supabase.from(TABLES.approvalQueue).delete().eq('entity_id', targetId);
      if (billNo) {
        await supabase.from(TABLES.approvalQueue).delete().eq('voucher_no', billNo);
      }
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.vendorBills),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.vendorBills),
  });

  return {
    addVendorBill: (vb: Omit<VendorBill, 'id'> & { id?: string }) => {
      addMutation.mutate(vb);
    },
    updateVendorBill: (id: string, patch: Partial<VendorBill>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteVendorBill: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useDebitNoteMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (dn: Omit<DebitNote, 'id'> & { id?: string }) => {
      const id = ensureUUID(dn.id || safeUUID());
      let dnNo = (dn.debit_note_no || '').trim();
      if (!dnNo) {
        dnNo = await allocateNextDocumentNumber('DN');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.debitNotes)
          .select('id')
          .eq('debit_note_no', dnNo)
          .limit(1);
        if (existing && existing.length > 0) {
          dnNo = await allocateNextDocumentNumber('DN');
        }
      }

      const row: DebitNote = {
        ...dn,
        id,
        debit_note_no: dnNo,
        vendor_id: dn.vendor_id ? ensureUUID(dn.vendor_id) : null,
        document_date: dn.document_date || dn.note_date,
        purpose_reason: dn.purpose_reason || dn.reason,
        created_at: dn.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.debitNotes,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.debitNotes),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.debitNotes),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<DebitNote> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.debitNotes, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.debitNotes),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.debitNotes),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await softOrHardDeleteRow(TABLES.debitNotes, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.debitNotes),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.debitNotes),
  });

  return {
    addDebitNote: (dn: Omit<DebitNote, 'id'> & { id?: string }) => {
      addMutation.mutate(dn);
    },
    updateDebitNote: (id: string, patch: Partial<DebitNote>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteDebitNote: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function usePurchaseReturnMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (pr: Omit<PurchaseReturn, 'id'> & { id?: string }) => {
      const id = ensureUUID(pr.id || safeUUID());
      let returnNo = (pr.return_no || '').trim();
      if (!returnNo) {
        returnNo = await allocateNextDocumentNumber('PRT');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.purchaseReturns)
          .select('id')
          .eq('return_no', returnNo)
          .limit(1);
        if (existing && existing.length > 0) {
          returnNo = await allocateNextDocumentNumber('PRT');
        }
      }

      const row: PurchaseReturn = {
        ...pr,
        id,
        return_no: returnNo,
        vendor_id: pr.vendor_id ? ensureUUID(pr.vendor_id) : null,
        warehouse_id: pr.warehouse_id ? ensureUUID(pr.warehouse_id) : null,
        created_at: pr.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.purchaseReturns,
        {
          ...row,
          date: row.document_date,
          tax_amount: row.tax_total || 0,
        } as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseReturns),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseReturns),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PurchaseReturn> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.purchaseReturns, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseReturns),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseReturns),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await softOrHardDeleteRow(TABLES.purchaseReturns, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseReturns),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseReturns),
  });

  return {
    addPurchaseReturn: (pr: Omit<PurchaseReturn, 'id'> & { id?: string }) => {
      addMutation.mutate(pr);
    },
    updatePurchaseReturn: (id: string, patch: Partial<PurchaseReturn>) => {
      updateMutation.mutate({ id, patch });
    },
    deletePurchaseReturn: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useVendorPaymentMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (vp: Omit<VendorPayment, 'id'> & { id?: string }) => {
      const id = ensureUUID(vp.id || safeUUID());
      let paymentNo = (vp.payment_no || '').trim();
      if (!paymentNo) {
        paymentNo = await allocateNextDocumentNumber('CP');
      } else {
        const { data: existing } = await supabase
          .from(TABLES.vendorPayments)
          .select('id')
          .eq('payment_no', paymentNo)
          .limit(1);
        if (existing && existing.length > 0) {
          paymentNo = await allocateNextDocumentNumber('CP');
        }
      }

      const banks = queryClient.getQueryData<BankAccount[]>([TABLES.bankAccounts]) || [];
      const matchedBank = banks.find(
        (b) => b.id === vp.paid_from_account_id || b.account_name === vp.pay_from
      );
      const payFromName = vp.pay_from || matchedBank?.account_name || vp.payment_method || 'Cash in Hand';

      const row: VendorPayment = {
        ...vp,
        id,
        payment_no: paymentNo,
        vendor_id: vp.vendor_id ? ensureUUID(vp.vendor_id) : null,
        pay_from: payFromName,
        created_at: vp.created_at || new Date().toISOString(),
      };
      await insertOrUpsertRow(
        TABLES.vendorPayments,
        row as unknown as Record<string, unknown>,
        'id'
      );

      if (row.status === 'POSTED') {
        const { error: rpcErr } = await supabase.rpc('post_vendor_payment', {
          p_payment_id: id,
        });
        if (rpcErr) {
          if (matchedBank) {
            await updateRowById(TABLES.bankAccounts, matchedBank.id, {
              current_balance: Math.max(0, (matchedBank.current_balance || 0) - (row.amount || 0)),
            });
          }
          const jeRow: JournalEntry = {
            id: safeUUID(),
            entry_no: `JV-${row.payment_no}`,
            entry_date: row.payment_date,
            reference_no: row.payment_no,
            source: 'Vendor Payment',
            narration: `Payment ${row.payment_no} paid from ${payFromName}`,
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
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.vendorPayments),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.vendorPayments),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<VendorPayment> }) => {
      const targetId = ensureUUID(id);
      await updateRowById(TABLES.vendorPayments, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.vendorPayments),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.vendorPayments),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      await softOrHardDeleteRow(TABLES.vendorPayments, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.vendorPayments),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.vendorPayments),
  });

  return {
    addVendorPayment: (vp: Omit<VendorPayment, 'id'> & { id?: string }) => {
      addMutation.mutate(vp);
    },
    updateVendorPayment: (id: string, patch: Partial<VendorPayment>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteVendorPayment: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}
