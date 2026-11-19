import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TABLES } from './supabase';
import { QUERY_KEYS } from './queryKeys';
import { ROLE_MODULES, type ModuleKey, type Role } from './rbac';
import { useErpMutations } from './services';
import { deleteRowById, invalidateTableAndRelated } from './services/dbHelpers';
import type {
  AccountLedgerItem,
  AccountTypeItem,
  ApprovalQueueItem,
  AuditLog,
  BankAccount,
  BankStatement,
  Branch,
  Category,
  ChartOfAccount,
  ControlAccountMapping,
  CreditNote,
  Customer,
  CustomerReceipt,
  DebitNote,
  Department,
  DocumentSequence,
  ExpenseRecord,
  FinancialYear,
  IncomeRecord,
  JournalEntry,
  LoginLog,
  ModulePermission,
  Organization,
  Product,
  ProductArticle,
  ProductBatch,
  ProductSerial,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseOrder,
  PurchaseRequest,
  PurchaseReturn,
  Quotation,
  SalesCommission,
  SalesInvoice,
  SalesInvoiceItem,
  SalesOrder,
  SalesReturn,
  StockAdjustment,
  StockLedgerEntry,
  StockTransfer,
  UserEmployee,
  Vendor,
  VendorBill,
  VendorPayment,
  Warehouse,
} from './types';

async function fetchTableRows<T>(
  table: string,
  orderBy?: { column: string; ascending?: boolean }
): Promise<T[]> {
  let query = supabase.from(table).select('*');
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
  }
  const { data, error } = await query;
  if (error) {
    if (error.code === 'PGRST205') {
      return [];
    }
    if (orderBy && error.code === '42703') {
      const retry = await supabase.from(table).select('*');
      if (!retry.error) {
        return ((retry.data || []) as Array<T & { deleted_at?: string | null }>).filter(
          (r) => !r.deleted_at
        );
      }
    }
    throw error;
  }
  return ((data || []) as Array<T & { deleted_at?: string | null }>).filter(
    (row) => !row.deleted_at
  );
}

// ============================================================================
// MASTER DATA QUERIES
// ============================================================================

export function useProducts() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.products,
    queryFn: async () => {
      const rows = await fetchTableRows<Product>(TABLES.products, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((p) => ({
        ...p,
        length: Number(p.length || 0),
        width: Number(p.width || 0),
        purchase_price: Number(p.purchase_price || 0),
        sale_price: Number(p.sale_price || 0),
        reorder_level: Number(p.reorder_level || 0),
        opening_balance: Number(p.opening_balance || 0),
        opening_average_cost: Number(p.opening_average_cost || p.purchase_price || 0),
        stock_quantity: Number(p.stock_quantity ?? p.opening_balance ?? 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function useProductArticles() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.productArticles,
    queryFn: async () => {
      const rows = await fetchTableRows<ProductArticle>(TABLES.productArticles, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((a) => ({
        ...a,
        colours: Array.isArray(a.colours) ? a.colours : [],
      }));
    },
  });
  return { data, isLoading, error };
}

export function useUniversalArticles() {
  const { data: productArticles = [] } = useProductArticles();
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.universalArticles,
    queryFn: async () => {
      const rows = await fetchTableRows<{ id: string; name: string }>(
        TABLES.universalArticles,
        { column: 'name', ascending: true }
      );
      return rows.map((r) => r.name).filter(Boolean);
    },
  });
  const combined = Array.from(
    new Set([...data, ...productArticles.map((pa) => pa.name).filter(Boolean)])
  );
  return { data: combined, isLoading, error };
}

export function useCategories() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: () =>
      fetchTableRows<Category>(TABLES.categories, {
        column: 'created_at',
        ascending: false,
      }),
  });
  return { data, isLoading, error };
}

export function useWarehouses() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.warehouses,
    queryFn: () =>
      fetchTableRows<Warehouse>(TABLES.warehouses, {
        column: 'created_at',
        ascending: true,
      }),
  });
  return { data, isLoading, error };
}

