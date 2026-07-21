import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const TABLES = {
  organizations: 'organizations',
  branches: 'branches',
  chartOfAccounts: 'chart_of_accounts',
  controlAccountMappings: 'control_account_mappings',
  accountLedger: 'account_ledger',
  products: 'products',
  warehouses: 'warehouses',
  stockLedger: 'stock_ledger',
  customers: 'customers',
  vendors: 'vendors',
  salesInvoices: 'sales_invoices',
  salesInvoiceItems: 'sales_invoice_items',
  approvalQueue: 'approval_queue',
  categories: 'categories',
} as const;
