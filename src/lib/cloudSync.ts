import { supabase } from './supabase';
import { useDataStore } from './dataStore';
import type { Customer, Vendor, Product, Category, Warehouse, SalesInvoice, ChartOfAccount } from './types';

export interface CloudSyncResult {
  success: boolean;
  message: string;
  isRlsError?: boolean;
  counts?: Record<string, number>;
}

/**
 * Ensures any local string/timestamp ID conforms to a valid Postgres UUID format.
 */
function toValidUuid(id: string | undefined | null): string {
  if (!id) return '00000000-0000-0000-0000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  let hex = '';
  for (let i = 0; i < id.length; i++) {
    hex += id.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

export const SUPABASE_FIX_SQL = `-- AMKAS ERP - Supabase Full Cloud Sync Fix Script
-- Run this script in Supabase Dashboard -> SQL Editor -> Click 'Run'

-- 1. Create Cloud Sync State Table for instant full-system synchronization
CREATE TABLE IF NOT EXISTS public.cloud_sync_state (
  id TEXT PRIMARY KEY DEFAULT 'primary_state',
  org_id TEXT DEFAULT 'primary_org',
  state_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  version TEXT DEFAULT 'v1.1'
);

-- 2. Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS public.sales_returns (
  id TEXT PRIMARY KEY,
  return_no TEXT,
  customer_id TEXT,
  invoice_id TEXT,
  warehouse_id TEXT,
  date DATE,
  status TEXT DEFAULT 'APPROVED',
  items JSONB,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_returns (
  id TEXT PRIMARY KEY,
  return_no TEXT,
  vendor_id TEXT,
  purchase_invoice_id TEXT,
  warehouse_id TEXT,
  date DATE,
  status TEXT DEFAULT 'APPROVED',
  items JSONB,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approval_queue (
  id TEXT PRIMARY KEY,
  record_id TEXT,
  record_no TEXT,
  module TEXT,
  entity_type TEXT,
  requested_by TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  party_name TEXT,
  warehouse_id TEXT,
  items_summary TEXT,
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Drop restrictive foreign key constraints on sales_invoices to allow unlimited transactions
ALTER TABLE IF EXISTS public.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_customer_id_fkey;
ALTER TABLE IF EXISTS public.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_warehouse_id_fkey;
ALTER TABLE IF EXISTS public.sales_invoice_items DROP CONSTRAINT IF EXISTS sales_invoice_items_sales_invoice_id_fkey;
ALTER TABLE IF EXISTS public.sales_invoice_items DROP CONSTRAINT IF EXISTS sales_invoice_items_product_id_fkey;

-- 4. Enable Supabase Realtime broadcast for instant multi-device synchronization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'cloud_sync_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cloud_sync_state;
  END IF;
END $$;

-- 5. Grant full permissions & disable RLS on all public tables
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role;', tbl);
    END LOOP;
END $$;
`;

/**
 * Merges two item arrays by unique key selector, ensuring no records from either device are lost.
 */
function mergeCollection<T>(
  localList: T[] = [],
  remoteList: T[] = [],
  keySelector: (item: T) => string,
  deletedSet?: Set<string>,
  _debugLabel?: string
): T[] {
  const isDeleted = (item: any, key: string) => {
    if (!deletedSet || deletedSet.size === 0) return false;
    // ONLY match on the unique record ID (UUID). Never match on document numbers
    // (invoice_no, grn_no, bill_no, record_no, etc.) because those get reused
    // when new records are created with auto-incrementing numbers.
    if (item.id && deletedSet.has(item.id)) return true;
    return false;
  };

  const map = new Map<string, T>();

  // 1. Index remote items
  for (const item of (remoteList || [])) {
    if (!item) continue;
    const key = keySelector(item);
    if (!key || isDeleted(item, key)) {
      if (_debugLabel) console.log(`[MERGE-DEBUG] ${_debugLabel} REMOTE item SKIPPED: key="${key}", deleted=${isDeleted(item, key)}`);
      continue;
    }
    map.set(key, item);
  }

  if (_debugLabel) console.log(`[MERGE-DEBUG] ${_debugLabel} after indexing remote: map size=${map.size}, remote keys=`, Array.from(map.keys()));

  // 2. Merge local items
  for (const item of (localList || [])) {
    if (!item) continue;
    const key = keySelector(item);
    if (!key || isDeleted(item, key)) {
      if (_debugLabel) console.log(`[MERGE-DEBUG] ${_debugLabel} LOCAL item SKIPPED: key="${key}", id=${(item as any).id}, deleted=${isDeleted(item, key)}`, deletedSet ? `deletedSet has key=${deletedSet.has(key)}, has id=${deletedSet.has((item as any).id || '')}` : 'no deletedSet');
      continue;
    }

    if (!map.has(key)) {
      // Exists only locally -> preserve it!
      if (_debugLabel) console.log(`[MERGE-DEBUG] ${_debugLabel} LOCAL-ONLY item PRESERVED: key="${key}"`);
      map.set(key, item);
    } else {
      // Exists in both -> preserve the most recently updated or posted status
      const remoteItem = map.get(key)!;
      const remoteTime = new Date(
        (remoteItem as any).updated_at ||
        (remoteItem as any).reviewed_at ||
        (remoteItem as any).created_at ||
        0
      ).getTime();
      const localTime = new Date(
        (item as any).updated_at ||
        (item as any).reviewed_at ||
        (item as any).created_at ||
        0
      ).getTime();

      if (localTime >= remoteTime) {
        const mergedItem = { ...remoteItem, ...item };
        if ((!(item as any).items || (item as any).items.length === 0) && (remoteItem as any).items && (remoteItem as any).items.length > 0) {
          (mergedItem as any).items = (remoteItem as any).items;
        }
        map.set(key, mergedItem);
      } else {
        const mergedItem = { ...item, ...remoteItem };
        if ((!(remoteItem as any).items || (remoteItem as any).items.length === 0) && (item as any).items && (item as any).items.length > 0) {
          (mergedItem as any).items = (item as any).items;
        }
        map.set(key, mergedItem);
      }
    }
  }

  if (_debugLabel) console.log(`[MERGE-DEBUG] ${_debugLabel} FINAL result: size=${map.size}, keys=`, Array.from(map.keys()));

  return Array.from(map.values());
}

/**
 * Intelligently combines two complete store states so that transactions added on
 * any device (invoices, queue items, purchases, etc.) are preserved and never clobbered.
 */
export function mergeStores(local: any, remote: any): any {
  if (!remote) return local;
  if (!local) return remote;

  // CRITICAL: Spread remote FIRST, then local on top.
  // This guarantees local (in-memory) state always wins over stale remote snapshots.
  // Specific arrays are then union-merged below to also preserve remote-only records.
  const merged = { ...remote, ...local };

  console.log('[SYNC-DEBUG] mergeStores called', {
    localInvoices: (local.invoices || []).length,
    remoteInvoices: (remote.invoices || []).length,
    localApprovalQueue: (local.approvalQueue || []).length,
    remoteApprovalQueue: (remote.approvalQueue || []).length,
    localPurchaseInvoices: (local.purchaseInvoices || []).length,
    remotePurchaseInvoices: (remote.purchaseInvoices || []).length,
  });

  const rawDeleted = [
    ...(local.deletedRecordIds || []),
    ...(remote.deletedRecordIds || []),
  ];
  const cleanDeleted = Array.from(new Set(rawDeleted.filter((id) => isValidUUID(id))));
  const deletedIds = new Set<string>(cleanDeleted);
  merged.deletedRecordIds = cleanDeleted;

  // Invoices
  merged.invoices = mergeCollection(
    local.invoices,
    remote.invoices,
    (i) => i.id || i.invoice_no || '',
    deletedIds,
    'INVOICES'
  );

  // Approval Queue
  merged.approvalQueue = mergeCollection(
    local.approvalQueue,
    remote.approvalQueue,
    (a) => a.id || a.record_id || a.record_no || '',
    deletedIds,
    'APPROVAL_QUEUE'
  );

  // Purchases & Bills
  merged.purchaseInvoices = mergeCollection(
    local.purchaseInvoices,
    remote.purchaseInvoices,
    (pi) => pi.id || pi.grn_no || pi.invoice_no || '',
    deletedIds,
    'PURCHASE_INVOICES'
  );
  merged.vendorBills = mergeCollection(
    local.vendorBills,
    remote.vendorBills,
    (vb) => vb.id || vb.bill_no || '',
    deletedIds
  );

  // Receipts & Payments
  merged.customerReceipts = mergeCollection(
    local.customerReceipts,
    remote.customerReceipts,
    (cr) => cr.id || cr.receipt_no || '',
    deletedIds
  );
  merged.vendorPayments = mergeCollection(
    local.vendorPayments,
    remote.vendorPayments,
    (vp) => vp.id || vp.payment_no || '',
    deletedIds
  );

  // Returns
  merged.salesReturns = mergeCollection(
    local.salesReturns,
    remote.salesReturns,
    (sr) => sr.id || sr.return_no || '',
    deletedIds
  );
  merged.purchaseReturns = mergeCollection(
    local.purchaseReturns,
    remote.purchaseReturns,
    (pr) => pr.id || pr.return_no || '',
    deletedIds
  );

  // Quotations, Orders, Notes
  merged.quotations = mergeCollection(
    local.quotations,
    remote.quotations,
    (q) => q.id || q.quotation_no || '',
    deletedIds
  );
  merged.salesOrders = mergeCollection(
    local.salesOrders,
    remote.salesOrders,
    (so) => so.id || so.order_no || '',
    deletedIds
  );
  merged.creditNotes = mergeCollection(
    local.creditNotes,
    remote.creditNotes,
    (cn) => cn.id || cn.credit_note_no || '',
    deletedIds
  );
  merged.debitNotes = mergeCollection(
    local.debitNotes,
    remote.debitNotes,
    (dn) => dn.id || dn.debit_note_no || '',
    deletedIds
  );

  // Journal entries
  merged.journalEntries = mergeCollection(
    local.journalEntries,
    remote.journalEntries,
    (je) => je.id || je.entry_no || '',
    deletedIds
  );

  // Master Data
  merged.customers = mergeCollection(
    local.customers,
    remote.customers,
    (c) => c.id || c.code || c.name || '',
    deletedIds
  );
  merged.vendors = mergeCollection(
    local.vendors,
    remote.vendors,
    (v) => v.id || v.code || v.name || '',
    deletedIds
  );
  merged.products = mergeCollection(
    local.products,
    remote.products,
    (p) => p.id || p.code || p.name || '',
    deletedIds
  );
  merged.categories = mergeCollection(
    local.categories,
    remote.categories,
    (c) => c.id || c.name || '',
    deletedIds
  );
  merged.warehouses = mergeCollection(
    local.warehouses,
    remote.warehouses,
    (w) => w.id || w.code || w.name || '',
    deletedIds,
    'WAREHOUSES'
  );
  merged.chartOfAccounts = mergeCollection(
    local.chartOfAccounts,
    remote.chartOfAccounts,
    (coa) => coa.id || coa.code || '',
    deletedIds
  );
  merged.accountTypes = mergeCollection(
    local.accountTypes,
    remote.accountTypes,
    (at) => at.id || at.code || at.name || '',
    deletedIds
  );
  merged.productArticles = mergeCollection(
    local.productArticles,
    remote.productArticles,
    (pa) => pa.id || pa.article_name || '',
    deletedIds
  );

  // ---- Additional collections ----
  merged.commissions = mergeCollection(
    local.commissions,
    remote.commissions,
    (c: any) => c.id || c.invoice_no || '',
    deletedIds
  );
  merged.purchaseRequests = mergeCollection(
    local.purchaseRequests,
    remote.purchaseRequests,
    (pr: any) => pr.id || pr.request_no || '',
    deletedIds
  );
  merged.purchaseOrders = mergeCollection(
    local.purchaseOrders,
    remote.purchaseOrders,
    (po: any) => po.id || po.order_no || '',
    deletedIds
  );
  merged.stockTransfers = mergeCollection(
    local.stockTransfers,
    remote.stockTransfers,
    (st: any) => st.id || st.transfer_no || '',
    deletedIds
  );
  merged.stockAdjustments = mergeCollection(
    local.stockAdjustments,
    remote.stockAdjustments,
    (sa: any) => sa.id || sa.adjustment_no || '',
    deletedIds
  );
  merged.batches = mergeCollection(
    local.batches,
    remote.batches,
    (b: any) => b.id || b.batch_no || '',
    deletedIds
  );
  merged.serials = mergeCollection(
    local.serials,
    remote.serials,
    (s: any) => s.id || s.serial_no || '',
    deletedIds
  );
  merged.bankAccounts = mergeCollection(
    local.bankAccounts,
    remote.bankAccounts,
    (ba: any) => ba.id || ba.account_number || '',
    deletedIds
  );
  merged.bankStatements = mergeCollection(
    local.bankStatements,
    remote.bankStatements,
    (bs: any) => bs.id || '',
    deletedIds
  );
  merged.financialYears = mergeCollection(
    local.financialYears,
    remote.financialYears,
    (fy: any) => fy.id || fy.name || '',
    deletedIds
  );
  merged.expenseRecords = mergeCollection(
    local.expenseRecords,
    remote.expenseRecords,
    (e: any) => e.id || '',
    deletedIds
  );
  merged.incomeRecords = mergeCollection(
    local.incomeRecords,
    remote.incomeRecords,
    (i: any) => i.id || '',
    deletedIds
  );
  merged.departments = mergeCollection(
    local.departments,
    remote.departments,
    (d: any) => d.id || d.code || d.name || '',
    deletedIds
  );
  merged.auditLogs = mergeCollection(
    local.auditLogs,
    remote.auditLogs,
    (a: any) => a.id || '',
    deletedIds
  );
  merged.loginLogs = mergeCollection(
    local.loginLogs,
    remote.loginLogs,
    (l: any) => l.id || '',
    deletedIds
  );
  merged.users = mergeCollection(
    local.users,
    remote.users,
    (u: any) => u.id || u.employee_code || u.email || '',
    deletedIds
  );
  merged.organizations = mergeCollection(
    local.organizations,
    remote.organizations,
    (o: any) => o.id || o.org_code || o.name || '',
    deletedIds
  );
  merged.branches = mergeCollection(
    local.branches,
    remote.branches,
    (b: any) => b.id || b.code || b.name || '',
    deletedIds
  );

  merged.universalArticles = Array.from(
    new Set([...(local.universalArticles || []), ...(remote.universalArticles || [])])
  );

  return reconcileMissingDocuments(merged);
}

/**
 * Self-healing reconciler: guarantees that any purchase or sale present in the Approval Queue
 * is never missing from the Purchase or Sales registers across all devices and web deployments.
 */
export function reconcileMissingDocuments(state: any): any {
  if (!state || !state.approvalQueue) return state;

  const deletedSet = new Set<string>((state.deletedRecordIds || []).filter((id: string) => isValidUUID(id)));

  // 1. Reconcile missing Purchase Invoices
  const existingPINos = new Set<string>();
  for (const p of state.purchaseInvoices || []) {
    if (p.id) existingPINos.add(p.id);
    if (p.invoice_no) existingPINos.add(p.invoice_no);
    if (p.grn_no) existingPINos.add(p.grn_no);
  }
  const newPIs = [...(state.purchaseInvoices || [])];

  for (const q of state.approvalQueue) {
    const isPurchase =
      q.entity_type === 'purchase_invoice' ||
      (q.module === 'Purchase' &&
        q.entity_type !== 'vendor_bill' &&
        q.entity_type !== 'purchase_return' &&
        q.entity_type !== 'vendor_payment' &&
        !q.record_no?.startsWith('PR-') &&
        !q.record_no?.startsWith('VP-')) ||
      (q.record_no && (q.record_no.startsWith('PI-') || q.record_no.startsWith('PUR-')));

    if (isPurchase) {
      const docNo = q.record_no;
      const recId = q.record_id || q.entity_id || q.id;
      if (
        docNo &&
        !existingPINos.has(docNo) &&
        !existingPINos.has(recId) &&
        !deletedSet.has(recId)
      ) {
        newPIs.push({
          id: recId,
          grn_no: docNo,
          invoice_no: docNo,
          vendor_id: null,
          vendor_name: q.party_name || 'Vendor',
          party_name: q.party_name || 'Vendor',
          warehouse_id: q.warehouse_id || 'w1',
          status: q.status === 'APPROVED' ? 'POSTED' : q.status === 'REJECTED' ? 'REJECTED' : 'PENDING_APPROVAL',
          received_date: q.created_at ? q.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          document_date: q.created_at ? q.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          due_date: q.created_at ? q.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          subtotal: q.amount || 0,
          total_amount: q.amount || 0,
          discount_total: 0,
          tax_total: 0,
          notes: q.items_summary || '',
          created_at: q.created_at || new Date().toISOString(),
          items: [],
        });
        existingPINos.add(docNo);
        existingPINos.add(recId);
      }
    }
  }
  state.purchaseInvoices = newPIs;

  // 2. Reconcile missing Sales Invoices
  const existingInvNos = new Set<string>();
  for (const i of state.invoices || []) {
    if (i.id) existingInvNos.add(i.id);
    if (i.invoice_no) existingInvNos.add(i.invoice_no);
  }
  const newInvoices = [...(state.invoices || [])];

  for (const q of state.approvalQueue) {
    const isSale =
      q.entity_type === 'sales_invoice' ||
      (q.module === 'Sales' &&
        q.entity_type !== 'sales_return' &&
        q.entity_type !== 'customer_receipt' &&
        !q.record_no?.startsWith('SR-') &&
        !q.record_no?.startsWith('CR-')) ||
      (q.record_no && (q.record_no.startsWith('SL-') || q.record_no.startsWith('INV-')));

    if (isSale) {
      const docNo = q.record_no;
      const recId = q.record_id || q.entity_id || q.id;
      if (
        docNo &&
        !existingInvNos.has(docNo) &&
        !existingInvNos.has(recId) &&
        !deletedSet.has(recId)
      ) {
        newInvoices.push({
          id: recId,
          invoice_no: docNo,
          customer_id: null,
          customer_name: q.party_name || 'Customer',
          party_name: q.party_name || 'Customer',
          warehouse_id: q.warehouse_id || 'w1',
          status: q.status === 'APPROVED' ? 'POSTED' : q.status === 'REJECTED' ? 'REJECTED' : 'PENDING_APPROVAL',
          invoice_date: q.created_at ? q.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          due_date: q.created_at ? q.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          subtotal: q.amount || 0,
          total_amount: q.amount || 0,
          discount_total: 0,
          tax_total: 0,
          notes: q.items_summary || '',
          created_at: q.created_at || new Date().toISOString(),
          items: [],
        });
        existingInvNos.add(docNo);
        existingInvNos.add(recId);
      }
    }
  }
  state.invoices = newInvoices;

  // ─── Status reconciliation pass ──────────────────────────────────────
  // After merging, fix any document whose approval-queue status has
  // advanced (APPROVED / REJECTED) but whose stored status is still stale
  // (e.g. PENDING_APPROVAL coming from an older cloud snapshot).
  // This is the root cause of "approved in Approval Center but still
  // showing Pending in Purchase/Sales register".

  // Build fast lookup: record_id → queue item (prefer APPROVED over REJECTED)
  const queueByRecordId = new Map<string, any>();
  const queueByRecordNo = new Map<string, any>();
  for (const q of state.approvalQueue || []) {
    if (q.record_id) {
      const existing = queueByRecordId.get(q.record_id);
      if (!existing || q.status === 'APPROVED') queueByRecordId.set(q.record_id, q);
    }
    if (q.record_no) {
      const existing = queueByRecordNo.get(q.record_no);
      if (!existing || q.status === 'APPROVED') queueByRecordNo.set(q.record_no, q);
    }
  }

  const resolveStatus = (queueItem: any): string | null => {
    if (!queueItem) return null;
    if (queueItem.status === 'APPROVED') return 'POSTED';
    if (queueItem.status === 'REJECTED') return 'REJECTED';
    return null; // PENDING — leave the document status unchanged
  };

  // Reconcile purchase invoices
  if (state.purchaseInvoices?.length) {
    state.purchaseInvoices = state.purchaseInvoices.map((pi: any) => {
      const q =
        queueByRecordId.get(pi.id) ||
        queueByRecordNo.get(pi.grn_no) ||
        queueByRecordNo.get(pi.invoice_no);
      const reconciled = resolveStatus(q);
      if (!reconciled) return pi;
      if (pi.status === reconciled) return pi;
      // Only override stale statuses — never downgrade an already-POSTED record
      if (pi.status === 'POSTED' && reconciled !== 'POSTED') return pi;
      return { ...pi, status: reconciled };
    });
  }

  // Reconcile sales invoices
  if (state.invoices?.length) {
    state.invoices = state.invoices.map((inv: any) => {
      const q =
        queueByRecordId.get(inv.id) ||
        queueByRecordNo.get(inv.invoice_no);
      const reconciled = resolveStatus(q);
      if (!reconciled) return inv;
      if (inv.status === reconciled) return inv;
      if (inv.status === 'POSTED' && reconciled !== 'POSTED') return inv;
      return { ...inv, status: reconciled };
    });
  }

  // Reconcile vendor bills
  if (state.vendorBills?.length) {
    state.vendorBills = state.vendorBills.map((vb: any) => {
      const q =
        queueByRecordId.get(vb.id) ||
        queueByRecordNo.get(vb.bill_no);
      const reconciled = resolveStatus(q);
      if (!reconciled) return vb;
      if (vb.status === reconciled) return vb;
      if (vb.status === 'POSTED' && reconciled !== 'POSTED') return vb;
      return { ...vb, status: reconciled };
    });
  }

  return state;
}

/**
 * Pushes the current active Zustand store state into Supabase tables & cloud snapshot.
 * Performs a smart pre-merge with any concurrent remote changes to guarantee no data loss.
 */
// Sync lock to prevent concurrent push/pull operations from racing
let _syncLock = false;
async function acquireSyncLock(): Promise<boolean> {
  if (_syncLock) return false;
  _syncLock = true;
  return true;
}
function releaseSyncLock() {
  _syncLock = false;
}

export async function pushStateToSupabase(): Promise<CloudSyncResult> {
  // Acquire lock – skip if another sync is in progress
  if (!(await acquireSyncLock())) {
    return { success: true, message: 'Sync already in progress, skipped.' };
  }

  try {
    let state = useDataStore.getState();
    const errors: string[] = [];
    let isRls = false;

    // 0. Pre-merge remote snapshot to prevent overwriting concurrent records added by other devices
    try {
      const { data: remoteSnap } = await supabase
        .from('cloud_sync_state')
        .select('state_json')
        .eq('id', 'primary_state')
        .maybeSingle();

      if (remoteSnap?.state_json) {
        console.log('[SYNC-DEBUG] PUSH pre-merge: local invoices=', state.invoices?.length, 'remote invoices=', remoteSnap.state_json?.invoices?.length);
        const merged = mergeStores(state, remoteSnap.state_json);
        console.log('[SYNC-DEBUG] PUSH post-merge: merged invoices=', merged.invoices?.length);
        syncEngine.isReceivingRemote = true;
        useDataStore.setState(merged);
        state = useDataStore.getState();
        setTimeout(() => {
          syncEngine.isReceivingRemote = false;
        }, 1500);
      }
    } catch {
      // Continue with push of current store state
    }

    // 1. Primary Sync: Push complete JSON snapshot into cloud_sync_state
    try {
      const { error: snapshotErr } = await supabase.from('cloud_sync_state').upsert(
        {
          id: 'primary_state',
          org_id: state.organizations?.[0]?.id || 'primary_org',
          state_json: state,
          updated_at: new Date().toISOString(),
          version: 'v1.1',
        },
        { onConflict: 'id' }
      );
      if (snapshotErr) {
        if (snapshotErr.code === '42501' || snapshotErr.message?.includes('row-level security')) {
          isRls = true;
        } else {
          errors.push(`Cloud Snapshot: ${snapshotErr.message}`);
        }
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === '42501' || err.message?.includes('row-level security')) {
        isRls = true;
      }
    }

    // Clean up deleted records in individual Supabase tables
    if (state.deletedRecordIds && state.deletedRecordIds.length > 0) {
      const validDelUuids = state.deletedRecordIds.filter((id: string) => isValidUUID(id));
      if (validDelUuids.length > 0) {
        try {
          await Promise.allSettled([
            supabase.from('warehouses').delete().in('id', validDelUuids),
            supabase.from('customers').delete().in('id', validDelUuids),
            supabase.from('vendors').delete().in('id', validDelUuids),
            supabase.from('products').delete().in('id', validDelUuids),
            supabase.from('categories').delete().in('id', validDelUuids),
            supabase.from('departments').delete().in('id', validDelUuids),
            supabase.from('branches').delete().in('id', validDelUuids),
          ]);
        } catch {
          // ignore error if table does not support delete or RLS
        }
      }
    }

    // 2. Sync Organizations
    if (state.organizations?.length > 0) {
      const orgRows = state.organizations.map((org) => ({
        id: toValidUuid(org.id),
        name: org.name,
        legal_name: org.legal_name || org.name,
        currency: org.currency || 'PKR',
        address: org.address || null,
        phone: org.phone || null,
        email: org.email || null,
        tax_id: org.tax_id || null,
      }));
      const { error } = await supabase.from('organizations').upsert(orgRows, { onConflict: 'id' });
      if (error && (error.code === '42501' || error.message.includes('row-level security'))) isRls = true;
    }

    // 3. Sync Branches
    let validBranchIds = new Set<string>();
    if (state.branches?.length > 0) {
      const branchRows = state.branches.map((b) => ({
        id: toValidUuid(b.id),
        org_id: b.org_id ? toValidUuid(b.org_id) : (state.organizations?.[0]?.id ? toValidUuid(state.organizations[0].id) : null),
        name: b.name,
        code: b.code || `BR-${b.id.slice(0, 4)}`,
        address: b.address || null,
      }));
      const { error } = await supabase.from('branches').upsert(branchRows, { onConflict: 'id' });
      if (error && (error.code === '42501' || error.message.includes('row-level security'))) isRls = true;
    }

    // Fetch existing branches to ensure valid foreign keys for warehouses
    try {
      const { data: existingBranches } = await supabase.from('branches').select('id');
      if (existingBranches) {
        validBranchIds = new Set(existingBranches.map((b) => b.id));
      }
    } catch {
      // ignore
    }

    // 4. Sync Warehouses (onConflict: 'code', safe foreign key branch_id)
    if (state.warehouses?.length > 0) {
      const whRows = state.warehouses.map((w) => {
        const candidateBranchId = w.branch_id ? toValidUuid(w.branch_id) : null;
        const safeBranchId = candidateBranchId && validBranchIds.has(candidateBranchId) ? candidateBranchId : null;
        return {
          id: toValidUuid(w.id),
          code: w.code || `WH-${w.id.slice(0, 4)}`,
          name: w.name,
          branch_id: safeBranchId,
          address: w.address || null,
          is_active: w.is_active ?? true,
        };
      });
      const { error } = await supabase.from('warehouses').upsert(whRows, { onConflict: 'code' });
      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) isRls = true;
        else errors.push(`Warehouses: ${error.message}`);
      }
    }

    // 5. Sync Chart of Accounts (2-pass self-referencing foreign key safe resolution)
    if (state.chartOfAccounts?.length > 0) {
      // Pass 1: Upsert all accounts with parent_id: null to prevent foreign key violations
      const coaPass1 = state.chartOfAccounts.map((coa) => ({
        code: coa.code,
        name: coa.name,
        account_type: coa.account_type || 'Asset',
        account_category: coa.account_category || coa.account_type || 'Asset',
        parent_id: null,
        is_control_account: coa.is_control_account ?? false,
        is_active: coa.is_active ?? true,
      }));
      const { error: coaErr1 } = await supabase.from('chart_of_accounts').upsert(coaPass1, { onConflict: 'code' });
      if (coaErr1) {
        if (coaErr1.code === '42501' || coaErr1.message.includes('row-level security')) isRls = true;
        else errors.push(`Chart of Accounts: ${coaErr1.message}`);
      } else {
        // Pass 2: Resolve parent UUIDs and update parent_id hierarchy
        try {
          const { data: dbCOA } = await supabase.from('chart_of_accounts').select('id, code');
          if (dbCOA && dbCOA.length > 0) {
            const codeToUuidMap = new Map<string, string>(dbCOA.map((a) => [a.code, a.id]));
            const localIdToCodeMap = new Map<string, string>(state.chartOfAccounts.map((a) => [a.id, a.code]));

            const coaPass2 = state.chartOfAccounts
              .filter((coa) => !!coa.parent_id)
              .map((coa) => {
                const parentCode = localIdToCodeMap.get(coa.parent_id!) || coa.parent_id!;
                const resolvedParentUuid = codeToUuidMap.get(parentCode) || (codeToUuidMap.has(coa.parent_id!) ? codeToUuidMap.get(coa.parent_id!) : null);
                return {
                  code: coa.code,
                  name: coa.name,
                  parent_id: resolvedParentUuid || null,
                };
              })
              .filter((c) => !!c.parent_id);

            if (coaPass2.length > 0) {
              await supabase.from('chart_of_accounts').upsert(coaPass2, { onConflict: 'code' });
            }
          }
        } catch {
          // Pass 1 already succeeded, pass 2 is hierarchy linking
        }
      }
    }

    // 6. Sync Categories
    if (state.categories?.length > 0) {
      const catRows = state.categories.map((c) => ({
        id: toValidUuid(c.id),
        name: c.name,
        description: c.description || null,
        is_active: c.is_active ?? true,
      }));
      const { error } = await supabase.from('categories').upsert(catRows, { onConflict: 'id' });
      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) isRls = true;
        else errors.push(`Categories: ${error.message}`);
      }
    }

    // 7. Sync Customers (onConflict: 'code')
    if (state.customers?.length > 0) {
      const custRows = state.customers.map((c) => ({
        id: toValidUuid(c.id),
        code: c.code || `CUST-${c.id.slice(0, 4)}`,
        name: c.name,
        contact_person: c.contact_person || c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        city: c.city || null,
        credit_limit: c.credit_limit || 0,
        opening_balance: c.opening_balance || 0,
        tax_id: c.tax_id || null,
        is_active: c.is_active ?? true,
      }));
      const { error } = await supabase.from('customers').upsert(custRows, { onConflict: 'id' });
      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) isRls = true;
        else errors.push(`Customers: ${error.message}`);
      }
    }

    // 8. Sync Vendors (onConflict: 'code')
    if (state.vendors?.length > 0) {
      const vendRows = state.vendors.map((v) => ({
        id: toValidUuid(v.id),
        code: v.code || `VEND-${v.id.slice(0, 4)}`,
        name: v.name,
        contact_person: v.contact_person || v.name,
        phone: v.phone || null,
        email: v.email || null,
        address: v.address || null,
        city: v.city || null,
        credit_limit: v.credit_limit || 0,
        opening_balance: v.opening_balance || 0,
        tax_id: v.tax_id || null,
        is_active: v.is_active ?? true,
      }));
      const { error } = await supabase.from('vendors').upsert(vendRows, { onConflict: 'id' });
      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) isRls = true;
        else errors.push(`Vendors: ${error.message}`);
      }
    }

    // 9. Sync Products (onConflict: 'code')
    if (state.products?.length > 0) {
      const prodRows = state.products.map((p) => ({
        id: toValidUuid(p.id),
        code: p.code || `PROD-${p.id.slice(0, 4)}`,
        name: p.name,
        category: p.category || 'Uncategorized',
        unit: p.unit || 'PCS',
        length: p.length || 0,
        width: p.width || 0,
        purchase_price: p.purchase_price || 0,
        sale_price: p.sale_price || 0,
        reorder_level: p.reorder_level || 0,
        track_batches: p.track_batches ?? false,
        track_serials: p.track_serials ?? false,
        is_active: p.is_active ?? true,
        article_name: p.article_name || null,
      }));
      const { error } = await supabase.from('products').upsert(prodRows, { onConflict: 'id' });
      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) isRls = true;
        else errors.push(`Products: ${error.message}`);
      }
    }

    // 10. Sync Sales Invoices (Safe foreign key mapping for unlimited party types)
    if (state.invoices?.length > 0) {
      let validCustIds = new Set<string>();
      try {
        const { data: dbCusts } = await supabase.from('customers').select('id');
        if (dbCusts) validCustIds = new Set(dbCusts.map((c) => c.id));
      } catch {
        // ignore
      }

      const invRows = state.invoices.map((inv) => {
        const rawCustId = toValidUuid(inv.customer_id);
        const safeCustId = validCustIds.size === 0 || validCustIds.has(rawCustId) ? rawCustId : null;
        return {
          id: toValidUuid(inv.id),
          invoice_no: inv.invoice_no,
          customer_id: safeCustId,
          warehouse_id: inv.warehouse_id ? toValidUuid(inv.warehouse_id) : null,
          invoice_date: inv.invoice_date || new Date().toISOString().slice(0, 10),
          status: inv.status || 'UNPOSTED',
          total_amount: inv.total_amount || 0,
          gate_pass_no: inv.gate_pass_no || null,
        };
      });
      const { error } = await supabase.from('sales_invoices').upsert(invRows, { onConflict: 'invoice_no' });
      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) isRls = true;
        else errors.push(`Sales Invoices: ${error.message}`);
      }
    }

    // 11. Sync Approval Queue (if table exists)
    if (state.approvalQueue?.length > 0) {
      try {
        const queueRows = state.approvalQueue.map((q) => ({
          id: toValidUuid(q.id),
          record_id: q.record_id || null,
          record_no: q.record_no || null,
          module: q.module || 'Sales',
          entity_type: q.entity_type || 'sales_invoice',
          requested_by: q.requested_by || 'admin',
          amount: q.amount || 0,
          status: q.status || 'PENDING',
          party_name: q.party_name || null,
          warehouse_id: q.warehouse_id || null,
          items_summary: q.items_summary || null,
          review_note: q.review_note || null,
          reviewed_by: q.reviewed_by || null,
          reviewed_at: q.reviewed_at || null,
          created_at: q.created_at || new Date().toISOString(),
        }));
        await supabase.from('approval_queue').upsert(queueRows, { onConflict: 'id' });
      } catch {
        // Table might be optional
      }
    }

    // Clean up deleted records in Supabase tables
    if (state.deletedRecordIds && state.deletedRecordIds.length > 0) {
      try {
        const delList = state.deletedRecordIds.slice(0, 100);
        await supabase.from('sales_invoices').delete().in('invoice_no', delList);
        await supabase.from('approval_queue').delete().in('record_no', delList);
      } catch {
        // ignore
      }
    }

    // If RLS blocked the operation, return informative RLS error
    if (isRls) {
      return {
        success: false,
        isRlsError: true,
        message: 'Supabase Row-Level Security (RLS) policy rejected write access. Please click "Fix Cloud Permissions" in Maintenance to run the 1-click SQL fix in Supabase.',
      };
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `Partial push failure: ${errors.slice(0, 2).join('; ')}`,
      };
    }

    return {
      success: true,
      message: 'Store state successfully pushed to Supabase Cloud Database!',
      counts: {
        products: state.products?.length || 0,
        customers: state.customers?.length || 0,
        vendors: state.vendors?.length || 0,
        users: state.users?.length || 0,
        categories: state.categories?.length || 0,
        warehouses: state.warehouses?.length || 0,
        invoices: state.invoices?.length || 0,
        approvalQueue: state.approvalQueue?.length || 0,
        salesReturns: state.salesReturns?.length || 0,
        purchaseReturns: state.purchaseReturns?.length || 0,
        chartOfAccounts: state.chartOfAccounts?.length || 0,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isRls = msg.includes('42501') || msg.includes('row-level security');
    return {
      success: false,
      isRlsError: isRls,
      message: isRls
        ? 'Supabase Row-Level Security (RLS) is blocking writes. Please run the SQL fix in Supabase Dashboard.'
        : `Failed to push to Supabase: ${msg}`,
    };
  } finally {
    releaseSyncLock();
  }
}