export function useCustomers() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.customers,
    queryFn: async () => {
      const rows = await fetchTableRows<Customer>(TABLES.customers, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((c) => ({
        ...c,
        credit_limit: Number(c.credit_limit || 0),
        opening_balance: Number(c.opening_balance || 0),
        current_balance: Number(c.current_balance ?? c.opening_balance ?? 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function useVendors() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.vendors,
    queryFn: async () => {
      const rows = await fetchTableRows<Vendor>(TABLES.vendors, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((v) => ({
        ...v,
        credit_limit: Number(v.credit_limit || 0),
        opening_balance: Number(v.opening_balance || 0),
        current_balance: Number(v.current_balance ?? v.opening_balance ?? 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function useAccountTypes() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.accountTypes,
    queryFn: () =>
      fetchTableRows<AccountTypeItem>(TABLES.accountTypes, {
        column: 'code',
        ascending: true,
      }),
  });
  return { data, isLoading, error };
}

export function useChartOfAccounts() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.chartOfAccounts,
    queryFn: async () => {
      const rows = await fetchTableRows<ChartOfAccount>(TABLES.chartOfAccounts, {
        column: 'code',
        ascending: true,
      });
      return rows.map((coa) => ({
        ...coa,
        current_balance: Number(coa.current_balance || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function useControlMappings() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.controlAccountMappings,
    queryFn: () => fetchTableRows<ControlAccountMapping>(TABLES.controlAccountMappings),
  });
  return { data, isLoading, error };
}

export function useDocumentSequences() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.documentSequences,
    queryFn: () =>
      fetchTableRows<DocumentSequence>(TABLES.documentSequences, {
        column: 'document_type',
        ascending: true,
      }),
  });
  return { data, isLoading, error };
}

// ============================================================================
// SALES & RECEIVABLES QUERIES
// ============================================================================

export function useSalesInvoices(statusFilter?: 'ALL' | 'POSTED' | 'PENDING_APPROVAL' | 'REJECTED' | string) {
  const normalizedFilter = statusFilter && statusFilter !== 'ALL' ? statusFilter : 'ALL';
  const { data = [], isLoading, error } = useQuery({
    queryKey:
      normalizedFilter === 'ALL'
        ? QUERY_KEYS.salesInvoices
        : [...QUERY_KEYS.salesInvoices, { status: normalizedFilter }],
    queryFn: async () => {
      let invQuery = supabase
        .from(TABLES.salesInvoices)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (normalizedFilter === 'POSTED') {
        invQuery = invQuery.in('status', ['POSTED', 'APPROVED', 'Accepted']);
      } else if (normalizedFilter === 'PENDING_APPROVAL') {
        invQuery = invQuery.in('status', ['PENDING_APPROVAL', 'PENDING']);
      } else if (normalizedFilter !== 'ALL') {
        invQuery = invQuery.eq('status', normalizedFilter);
      }

      const [{ data: invRows, error: invErr }, lineItems, customers] = await Promise.all([
        invQuery,
        fetchTableRows<SalesInvoiceItem>(TABLES.salesInvoiceItems),
        fetchTableRows<Customer>(TABLES.customers),
      ]);

      const invoices = invErr
        ? await fetchTableRows<SalesInvoice>(TABLES.salesInvoices, {
            column: 'created_at',
            ascending: false,
          })
        : ((invRows || []) as SalesInvoice[]);

      const itemsByInv = new Map<string, SalesInvoiceItem[]>();
      for (const item of lineItems) {
        const list = itemsByInv.get(item.sales_invoice_id) || [];
        list.push({
          ...item,
          qty: Number(item.qty || 0),
          length: Number(item.length || 0),
          width: Number(item.width || 0),
          rate: Number(item.rate || 0),
          discount: Number(item.discount || 0),
          tax_pct: Number(item.tax_pct || 0),
          line_total: Number(item.line_total || 0),
        });
        itemsByInv.set(item.sales_invoice_id, list);
      }

      const custMap = new Map<string, string>(customers.map((c) => [c.id, c.name]));

      return invoices.map((inv) => {
        const childItems = itemsByInv.get(inv.id);
        const embeddedItems = Array.isArray(inv.items) ? inv.items : [];
        const resolvedName =
          inv.customer_name ||
          inv.party_name ||
          (inv.customer_id ? custMap.get(inv.customer_id) : undefined);
        const rawStatus = String(inv.status || 'UNPOSTED');
        const normalizedStatus =
          rawStatus === 'APPROVED' || rawStatus === 'Accepted'
            ? 'POSTED'
            : rawStatus === 'PENDING'
            ? 'PENDING_APPROVAL'
            : (rawStatus as SalesInvoice['status']);

        return {
          ...inv,
          status: normalizedStatus,
          customer_name: resolvedName,
          party_name: inv.party_name || resolvedName,
          subtotal: Number(inv.subtotal || 0),
          discount_total: Number(inv.discount_total || 0),
          tax_total: Number(inv.tax_total || 0),
          total_amount: Number(inv.total_amount || 0),
          paid_amount: Number(inv.paid_amount || 0),
          exchange_rate: Number(inv.exchange_rate || 1),
          items: childItems && childItems.length > 0 ? childItems : embeddedItems,
        };
      });
    },
  });
  return { data, isLoading, error };
}

export function useSalesInvoiceStatusCounts() {
  const { data } = useQuery({
    queryKey: [...QUERY_KEYS.salesInvoices, 'counts'],
    queryFn: async () => {
      const [allRes, postedRes, pendingRes, rejectedRes] = await Promise.all([
        supabase.from(TABLES.salesInvoices).select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase
          .from(TABLES.salesInvoices)
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .in('status', ['POSTED', 'APPROVED', 'Accepted']),
        supabase
          .from(TABLES.salesInvoices)
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .in('status', ['PENDING_APPROVAL', 'PENDING']),
        supabase
          .from(TABLES.salesInvoices)
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', 'REJECTED'),
      ]);
      return {
        ALL: allRes.count ?? 0,
        POSTED: postedRes.count ?? 0,
        PENDING_APPROVAL: pendingRes.count ?? 0,
        REJECTED: rejectedRes.count ?? 0,
      };
    },
  });
  return data || { ALL: 0, POSTED: 0, PENDING_APPROVAL: 0, REJECTED: 0 };
}

export function useInvoiceItems(invoiceId: string | null) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.salesInvoiceItemsByInvoice(invoiceId),
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data: rows, error: err } = await supabase
        .from(TABLES.salesInvoiceItems)
        .select('*')
        .eq('sales_invoice_id', invoiceId);
      if (err) throw err;
      return (rows || []) as SalesInvoiceItem[];
    },
  });
  return { data, isLoading, error };
}

export function useQuotations() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.quotations,
    queryFn: async () => {
      const rows = await fetchTableRows<Quotation>(TABLES.quotations, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((q) => ({
        ...q,
        quotation_date: q.quotation_date || q.document_date || '',
        subtotal: Number(q.subtotal || 0),
        discount_total: Number(q.discount_total || 0),
        tax_total: Number(q.tax_total || 0),
        total_amount: Number(q.total_amount || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function useSalesOrders() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.salesOrders,
    queryFn: async () => {
      const rows = await fetchTableRows<SalesOrder>(TABLES.salesOrders, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((so) => ({
        ...so,
        order_date: so.order_date || so.document_date || '',
        subtotal: Number(so.subtotal || 0),
        discount_total: Number(so.discount_total || 0),
        tax_total: Number(so.tax_total || 0),
        total_amount: Number(so.total_amount || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function useCreditNotes() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.creditNotes,
    queryFn: async () => {
      const rows = await fetchTableRows<CreditNote>(TABLES.creditNotes, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((cn) => ({
        ...cn,
        note_date: cn.note_date || cn.document_date || '',
        sales_invoice_id: cn.sales_invoice_id || cn.invoice_id || null,
        total_amount: Number(cn.total_amount || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function useSalesReturns() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.salesReturns,
    queryFn: async () => {
      const rows = await fetchTableRows<SalesReturn & { date?: string; tax_amount?: number }>(
        TABLES.salesReturns,
        { column: 'created_at', ascending: false }
      );
      return rows.map((sr) => ({
        ...sr,
        party_type: sr.party_type || 'Customer',
        document_date: sr.document_date || sr.date || '',
        subtotal: Number(sr.subtotal || 0),
        discount_total: Number(sr.discount_total || 0),
        tax_total: Number(sr.tax_total ?? sr.tax_amount ?? 0),
        total_amount: Number(sr.total_amount || 0),
        items: Array.isArray(sr.items) ? sr.items : [],
      }));
    },
  });
  return { data, isLoading, error };
}

export function useCustomerReceipts() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.customerReceipts,
    queryFn: async () => {
      const rows = await fetchTableRows<CustomerReceipt>(TABLES.customerReceipts, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((cr) => ({
        ...cr,
        payment_method: cr.payment_method || cr.deposit_to || 'Cash',
        deposit_account_id: cr.deposit_account_id || cr.deposit_to || '',
        amount: Number(cr.amount || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function useSalesCommissions() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.salesCommissions,
    queryFn: async () => {
      const rows = await fetchTableRows<SalesCommission>(TABLES.salesCommissions, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((c) => ({
        ...c,
        rate_pct: Number(c.rate_pct || 0),
        commission_amount: Number(c.commission_amount || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

// ============================================================================
// PURCHASES & PAYABLES QUERIES
// ============================================================================

export function usePurchaseRequests() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.purchaseRequests,
    queryFn: async () => {
      const rows = await fetchTableRows<PurchaseRequest>(TABLES.purchaseRequests, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((pr) => ({
        ...pr,
        request_date: pr.request_date || pr.document_date || '',
        total_amount: Number(pr.total_amount || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function usePurchaseOrders() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.purchaseOrders,
    queryFn: async () => {
      const rows = await fetchTableRows<PurchaseOrder>(TABLES.purchaseOrders, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((po) => ({
        ...po,
        po_date: po.po_date || po.document_date || '',
        expected_delivery: po.expected_delivery || po.expected_date || null,
        total_amount: Number(po.total_amount || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function usePurchaseInvoices(statusFilter?: 'ALL' | 'POSTED' | 'PENDING_APPROVAL' | 'REJECTED' | string) {
  const normalizedFilter = statusFilter && statusFilter !== 'ALL' ? statusFilter : 'ALL';
  const { data = [], isLoading, error } = useQuery({
    queryKey:
      normalizedFilter === 'ALL'
        ? QUERY_KEYS.purchaseInvoices
        : [...QUERY_KEYS.purchaseInvoices, { status: normalizedFilter }],
    queryFn: async () => {
      let piQuery = supabase
        .from(TABLES.purchaseInvoices)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (normalizedFilter === 'POSTED') {
        piQuery = piQuery.in('status', ['POSTED', 'APPROVED', 'Accepted']);
      } else if (normalizedFilter === 'PENDING_APPROVAL') {
        piQuery = piQuery.in('status', ['PENDING_APPROVAL', 'PENDING']);
      } else if (normalizedFilter !== 'ALL') {
        piQuery = piQuery.eq('status', normalizedFilter);
      }

      const [{ data: piRows, error: piErr }, lineItems, vendors] = await Promise.all([
        piQuery,
        fetchTableRows<PurchaseInvoiceItem>(TABLES.purchaseInvoiceItems),
        fetchTableRows<Vendor>(TABLES.vendors),
      ]);

      const invoices = piErr
        ? await fetchTableRows<PurchaseInvoice>(TABLES.purchaseInvoices, {
            column: 'created_at',
            ascending: false,
          })
        : ((piRows || []) as PurchaseInvoice[]);

      const itemsByPi = new Map<string, PurchaseInvoiceItem[]>();
      for (const item of lineItems) {
        if (!item.purchase_invoice_id) continue;
        const list = itemsByPi.get(item.purchase_invoice_id) || [];
        list.push({
          ...item,
          qty: Number(item.qty || 0),
          rate: Number(item.rate || 0),
          discount: Number(item.discount || 0),
          tax_pct: Number(item.tax_pct || 0),
          line_total: Number(item.line_total || 0),
        });
        itemsByPi.set(item.purchase_invoice_id, list);
      }

      const vendMap = new Map<string, string>(vendors.map((v) => [v.id, v.name]));

      return invoices.map((pi) => {
        const childItems = itemsByPi.get(pi.id);
        let embeddedItems: PurchaseInvoiceItem[] = Array.isArray(pi.items) ? pi.items : [];
        let cleanNotes = pi.notes;
        if (
          (!embeddedItems || embeddedItems.length === 0) &&
          typeof pi.notes === 'string' &&
          pi.notes.trim().startsWith('[')
        ) {
          try {
            const parsed = JSON.parse(pi.notes);
            if (Array.isArray(parsed)) {
              embeddedItems = parsed;
              cleanNotes = null;
            }
          } catch {
            // keep notes as string
          }
        }
        const resolvedVendorName =
          pi.vendor_name ||
          pi.party_name ||
          (pi.vendor_id ? vendMap.get(pi.vendor_id) : undefined);

        const rawStatus = String(pi.status || 'UNPOSTED');
        const normalizedStatus =
          rawStatus === 'APPROVED' || rawStatus === 'Accepted'
            ? 'POSTED'
            : rawStatus === 'PENDING'
            ? 'PENDING_APPROVAL'
            : (rawStatus as PurchaseInvoice['status']);

        return {
          ...pi,
          status: normalizedStatus,
          grn_no: pi.grn_no || pi.invoice_no || '',
          invoice_no: pi.invoice_no || pi.grn_no || '',
          vendor_name: resolvedVendorName,
          party_name: pi.party_name || resolvedVendorName,
          received_date: pi.received_date || pi.document_date || '',
          document_date: pi.document_date || pi.received_date || '',
          subtotal: Number(pi.subtotal || 0),
          discount_total: Number(pi.discount_total || 0),
          tax_total: Number(pi.tax_total || 0),
          total_amount: Number(pi.total_amount || 0),
          notes: cleanNotes,
          items: childItems && childItems.length > 0 ? childItems : embeddedItems,
        };
      });
    },
  });
  return { data, isLoading, error };
}

export function usePurchaseInvoiceStatusCounts() {
  const { data } = useQuery({
    queryKey: [...QUERY_KEYS.purchaseInvoices, 'counts'],
    queryFn: async () => {
      const [allRes, postedRes, pendingRes, rejectedRes] = await Promise.all([
        supabase.from(TABLES.purchaseInvoices).select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase
          .from(TABLES.purchaseInvoices)
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .in('status', ['POSTED', 'APPROVED', 'Accepted']),
        supabase
          .from(TABLES.purchaseInvoices)
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .in('status', ['PENDING_APPROVAL', 'PENDING']),
        supabase
          .from(TABLES.purchaseInvoices)
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', 'REJECTED'),
      ]);
      return {
        ALL: allRes.count ?? 0,
        POSTED: postedRes.count ?? 0,
        PENDING_APPROVAL: pendingRes.count ?? 0,
        REJECTED: rejectedRes.count ?? 0,
      };
    },
  });
  return data || { ALL: 0, POSTED: 0, PENDING_APPROVAL: 0, REJECTED: 0 };
}

export function useVendorBills() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.vendorBills,
    queryFn: async () => {
      const rows = await fetchTableRows<VendorBill>(TABLES.vendorBills, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((vb) => ({
        ...vb,
        bill_date: vb.bill_date || vb.document_date || '',
        subtotal: Number(vb.subtotal ?? vb.total_amount ?? 0),
        discount_total: Number(vb.discount_total || 0),
        tax_total: Number(vb.tax_total || 0),
        total_amount: Number(vb.total_amount || 0),
        paid_amount: Number(vb.paid_amount || 0),
        exchange_rate: Number(vb.exchange_rate || 1),
        items: Array.isArray(vb.items) ? vb.items : [],
      }));
    },
  });
  return { data, isLoading, error };
}

export function useDebitNotes() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.debitNotes,
    queryFn: async () => {
      const rows = await fetchTableRows<DebitNote>(TABLES.debitNotes, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((dn) => ({
        ...dn,
        note_date: dn.note_date || dn.document_date || '',
        reason: dn.reason || dn.purpose_reason || '',
        total_amount: Number(dn.total_amount || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function usePurchaseReturns() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.purchaseReturns,
    queryFn: async () => {
      const rows = await fetchTableRows<PurchaseReturn & { date?: string; tax_amount?: number }>(
        TABLES.purchaseReturns,
        { column: 'created_at', ascending: false }
      );
      return rows.map((pr) => ({
        ...pr,
        party_type: pr.party_type || 'Vendor',
        document_date: pr.document_date || pr.date || '',
        subtotal: Number(pr.subtotal || 0),
        discount_total: Number(pr.discount_total || 0),
        tax_total: Number(pr.tax_total ?? pr.tax_amount ?? 0),
        total_amount: Number(pr.total_amount || 0),
        items: Array.isArray(pr.items) ? pr.items : [],
      }));
    },
  });
  return { data, isLoading, error };
}

export function useVendorPayments() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.vendorPayments,
    queryFn: async () => {
      const rows = await fetchTableRows<VendorPayment>(TABLES.vendorPayments, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((vp) => ({
        ...vp,
        payment_method: vp.payment_method || vp.pay_from || 'Cash',
        paid_from_account_id: vp.paid_from_account_id || vp.pay_from || '',
        amount: Number(vp.amount || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

// ============================================================================
// INVENTORY & STOCK QUERIES
// ============================================================================

export function useStockTransfers() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.stockTransfers,
    queryFn: () =>
      fetchTableRows<StockTransfer>(TABLES.stockTransfers, {
        column: 'created_at',
        ascending: false,
      }),
  });
  return { data, isLoading, error };
}

export function useStockAdjustments() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.stockAdjustments,
    queryFn: () =>
      fetchTableRows<StockAdjustment>(TABLES.stockAdjustments, {
        column: 'created_at',
        ascending: false,
      }),
  });
  return { data, isLoading, error };
}

export function useProductBatches() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.productBatches,
    queryFn: async () => {
      const rows = await fetchTableRows<ProductBatch>(TABLES.productBatches, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((b) => ({
        ...b,
        batch_number: b.batch_number || b.batch_no || '',
        quantity_initial: Number(b.quantity_initial ?? b.qty ?? 0),
        quantity_on_hand: Number(b.quantity_on_hand ?? b.qty ?? 0),
        unit_cost: Number(b.unit_cost || 0),
        is_active: b.is_active ?? b.status === 'Active',
      }));
    },
  });
  return { data, isLoading, error };
}

export function useProductSerials() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.productSerials,
    queryFn: async () => {
      const rows = await fetchTableRows<ProductSerial>(TABLES.productSerials, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((s) => ({
        ...s,
        serial_number: s.serial_number || s.serial_no || '',
      }));
    },
  });
  return { data, isLoading, error };
}

export function useStockLedger(productId?: string) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.stockLedgerByProduct(productId),
    queryFn: async () => {
      let query = supabase
        .from(TABLES.stockLedger)
        .select('*')
        .order('created_at', { ascending: false });
      if (productId) {
        query = query.eq('product_id', productId);
      }
      const { data: rows, error: err } = await query;
      if (err) throw err;
      return ((rows || []) as StockLedgerEntry[]).map((r) => ({
        ...r,
        qty_in: Number(r.qty_in || 0),
        qty_out: Number(r.qty_out || 0),
        unit_cost: Number(r.unit_cost || 0),
        total_cost: Number(
          r.total_cost ??
            (Number(r.qty_in || 0) + Number(r.qty_out || 0)) * Number(r.unit_cost || 0)
        ),
      }));
    },
  });
  return { data, isLoading, error };
}

// ============================================================================
// ACCOUNTING & BANKING QUERIES
// ============================================================================

export function useBankAccounts() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.bankAccounts,
    queryFn: async () => {
      const rows = await fetchTableRows<BankAccount>(TABLES.bankAccounts, {
        column: 'created_at',
        ascending: true,
      });
      return rows.map((b) => ({
        ...b,
        opening_balance: Number(b.opening_balance || 0),
        current_balance: Number(b.current_balance || 0),
      }));
    },
  });
  return { data, isLoading, error };
}

export function useBankStatements() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.bankStatements,
    queryFn: () =>
      fetchTableRows<BankStatement>(TABLES.bankStatements, {
        column: 'created_at',
        ascending: false,
      }),
  });
  return { data, isLoading, error };
}

export function useJournalEntries() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.journalEntries,
    queryFn: async () => {
      const rows = await fetchTableRows<JournalEntry>(TABLES.journalEntries, {
        column: 'entry_date',
        ascending: false,
      });
      return rows.map((je) => ({
        ...je,
        total_debit: Number(je.total_debit || 0),
        total_credit: Number(je.total_credit || 0),
        lines: Array.isArray(je.lines) ? je.lines : [],
      }));
    },
  });
  return { data, isLoading, error };
}

export function useAccountLedger(accountId?: string, partyId?: string) {
  const { data: journalEntries = [] } = useJournalEntries();
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.accountLedgerFiltered(accountId, partyId),
    queryFn: async () => {
      let query = supabase
        .from(TABLES.accountLedger)
        .select('*')
        .order('transaction_date', { ascending: false });
      if (accountId) query = query.eq('account_id', accountId);
      if (partyId) query = query.eq('party_id', partyId);
      const { data: rows, error: err } = await query;
      if (err && err.code !== 'PGRST205') throw err;
      return ((rows || []) as AccountLedgerItem[]).map((r) => ({
        ...r,
        debit: Number(r.debit || 0),
        credit: Number(r.credit || 0),
      }));
    },
  });

  const fromJournals: AccountLedgerItem[] = journalEntries
    .filter((j) => !accountId || j.lines?.some((l) => l.account_id === accountId))
    .flatMap((j) =>
      (j.lines || [])
        .filter((l) => !accountId || l.account_id === accountId)
        .map((l) => ({
          id: `${j.id}-${l.id || '0'}`,
          account_id: l.account_id || null,
          party_id: null,
          voucher_no: j.entry_no,
          voucher_type: j.entry_type || j.source || 'Journal Entry',
          transaction_date: j.entry_date,
          description: l.description || l.narration || j.narration,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
        }))
    );

  return { data: [...data, ...fromJournals], isLoading, error };
}

export function useFinancialYears() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.financialYears,
    queryFn: () =>
      fetchTableRows<FinancialYear>(TABLES.financialYears, {
        column: 'start_date',
        ascending: false,
      }),
  });
  return { data, isLoading, error };
}

export function useExpenseRecords() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.expenseRecords,
    queryFn: async () => {
      const rows = await fetchTableRows<ExpenseRecord>(TABLES.expenseRecords, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((e) => ({ ...e, amount: Number(e.amount || 0) }));
    },
  });
  return { data, isLoading, error };
}

export function useIncomeRecords() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.incomeRecords,
    queryFn: async () => {
      const rows = await fetchTableRows<IncomeRecord>(TABLES.incomeRecords, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((i) => ({ ...i, amount: Number(i.amount || 0) }));
    },
  });
  return { data, isLoading, error };
}

// ============================================================================
// APPROVAL QUEUE QUERIES
// ============================================================================

export function useApprovalQueue(status?: string) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.approvalQueue,
    queryFn: async () => {
      const rows = await fetchTableRows<ApprovalQueueItem>(TABLES.approvalQueue, {
        column: 'created_at',
        ascending: false,
      });
      return rows.map((q) => {
        let meta: {
          party_name?: string;
          module?: string;
          warehouse_id?: string;
          items_summary?: string;
        } = {};
        let cleanReviewNote = q.review_note;
        if (typeof q.review_note === 'string' && q.review_note.trim().startsWith('{')) {
          try {
            meta = JSON.parse(q.review_note);
            cleanReviewNote = null;
          } catch {
            // preserve plain text review_note
          }
        }
        const recordNo = q.record_no || q.voucher_no || undefined;
        const recordId = q.record_id || q.entity_id || q.id;
        const inferredModule =
          q.module ||
          meta.module ||
          (q.entity_type?.includes('purchase') || q.entity_type?.includes('vendor')
            ? 'Purchase'
            : 'Sales');

        return {
          ...q,
          module: inferredModule,
          record_id: recordId,
          entity_id: recordId,
          record_no: recordNo,
          voucher_no: recordNo || null,
          party_name: q.party_name || meta.party_name || null,
          warehouse_id: q.warehouse_id || meta.warehouse_id || null,
          items_summary: q.items_summary || meta.items_summary || null,
          review_note: cleanReviewNote,
          amount: Number(q.amount || 0),
        };
      });
    },
  });

  const filtered =
    status && status !== 'ALL' ? data.filter((a) => a.status === status) : data;
  return { data: filtered, isLoading, error };
}

export function useApprovals(status?: string) {
  return useApprovalQueue(status);
}

// ============================================================================
// ADMINISTRATION & SECURITY QUERIES
// ============================================================================

export function useOrganizations() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.organizations,
    queryFn: async () => {
      const rows = await fetchTableRows<Organization>(TABLES.organizations, {
        column: 'created_at',
        ascending: true,
      });
      const hasNice = rows.some((o) => o.name.toUpperCase().includes('NICE'));
      const filtered = hasNice
        ? rows.filter((o) => !o.name.toUpperCase().includes('AMKAS'))
        : rows;
      return filtered;
    },
  });
  return { data, isLoading, error };
}

export function useBranches() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.branches,
    queryFn: async () => {
      const rows = await fetchTableRows<Branch>(TABLES.branches, {
        column: 'created_at',
        ascending: true,
      });
      return rows.map((b) => ({
        ...b,
        is_active: b.is_active ?? true,
      }));
    },
  });
  return { data, isLoading, error };
}

export function useDepartments() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.departments,
    queryFn: () =>
      fetchTableRows<Department>(TABLES.departments, {
        column: 'created_at',
        ascending: true,
      }),
  });
  return { data, isLoading, error };
}

export function useUsers() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.userProfiles,
    queryFn: async () => {
      const rows = await fetchTableRows<UserEmployee>(TABLES.userProfiles, {
        column: 'created_at',
        ascending: true,
      });
      return rows.map((u) => ({
        ...u,
        employee_code: u.employee_code || 'EMP-001',
        base_salary: Number(u.base_salary || 0),
        allowances: Number(u.allowances || 0),
        others: Number(u.others || 0),
        is_active: u.is_active ?? true,
      }));
    },
  });
  return { data, isLoading, error };
}

export function useRolePermissions() {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.rolePermissions,
    queryFn: async () => {
      const rows = await fetchTableRows<ModulePermission>(TABLES.rolePermissions);
      const map: Record<Role, ModuleKey[]> = { ...ROLE_MODULES };
      if (rows.length > 0) {
        const grouped: Partial<Record<Role, ModuleKey[]>> = {};
        for (const r of rows) {
          if (r.can_view === false) continue;
          const roleKey = r.role_id as Role;
          const modKey = r.module_key as ModuleKey;
          if (!grouped[roleKey]) grouped[roleKey] = [];
          if (!grouped[roleKey]!.includes(modKey)) {
            grouped[roleKey]!.push(modKey);
          }
        }
        for (const [roleKey, mods] of Object.entries(grouped)) {
          if (mods && mods.length > 0) {
            map[roleKey as Role] = mods;
          }
        }
      }
      return map;
    },
  });
  return { data: data || ROLE_MODULES, isLoading, error };
}

export function useAuditLogs() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.auditLogs,
    queryFn: () =>
      fetchTableRows<AuditLog>(TABLES.auditLogs, {
        column: 'timestamp',
        ascending: false,
      }),
  });
  return { data, isLoading, error };
}

