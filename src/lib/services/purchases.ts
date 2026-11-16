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
  optimisticPatch,
  optimisticRemove,
  optimisticUpsert,
  softOrHardDeleteRow,
  updateRowById,
} from './dbHelpers';

export function usePurchaseRequestMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (pr: Omit<PurchaseRequest, 'id'> & { id?: string }) => {
      const id = ensureUUID(pr.id || safeUUID());
      const row: PurchaseRequest = {
        ...pr,
        id,
        document_date: pr.document_date || pr.request_date,
        created_at: pr.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.purchaseRequests, row);
      await insertOrUpsertRow(
        TABLES.purchaseRequests,
        row as unknown as Record<string, unknown>,
        'request_no'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseRequests),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseRequests),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PurchaseRequest> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<PurchaseRequest>(queryClient, TABLES.purchaseRequests, targetId, patch);
      await updateRowById(TABLES.purchaseRequests, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseRequests),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseRequests),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<PurchaseRequest>(queryClient, TABLES.purchaseRequests, targetId);
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
      const row: PurchaseOrder = {
        ...po,
        id,
        vendor_id: po.vendor_id ? ensureUUID(po.vendor_id) : null,
        document_date: po.document_date || po.po_date,
        expected_date: po.expected_date || po.expected_delivery || null,
        created_at: po.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.purchaseOrders, row);
      await insertOrUpsertRow(
        TABLES.purchaseOrders,
        row as unknown as Record<string, unknown>,
        'po_no'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseOrders),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseOrders),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PurchaseOrder> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<PurchaseOrder>(queryClient, TABLES.purchaseOrders, targetId, patch);
      await updateRowById(TABLES.purchaseOrders, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseOrders),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseOrders),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<PurchaseOrder>(queryClient, TABLES.purchaseOrders, targetId);
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
    mutationFn: async (pi: Omit<PurchaseInvoice, 'id'> & { id?: string }) => {
      const id = ensureUUID(pi.id || safeUUID());
      const docNo = pi.invoice_no || pi.grn_no;
      const row: PurchaseInvoice = {
        ...pi,
        id,
        grn_no: pi.grn_no || docNo,
        invoice_no: docNo,
        vendor_id: pi.vendor_id ? ensureUUID(pi.vendor_id) : null,
        warehouse_id: pi.warehouse_id ? ensureUUID(pi.warehouse_id) : null,
        document_date: pi.document_date || pi.received_date,
        created_at: pi.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.purchaseInvoices, row);
      await insertOrUpsertRow(
        TABLES.purchaseInvoices,
        row as unknown as Record<string, unknown>,
        'invoice_no'
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
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseInvoices),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseInvoices),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PurchaseInvoice> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<PurchaseInvoice>(queryClient, TABLES.purchaseInvoices, targetId, patch);
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

      optimisticRemove<PurchaseInvoice>(queryClient, TABLES.purchaseInvoices, targetId);
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
    addPurchaseInvoice: (pi: Omit<PurchaseInvoice, 'id'> & { id?: string }) => {
      addMutation.mutate(pi);
    },
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
      const row: VendorBill = {
        ...vb,
        id,
        vendor_id: vb.vendor_id ? ensureUUID(vb.vendor_id) : null,
        warehouse_id: vb.warehouse_id ? ensureUUID(vb.warehouse_id) : null,
        document_date: vb.document_date || vb.bill_date,
        created_at: vb.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.vendorBills, row);
      await insertOrUpsertRow(
        TABLES.vendorBills,
        row as unknown as Record<string, unknown>,
        'bill_no'
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
      optimisticPatch<VendorBill>(queryClient, TABLES.vendorBills, targetId, patch);
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

      optimisticRemove<VendorBill>(queryClient, TABLES.vendorBills, targetId);
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
      const row: DebitNote = {
        ...dn,
        id,
        vendor_id: dn.vendor_id ? ensureUUID(dn.vendor_id) : null,
        document_date: dn.document_date || dn.note_date,
        purpose_reason: dn.purpose_reason || dn.reason,
        created_at: dn.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.debitNotes, row);
      await insertOrUpsertRow(
        TABLES.debitNotes,
        row as unknown as Record<string, unknown>,
        'debit_note_no'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.debitNotes),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.debitNotes),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<DebitNote> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<DebitNote>(queryClient, TABLES.debitNotes, targetId, patch);
      await updateRowById(TABLES.debitNotes, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.debitNotes),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.debitNotes),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<DebitNote>(queryClient, TABLES.debitNotes, targetId);
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
      const row: PurchaseReturn = {
        ...pr,
        id,
        vendor_id: pr.vendor_id ? ensureUUID(pr.vendor_id) : null,
        warehouse_id: pr.warehouse_id ? ensureUUID(pr.warehouse_id) : null,
        created_at: pr.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.purchaseReturns, row);
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
      optimisticPatch<PurchaseReturn>(queryClient, TABLES.purchaseReturns, targetId, patch);
      await updateRowById(TABLES.purchaseReturns, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.purchaseReturns),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.purchaseReturns),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<PurchaseReturn>(queryClient, TABLES.purchaseReturns, targetId);
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
      const banks = queryClient.getQueryData<BankAccount[]>([TABLES.bankAccounts]) || [];
      const matchedBank = banks.find(
        (b) => b.id === vp.paid_from_account_id || b.account_name === vp.pay_from
      );
      const payFromName = vp.pay_from || matchedBank?.account_name || vp.payment_method || 'Cash in Hand';

      const row: VendorPayment = {
        ...vp,
        id,
        vendor_id: vp.vendor_id ? ensureUUID(vp.vendor_id) : null,
        pay_from: payFromName,
        created_at: vp.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.vendorPayments, row);
      await insertOrUpsertRow(
        TABLES.vendorPayments,
        row as unknown as Record<string, unknown>,
        'payment_no'
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
      optimisticPatch<VendorPayment>(queryClient, TABLES.vendorPayments, targetId, patch);
      await updateRowById(TABLES.vendorPayments, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.vendorPayments),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.vendorPayments),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<VendorPayment>(queryClient, TABLES.vendorPayments, targetId);
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