/**
 * Pulls latest records from Supabase tables, smartly merges with active store,
 * and populates the Zustand store without triggering an immediate push echo loop.
 */
export async function pullStateFromSupabase(): Promise<CloudSyncResult> {
  // Acquire lock – skip if another sync is in progress
  if (!(await acquireSyncLock())) {
    return { success: true, message: 'Sync already in progress, skipped.' };
  }

  try {
    const store = useDataStore.getState();

    // 1. Check if cloud snapshot exists in cloud_sync_state
    try {
      const { data: snapshotData, error: snapErr } = await supabase
        .from('cloud_sync_state')
        .select('state_json')
        .eq('id', 'primary_state')
        .maybeSingle();

      if (!snapErr && snapshotData?.state_json) {
        const cloudState = snapshotData.state_json;
        if (cloudState.products || cloudState.customers || cloudState.invoices || cloudState.organizations) {
          // Smart union merge with current active store state
          syncEngine.isReceivingRemote = true;
          console.log('[SYNC-DEBUG] PULL merge: local invoices=', store.invoices?.length, 'cloud invoices=', cloudState.invoices?.length);
          const merged = mergeStores(store, cloudState);
          console.log('[SYNC-DEBUG] PULL post-merge: merged invoices=', merged.invoices?.length);
          useDataStore.setState(merged);

          setTimeout(() => {
            syncEngine.isReceivingRemote = false;
            setSyncStatus('synced');
          }, 1500);

          return {
            success: true,
            message: 'Successfully pulled and merged system snapshot from Supabase Cloud!',
            counts: {
              products: merged.products?.length || 0,
              customers: merged.customers?.length || 0,
              vendors: merged.vendors?.length || 0,
              invoices: merged.invoices?.length || 0,
              approvalQueue: merged.approvalQueue?.length || 0,
              salesReturns: merged.salesReturns?.length || 0,
              purchaseReturns: merged.purchaseReturns?.length || 0,
            },
          };
        }
      }
    } catch {
      // Fallback to table-by-table sync below
    }

    const deletedFallbackSet = new Set<string>((store.deletedRecordIds || []).filter((id: string) => isValidUUID(id)));

    // 2. Fetch Products
    const { data: prods } = await supabase.from('products').select('*');
    if (prods && prods.length > 0) {
      prods.forEach((p: Product) => {
        if (deletedFallbackSet.has(p.id)) return;
        const existing = store.products?.find((ep) => ep.id === p.id || ep.code === p.code);
        if (existing) {
          store.updateProduct(existing.id, { ...existing, ...p });
        } else {
          store.addProduct(p);
        }
      });
    }

    // 3. Fetch Customers
    const { data: custs } = await supabase.from('customers').select('*');
    if (custs && custs.length > 0) {
      custs.forEach((c: Customer) => {
        if (deletedFallbackSet.has(c.id)) return;
        const existing = store.customers?.find((ec) => ec.id === c.id || ec.code === c.code);
        if (existing) {
          store.updateCustomer(existing.id, { ...existing, ...c });
        } else {
          store.addCustomer(c);
        }
      });
    }

    // 4. Fetch Vendors
    const { data: vends } = await supabase.from('vendors').select('*');
    if (vends && vends.length > 0) {
      vends.forEach((v: Vendor) => {
        if (deletedFallbackSet.has(v.id)) return;
        const existing = store.vendors?.find((ev) => ev.id === v.id || ev.code === v.code);
        if (existing) {
          store.updateVendor(existing.id, { ...existing, ...v });
        } else {
          store.addVendor(v);
        }
      });
    }

    // 5. Fetch Categories
    const { data: cats } = await supabase.from('categories').select('*');
    if (cats && cats.length > 0) {
      cats.forEach((cat: Category) => {
        if (deletedFallbackSet.has(cat.id)) return;
        const existing = store.categories?.find((ec) => ec.id === cat.id || ec.name === cat.name);
        if (existing) {
          store.updateCategory(existing.id, { ...existing, ...cat });
        } else {
          store.addCategory(cat);
        }
      });
    }

    // 6. Fetch Warehouses
    const { data: whs } = await supabase.from('warehouses').select('*');
    if (whs && whs.length > 0) {
      whs.forEach((wh: Warehouse) => {
        if (deletedFallbackSet.has(wh.id)) return;
        const existing = store.warehouses?.find((ewh) => ewh.id === wh.id || ewh.code === wh.code);
        if (existing) {
          store.updateWarehouse(existing.id, { ...existing, ...wh });
        } else {
          store.addWarehouse(wh);
        }
      });
    }

    return {
      success: true,
      message: 'Successfully pulled latest normalized tables from Supabase Cloud!',
      counts: {
        products: prods?.length || 0,
        customers: custs?.length || 0,
        vendors: vends?.length || 0,
        categories: cats?.length || 0,
        warehouses: whs?.length || 0,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Failed to pull from Supabase: ${msg}`,
    };
  } finally {
    releaseSyncLock();
  }
}

// =========================================================================
// REAL-TIME AUTO CLOUD SYNC ENGINE
// =========================================================================

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface SyncEngineState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  lastLocalPushTime: number;
  isReceivingRemote: boolean;
  listeners: Set<(status: SyncStatus, lastSyncedAt: Date | null) => void>;
}

const syncEngine: SyncEngineState = {
  status: 'synced',
  lastSyncedAt: null,
  lastLocalPushTime: 0,
  isReceivingRemote: false,
  listeners: new Set(),
};

function notifySyncListeners() {
  syncEngine.listeners.forEach((fn) => fn(syncEngine.status, syncEngine.lastSyncedAt));
}

function setSyncStatus(status: SyncStatus) {
  syncEngine.status = status;
  if (status === 'synced') {
    syncEngine.lastSyncedAt = new Date();
  }
  notifySyncListeners();
}

/**
 * Hook to subscribe to real-time sync status in React components.
 */
import { useEffect, useState } from 'react';

export function useCloudSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(syncEngine.status);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(syncEngine.lastSyncedAt);

  useEffect(() => {
    const handler = (newStatus: SyncStatus, newTime: Date | null) => {
      setStatus(newStatus);
      setLastSyncedAt(newTime);
    };
    syncEngine.listeners.add(handler);
    return () => {
      syncEngine.listeners.delete(handler);
    };
  }, []);

  return { status, lastSyncedAt, triggerManualSync: pushStateToSupabase };
}

let isEngineInitialized = false;
let pushDebounceTimer: NodeJS.Timeout | null = null;

/**
 * Initializes continuous automatic real-time cloud synchronization.
 * - Pushes any local changes to Supabase Cloud automatically (debounced).
 * - Subscribes to Supabase Realtime so changes made on other devices arrive immediately.
 * - Pulls latest state on startup, window focus, and periodic interval.
 */
export function initAutoCloudSync() {
  if (isEngineInitialized || typeof window === 'undefined') return;
  isEngineInitialized = true;

  // 1. Initial Pull on Startup
  pullStateFromSupabase()
    .then((res) => {
      if (res.success) {
        setSyncStatus('synced');
      } else {
        // If snapshot wasn't there yet, push initial store to create it
        pushStateToSupabase().then(() => setSyncStatus('synced')).catch(() => setSyncStatus('offline'));
      }
    })
    .catch(() => {
      setSyncStatus('offline');
    });

  // 2. Real-time Subscription via Supabase Channels (Instant multi-device sync)
  try {
    supabase
      .channel('cloud_sync_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cloud_sync_state' },
        (payload) => {
          if (payload.new && (payload.new as any).state_json) {
            // Skip if a sync operation is already in progress
            if (_syncLock) return;

            const incomingState = (payload.new as any).state_json;
            const incomingUpdated = new Date((payload.new as any).updated_at || 0).getTime();

            // Only apply if incoming state is newer than our last push (prevents echo loops)
            if (incomingUpdated > syncEngine.lastLocalPushTime + 500) {
              syncEngine.isReceivingRemote = true;
              setSyncStatus('syncing');

              // Smartly merge remote state into local Zustand store
              const currentStore = useDataStore.getState();
              console.log('[SYNC-DEBUG] REALTIME merge: local invoices=', currentStore.invoices?.length, 'incoming invoices=', incomingState.invoices?.length);
              const merged = mergeStores(currentStore, incomingState);
              console.log('[SYNC-DEBUG] REALTIME post-merge: merged invoices=', merged.invoices?.length);
              useDataStore.setState(merged);

              setTimeout(() => {
                syncEngine.isReceivingRemote = false;
                setSyncStatus('synced');
              }, 1500);
            }
          }
        }
      )
      .subscribe();
  } catch {
    // Realtime channel fallback
  }

  // 3. Auto-Push Local Store Changes to Supabase (Debounced)
  useDataStore.subscribe((state) => {
    // Skip auto-push if this mutation came from a remote incoming sync
    if (syncEngine.isReceivingRemote) return;

    if (pushDebounceTimer) {
      clearTimeout(pushDebounceTimer);
    }

    setSyncStatus('syncing');

    pushDebounceTimer = setTimeout(async () => {
      try {
        syncEngine.lastLocalPushTime = Date.now();
        const res = await pushStateToSupabase();
        if (res.success) {
          setSyncStatus('synced');
        } else if (res.isRlsError) {
          setSyncStatus('error');
        } else {
          setSyncStatus('offline');
        }
      } catch {
        setSyncStatus('offline');
      }
    }, 2500);
  });

  // 4. Window Focus & Online Event Sync (Ensures sync when user switches tabs/devices)
  window.addEventListener('focus', () => {
    if (!syncEngine.isReceivingRemote) {
      pullStateFromSupabase().then((res) => {
        if (res.success) setSyncStatus('synced');
      });
    }
  });

  window.addEventListener('online', () => {
    setSyncStatus('syncing');
    pushStateToSupabase().then(() => setSyncStatus('synced')).catch(() => setSyncStatus('offline'));
  });

  window.addEventListener('offline', () => {
    setSyncStatus('offline');
  });

  // 5. Background Heartbeat Poll (Every 30 seconds for guaranteed multi-device consistency)
  setInterval(async () => {
    if (!syncEngine.isReceivingRemote && navigator.onLine) {
      try {
        const { data } = await supabase
          .from('cloud_sync_state')
          .select('updated_at')
          .eq('id', 'primary_state')
          .maybeSingle();

        if (data?.updated_at) {
          const cloudTime = new Date(data.updated_at).getTime();
          if (cloudTime > syncEngine.lastLocalPushTime + 1000) {
            const res = await pullStateFromSupabase();
            if (res.success) setSyncStatus('synced');
          }
        }
      } catch {
        // Ignore background polling errors
      }
    }
  }, 30000);
}