export function useLoginLogs() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.loginLogs,
    queryFn: () =>
      fetchTableRows<LoginLog>(TABLES.loginLogs, {
        column: 'timestamp',
        ascending: false,
      }),
  });
  return { data, isLoading, error };
}

// ============================================================================
// STANDALONE MUTATION HOOKS
// ============================================================================

export function usePostInvoice() {
  const { postInvoiceMutation } = useErpMutations();
  return {
    isPending: postInvoiceMutation.isPending,
    mutateAsync: (invoiceId: string) => postInvoiceMutation.mutateAsync(invoiceId),
  };
}

export function useDeleteInvoice() {
  const { deleteInvoiceMutation } = useErpMutations();
  return {
    isPending: deleteInvoiceMutation.isPending,
    mutateAsync: (invoiceId: string) => deleteInvoiceMutation.mutateAsync(invoiceId),
  };
}

export function useDeleteRecord(table: string, queryKey: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteRowById(table, id);
    },
    onSuccess: () => {
      invalidateTableAndRelated(queryClient, table);
      queryClient.invalidateQueries({ queryKey });
    },
    onSettled: () => {
      invalidateTableAndRelated(queryClient, table);
    },
  });
}

export function useReviewApproval() {
  const { reviewApprovalMutation } = useErpMutations();
  return {
    isPending: reviewApprovalMutation.isPending,
    mutateAsync: ({
      id,
      status,
      note,
      reviewer,
    }: {
      id: string;
      status: string;
      note?: string;
      reviewer?: string;
    }) =>
      reviewApprovalMutation.mutateAsync({
        id,
        status: status as 'APPROVED' | 'REJECTED',
        note,
        reviewer,
      }),
  };
}

