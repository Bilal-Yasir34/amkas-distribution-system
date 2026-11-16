import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const BUILD_ID: string =
  (import.meta.env.VITE_BUILD_ID as string | undefined)?.trim() || 'v2.4.0-rt-20261116';

export const SUPABASE_HOST: string = (() => {
  if (!supabaseUrl) return 'unconfigured';
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return 'invalid-url';
  }
})();

// Startup diagnostic log (shows ONLY host and build ID, NEVER the anon key)
// eslint-disable-next-line no-console
console.info(`[NICE-ERP] Build: ${BUILD_ID} | Supabase Host: ${SUPABASE_HOST}`);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error('Configuration missing: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-unconfigured.supabase.co',
  supabaseAnonKey || 'unconfigured-anon-key',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }
);

export const TABLES = {
  organizations: 'organizations',
  branches: 'branches',
  departments: 'departments',
  userProfiles: 'user_profiles',
  rolePermissions: 'role_permissions',
  chartOfAccounts: 'chart_of_accounts',
  controlAccountMappings: 'control_account_mappings',
  accountTypes: 'account_types',
  accountLedger: 'account_ledger',
  journalEntries: 'journal_entries',
  financialYears: 'financial_years',
  expenseRecords: 'expense_records',
  incomeRecords: 'income_records',
  products: 'products',
  productArticles: 'product_articles',
  universalArticles: 'universal_articles',
  categories: 'categories',
  warehouses: 'warehouses',
  stockLedger: 'stock_ledger',
  stockTransfers: 'stock_transfers',
  stockAdjustments: 'stock_adjustments',
  productBatches: 'product_batches',
  productSerials: 'product_serials',
  customers: 'customers',
  vendors: 'vendors',
  salesInvoices: 'sales_invoices',
  salesInvoiceItems: 'sales_invoice_items',
  quotations: 'quotations',
  quotationItems: 'quotation_items',
  salesOrders: 'sales_orders',
  salesOrderItems: 'sales_order_items',
  creditNotes: 'credit_notes',
  salesReturns: 'sales_returns',
  customerReceipts: 'customer_receipts',
  salesCommissions: 'sales_commissions',
  purchaseRequests: 'purchase_requests',
  purchaseOrders: 'purchase_orders',
  purchaseInvoices: 'purchase_invoices',
  purchaseInvoiceItems: 'purchase_invoice_items',
  vendorBills: 'vendor_bills',
  vendorBillItems: 'vendor_bill_items',
  debitNotes: 'debit_notes',
  purchaseReturns: 'purchase_returns',
  vendorPayments: 'vendor_payments',
  bankAccounts: 'bank_accounts',
  bankStatements: 'bank_statements',
  approvalQueue: 'approval_queue',
  documentSequences: 'document_sequences',
  exchangeRates: 'exchange_rates',
  auditLogs: 'audit_logs',
  loginLogs: 'login_logs',
} as const;

export const ALL_REALTIME_TABLES = Object.values(TABLES);

