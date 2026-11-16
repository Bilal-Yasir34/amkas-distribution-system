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
  optimisticPatch,
  optimisticRemove,
  optimisticUpsert,
  updateRowById,
} from './dbHelpers';

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

      // Check if an existing queue item for the same record_id exists
      const existingQueue =
        queryClient.getQueryData<ApprovalQueueItem[]>([TABLES.approvalQueue]) || [];
      const existing = existingQueue.find(
        (a) =>
          (item.record_id && (a.record_id === item.record_id || a.entity_id === item.record_id)) ||
          (recordNo && (a.record_no === recordNo || a.voucher_no === recordNo))
      );

      const finalId = existing?.id ? ensureUUID(existing.id) : id;

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

      optimisticUpsert(queryClient, TABLES.approvalQueue, row);
      await insertOrUpsertRow(
        TABLES.approvalQueue,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.approvalQueue),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.approvalQueue),
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
      const queue = queryClient.getQueryData<ApprovalQueueItem[]>([TABLES.approvalQueue]) || [];
      const item = queue.find((a) => a.id === id || a.id === targetQueueId);
      const reviewedAt = new Date().toISOString();

      optimisticPatch<ApprovalQueueItem>(queryClient, TABLES.approvalQueue, targetQueueId, {
        status,
        review_note: note || null,
        reviewed_by: reviewer || 'Administrator',
        reviewed_at: reviewedAt,
      });

      // 1. Try atomic Postgres RPC first
      const { error: rpcError } = await supabase.rpc('review_approval_queue_item', {
        p_queue_id: targetQueueId,
        p_status: status,
        p_note: note || null,
        p_reviewer: reviewer || 'Administrator',
      });

      if (!rpcError) return;

      // 2. Sequenced row-level fallback if RPC is not yet installed in DB
      await updateRowById(TABLES.approvalQueue, targetQueueId, {
        status,
        review_note: note || null,
        reviewed_by: reviewer || 'Administrator',
        reviewed_at: reviewedAt,
      });

      if (!item) return;
      const recId = item.record_id || item.entity_id;
      const recNo = item.record_no || item.voucher_no;
      const targetDocStatus = status === 'APPROVED' ? 'POSTED' : 'REJECTED';

      if (item.entity_type === 'sales_invoice') {
        const invoices = queryClient.getQueryData<SalesInvoice[]>([TABLES.salesInvoices]) || [];
        const inv = invoices.find((i) => i.id === recId || (recNo && i.invoice_no === recNo));
        if (inv) {
          optimisticPatch<SalesInvoice>(queryClient, TABLES.salesInvoices, inv.id, {
            status: targetDocStatus,
          });
          await updateRowById(TABLES.salesInvoices, inv.id, { status: targetDocStatus });

          if (status === 'APPROVED') {
            const products = queryClient.getQueryData<Product[]>([TABLES.products]) || [];
            for (const invItem of inv.items || []) {
              if (!invItem.product_id) continue;
              const prod = products.find((p) => p.id === invItem.product_id);
              if (prod) {
                const nextQty = Math.max(0, (prod.stock_quantity || 0) - (invItem.qty || 0));
                optimisticPatch<Product>(queryClient, TABLES.products, prod.id, {
                  stock_quantity: nextQty,
                });
                await updateRowById(TABLES.products, prod.id, { stock_quantity: nextQty });
              }
            }
            const jeRow: JournalEntry = {
              id: safeUUID(),
              entry_no: `JV-${inv.invoice_no}`,
              entry_date: inv.invoice_date,
              reference_no: inv.invoice_no,
              source: 'Sales Invoice',
              narration: `Sales Invoice ${inv.invoice_no} approved & posted to ${inv.account_head || 'Sales Revenue'}`,
              total_debit: inv.total_amount,
              total_credit: inv.total_amount,
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
      } else if (item.entity_type === 'vendor_bill' || item.entity_type === 'purchase_invoice') {
        const bills = queryClient.getQueryData<VendorBill[]>([TABLES.vendorBills]) || [];
        const bill = bills.find((b) => b.id === recId || (recNo && b.bill_no === recNo));
        if (bill) {
          optimisticPatch<VendorBill>(queryClient, TABLES.vendorBills, bill.id, {
            status: targetDocStatus,
          });
          await updateRowById(TABLES.vendorBills, bill.id, { status: targetDocStatus });
        }

        const pis = queryClient.getQueryData<PurchaseInvoice[]>([TABLES.purchaseInvoices]) || [];
        const pi = pis.find(
          (p) => p.id === recId || (recNo && (p.grn_no === recNo || p.invoice_no === recNo))
        );
        if (pi) {
          optimisticPatch<PurchaseInvoice>(queryClient, TABLES.purchaseInvoices, pi.id, {
            status: targetDocStatus,
          });
          await updateRowById(TABLES.purchaseInvoices, pi.id, { status: targetDocStatus });

          if (status === 'APPROVED') {
            const products = queryClient.getQueryData<Product[]>([TABLES.products]) || [];
            for (const piItem of pi.items || []) {
              if (!piItem.product_id) continue;
              const prod = products.find((p) => p.id === piItem.product_id);
              if (prod) {
                const nextQty = (prod.stock_quantity || 0) + (piItem.qty || 0);
                optimisticPatch<Product>(queryClient, TABLES.products, prod.id, {
                  stock_quantity: nextQty,
                });
                await updateRowById(TABLES.products, prod.id, { stock_quantity: nextQty });
              }
            }
            const refDoc = pi.grn_no || pi.invoice_no;
            if (refDoc) {
              const jeRow: JournalEntry = {
                id: safeUUID(),
                entry_no: `JV-${refDoc}`,
                entry_date:
                  pi.received_date || pi.document_date || new Date().toISOString().split('T')[0],
                reference_no: refDoc,
                source: 'Purchase Invoice',
                narration: `Purchase Invoice ${refDoc} approved & posted to ${pi.account_head || 'Inventory Purchases'}`,
                total_debit: pi.total_amount || 0,
                total_credit: pi.total_amount || 0,
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
        }
      } else if (item.entity_type === 'sales_return') {
        const srs = queryClient.getQueryData<SalesReturn[]>([TABLES.salesReturns]) || [];
        const sr = srs.find((r) => r.id === recId || (recNo && r.return_no === recNo));
        if (sr) {
          optimisticPatch<SalesReturn>(queryClient, TABLES.salesReturns, sr.id, {
            status: targetDocStatus,
          });
          await updateRowById(TABLES.salesReturns, sr.id, { status: targetDocStatus });
        }
      } else if (item.entity_type === 'purchase_return') {
        const prs = queryClient.getQueryData<PurchaseReturn[]>([TABLES.purchaseReturns]) || [];
        const pr = prs.find((r) => r.id === recId || (recNo && r.return_no === recNo));
        if (pr) {
          optimisticPatch<PurchaseReturn>(queryClient, TABLES.purchaseReturns, pr.id, {
            status: targetDocStatus,
          });
          await updateRowById(TABLES.purchaseReturns, pr.id, { status: targetDocStatus });
        }
      } else if (
        item.entity_type === 'customer_receipt' ||
        item.entity_type === 'payment_receipt'
      ) {
        const crs = queryClient.getQueryData<CustomerReceipt[]>([TABLES.customerReceipts]) || [];
        const cr = crs.find((r) => r.id === recId || (recNo && r.receipt_no === recNo));
        if (cr) {
          optimisticPatch<CustomerReceipt>(queryClient, TABLES.customerReceipts, cr.id, {
            status: targetDocStatus,
          });
          await updateRowById(TABLES.customerReceipts, cr.id, { status: targetDocStatus });
          if (status === 'APPROVED') {
            const banks = queryClient.getQueryData<BankAccount[]>([TABLES.bankAccounts]) || [];
            const bank = banks.find(
              (b) => b.id === cr.deposit_account_id || b.account_name === cr.deposit_to
            );
            if (bank) {
              await updateRowById(TABLES.bankAccounts, bank.id, {
                current_balance: (bank.current_balance || 0) + (cr.amount || 0),
              });
            }
          }
        }
      } else if (
        item.entity_type === 'vendor_payment' ||
        item.entity_type === 'payment_voucher'
      ) {
        const vps = queryClient.getQueryData<VendorPayment[]>([TABLES.vendorPayments]) || [];
        const vp = vps.find((p) => p.id === recId || (recNo && p.payment_no === recNo));
        if (vp) {
          optimisticPatch<VendorPayment>(queryClient, TABLES.vendorPayments, vp.id, {
            status: targetDocStatus,
          });
          await updateRowById(TABLES.vendorPayments, vp.id, { status: targetDocStatus });
          if (status === 'APPROVED') {
            const banks = queryClient.getQueryData<BankAccount[]>([TABLES.bankAccounts]) || [];
            const bank = banks.find(
              (b) => b.id === vp.paid_from_account_id || b.account_name === vp.pay_from
            );
            if (bank) {
              await updateRowById(TABLES.bankAccounts, bank.id, {
                current_balance: Math.max(0, (bank.current_balance || 0) - (vp.amount || 0)),
              });
            }
          }
        }
      }
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.approvalQueue),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.approvalQueue),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<ApprovalQueueItem>(queryClient, TABLES.approvalQueue, targetId);
      await deleteRowById(TABLES.approvalQueue, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.approvalQueue),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.approvalQueue),
  });

  return {
    addApprovalQueueItem: (item: Omit<ApprovalQueueItem, 'id'> & { id?: string }): string => {
      const id = ensureUUID(item.id || safeUUID());
      addMutation.mutate({ ...item, id });
      return id;
    },
    reviewApproval: (
      id: string,
      status: 'APPROVED' | 'REJECTED',
      note?: string,
      reviewer?: string
    ) => {
      reviewMutation.mutate({ id, status, note, reviewer });
    },
    deleteApprovalQueueItem: (id: string) => {
      deleteMutation.mutate(id);
    },
    reviewApprovalMutation: reviewMutation,
  };
}