// ============================================================================
// UNIFIED ERP DATA + MUTATIONS HOOK (100% backed by React Query + Supabase)
// ============================================================================

export function useErpData() {
  const { data: customers = [] } = useCustomers();
  const { data: vendors = [] } = useVendors();
  const { data: accountTypes = [] } = useAccountTypes();
  const { data: products = [] } = useProducts();
  const { data: productArticles = [] } = useProductArticles();
  const { data: universalArticles = [] } = useUniversalArticles();
  const { data: categories = [] } = useCategories();
  const { data: warehouses = [] } = useWarehouses();
  const { data: invoices = [] } = useSalesInvoices();
  const { data: quotations = [] } = useQuotations();
  const { data: salesOrders = [] } = useSalesOrders();
  const { data: creditNotes = [] } = useCreditNotes();
  const { data: customerReceipts = [] } = useCustomerReceipts();
  const { data: commissions = [] } = useSalesCommissions();
  const { data: purchaseRequests = [] } = usePurchaseRequests();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: purchaseInvoices = [] } = usePurchaseInvoices();
  const { data: vendorBills = [] } = useVendorBills();
  const { data: debitNotes = [] } = useDebitNotes();
  const { data: salesReturns = [] } = useSalesReturns();
  const { data: purchaseReturns = [] } = usePurchaseReturns();
  const { data: vendorPayments = [] } = useVendorPayments();
  const { data: stockTransfers = [] } = useStockTransfers();
  const { data: stockAdjustments = [] } = useStockAdjustments();
  const { data: batches = [] } = useProductBatches();
  const { data: serials = [] } = useProductSerials();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: bankStatements = [] } = useBankStatements();
  const { data: journalEntries = [] } = useJournalEntries();
  const { data: financialYears = [] } = useFinancialYears();
  const { data: chartOfAccounts = [] } = useChartOfAccounts();
  const { data: approvalQueue = [] } = useApprovalQueue();
  const { data: organizations = [] } = useOrganizations();
  const { data: branches = [] } = useBranches();
  const { data: departments = [] } = useDepartments();
  const { data: users = [] } = useUsers();
  const { data: auditLogs = [] } = useAuditLogs();
  const { data: loginLogs = [] } = useLoginLogs();
  const { data: rolePermissions } = useRolePermissions();
  const { data: expenseRecords = [] } = useExpenseRecords();
  const { data: incomeRecords = [] } = useIncomeRecords();

  const mutations = useErpMutations();

  const primaryOrg = (organizations[0] || {}) as Organization & {
    is_maintenance_mode?: boolean;
  };
  const companyLogo = primaryOrg.logo_url || null;
  const isMaintenanceMode = Boolean(primaryOrg.is_maintenance_mode);
  const orgSettings: Partial<Organization> = {
    name: primaryOrg.name || 'NICE ENTERPRISES',
    legal_name: primaryOrg.legal_name || 'NICE ENTERPRISES ERP',
    email: primaryOrg.email || 'admin123@gmail.com',
    phone: primaryOrg.phone || '+92 42 111 222 333',
    address: primaryOrg.address || 'Lahore, Pakistan',
    tax_id: primaryOrg.tax_id || 'NTN-1234567',
    currency: primaryOrg.currency || 'PKR',
    decimal_places: primaryOrg.decimal_places ?? 2,
    tax_label: primaryOrg.tax_label || 'GST / NTN',
    default_tax_rate: primaryOrg.default_tax_rate ?? 0,
    default_invoice_prefix: primaryOrg.default_invoice_prefix || 'MS-',
    date_format: primaryOrg.date_format || '21 Jun 2026',
  };

  return {
    customers,
    vendors,
    accountTypes,
    products,
    productArticles,
    universalArticles,
    categories,
    warehouses,
    invoices,
    quotations,
    salesOrders,
    creditNotes,
    customerReceipts,
    commissions,
    purchaseRequests,
    purchaseOrders,
    purchaseInvoices,
    vendorBills,
    debitNotes,
    salesReturns,
    purchaseReturns,
    vendorPayments,
    stockTransfers,
    stockAdjustments,
    batches,
    serials,
    bankAccounts,
    bankStatements,
    journalEntries,
    financialYears,
    chartOfAccounts,
    approvalQueue,
    organizations,
    branches,
    departments,
    users,
    auditLogs,
    loginLogs,
    rolePermissions,
    expenseRecords,
    incomeRecords,
    companyLogo,
    orgSettings,
    isMaintenanceMode,
    ...mutations,
  };
}
