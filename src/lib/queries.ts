import { useDataStore } from './dataStore';
import type {
  AccountLedgerEntry,
  ApprovalQueueItem,
  Category,
  ChartOfAccount,
  ControlAccountMapping,
  Customer,
  Product,
  SalesInvoice,
  SalesInvoiceItem,
  StockLedgerEntry,
  Vendor,
  Warehouse,
} from './types';

// Reactive Hooks subscribing directly to useDataStore for instant zero-refresh UI updates
export function useProducts() {
  const products = useDataStore((s) => s.products);
  return { data: products, isLoading: false, error: null };
}

export function useWarehouses() {
  const warehouses = useDataStore((s) => s.warehouses);
  return { data: warehouses, isLoading: false, error: null };
}

export function useCustomers() {
  const customers = useDataStore((s) => s.customers);
  return { data: customers, isLoading: false, error: null };
}

export function useVendors() {
  const vendors = useDataStore((s) => s.vendors);
  return { data: vendors, isLoading: false, error: null };
}

export function useChartOfAccounts() {
  const coa = useDataStore((s) => s.chartOfAccounts);
  return { data: coa, isLoading: false, error: null };
}

export function useControlMappings() {
  return { data: [], isLoading: false, error: null };
}

export function useSalesInvoices() {
  const invoices = useDataStore((s) => s.invoices);
  return { data: invoices, isLoading: false, error: null };
}

export function useInvoiceItems(invoiceId: string | null) {
  return { data: [], isLoading: false, error: null };
}

export function useStockLedger(productId?: string) {
  const products = useDataStore((s) => s.products);
  const ledger: StockLedgerEntry[] = products.map((p) => ({
    id: `sl-${p.id}`,
    product_id: p.id,
    warehouse_id: 'w1',
    voucher_no: 'INIT-001',
    voucher_type: 'Opening Stock',
    transaction_date: '2026-07-01',
    qty_in: 500,
    qty_out: 0,
    unit_cost: p.opening_average_cost || p.purchase_price || 140,
    total_cost: 500 * (p.opening_average_cost || p.purchase_price || 140),
    created_at: '2026-07-01T00:00:00Z',
  }));
  return { data: ledger, isLoading: false, error: null };
}

export function useAccountLedger(accountId?: string, partyId?: string) {
  return { data: [], isLoading: false, error: null };
}

export function useApprovals(status?: string) {
  const approvalQueue = useDataStore((s) => s.approvalQueue);
  const filtered = status && status !== 'ALL' ? approvalQueue.filter((a) => a.status === status) : approvalQueue;
  return { data: filtered, isLoading: false, error: null };
}

export function useCategories() {
  const categories = useDataStore((s) => s.categories);
  return { data: categories, isLoading: false, error: null };
}

export function usePostInvoice() {
  const updateInvoice = useDataStore((s) => s.updateInvoice);
  return {
    mutateAsync: async (invoiceId: string) => {
      updateInvoice(invoiceId, { status: 'POSTED' });
    },
  };
}

export function useDeleteInvoice() {
  const deleteInvoice = useDataStore((s) => s.deleteInvoice);
  return {
    mutateAsync: async (invoiceId: string) => {
      deleteInvoice(invoiceId);
    },
  };
}

export function useDeleteRecord(table: string, queryKey: string[]) {
  return {
    mutateAsync: async (id: string) => {
      // Direct store delete handled in components
    },
  };
}

export function useReviewApproval() {
  const reviewApproval = useDataStore((s) => s.reviewApproval);
  return {
    mutateAsync: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      reviewApproval(id, status as any, note);
    },
  };
}
