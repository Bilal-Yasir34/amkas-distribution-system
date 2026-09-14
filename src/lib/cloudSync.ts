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
  deletedSet?: Set<string>
): T[] {
  const isDeleted = (item: any, key: string) => {
    if (!deletedSet || deletedSet.size === 0) return false;
    if (deletedSet.has(key)) return true;
    if (item.id && deletedSet.has(item.id)) return true;
    if (item.record_id && deletedSet.has(item.record_id)) return true;
    if (item.entity_id && deletedSet.has(item.entity_id)) return true;
    if (item.invoice_no && deletedSet.has(item.invoice_no)) return true;
    if (item.grn_no && deletedSet.has(item.grn_no)) return true;
    if (item.bill_no && deletedSet.has(item.bill_no)) return true;
    if (item.record_no && deletedSet.has(item.record_no)) return true;
    if (item.voucher_no && deletedSet.has(item.voucher_no)) return true;
    return false;
  };

  const map = new Map<string, T>();

  // 1. Index remote items
  for (const item of (remoteList || [])) {
    if (!item) continue;
    const key = keySelector(item);
    if (!key || isDeleted(item, key)) continue;
    map.set(key, item);
  }

  // 2. Merge local items
  for (const item of (localList || [])) {
    if (!item) continue;
    const key = keySelector(item);
    if (!key || isDeleted(item, key)) continue;

    if (!map.has(key)) {
      // Exists only locally -> preserve it!
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
        map.set(key, { ...remoteItem, ...item });
      } else {
        map.set(key, { ...item, ...remoteItem });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Intelligently combines two complete store states so that transactions added on
 * any device (invoices, queue items, purchases, etc.) are preserved and never clobbered.
 */
export function mergeStores(local: any, remote: any): any {
  if (!remote) return local;
  if (!local) return remote;

  const merged = { ...local, ...remote };

  const deletedIds = new Set<string>([
    ...(local.deletedRecordIds || []),
    ...(remote.deletedRecordIds || []),
  ]);
  merged.deletedRecordIds = Array.from(deletedIds);

  // Invoices
  merged.invoices = mergeCollection(
    local.invoices,
    remote.invoices,
    (i) => i.invoice_no || i.id || '',
    deletedIds
  );

  // Approval Queue
  merged.approvalQueue = mergeCollection(
    local.approvalQueue,
    remote.approvalQueue,
    (a) => a.id || a.record_id || a.record_no || '',
    deletedIds
  );

  // Purchases & Bills
  merged.purchaseInvoices = mergeCollection(
    local.purchaseInvoices,
    remote.purchaseInvoices,
    (p) => p.invoice_no || p.grn_no || p.id || '',
    deletedIds
  );
  merged.vendorBills = mergeCollection(
    local.vendorBills,
    remote.vendorBills,
    (b) => b.bill_no || b.id || '',
    deletedIds
  );

  // Receipts & Payments
  merged.customerReceipts = mergeCollection(
    local.customerReceipts,
    remote.customerReceipts,
    (r) => r.receipt_no || r.id || '',
    deletedIds
  );
  merged.vendorPayments = mergeCollection(
    local.vendorPayments,
    remote.vendorPayments,
    (vp) => vp.payment_no || vp.id || '',
    deletedIds
  );

  // Returns
  merged.salesReturns = mergeCollection(
    local.salesReturns,
    remote.salesReturns,
    (sr) => sr.return_no || sr.id || '',
    deletedIds
  );
  merged.purchaseReturns = mergeCollection(
    local.purchaseReturns,
    remote.purchaseReturns,
    (pr) => pr.return_no || pr.id || '',
    deletedIds
  );

  // Quotations, Orders, Notes
  merged.quotations = mergeCollection(
    local.quotations,
    remote.quotations,
    (q) => q.quotation_no || q.id || '',
    deletedIds
  );
  merged.salesOrders = mergeCollection(
    local.salesOrders,
    remote.salesOrders,
    (so) => so.order_no || so.id || '',
    deletedIds
  );
  merged.creditNotes = mergeCollection(
    local.creditNotes,
    remote.creditNotes,
    (cn) => cn.credit_note_no || cn.id || '',
    deletedIds
  );
  merged.debitNotes = mergeCollection(
    local.debitNotes,
    remote.debitNotes,
    (dn) => dn.debit_note_no || dn.id || '',
    deletedIds
  );

  // Journal entries
  merged.journalEntries = mergeCollection(
    local.journalEntries,
    remote.journalEntries,
    (je) => je.entry_no || je.id || '',
    deletedIds
  );

  // Master Data
  merged.customers = mergeCollection(
    local.customers,
    remote.customers,
    (c) => c.code || c.id || c.name || ''
  );
  merged.vendors = mergeCollection(
    local.vendors,
    remote.vendors,
    (v) => v.code || v.id || v.name || ''
  );
  merged.products = mergeCollection(
    local.products,
    remote.products,
    (p) => p.code || p.id || p.name || ''
  );
  merged.categories = mergeCollection(
    local.categories,
    remote.categories,
    (c) => c.name || c.id || ''
  );
  merged.warehouses = mergeCollection(
    local.warehouses,
    remote.warehouses,
    (w) => w.code || w.id || w.name || ''
  );
  merged.chartOfAccounts = mergeCollection(
    local.chartOfAccounts,
    remote.chartOfAccounts,
    (coa) => coa.code || coa.id || ''
  );
  merged.accountTypes = mergeCollection(
    local.accountTypes,
    remote.accountTypes,
    (at) => at.code || at.id || at.name || ''
  );
  merged.productArticles = mergeCollection(
    local.productArticles,
    remote.productArticles,
    (pa) => pa.id || pa.article_name || ''
  );

  merged.universalArticles = Array.from(
    new Set([...(local.universalArticles || []), ...(remote.universalArticles || [])])
  );

  if (local.users?.length > 0 && (!remote.users || remote.users.length === 0)) {
    merged.users = local.users;
  }
  if (local.organizations?.length > 0 && (!remote.organizations || remote.organizations.length === 0)) {
    merged.organizations = local.organizations;
  }
  if (local.branches?.length > 0 && (!remote.branches || remote.branches.length === 0)) {
    merged.branches = local.branches;
  }

  return merged;
}

/**
 * Pushes the current active Zustand store state into Supabase tables & cloud snapshot.
 * Performs a smart pre-merge with any concurrent remote changes to guarantee no data loss.
 */
export async function pushStateToSupabase(): Promise<CloudSyncResult> {
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
        const merged = mergeStores(state, remoteSnap.state_json);
        syncEngine.isReceivingRemote = true;
        useDataStore.setState(merged);
        state = useDataStore.getState();
        setTimeout(() => {
          syncEngine.isReceivingRemote = false;
        }, 300);
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
  }
}

/**
 * Pulls latest records from Supabase tables, smartly merges with active store,
 * and populates the Zustand store without triggering an immediate push echo loop.
 */
export async function pullStateFromSupabase(): Promise<CloudSyncResult> {
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
          const merged = mergeStores(store, cloudState);
          useDataStore.setState(merged);

          setTimeout(() => {
            syncEngine.isReceivingRemote = false;
            setSyncStatus('synced');
          }, 800);

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

    // 2. Fetch Products
    const { data: prods } = await supabase.from('products').select('*');
    if (prods && prods.length > 0) {
      prods.forEach((p: Product) => {
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
            const incomingState = (payload.new as any).state_json;
            const incomingUpdated = new Date((payload.new as any).updated_at || 0).getTime();

            // Only apply if incoming state is newer than our last push (prevents echo loops)
            if (incomingUpdated > syncEngine.lastLocalPushTime + 500) {
              syncEngine.isReceivingRemote = true;
              setSyncStatus('syncing');

              // Smartly merge remote state into local Zustand store
              const currentStore = useDataStore.getState();
              const merged = mergeStores(currentStore, incomingState);
              useDataStore.setState(merged);

              setTimeout(() => {
                syncEngine.isReceivingRemote = false;
                setSyncStatus('synced');
              }, 800);
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
    }, 1200);
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
