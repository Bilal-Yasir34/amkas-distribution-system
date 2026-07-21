/*
# AMKAS International ERP — Core Schema

Builds the foundational tables for a single-tenant ERP distribution system
(no auth/sign-in screen): organizations, branches, chart of accounts,
control account mappings, account ledger, products, stock ledger, customers,
vendors, warehouses, sales invoices + line items, and approval queue.

1. New Tables
- organizations: top-level company entity
- branches: org branches
- chart_of_accounts: hierarchical accounts (Asset/Liability/Equity/Income/Expense)
- control_account_mappings: maps transaction types to control accounts
- account_ledger: unified double-entry ledger (debit/credit per posting)
- products: goods with code, unit, purchase/sale price, reorder, batch/serial flags
- stock_ledger: every product movement with qty in/out and unit cost
- warehouses: store master
- customers: customer directory with balances
- vendors: vendor directory with balances
- sales_invoices: invoice header (draft/post workflow)
- sales_invoice_items: invoice line items
- approval_queue: pending approvals for administrative review

2. Security
- RLS enabled on every table.
- Single-tenant (no auth): policies allow anon + authenticated full CRUD on all tables
  because the app is intentionally shared/public (no sign-in screen).

3. Notes
- Uses gen_random_uuid() for all PKs.
- NUMERIC used for all monetary/quantity fields.
- Idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS) so re-runs are safe.
*/

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  currency text DEFAULT 'PKR',
  address text,
  phone text,
  email text,
  tax_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL,
  account_category text,
  parent_id uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_control_account boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS control_account_mappings (
  transaction_type text PRIMARY KEY,
  account_id uuid REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  description text
);

CREATE TABLE IF NOT EXISTS account_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  voucher_no text,
  voucher_type text,
  transaction_date date,
  description text,
  debit numeric DEFAULT 0,
  credit numeric DEFAULT 0,
  party_id uuid,
  party_type text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON account_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_voucher ON account_ledger(voucher_no);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON account_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ledger_party ON account_ledger(party_id);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  unit text DEFAULT 'PCS',
  length numeric DEFAULT 0,
  width numeric DEFAULT 0,
  purchase_price numeric DEFAULT 0,
  sale_price numeric DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  track_batches boolean DEFAULT false,
  track_serials boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  voucher_no text,
  voucher_type text,
  qty_in numeric DEFAULT 0,
  qty_out numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  balance_after numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON stock_ledger(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_voucher ON stock_ledger(voucher_no);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  credit_limit numeric DEFAULT 0,
  opening_balance numeric DEFAULT 0,
  tax_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  credit_limit numeric DEFAULT 0,
  opening_balance numeric DEFAULT 0,
  tax_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  invoice_date date NOT NULL,
  due_date date,
  salesperson text,
  currency text DEFAULT 'PKR',
  exchange_rate numeric DEFAULT 1,
  payment_terms text,
  account_head text,
  gate_pass_no text,
  status text DEFAULT 'UNPOSTED',
  subtotal numeric DEFAULT 0,
  discount_total numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_si_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_si_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_si_date ON sales_invoices(invoice_date);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id uuid REFERENCES sales_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text,
  qty numeric DEFAULT 0,
  length numeric DEFAULT 0,
  width numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  tax_pct numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sii_invoice ON sales_invoice_items(sales_invoice_id);

CREATE TABLE IF NOT EXISTS approval_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  voucher_no text,
  amount numeric DEFAULT 0,
  requested_by text,
  status text DEFAULT 'PENDING',
  reviewed_by text,
  review_note text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;

-- Helper to apply full CRUD policies to a table (single-tenant, no auth)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations','branches','chart_of_accounts','control_account_mappings',
    'account_ledger','products','warehouses','stock_ledger','customers','vendors',
    'sales_invoices','sales_invoice_items','approval_queue'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "anon_select_%s" ON %I FOR SELECT TO anon, authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "anon_insert_%s" ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "anon_update_%s" ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "anon_delete_%s" ON %I FOR DELETE TO anon, authenticated USING (true)', t, t);
  END LOOP;
END $$;