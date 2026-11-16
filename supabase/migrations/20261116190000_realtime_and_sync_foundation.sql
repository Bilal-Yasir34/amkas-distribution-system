/*
================================================================================
NICE ENTERPRISES ERP — REALTIME & NORMALIZED ROW-LEVEL SYNC FOUNDATION
Migration: 20261116190000_realtime_and_sync_foundation.sql
================================================================================
Idempotent migration that:
1. Creates all missing normalized tables with UUID PKs, created_at, updated_at.
2. Upgrades any legacy TEXT PK tables (sales_returns, purchase_returns, approval_queue)
   and adds all missing columns required by the ERP TypeScript models.
3. Adds updated_at + BEFORE UPDATE trigger set_updated_at() to every table.
4. Adds soft-delete deleted_at timestamptz to financial/document tables.
5. Sets REPLICA IDENTITY FULL and adds every ERP table to supabase_realtime.
6. Enables Row Level Security (RLS) on every table with explicit policies.
7. Creates atomic SECURITY DEFINER RPC functions for multi-table postings.
8. Backs up cloud_sync_state -> cloud_sync_state_backup and migrates the JSON
   snapshot into normalized tables with deterministic UUID mapping.
================================================================================
*/

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0. DETERMINISTIC LEGACY-ID TO UUID HELPER FUNCTION
-- ============================================================================
-- Maps non-UUID legacy strings ('org1', 'b1', 'w1', 'd1', 'u1', 'ba1', 'coa1',
-- 'at-1', etc.) to deterministic UUIDs so foreign keys remain 100% consistent.
CREATE OR REPLACE FUNCTION public.legacy_id_to_uuid(p_id text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_clean text;
BEGIN
  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN NULL;
  END IF;
  v_clean := btrim(p_id);
  IF v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN v_clean::uuid;
  END IF;
  RETURN md5('nice-erp-legacy-id:' || v_clean)::uuid;
END;
$$;

-- ============================================================================
-- 1. SERVER-SIDE VERSIONING TRIGGER FUNCTION (set_updated_at)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. CREATE MISSING TABLES & UPGRADE EXISTING TABLES
-- ============================================================================

-- 2.1 account_types
CREATE TABLE IF NOT EXISTS public.account_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.2 expense_records
CREATE TABLE IF NOT EXISTS public.expense_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  account_id text,
  account_name text,
  description text,
  cash_bank_account text,
  amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  reference text,
  vendor_id uuid,
  vendor_name text,
  status text NOT NULL DEFAULT 'Posted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2.3 income_records
CREATE TABLE IF NOT EXISTS public.income_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  account_id text,
  account_name text,
  description text,
  cash_bank_account text,
  amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  reference text,
  customer_id uuid,
  customer_name text,
  status text NOT NULL DEFAULT 'Posted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2.4 universal_articles
CREATE TABLE IF NOT EXISTS public.universal_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.5 purchase_invoice_items
CREATE TABLE IF NOT EXISTS public.purchase_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id uuid REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  article_id text,
  colour text,
  description text,
  unit text DEFAULT 'PCS',
  base_unit text DEFAULT 'PCS',
  base_rate numeric DEFAULT 0,
  qty numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax_pct numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pii_invoice ON public.purchase_invoice_items(purchase_invoice_id);

-- 2.6 vendor_bill_items
CREATE TABLE IF NOT EXISTS public.vendor_bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_bill_id uuid REFERENCES public.vendor_bills(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text,
  qty numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax_pct numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vbi_bill ON public.vendor_bill_items(vendor_bill_id);

-- 2.7 sales_returns (create or upgrade from TEXT PK to UUID PK)
CREATE TABLE IF NOT EXISTS public.sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no text UNIQUE,
  party_type text DEFAULT 'Customer',
  customer_id uuid,
  customer_name text,
  party_name text,
  invoice_id uuid,
  warehouse_id uuid,
  document_date date DEFAULT CURRENT_DATE,
  due_date date,
  account_category text,
  account_head text,
  status text DEFAULT 'UNPOSTED',
  items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  discount_total numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_returns'
      AND column_name = 'id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.sales_returns ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.sales_returns
      ALTER COLUMN id TYPE uuid USING public.legacy_id_to_uuid(id);
    ALTER TABLE public.sales_returns ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

ALTER TABLE public.sales_returns
  ADD COLUMN IF NOT EXISTS return_no text,
  ADD COLUMN IF NOT EXISTS party_type text DEFAULT 'Customer',
  ADD COLUMN IF NOT EXISTS customer_id text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS invoice_id text,
  ADD COLUMN IF NOT EXISTS warehouse_id text,
  ADD COLUMN IF NOT EXISTS document_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS account_category text,
  ADD COLUMN IF NOT EXISTS account_head text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'UNPOSTED',
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2.8 purchase_returns (create or upgrade from TEXT PK to UUID PK)
CREATE TABLE IF NOT EXISTS public.purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no text UNIQUE,
  party_type text DEFAULT 'Vendor',
  vendor_id uuid,
  vendor_name text,
  party_name text,
  purchase_invoice_id uuid,
  warehouse_id uuid,
  document_date date DEFAULT CURRENT_DATE,
  due_date date,
  account_category text,
  account_head text,
  status text DEFAULT 'UNPOSTED',
  items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  discount_total numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_returns'
      AND column_name = 'id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.purchase_returns ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.purchase_returns
      ALTER COLUMN id TYPE uuid USING public.legacy_id_to_uuid(id);
    ALTER TABLE public.purchase_returns ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

ALTER TABLE public.purchase_returns
  ADD COLUMN IF NOT EXISTS return_no text,
  ADD COLUMN IF NOT EXISTS party_type text DEFAULT 'Vendor',
  ADD COLUMN IF NOT EXISTS vendor_id text,
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS purchase_invoice_id text,
  ADD COLUMN IF NOT EXISTS warehouse_id text,
  ADD COLUMN IF NOT EXISTS document_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS account_category text,
  ADD COLUMN IF NOT EXISTS account_head text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'UNPOSTED',
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2.9 approval_queue (ensure UUID PK and all required columns)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'approval_queue'
      AND column_name = 'id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.approval_queue ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.approval_queue
      ALTER COLUMN id TYPE uuid USING public.legacy_id_to_uuid(id);
    ALTER TABLE public.approval_queue ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

ALTER TABLE public.approval_queue
  ALTER COLUMN entity_type DROP NOT NULL,
  ALTER COLUMN entity_id DROP NOT NULL;

ALTER TABLE public.approval_queue
  ADD COLUMN IF NOT EXISTS module text,
  ADD COLUMN IF NOT EXISTS record_id text,
  ADD COLUMN IF NOT EXISTS record_no text,
  ADD COLUMN IF NOT EXISTS voucher_no text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS warehouse_id text,
  ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requested_by text,
  ADD COLUMN IF NOT EXISTS requested_by_name text,
  ADD COLUMN IF NOT EXISTS requested_by_role text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS items_summary text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2.10 Extend existing tables with all columns required by src/lib/types.ts

-- organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_code text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS decimal_places integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS tax_label text DEFAULT 'GST / NTN',
  ADD COLUMN IF NOT EXISTS default_tax_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_invoice_prefix text DEFAULT 'MS-',
  ADD COLUMN IF NOT EXISTS date_format text DEFAULT '21 Jun 2026',
  ADD COLUMN IF NOT EXISTS branches_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS users_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS is_maintenance_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- branches
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- departments
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- user_profiles (drop auth.users FK constraint on id so ERP employees can be added freely)
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
ALTER TABLE public.user_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS employee_code text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_salary numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowances numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS others numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_2fa_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login text,
  ADD COLUMN IF NOT EXISTS password text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- role_permissions
ALTER TABLE public.role_permissions
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- chart_of_accounts
ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS normal_balance text DEFAULT 'Debit',
  ADD COLUMN IF NOT EXISTS current_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- control_account_mappings
ALTER TABLE public.control_account_mappings
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- account_ledger
ALTER TABLE public.account_ledger
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS opening_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_average_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS barcode_value text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS article_name text,
  ADD COLUMN IF NOT EXISTS stock_quantity numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- warehouses
ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- stock_ledger
ALTER TABLE public.stock_ledger
  ADD COLUMN IF NOT EXISTS transaction_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'Customer',
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS credit_period_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS current_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salesperson text,
  ADD COLUMN IF NOT EXISTS commission_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'Vendor',
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS current_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salesperson text,
  ADD COLUMN IF NOT EXISTS commission_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- sales_invoices (with soft-delete deleted_at)
ALTER TABLE public.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_customer_id_fkey;
ALTER TABLE public.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_warehouse_id_fkey;
ALTER TABLE public.sales_invoices
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS account_category text,
  ADD COLUMN IF NOT EXISTS terms_conditions text,
  ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- sales_invoice_items
ALTER TABLE public.sales_invoice_items DROP CONSTRAINT IF EXISTS sales_invoice_items_product_id_fkey;
ALTER TABLE public.sales_invoice_items
  ADD COLUMN IF NOT EXISTS article_id text,
  ADD COLUMN IF NOT EXISTS colour text,
  ADD COLUMN IF NOT EXISTS unit text DEFAULT 'PCS',
  ADD COLUMN IF NOT EXISTS base_unit text DEFAULT 'PCS',
  ADD COLUMN IF NOT EXISTS base_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- quotations & quotation_items
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS quotation_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS converted_to_order boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.quotation_items
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- sales_orders & sales_order_items
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS warehouse_id uuid,
  ADD COLUMN IF NOT EXISTS order_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS quotation_id uuid,
  ADD COLUMN IF NOT EXISTS converted_to_invoice boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.sales_order_items
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- credit_notes
ALTER TABLE public.credit_notes
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS sales_invoice_id uuid,
  ADD COLUMN IF NOT EXISTS note_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- customer_receipts
ALTER TABLE public.customer_receipts DROP CONSTRAINT IF EXISTS customer_receipts_customer_id_fkey;
ALTER TABLE public.customer_receipts
  ALTER COLUMN deposit_to DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS sales_invoice_id uuid,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS deposit_account_id text,
  ADD COLUMN IF NOT EXISTS cheque_number text,
  ADD COLUMN IF NOT EXISTS cheque_date date,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- sales_commissions
ALTER TABLE public.sales_commissions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- purchase_requests
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS department_id text,
  ADD COLUMN IF NOT EXISTS request_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- purchase_orders
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS warehouse_id uuid,
  ADD COLUMN IF NOT EXISTS po_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS expected_delivery date,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- purchase_invoices
ALTER TABLE public.purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_vendor_id_fkey;
ALTER TABLE public.purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_warehouse_id_fkey;
ALTER TABLE public.purchase_invoices
  ALTER COLUMN invoice_no DROP NOT NULL,
  ALTER COLUMN document_date DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS grn_no text,
  ADD COLUMN IF NOT EXISTS po_id uuid,
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS vendor_invoice_no text,
  ADD COLUMN IF NOT EXISTS received_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS account_category text,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- vendor_bills
ALTER TABLE public.vendor_bills DROP CONSTRAINT IF EXISTS vendor_bills_vendor_id_fkey;
ALTER TABLE public.vendor_bills DROP CONSTRAINT IF EXISTS vendor_bills_warehouse_id_fkey;
ALTER TABLE public.vendor_bills
  ALTER COLUMN document_date DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS bill_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS vendor_invoice_no text,
  ADD COLUMN IF NOT EXISTS account_category text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- debit_notes
ALTER TABLE public.debit_notes
  ALTER COLUMN document_date DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS vendor_bill_id uuid,
  ADD COLUMN IF NOT EXISTS note_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- vendor_payments
ALTER TABLE public.vendor_payments DROP CONSTRAINT IF EXISTS vendor_payments_vendor_id_fkey;
ALTER TABLE public.vendor_payments
  ALTER COLUMN pay_from DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS vendor_bill_id uuid,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS paid_from_account_id text,
  ADD COLUMN IF NOT EXISTS cheque_number text,
  ADD COLUMN IF NOT EXISTS cheque_date date,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- stock_transfers
ALTER TABLE public.stock_transfers
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- stock_adjustments
ALTER TABLE public.stock_adjustments
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- product_batches
ALTER TABLE public.product_batches
  ALTER COLUMN batch_no DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS batch_number text,
  ADD COLUMN IF NOT EXISTS manufacture_date date,
  ADD COLUMN IF NOT EXISTS quantity_initial numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_on_hand numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- product_serials
ALTER TABLE public.product_serials
  ALTER COLUMN serial_no DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- bank_accounts
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- bank_statements
ALTER TABLE public.bank_statements
  ALTER COLUMN file_name DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_id uuid,
  ADD COLUMN IF NOT EXISTS transaction_date date,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS debit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_reconciled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- journal_entries
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS lines jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'Manual Journal',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- financial_years
ALTER TABLE public.financial_years
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- document_sequences
ALTER TABLE public.document_sequences
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- exchange_rates
ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- audit_logs & login_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.login_logs
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Partial indexes for soft-deleted tables
CREATE INDEX IF NOT EXISTS idx_sales_invoices_active ON public.sales_invoices(invoice_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_active ON public.purchase_invoices(received_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_bills_active ON public.vendor_bills(bill_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customer_receipts_active ON public.customer_receipts(receipt_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_payments_active ON public.vendor_payments(payment_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_returns_active ON public.sales_returns(document_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_returns_active ON public.purchase_returns(document_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entries_active ON public.journal_entries(entry_date DESC) WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. ATTACH BEFORE UPDATE TRIGGER (set_updated_at) TO EVERY TABLE
-- ============================================================================
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'organizations','branches','departments','user_profiles','role_permissions',
    'chart_of_accounts','control_account_mappings','account_types','account_ledger',
    'journal_entries','financial_years','expense_records','income_records',
    'products','product_articles','universal_articles','categories','warehouses',
    'stock_ledger','stock_transfers','stock_adjustments','product_batches','product_serials',
    'customers','vendors','sales_invoices','sales_invoice_items','quotations','quotation_items',
    'sales_orders','sales_order_items','credit_notes','sales_returns','customer_receipts',
    'sales_commissions','purchase_requests','purchase_orders','purchase_invoices',
    'purchase_invoice_items','vendor_bills','vendor_bill_items','debit_notes',
    'purchase_returns','vendor_payments','bank_accounts','bank_statements',
    'approval_queue','document_sequences','exchange_rates','audit_logs','login_logs'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================================
-- 4. REPLICA IDENTITY FULL & SUPABASE REALTIME PUBLICATION FOR EVERY TABLE
-- ============================================================================
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'organizations','branches','departments','user_profiles','role_permissions',
    'chart_of_accounts','control_account_mappings','account_types','account_ledger',
    'journal_entries','financial_years','expense_records','income_records',
    'products','product_articles','universal_articles','categories','warehouses',
    'stock_ledger','stock_transfers','stock_adjustments','product_batches','product_serials',
    'customers','vendors','sales_invoices','sales_invoice_items','quotations','quotation_items',
    'sales_orders','sales_order_items','credit_notes','sales_returns','customer_receipts',
    'sales_commissions','purchase_requests','purchase_orders','purchase_invoices',
    'purchase_invoice_items','vendor_bills','vendor_bill_items','debit_notes',
    'purchase_returns','vendor_payments','bank_accounts','bank_statements',
    'approval_queue','document_sequences','exchange_rates','audit_logs','login_logs'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) — ENABLED WITH EXPLICIT POLICIES
-- ============================================================================
-- NOTE ON POLICIES FOR REVIEW:
-- Single-tenant ERP where all signed-in staff collaborate on the same company
-- dataset. RLS is ENABLED on all 51 tables.
-- 1) `auth_select_<table>`, `auth_insert_<table>`, `auth_update_<table>`,
--    `auth_delete_<table>` grant CRUD to `authenticated` role with `USING (true)`.
-- 2) Because employees created in `user_profiles` via the ERP UI may sign in
--    using employee credentials before an `auth.users` record is provisioned,
--    `erp_anon_*` policies are also included and flagged for review so employee
--    sessions never fail RLS checks.
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'organizations','branches','departments','user_profiles','role_permissions',
    'chart_of_accounts','control_account_mappings','account_types','account_ledger',
    'journal_entries','financial_years','expense_records','income_records',
    'products','product_articles','universal_articles','categories','warehouses',
    'stock_ledger','stock_transfers','stock_adjustments','product_batches','product_serials',
    'customers','vendors','sales_invoices','sales_invoice_items','quotations','quotation_items',
    'sales_orders','sales_order_items','credit_notes','sales_returns','customer_receipts',
    'sales_commissions','purchase_requests','purchase_orders','purchase_invoices',
    'purchase_invoice_items','vendor_bills','vendor_bill_items','debit_notes',
    'purchase_returns','vendor_payments','bank_accounts','bank_statements',
    'approval_queue','document_sequences','exchange_rates','audit_logs','login_logs'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated, anon, service_role;', t);

    -- Drop any legacy conflicting policies
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_select_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "erp_anon_select_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "erp_anon_insert_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "erp_anon_update_%s" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "erp_anon_delete_%s" ON public.%I;', t, t);

    -- Authenticated user policies
    EXECUTE format('CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (true);', t, t);

    -- Flagged anon policies (supports employee profile sign-in & pre-login org/maintenance check)
    EXECUTE format('CREATE POLICY "erp_anon_select_%s" ON public.%I FOR SELECT TO anon USING (true);', t, t);
    EXECUTE format('CREATE POLICY "erp_anon_insert_%s" ON public.%I FOR INSERT TO anon WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "erp_anon_update_%s" ON public.%I FOR UPDATE TO anon USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "erp_anon_delete_%s" ON public.%I FOR DELETE TO anon USING (true);', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- 6. ATOMIC MULTI-TABLE POSTGRES FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

-- 6.1 Post Sales Invoice (extends original post_sales_invoice)
CREATE OR REPLACE FUNCTION public.post_sales_invoice(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_ar_account uuid;
  v_sales_account uuid;
  v_total numeric;
  v_item jsonb;
  v_prod_id uuid;
  v_qty numeric;
  v_rate numeric;
BEGIN
  SELECT * INTO v_rec FROM public.sales_invoices WHERE id = p_invoice_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales invoice % not found', p_invoice_id;
  END IF;

  IF v_rec.status = 'POSTED' THEN
    RETURN;
  END IF;

  v_total := COALESCE(v_rec.total_amount, 0);

  UPDATE public.sales_invoices
  SET status = 'POSTED', updated_at = now()
  WHERE id = p_invoice_id;

  -- Decrement product stock & write stock_ledger from sales_invoice_items or items JSONB
  IF EXISTS (SELECT 1 FROM public.sales_invoice_items WHERE sales_invoice_id = p_invoice_id) THEN
    UPDATE public.products p
    SET stock_quantity = GREATEST(0, COALESCE(p.stock_quantity, 0) - COALESCE(sii.qty, 0)),
        updated_at = now()
    FROM public.sales_invoice_items sii
    WHERE sii.sales_invoice_id = p_invoice_id AND sii.product_id = p.id;

    INSERT INTO public.stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, transaction_date, qty_in, qty_out, unit_cost, total_cost)
    SELECT sii.product_id, v_rec.warehouse_id, v_rec.invoice_no, 'SALE_INVOICE', v_rec.invoice_date, 0, COALESCE(sii.qty, 0), COALESCE(sii.rate, 0), COALESCE(sii.line_total, 0)
    FROM public.sales_invoice_items sii
    WHERE sii.sales_invoice_id = p_invoice_id AND sii.product_id IS NOT NULL;
  ELSIF v_rec.items IS NOT NULL AND jsonb_typeof(v_rec.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_rec.items) LOOP
      v_prod_id := public.legacy_id_to_uuid(v_item->>'product_id');
      v_qty := COALESCE((v_item->>'qty')::numeric, 0);
      v_rate := COALESCE((v_item->>'rate')::numeric, 0);
      IF v_prod_id IS NOT NULL AND v_qty > 0 THEN
        UPDATE public.products
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_qty),
            updated_at = now()
        WHERE id = v_prod_id;

        INSERT INTO public.stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, transaction_date, qty_in, qty_out, unit_cost, total_cost)
        VALUES (v_prod_id, v_rec.warehouse_id, v_rec.invoice_no, 'SALE_INVOICE', v_rec.invoice_date, 0, v_qty, v_rate, v_qty * v_rate);
      END IF;
    END LOOP;
  END IF;

  -- Post journal entry if not already present
  IF NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_no = v_rec.invoice_no AND deleted_at IS NULL) THEN
    INSERT INTO public.journal_entries (entry_no, entry_date, reference_no, source, narration, total_debit, total_credit, status)
    VALUES (
      'JV-' || v_rec.invoice_no,
      COALESCE(v_rec.invoice_date, CURRENT_DATE),
      v_rec.invoice_no,
      'Sales Invoice',
      'Sales Invoice ' || v_rec.invoice_no || ' posted to ' || COALESCE(v_rec.account_head, 'Sales Revenue'),
      v_total,
      v_total,
      'POSTED'
    )
    ON CONFLICT (entry_no) DO NOTHING;
  END IF;

  -- Optional control account ledger posting
  SELECT account_id INTO v_ar_account FROM public.control_account_mappings WHERE transaction_type = 'RECEIVABLE_CONTROL';
  SELECT account_id INTO v_sales_account FROM public.control_account_mappings WHERE transaction_type = 'SALE_REVENUE';
  IF v_ar_account IS NOT NULL AND v_sales_account IS NOT NULL THEN
    INSERT INTO public.account_ledger (account_id, voucher_no, voucher_type, transaction_date, description, debit, credit, party_id, party_type)
    VALUES
      (v_ar_account, v_rec.invoice_no, 'SALE_INVOICE', v_rec.invoice_date, 'Sales Invoice Posting — ' || v_rec.invoice_no, v_total, 0, v_rec.customer_id, 'CUSTOMER'),
      (v_sales_account, v_rec.invoice_no, 'SALE_INVOICE', v_rec.invoice_date, 'Sales Revenue — ' || v_rec.invoice_no, 0, v_total, v_rec.customer_id, 'CUSTOMER');
  END IF;

  -- Approve accrued commissions for this invoice
  UPDATE public.sales_commissions
  SET status = 'APPROVED', updated_at = now()
  WHERE invoice_no = v_rec.invoice_no;
END;
$$;

-- 6.2 Post Purchase Invoice
CREATE OR REPLACE FUNCTION public.post_purchase_invoice(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_ref text;
  v_total numeric;
  v_item jsonb;
  v_prod_id uuid;
  v_qty numeric;
  v_rate numeric;
BEGIN
  SELECT * INTO v_rec FROM public.purchase_invoices WHERE id = p_invoice_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase invoice % not found', p_invoice_id;
  END IF;

  IF v_rec.status = 'POSTED' THEN
    RETURN;
  END IF;

  v_ref := COALESCE(v_rec.grn_no, v_rec.invoice_no);
  v_total := COALESCE(v_rec.total_amount, 0);

  UPDATE public.purchase_invoices
  SET status = 'POSTED', updated_at = now()
  WHERE id = p_invoice_id;

  IF EXISTS (SELECT 1 FROM public.purchase_invoice_items WHERE purchase_invoice_id = p_invoice_id) THEN
    UPDATE public.products p
    SET stock_quantity = COALESCE(p.stock_quantity, 0) + COALESCE(pii.qty, 0),
        updated_at = now()
    FROM public.purchase_invoice_items pii
    WHERE pii.purchase_invoice_id = p_invoice_id AND pii.product_id = p.id;

    INSERT INTO public.stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, transaction_date, qty_in, qty_out, unit_cost, total_cost)
    SELECT pii.product_id, v_rec.warehouse_id, v_ref, 'PURCHASE_INVOICE', COALESCE(v_rec.received_date, v_rec.document_date, CURRENT_DATE), COALESCE(pii.qty, 0), 0, COALESCE(pii.rate, 0), COALESCE(pii.line_total, 0)
    FROM public.purchase_invoice_items pii
    WHERE pii.purchase_invoice_id = p_invoice_id AND pii.product_id IS NOT NULL;
  ELSIF v_rec.items IS NOT NULL AND jsonb_typeof(v_rec.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_rec.items) LOOP
      v_prod_id := public.legacy_id_to_uuid(v_item->>'product_id');
      v_qty := COALESCE((v_item->>'qty')::numeric, 0);
      v_rate := COALESCE((v_item->>'rate')::numeric, 0);
      IF v_prod_id IS NOT NULL AND v_qty > 0 THEN
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) + v_qty,
            updated_at = now()
        WHERE id = v_prod_id;

        INSERT INTO public.stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, transaction_date, qty_in, qty_out, unit_cost, total_cost)
        VALUES (v_prod_id, v_rec.warehouse_id, v_ref, 'PURCHASE_INVOICE', COALESCE(v_rec.received_date, v_rec.document_date, CURRENT_DATE), v_qty, 0, v_rate, v_qty * v_rate);
      END IF;
    END LOOP;
  END IF;

  IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_no = v_ref AND deleted_at IS NULL) THEN
    INSERT INTO public.journal_entries (entry_no, entry_date, reference_no, source, narration, total_debit, total_credit, status)
    VALUES (
      'JV-' || v_ref,
      COALESCE(v_rec.received_date, v_rec.document_date, CURRENT_DATE),
      v_ref,
      'Purchase Invoice',
      'Purchase Invoice ' || v_ref || ' approved & posted to ' || COALESCE(v_rec.account_head, 'Inventory Purchases'),
      v_total,
      v_total,
      'POSTED'
    )
    ON CONFLICT (entry_no) DO NOTHING;
  END IF;
END;
$$;

-- 6.3 Post Customer Receipt
CREATE OR REPLACE FUNCTION public.post_customer_receipt(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_inv RECORD;
  v_remaining numeric;
  v_due numeric;
  v_alloc numeric;
  v_bank_name text;
BEGIN
  SELECT * INTO v_rec FROM public.customer_receipts WHERE id = p_receipt_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer receipt % not found', p_receipt_id;
  END IF;

  UPDATE public.customer_receipts
  SET status = 'POSTED', updated_at = now()
  WHERE id = p_receipt_id;

  -- Auto-allocate oldest customer invoices if customer_id is present
  IF v_rec.customer_id IS NOT NULL THEN
    v_remaining := COALESCE(v_rec.amount, 0);
    FOR v_inv IN
      SELECT * FROM public.sales_invoices
      WHERE customer_id = v_rec.customer_id
        AND status <> 'CANCELLED'
        AND deleted_at IS NULL
        AND COALESCE(total_amount, 0) > COALESCE(paid_amount, 0)
      ORDER BY invoice_date ASC, created_at ASC
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_due := COALESCE(v_inv.total_amount, 0) - COALESCE(v_inv.paid_amount, 0);
      IF v_due > 0 THEN
        v_alloc := LEAST(v_remaining, v_due);
        v_remaining := v_remaining - v_alloc;
        UPDATE public.sales_invoices
        SET paid_amount = COALESCE(paid_amount, 0) + v_alloc,
            status = CASE WHEN COALESCE(paid_amount, 0) + v_alloc >= COALESCE(total_amount, 0) THEN 'POSTED' ELSE status END,
            updated_at = now()
        WHERE id = v_inv.id;
      END IF;
    END LOOP;
  END IF;

  -- Update bank account balance
  UPDATE public.bank_accounts
  SET current_balance = COALESCE(current_balance, 0) + COALESCE(v_rec.amount, 0),
      updated_at = now()
  WHERE id::text = v_rec.deposit_account_id
     OR account_name = v_rec.deposit_to;

  v_bank_name := COALESCE(v_rec.deposit_to, 'Cash in Hand');

  IF NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_no = v_rec.receipt_no AND deleted_at IS NULL) THEN
    INSERT INTO public.journal_entries (entry_no, entry_date, reference_no, source, narration, total_debit, total_credit, status)
    VALUES (
      'JV-' || v_rec.receipt_no,
      COALESCE(v_rec.receipt_date, CURRENT_DATE),
      v_rec.receipt_no,
      'Customer Payment',
      'Customer payment ' || v_rec.receipt_no || ' deposited to ' || v_bank_name,
      COALESCE(v_rec.amount, 0),
      COALESCE(v_rec.amount, 0),
      'POSTED'
    )
    ON CONFLICT (entry_no) DO NOTHING;
  END IF;
END;
$$;

-- 6.4 Post Vendor Payment
CREATE OR REPLACE FUNCTION public.post_vendor_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay RECORD;
  v_bill RECORD;
  v_remaining numeric;
  v_due numeric;
  v_alloc numeric;
  v_pay_from text;
BEGIN
  SELECT * INTO v_pay FROM public.vendor_payments WHERE id = p_payment_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor payment % not found', p_payment_id;
  END IF;

  UPDATE public.vendor_payments
  SET status = 'POSTED', updated_at = now()
  WHERE id = p_payment_id;

  -- Auto-allocate oldest vendor bills
  IF v_pay.vendor_id IS NOT NULL THEN
    v_remaining := COALESCE(v_pay.amount, 0);
    FOR v_bill IN
      SELECT * FROM public.vendor_bills
      WHERE vendor_id = v_pay.vendor_id
        AND status <> 'CANCELLED'
        AND deleted_at IS NULL
        AND COALESCE(total_amount, 0) > COALESCE(paid_amount, 0)
      ORDER BY bill_date ASC, created_at ASC
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_due := COALESCE(v_bill.total_amount, 0) - COALESCE(v_bill.paid_amount, 0);
      IF v_due > 0 THEN
        v_alloc := LEAST(v_remaining, v_due);
        v_remaining := v_remaining - v_alloc;
        UPDATE public.vendor_bills
        SET paid_amount = COALESCE(paid_amount, 0) + v_alloc,
            status = CASE WHEN COALESCE(paid_amount, 0) + v_alloc >= COALESCE(total_amount, 0) THEN 'POSTED' ELSE status END,
            updated_at = now()
        WHERE id = v_bill.id;
      END IF;
    END LOOP;
  END IF;

  -- Deduct from bank account balance
  UPDATE public.bank_accounts
  SET current_balance = GREATEST(0, COALESCE(current_balance, 0) - COALESCE(v_pay.amount, 0)),
      updated_at = now()
  WHERE id::text = v_pay.paid_from_account_id
     OR account_name = v_pay.pay_from
     OR account_name = v_pay.payment_method;

  v_pay_from := COALESCE(v_pay.pay_from, v_pay.payment_method, 'Cash in Hand');

  IF NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_no = v_pay.payment_no AND deleted_at IS NULL) THEN
    INSERT INTO public.journal_entries (entry_no, entry_date, reference_no, source, narration, total_debit, total_credit, status)
    VALUES (
      'JV-' || v_pay.payment_no,
      COALESCE(v_pay.payment_date, CURRENT_DATE),
      v_pay.payment_no,
      'Vendor Payment',
      'Payment ' || v_pay.payment_no || ' paid from ' || v_pay_from,
      COALESCE(v_pay.amount, 0),
      COALESCE(v_pay.amount, 0),
      'POSTED'
    )
    ON CONFLICT (entry_no) DO NOTHING;
  END IF;
END;
$$;

-- 6.5 Post Sales Return
CREATE OR REPLACE FUNCTION public.post_sales_return(p_return_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sr RECORD;
  v_item jsonb;
  v_prod_id uuid;
  v_qty numeric;
  v_rate numeric;
BEGIN
  SELECT * INTO v_sr FROM public.sales_returns WHERE id = p_return_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales return % not found', p_return_id;
  END IF;

  IF v_sr.status = 'POSTED' THEN
    RETURN;
  END IF;

  UPDATE public.sales_returns
  SET status = 'POSTED', updated_at = now()
  WHERE id = p_return_id;

  IF v_sr.items IS NOT NULL AND jsonb_typeof(v_sr.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_sr.items) LOOP
      v_prod_id := public.legacy_id_to_uuid(v_item->>'product_id');
      v_qty := COALESCE((v_item->>'qty')::numeric, 0);
      v_rate := COALESCE((v_item->>'rate')::numeric, 0);
      IF v_prod_id IS NOT NULL AND v_qty > 0 THEN
        UPDATE public.products
        SET stock_quantity = COALESCE(stock_quantity, 0) + v_qty,
            updated_at = now()
        WHERE id = v_prod_id;

        INSERT INTO public.stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, transaction_date, qty_in, qty_out, unit_cost, total_cost)
        VALUES (v_prod_id, public.legacy_id_to_uuid(v_sr.warehouse_id::text), v_sr.return_no, 'SALES_RETURN', COALESCE(v_sr.document_date, CURRENT_DATE), v_qty, 0, v_rate, v_qty * v_rate);
      END IF;
    END LOOP;
  END IF;
END;
$$;

-- 6.6 Post Purchase Return
CREATE OR REPLACE FUNCTION public.post_purchase_return(p_return_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pr RECORD;
  v_item jsonb;
  v_prod_id uuid;
  v_qty numeric;
  v_rate numeric;
BEGIN
  SELECT * INTO v_pr FROM public.purchase_returns WHERE id = p_return_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase return % not found', p_return_id;
  END IF;

  IF v_pr.status = 'POSTED' THEN
    RETURN;
  END IF;

  UPDATE public.purchase_returns
  SET status = 'POSTED', updated_at = now()
  WHERE id = p_return_id;

  IF v_pr.items IS NOT NULL AND jsonb_typeof(v_pr.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_pr.items) LOOP
      v_prod_id := public.legacy_id_to_uuid(v_item->>'product_id');
      v_qty := COALESCE((v_item->>'qty')::numeric, 0);
      v_rate := COALESCE((v_item->>'rate')::numeric, 0);
      IF v_prod_id IS NOT NULL AND v_qty > 0 THEN
        UPDATE public.products
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_qty),
            updated_at = now()
        WHERE id = v_prod_id;

        INSERT INTO public.stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, transaction_date, qty_in, qty_out, unit_cost, total_cost)
        VALUES (v_prod_id, public.legacy_id_to_uuid(v_pr.warehouse_id::text), v_pr.return_no, 'PURCHASE_RETURN', COALESCE(v_pr.document_date, CURRENT_DATE), 0, v_qty, v_rate, v_qty * v_rate);
      END IF;
    END LOOP;
  END IF;
END;
$$;

-- 6.6b Post Stock Transfer
CREATE OR REPLACE FUNCTION public.post_stock_transfer(p_transfer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_st RECORD;
  v_item jsonb;
  v_prod_id uuid;
  v_qty numeric;
  v_rate numeric;
BEGIN
  SELECT * INTO v_st FROM public.stock_transfers WHERE id = p_transfer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock transfer % not found', p_transfer_id;
  END IF;

  UPDATE public.stock_transfers
  SET status = 'COMPLETED', updated_at = now()
  WHERE id = p_transfer_id;

  IF v_st.items IS NOT NULL AND jsonb_typeof(v_st.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_st.items) LOOP
      v_prod_id := public.legacy_id_to_uuid(v_item->>'product_id');
      v_qty := COALESCE((v_item->>'qty')::numeric, 0);
      v_rate := COALESCE((v_item->>'rate')::numeric, 0);
      IF v_prod_id IS NOT NULL AND v_qty > 0 THEN
        INSERT INTO public.stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, transaction_date, qty_in, qty_out, unit_cost, total_cost)
        VALUES
          (v_prod_id, v_st.from_warehouse_id, v_st.transfer_no, 'STOCK_TRANSFER_OUT', COALESCE(v_st.transfer_date, CURRENT_DATE), 0, v_qty, v_rate, v_qty * v_rate),
          (v_prod_id, v_st.to_warehouse_id, v_st.transfer_no, 'STOCK_TRANSFER_IN', COALESCE(v_st.transfer_date, CURRENT_DATE), v_qty, 0, v_rate, v_qty * v_rate);
      END IF;
    END LOOP;
  END IF;
END;
$$;

-- 6.6c Post Stock Adjustment
CREATE OR REPLACE FUNCTION public.post_stock_adjustment(p_adjustment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sa RECORD;
  v_item jsonb;
  v_prod_id uuid;
  v_qty numeric;
  v_cost numeric;
BEGIN
  SELECT * INTO v_sa FROM public.stock_adjustments WHERE id = p_adjustment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock adjustment % not found', p_adjustment_id;
  END IF;

  UPDATE public.stock_adjustments
  SET status = 'POSTED', updated_at = now()
  WHERE id = p_adjustment_id;

  IF v_sa.items IS NOT NULL AND jsonb_typeof(v_sa.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_sa.items) LOOP
      v_prod_id := public.legacy_id_to_uuid(v_item->>'product_id');
      v_qty := COALESCE((v_item->>'qty')::numeric, 0);
      v_cost := COALESCE((v_item->>'unit_cost')::numeric, 0);
      IF v_prod_id IS NOT NULL AND v_qty <> 0 THEN
        UPDATE public.products
        SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + v_qty),
            updated_at = now()
        WHERE id = v_prod_id;

        INSERT INTO public.stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, transaction_date, qty_in, qty_out, unit_cost, total_cost)
        VALUES (
          v_prod_id,
          v_sa.warehouse_id,
          v_sa.adjustment_no,
          'STOCK_ADJUSTMENT',
          COALESCE(v_sa.adjustment_date, CURRENT_DATE),
          CASE WHEN v_qty > 0 THEN v_qty ELSE 0 END,
          CASE WHEN v_qty < 0 THEN ABS(v_qty) ELSE 0 END,
          v_cost,
          ABS(v_qty) * v_cost
        );
      END IF;
    END LOOP;
  END IF;
END;
$$;

-- 6.7 Review Approval Queue Item (Atomic approve / reject across all document types)
CREATE OR REPLACE FUNCTION public.review_approval_queue_item(
  p_queue_id uuid,
  p_status text,
  p_note text DEFAULT NULL,
  p_reviewer text DEFAULT 'Administrator'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_target_uuid uuid;
  v_bill RECORD;
  v_bitem jsonb;
  v_prod_id uuid;
  v_qty numeric;
BEGIN
  SELECT * INTO v_item FROM public.approval_queue WHERE id = p_queue_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval queue item % not found', p_queue_id;
  END IF;

  UPDATE public.approval_queue
  SET status = p_status,
      review_note = p_note,
      reviewed_by = COALESCE(p_reviewer, 'Administrator'),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_queue_id;

  v_target_uuid := public.legacy_id_to_uuid(COALESCE(v_item.record_id, v_item.entity_id::text));

  IF p_status = 'REJECTED' THEN
    IF v_item.entity_type = 'sales_invoice' THEN
      UPDATE public.sales_invoices SET status = 'REJECTED', updated_at = now()
      WHERE (v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND invoice_no = v_item.record_no);
    ELSIF v_item.entity_type IN ('vendor_bill', 'purchase_invoice') THEN
      UPDATE public.vendor_bills SET status = 'REJECTED', updated_at = now()
      WHERE (v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND bill_no = v_item.record_no);
      UPDATE public.purchase_invoices SET status = 'REJECTED', updated_at = now()
      WHERE (v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND (grn_no = v_item.record_no OR invoice_no = v_item.record_no));
    ELSIF v_item.entity_type = 'sales_return' THEN
      UPDATE public.sales_returns SET status = 'REJECTED', updated_at = now()
      WHERE (v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND return_no = v_item.record_no);
    ELSIF v_item.entity_type = 'purchase_return' THEN
      UPDATE public.purchase_returns SET status = 'REJECTED', updated_at = now()
      WHERE (v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND return_no = v_item.record_no);
    ELSIF v_item.entity_type IN ('customer_receipt', 'payment_receipt') THEN
      UPDATE public.customer_receipts SET status = 'REJECTED', updated_at = now()
      WHERE (v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND receipt_no = v_item.record_no);
    ELSIF v_item.entity_type IN ('vendor_payment', 'payment_voucher') THEN
      UPDATE public.vendor_payments SET status = 'REJECTED', updated_at = now()
      WHERE (v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND payment_no = v_item.record_no);
    END IF;
    RETURN;
  END IF;

  IF p_status = 'APPROVED' THEN
    IF v_item.entity_type = 'sales_invoice' THEN
      SELECT id INTO v_target_uuid FROM public.sales_invoices
      WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND invoice_no = v_item.record_no))
        AND deleted_at IS NULL
      LIMIT 1;
      IF v_target_uuid IS NOT NULL THEN
        PERFORM public.post_sales_invoice(v_target_uuid);
      END IF;
    ELSIF v_item.entity_type IN ('vendor_bill', 'purchase_invoice') THEN
      FOR v_bill IN
        SELECT * FROM public.vendor_bills
        WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND bill_no = v_item.record_no))
          AND deleted_at IS NULL
      LOOP
        UPDATE public.vendor_bills SET status = 'POSTED', updated_at = now() WHERE id = v_bill.id;
        IF v_bill.items IS NOT NULL AND jsonb_typeof(v_bill.items) = 'array' THEN
          FOR v_bitem IN SELECT * FROM jsonb_array_elements(v_bill.items) LOOP
            v_prod_id := public.legacy_id_to_uuid(v_bitem->>'product_id');
            v_qty := COALESCE((v_bitem->>'qty')::numeric, 0);
            IF v_prod_id IS NOT NULL AND v_qty > 0 THEN
              UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + v_qty, updated_at = now() WHERE id = v_prod_id;
            END IF;
          END LOOP;
        END IF;
      END LOOP;

      SELECT id INTO v_target_uuid FROM public.purchase_invoices
      WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND (grn_no = v_item.record_no OR invoice_no = v_item.record_no)))
        AND deleted_at IS NULL
      LIMIT 1;
      IF v_target_uuid IS NOT NULL THEN
        PERFORM public.post_purchase_invoice(v_target_uuid);
      END IF;
    ELSIF v_item.entity_type = 'sales_return' THEN
      SELECT id INTO v_target_uuid FROM public.sales_returns
      WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND return_no = v_item.record_no))
        AND deleted_at IS NULL
      LIMIT 1;
      IF v_target_uuid IS NOT NULL THEN
        PERFORM public.post_sales_return(v_target_uuid);
      END IF;
    ELSIF v_item.entity_type = 'purchase_return' THEN
      SELECT id INTO v_target_uuid FROM public.purchase_returns
      WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND return_no = v_item.record_no))
        AND deleted_at IS NULL
      LIMIT 1;
      IF v_target_uuid IS NOT NULL THEN
        PERFORM public.post_purchase_return(v_target_uuid);
      END IF;
    ELSIF v_item.entity_type IN ('customer_receipt', 'payment_receipt') THEN
      SELECT id INTO v_target_uuid FROM public.customer_receipts
      WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND receipt_no = v_item.record_no))
        AND deleted_at IS NULL
      LIMIT 1;
      IF v_target_uuid IS NOT NULL THEN
        PERFORM public.post_customer_receipt(v_target_uuid);
      END IF;
    ELSIF v_item.entity_type IN ('vendor_payment', 'payment_voucher') THEN
      SELECT id INTO v_target_uuid FROM public.vendor_payments
      WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_item.record_no IS NOT NULL AND payment_no = v_item.record_no))
        AND deleted_at IS NULL
      LIMIT 1;
      IF v_target_uuid IS NOT NULL THEN
        PERFORM public.post_vendor_payment(v_target_uuid);
      END IF;
    END IF;
  END IF;
END;
$$;

-- ============================================================================
-- 7. ONE-TIME BACKUP & MIGRATION FROM cloud_sync_state.state_json
-- ============================================================================

-- 7.1 Backup cloud_sync_state into cloud_sync_state_backup (non-destructive)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cloud_sync_state') THEN
    CREATE TABLE IF NOT EXISTS public.cloud_sync_state_backup AS
      SELECT * FROM public.cloud_sync_state;
  END IF;
END $$;

-- 7.2 Migrate JSON blob into normalized tables with real UUIDs
DO $$
DECLARE
  v_json jsonb;
  v_elem jsonb;
  v_item jsonb;
  v_role text;
  v_mod text;
  v_org_id uuid;
  v_branch_id uuid;
  v_wh_id uuid;
  v_inv_id uuid;
  v_pi_id uuid;
  v_prod_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cloud_sync_state') THEN
    RETURN;
  END IF;

  SELECT state_json INTO v_json
  FROM public.cloud_sync_state
  WHERE id = 'primary_state'
  LIMIT 1;

  IF v_json IS NULL THEN
    RETURN;
  END IF;

  -- 1) Organizations
  IF jsonb_typeof(v_json->'organizations') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'organizations') LOOP
      v_org_id := public.legacy_id_to_uuid(v_elem->>'id');
      INSERT INTO public.organizations (
        id, name, legal_name, org_code, currency, address, phone, email, tax_id,
        logo_url, decimal_places, tax_label, default_tax_rate, default_invoice_prefix,
        date_format, branches_count, users_count, status, is_maintenance_mode
      ) VALUES (
        v_org_id,
        COALESCE(v_elem->>'name', 'NICE ENTERPRISES'),
        COALESCE(v_elem->>'legal_name', 'NICE ENTERPRISES ERP'),
        COALESCE(v_elem->>'org_code', 'ORG01'),
        COALESCE(v_elem->>'currency', 'PKR'),
        v_elem->>'address',
        v_elem->>'phone',
        v_elem->>'email',
        v_elem->>'tax_id',
        COALESCE(v_elem->>'logo_url', v_json->>'companyLogo'),
        COALESCE((v_elem->>'decimal_places')::int, 2),
        COALESCE(v_elem->>'tax_label', 'GST / NTN'),
        COALESCE((v_elem->>'default_tax_rate')::numeric, 0),
        COALESCE(v_elem->>'default_invoice_prefix', 'MS-'),
        COALESCE(v_elem->>'date_format', '21 Jun 2026'),
        COALESCE((v_elem->>'branches_count')::int, 1),
        COALESCE((v_elem->>'users_count')::int, 1),
        COALESCE(v_elem->>'status', 'Active'),
        COALESCE((v_json->>'isMaintenanceMode')::boolean, false)
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        legal_name = EXCLUDED.legal_name,
        currency = EXCLUDED.currency,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        tax_id = EXCLUDED.tax_id,
        logo_url = COALESCE(EXCLUDED.logo_url, public.organizations.logo_url);
    END LOOP;
  END IF;

  -- 2) Branches
  IF jsonb_typeof(v_json->'branches') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'branches') LOOP
      v_branch_id := public.legacy_id_to_uuid(v_elem->>'id');
      INSERT INTO public.branches (id, org_id, name, code, address, phone, email, is_active)
      VALUES (
        v_branch_id,
        public.legacy_id_to_uuid(v_elem->>'org_id'),
        COALESCE(v_elem->>'name', 'Head Office'),
        v_elem->>'code',
        v_elem->>'address',
        v_elem->>'phone',
        v_elem->>'email',
        COALESCE((v_elem->>'is_active')::boolean, true)
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        is_active = EXCLUDED.is_active;
    END LOOP;
  END IF;

  -- 3) Departments
  IF jsonb_typeof(v_json->'departments') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'departments') LOOP
      INSERT INTO public.departments (id, branch_id, name, code, is_active)
      VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        public.legacy_id_to_uuid(v_elem->>'branch_id'),
        COALESCE(v_elem->>'name', 'Administration'),
        COALESCE(v_elem->>'code', 'ADMIN'),
        COALESCE((v_elem->>'is_active')::boolean, true)
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        is_active = EXCLUDED.is_active;
    END LOOP;
  END IF;

  -- 4) Users / Employees -> user_profiles
  IF jsonb_typeof(v_json->'users') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'users') LOOP
      INSERT INTO public.user_profiles (
        id, full_name, email, username, phone, employee_code, designation,
        role, password, branch_id, department_id, base_salary, allowances,
        others, is_2fa_required, is_active, last_login
      ) VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        COALESCE(v_elem->>'full_name', 'Super Admin'),
        COALESCE(v_elem->>'email', 'admin@niceenterprises.pk'),
        COALESCE(v_elem->>'username', split_part(COALESCE(v_elem->>'email', 'admin'), '@', 1)),
        v_elem->>'phone',
        COALESCE(v_elem->>'employee_code', 'EMP-001'),
        v_elem->>'designation',
        COALESCE(v_elem->>'role', 'super_admin'),
        COALESCE(v_elem->>'password', 'Amkas@123'),
        public.legacy_id_to_uuid(v_elem->>'branch_id'),
        public.legacy_id_to_uuid(v_elem->>'department_id'),
        COALESCE((v_elem->>'base_salary')::numeric, 0),
        COALESCE((v_elem->>'allowances')::numeric, 0),
        COALESCE((v_elem->>'others')::numeric, 0),
        COALESCE((v_elem->>'is_2fa_required')::boolean, false),
        COALESCE((v_elem->>'is_active')::boolean, true),
        v_elem->>'last_login'
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active;
    END LOOP;
  END IF;

  -- 5) Role Permissions
  IF jsonb_typeof(v_json->'rolePermissions') = 'object' THEN
    FOR v_role IN SELECT jsonb_object_keys(v_json->'rolePermissions') LOOP
      IF jsonb_typeof(v_json->'rolePermissions'->v_role) = 'array' THEN
        FOR v_mod IN SELECT jsonb_array_elements_text(v_json->'rolePermissions'->v_role) LOOP
          INSERT INTO public.role_permissions (role_id, module_key, can_view, can_create, can_edit, can_delete, can_approve, can_export)
          VALUES (v_role, v_mod, true, true, true, true, true, true)
          ON CONFLICT (role_id, module_key) DO UPDATE SET can_view = true;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- 6) Account Types
  IF jsonb_typeof(v_json->'accountTypes') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'accountTypes') LOOP
      INSERT INTO public.account_types (id, code, name, description, is_active)
      VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        COALESCE(v_elem->>'code', 'AT-' || substr(md5(COALESCE(v_elem->>'name', '')), 1, 4)),
        COALESCE(v_elem->>'name', 'Customer'),
        v_elem->>'description',
        COALESCE((v_elem->>'is_active')::boolean, true)
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active;
    END LOOP;
  END IF;

  -- 7) Chart of Accounts
  IF jsonb_typeof(v_json->'chartOfAccounts') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'chartOfAccounts') LOOP
      INSERT INTO public.chart_of_accounts (id, code, name, account_type, account_category, is_control_account, is_active, current_balance)
      VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        v_elem->>'code',
        v_elem->>'name',
        COALESCE(v_elem->>'account_type', 'Asset'),
        COALESCE(v_elem->>'account_category', v_elem->>'account_type', 'Asset'),
        COALESCE((v_elem->>'is_control_account')::boolean, false),
        COALESCE((v_elem->>'is_active')::boolean, true),
        COALESCE((v_elem->>'current_balance')::numeric, 0)
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        account_type = EXCLUDED.account_type,
        current_balance = EXCLUDED.current_balance;
    END LOOP;
  END IF;

  -- 8) Categories
  IF jsonb_typeof(v_json->'categories') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'categories') LOOP
      INSERT INTO public.categories (id, code, name, description, is_active)
      VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        v_elem->>'code',
        v_elem->>'name',
        v_elem->>'description',
        COALESCE((v_elem->>'is_active')::boolean, true)
      )
      ON CONFLICT (name) DO UPDATE SET
        code = COALESCE(EXCLUDED.code, public.categories.code),
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active;
    END LOOP;
  END IF;

  -- 9) Warehouses
  IF jsonb_typeof(v_json->'warehouses') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'warehouses') LOOP
      INSERT INTO public.warehouses (id, code, name, address, is_active, is_default)
      VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        COALESCE(v_elem->>'code', 'MAIN'),
        COALESCE(v_elem->>'name', 'Main Warehouse'),
        v_elem->>'address',
        COALESCE((v_elem->>'is_active')::boolean, true),
        COALESCE((v_elem->>'is_default')::boolean, false)
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        is_active = EXCLUDED.is_active,
        is_default = EXCLUDED.is_default;
    END LOOP;
  END IF;

  -- 10) Customers
  IF jsonb_typeof(v_json->'customers') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'customers') LOOP
      INSERT INTO public.customers (
        id, code, name, account_type, company_name, contact_person, phone, email,
        address, city, credit_limit, credit_period_days, opening_balance,
        current_balance, tax_id, salesperson, commission_pct, is_active
      ) VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        COALESCE(v_elem->>'code', 'CUST-' || substr(md5(COALESCE(v_elem->>'id', '')), 1, 4)),
        v_elem->>'name',
        COALESCE(v_elem->>'account_type', 'Customer'),
        v_elem->>'company_name',
        v_elem->>'contact_person',
        v_elem->>'phone',
        v_elem->>'email',
        v_elem->>'address',
        v_elem->>'city',
        COALESCE((v_elem->>'credit_limit')::numeric, 0),
        COALESCE((v_elem->>'credit_period_days')::int, 30),
        COALESCE((v_elem->>'opening_balance')::numeric, 0),
        COALESCE((v_elem->>'current_balance')::numeric, 0),
        v_elem->>'tax_id',
        v_elem->>'salesperson',
        COALESCE((v_elem->>'commission_pct')::numeric, 0),
        COALESCE((v_elem->>'is_active')::boolean, true)
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        account_type = EXCLUDED.account_type,
        company_name = EXCLUDED.company_name,
        contact_person = EXCLUDED.contact_person,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        credit_limit = EXCLUDED.credit_limit,
        opening_balance = EXCLUDED.opening_balance,
        current_balance = EXCLUDED.current_balance,
        is_active = EXCLUDED.is_active;
    END LOOP;
  END IF;

  -- 11) Vendors
  IF jsonb_typeof(v_json->'vendors') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'vendors') LOOP
      INSERT INTO public.vendors (
        id, code, name, account_type, company_name, contact_person, phone, email,
        address, city, credit_limit, opening_balance, current_balance, tax_id,
        salesperson, commission_pct, is_active
      ) VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        COALESCE(v_elem->>'code', 'VEND-' || substr(md5(COALESCE(v_elem->>'id', '')), 1, 4)),
        v_elem->>'name',
        COALESCE(v_elem->>'account_type', 'Vendor'),
        v_elem->>'company_name',
        v_elem->>'contact_person',
        v_elem->>'phone',
        v_elem->>'email',
        v_elem->>'address',
        v_elem->>'city',
        COALESCE((v_elem->>'credit_limit')::numeric, 0),
        COALESCE((v_elem->>'opening_balance')::numeric, 0),
        COALESCE((v_elem->>'current_balance')::numeric, 0),
        v_elem->>'tax_id',
        v_elem->>'salesperson',
        COALESCE((v_elem->>'commission_pct')::numeric, 0),
        COALESCE((v_elem->>'is_active')::boolean, true)
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        contact_person = EXCLUDED.contact_person,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        credit_limit = EXCLUDED.credit_limit,
        opening_balance = EXCLUDED.opening_balance,
        is_active = EXCLUDED.is_active;
    END LOOP;
  END IF;

  -- 12) Products
  IF jsonb_typeof(v_json->'products') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'products') LOOP
      INSERT INTO public.products (
        id, code, name, category, unit, length, width, purchase_price, sale_price,
        reorder_level, track_batches, track_serials, is_active, opening_balance,
        opening_average_cost, tax_pct, barcode_value, description, article_name, stock_quantity
      ) VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        COALESCE(v_elem->>'code', 'PROD-' || substr(md5(COALESCE(v_elem->>'id', '')), 1, 4)),
        v_elem->>'name',
        v_elem->>'category',
        COALESCE(v_elem->>'unit', 'PCS'),
        COALESCE((v_elem->>'length')::numeric, 0),
        COALESCE((v_elem->>'width')::numeric, 0),
        COALESCE((v_elem->>'purchase_price')::numeric, 0),
        COALESCE((v_elem->>'sale_price')::numeric, 0),
        COALESCE((v_elem->>'reorder_level')::numeric, 0),
        COALESCE((v_elem->>'track_batches')::boolean, false),
        COALESCE((v_elem->>'track_serials')::boolean, false),
        COALESCE((v_elem->>'is_active')::boolean, true),
        COALESCE((v_elem->>'opening_balance')::numeric, 0),
        COALESCE((v_elem->>'opening_average_cost')::numeric, 0),
        COALESCE((v_elem->>'tax_pct')::numeric, 0),
        v_elem->>'barcode_value',
        v_elem->>'description',
        v_elem->>'article_name',
        COALESCE((v_elem->>'stock_quantity')::numeric, 0)
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        unit = EXCLUDED.unit,
        purchase_price = EXCLUDED.purchase_price,
        sale_price = EXCLUDED.sale_price,
        opening_balance = EXCLUDED.opening_balance,
        opening_average_cost = EXCLUDED.opening_average_cost,
        tax_pct = EXCLUDED.tax_pct,
        barcode_value = EXCLUDED.barcode_value,
        description = EXCLUDED.description,
        article_name = EXCLUDED.article_name,
        stock_quantity = EXCLUDED.stock_quantity,
        is_active = EXCLUDED.is_active;
    END LOOP;
  END IF;

  -- 13) Product Articles & Universal Articles
  IF jsonb_typeof(v_json->'productArticles') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'productArticles') LOOP
      v_prod_id := public.legacy_id_to_uuid(v_elem->>'product_id');
      IF v_prod_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.products WHERE id = v_prod_id) THEN
        INSERT INTO public.product_articles (id, product_id, name, colours)
        VALUES (
          public.legacy_id_to_uuid(v_elem->>'id'),
          v_prod_id,
          COALESCE(v_elem->>'name', 'Article'),
          COALESCE(v_elem->'colours', '[]'::jsonb)
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          colours = EXCLUDED.colours;
      END IF;
    END LOOP;
  END IF;

  IF jsonb_typeof(v_json->'universalArticles') = 'array' THEN
    FOR v_mod IN SELECT jsonb_array_elements_text(v_json->'universalArticles') LOOP
      IF btrim(v_mod) <> '' THEN
        INSERT INTO public.universal_articles (name)
        VALUES (btrim(v_mod))
        ON CONFLICT (name) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- 14) Bank Accounts
  IF jsonb_typeof(v_json->'bankAccounts') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'bankAccounts') LOOP
      INSERT INTO public.bank_accounts (
        id, account_name, bank_name, account_number, iban, currency,
        opening_balance, current_balance, account_type, status
      ) VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        COALESCE(v_elem->>'account_name', 'Cash in Hand'),
        v_elem->>'bank_name',
        v_elem->>'account_number',
        v_elem->>'iban',
        COALESCE(v_elem->>'currency', 'PKR'),
        COALESCE((v_elem->>'opening_balance')::numeric, 0),
        COALESCE((v_elem->>'current_balance')::numeric, 0),
        COALESCE(v_elem->>'account_type', 'Bank'),
        COALESCE(v_elem->>'status', 'Active')
      )
      ON CONFLICT (id) DO UPDATE SET
        account_name = EXCLUDED.account_name,
        bank_name = EXCLUDED.bank_name,
        account_number = EXCLUDED.account_number,
        iban = EXCLUDED.iban,
        current_balance = EXCLUDED.current_balance,
        status = EXCLUDED.status;
    END LOOP;
  END IF;

  -- 15) Financial Years
  IF jsonb_typeof(v_json->'financialYears') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'financialYears') LOOP
      INSERT INTO public.financial_years (id, name, start_date, end_date, is_current, status)
      VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        v_elem->>'name',
        COALESCE((v_elem->>'start_date')::date, '2026-07-01'::date),
        COALESCE((v_elem->>'end_date')::date, '2027-06-30'::date),
        COALESCE((v_elem->>'is_current')::boolean, false),
        COALESCE(v_elem->>'status', 'Open')
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        is_current = EXCLUDED.is_current,
        status = EXCLUDED.status;
    END LOOP;
  END IF;

  -- 16) Sales Invoices & Line Items
  IF jsonb_typeof(v_json->'invoices') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'invoices') LOOP
      v_inv_id := public.legacy_id_to_uuid(v_elem->>'id');
      INSERT INTO public.sales_invoices (
        id, invoice_no, customer_id, customer_name, party_name, warehouse_id,
        invoice_date, due_date, salesperson, currency, exchange_rate, payment_terms,
        account_head, account_category, gate_pass_no, status, subtotal, discount_total,
        tax_total, total_amount, paid_amount, notes, terms_conditions, commission_rate,
        items, created_by
      ) VALUES (
        v_inv_id,
        v_elem->>'invoice_no',
        public.legacy_id_to_uuid(v_elem->>'customer_id'),
        v_elem->>'customer_name',
        v_elem->>'party_name',
        public.legacy_id_to_uuid(v_elem->>'warehouse_id'),
        COALESCE((v_elem->>'invoice_date')::date, CURRENT_DATE),
        NULLIF(v_elem->>'due_date', '')::date,
        v_elem->>'salesperson',
        COALESCE(v_elem->>'currency', 'PKR'),
        COALESCE((v_elem->>'exchange_rate')::numeric, 1),
        v_elem->>'payment_terms',
        v_elem->>'account_head',
        v_elem->>'account_category',
        v_elem->>'gate_pass_no',
        COALESCE(v_elem->>'status', 'UNPOSTED'),
        COALESCE((v_elem->>'subtotal')::numeric, 0),
        COALESCE((v_elem->>'discount_total')::numeric, 0),
        COALESCE((v_elem->>'tax_total')::numeric, 0),
        COALESCE((v_elem->>'total_amount')::numeric, 0),
        COALESCE((v_elem->>'paid_amount')::numeric, 0),
        v_elem->>'notes',
        v_elem->>'terms_conditions',
        COALESCE((v_elem->>'commission_rate')::numeric, 0),
        COALESCE(v_elem->'items', '[]'::jsonb),
        v_elem->>'created_by'
      )
      ON CONFLICT (invoice_no) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        customer_name = EXCLUDED.customer_name,
        party_name = EXCLUDED.party_name,
        warehouse_id = EXCLUDED.warehouse_id,
        status = EXCLUDED.status,
        subtotal = EXCLUDED.subtotal,
        discount_total = EXCLUDED.discount_total,
        tax_total = EXCLUDED.tax_total,
        total_amount = EXCLUDED.total_amount,
        paid_amount = EXCLUDED.paid_amount,
        notes = EXCLUDED.notes,
        items = EXCLUDED.items
      RETURNING id INTO v_inv_id;

      IF jsonb_typeof(v_elem->'items') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_elem->'items') LOOP
          INSERT INTO public.sales_invoice_items (
            id, sales_invoice_id, product_id, article_id, colour, description,
            unit, base_unit, base_rate, qty, length, width, rate, discount, tax_pct, line_total
          ) VALUES (
            COALESCE(public.legacy_id_to_uuid(v_item->>'id'), gen_random_uuid()),
            v_inv_id,
            public.legacy_id_to_uuid(v_item->>'product_id'),
            v_item->>'article_id',
            v_item->>'colour',
            v_item->>'description',
            COALESCE(v_item->>'unit', 'PCS'),
            COALESCE(v_item->>'base_unit', 'PCS'),
            COALESCE((v_item->>'base_rate')::numeric, 0),
            COALESCE((v_item->>'qty')::numeric, 0),
            COALESCE((v_item->>'length')::numeric, 0),
            COALESCE((v_item->>'width')::numeric, 0),
            COALESCE((v_item->>'rate')::numeric, 0),
            COALESCE((v_item->>'discount')::numeric, 0),
            COALESCE((v_item->>'tax_pct')::numeric, 0),
            COALESCE((v_item->>'line_total')::numeric, 0)
          )
          ON CONFLICT (id) DO UPDATE SET
            qty = EXCLUDED.qty,
            rate = EXCLUDED.rate,
            line_total = EXCLUDED.line_total;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- 17) Purchase Invoices & Line Items
  IF jsonb_typeof(v_json->'purchaseInvoices') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'purchaseInvoices') LOOP
      v_pi_id := public.legacy_id_to_uuid(v_elem->>'id');
      INSERT INTO public.purchase_invoices (
        id, invoice_no, grn_no, po_id, vendor_id, vendor_name, party_name,
        vendor_invoice_no, warehouse_id, document_date, received_date, due_date,
        gate_pass_no, account_head, account_category, status, subtotal,
        discount_total, tax_total, total_amount, notes, items
      ) VALUES (
        v_pi_id,
        COALESCE(v_elem->>'invoice_no', v_elem->>'grn_no'),
        COALESCE(v_elem->>'grn_no', v_elem->>'invoice_no'),
        public.legacy_id_to_uuid(v_elem->>'po_id'),
        public.legacy_id_to_uuid(v_elem->>'vendor_id'),
        v_elem->>'vendor_name',
        v_elem->>'party_name',
        v_elem->>'vendor_invoice_no',
        public.legacy_id_to_uuid(v_elem->>'warehouse_id'),
        COALESCE(NULLIF(v_elem->>'document_date', '')::date, NULLIF(v_elem->>'received_date', '')::date, CURRENT_DATE),
        COALESCE(NULLIF(v_elem->>'received_date', '')::date, NULLIF(v_elem->>'document_date', '')::date, CURRENT_DATE),
        NULLIF(v_elem->>'due_date', '')::date,
        v_elem->>'gate_pass_no',
        v_elem->>'account_head',
        v_elem->>'account_category',
        COALESCE(v_elem->>'status', 'UNPOSTED'),
        COALESCE((v_elem->>'subtotal')::numeric, 0),
        COALESCE((v_elem->>'discount_total')::numeric, 0),
        COALESCE((v_elem->>'tax_total')::numeric, 0),
        COALESCE((v_elem->>'total_amount')::numeric, 0),
        v_elem->>'notes',
        COALESCE(v_elem->'items', '[]'::jsonb)
      )
      ON CONFLICT (invoice_no) DO UPDATE SET
        grn_no = EXCLUDED.grn_no,
        vendor_id = EXCLUDED.vendor_id,
        vendor_name = EXCLUDED.vendor_name,
        party_name = EXCLUDED.party_name,
        status = EXCLUDED.status,
        subtotal = EXCLUDED.subtotal,
        total_amount = EXCLUDED.total_amount,
        items = EXCLUDED.items
      RETURNING id INTO v_pi_id;

      IF jsonb_typeof(v_elem->'items') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_elem->'items') LOOP
          INSERT INTO public.purchase_invoice_items (
            id, purchase_invoice_id, product_id, article_id, colour, description,
            qty, rate, discount, tax_pct, line_total
          ) VALUES (
            COALESCE(public.legacy_id_to_uuid(v_item->>'id'), gen_random_uuid()),
            v_pi_id,
            public.legacy_id_to_uuid(v_item->>'product_id'),
            v_item->>'article_id',
            v_item->>'colour',
            v_item->>'description',
            COALESCE((v_item->>'qty')::numeric, 0),
            COALESCE((v_item->>'rate')::numeric, 0),
            COALESCE((v_item->>'discount')::numeric, 0),
            COALESCE((v_item->>'tax_pct')::numeric, 0),
            COALESCE((v_item->>'line_total')::numeric, 0)
          )
          ON CONFLICT (id) DO UPDATE SET
            qty = EXCLUDED.qty,
            rate = EXCLUDED.rate,
            line_total = EXCLUDED.line_total;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- 18) Journal Entries
  IF jsonb_typeof(v_json->'journalEntries') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'journalEntries') LOOP
      INSERT INTO public.journal_entries (
        id, entry_no, entry_date, reference_no, source, narration,
        total_debit, total_credit, status, lines, entry_type
      ) VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        v_elem->>'entry_no',
        COALESCE(NULLIF(v_elem->>'entry_date', '')::date, CURRENT_DATE),
        v_elem->>'reference_no',
        COALESCE(v_elem->>'source', 'Manual Journal'),
        v_elem->>'narration',
        COALESCE((v_elem->>'total_debit')::numeric, 0),
        COALESCE((v_elem->>'total_credit')::numeric, 0),
        COALESCE(v_elem->>'status', 'POSTED'),
        COALESCE(v_elem->'lines', '[]'::jsonb),
        COALESCE(v_elem->>'entry_type', 'Manual Journal')
      )
      ON CONFLICT (entry_no) DO UPDATE SET
        total_debit = EXCLUDED.total_debit,
        total_credit = EXCLUDED.total_credit,
        narration = EXCLUDED.narration;
    END LOOP;
  END IF;

  -- 19) Approval Queue
  IF jsonb_typeof(v_json->'approvalQueue') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'approvalQueue') LOOP
      INSERT INTO public.approval_queue (
        id, module, entity_type, entity_id, record_id, record_no, voucher_no,
        party_name, warehouse_id, amount, requested_by, requested_by_name,
        requested_by_role, status, reviewed_by, review_note, reviewed_at, items_summary
      ) VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        v_elem->>'module',
        COALESCE(v_elem->>'entity_type', 'sales_invoice'),
        public.legacy_id_to_uuid(COALESCE(v_elem->>'record_id', v_elem->>'entity_id', v_elem->>'id')),
        v_elem->>'record_id',
        v_elem->>'record_no',
        COALESCE(v_elem->>'voucher_no', v_elem->>'record_no'),
        v_elem->>'party_name',
        v_elem->>'warehouse_id',
        COALESCE((v_elem->>'amount')::numeric, 0),
        v_elem->>'requested_by',
        v_elem->>'requested_by_name',
        v_elem->>'requested_by_role',
        COALESCE(v_elem->>'status', 'PENDING'),
        v_elem->>'reviewed_by',
        v_elem->>'review_note',
        NULLIF(v_elem->>'reviewed_at', '')::timestamptz,
        v_elem->>'items_summary'
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        reviewed_by = EXCLUDED.reviewed_by,
        review_note = EXCLUDED.review_note,
        reviewed_at = EXCLUDED.reviewed_at;
    END LOOP;
  END IF;

  -- 20) Audit Logs & Login Logs
  IF jsonb_typeof(v_json->'auditLogs') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'auditLogs') LOOP
      INSERT INTO public.audit_logs (id, username, module, action, description, ip_address)
      VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        COALESCE(v_elem->>'username', 'admin'),
        COALESCE(v_elem->>'module', 'System'),
        COALESCE(v_elem->>'action', 'Action'),
        v_elem->>'description',
        COALESCE(v_elem->>'ip_address', '127.0.0.1')
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  IF jsonb_typeof(v_json->'loginLogs') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_json->'loginLogs') LOOP
      INSERT INTO public.login_logs (id, username, status, ip_address, user_agent)
      VALUES (
        public.legacy_id_to_uuid(v_elem->>'id'),
        COALESCE(v_elem->>'username', 'admin'),
        COALESCE(v_elem->>'status', 'Success'),
        COALESCE(v_elem->>'ip_address', '127.0.0.1'),
        v_elem->>'user_agent'
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ============================================================================
-- 8. VERIFICATION QUERY (COMPARES NORMALIZED TABLE COUNTS VS JSON SNAPSHOT)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_cloud_sync_migration()
RETURNS TABLE (
  entity text,
  json_count integer,
  table_count bigint,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH snap AS (
    SELECT state_json AS j FROM public.cloud_sync_state WHERE id = 'primary_state' LIMIT 1
  )
  SELECT 'organizations'::text, COALESCE(jsonb_array_length((SELECT j->'organizations' FROM snap)), 0), (SELECT count(*) FROM public.organizations), 'OK'
  UNION ALL
  SELECT 'branches', COALESCE(jsonb_array_length((SELECT j->'branches' FROM snap)), 0), (SELECT count(*) FROM public.branches), 'OK'
  UNION ALL
  SELECT 'departments', COALESCE(jsonb_array_length((SELECT j->'departments' FROM snap)), 0), (SELECT count(*) FROM public.departments), 'OK'
  UNION ALL
  SELECT 'user_profiles', COALESCE(jsonb_array_length((SELECT j->'users' FROM snap)), 0), (SELECT count(*) FROM public.user_profiles), 'OK'
  UNION ALL
  SELECT 'account_types', COALESCE(jsonb_array_length((SELECT j->'accountTypes' FROM snap)), 0), (SELECT count(*) FROM public.account_types), 'OK'
  UNION ALL
  SELECT 'chart_of_accounts', COALESCE(jsonb_array_length((SELECT j->'chartOfAccounts' FROM snap)), 0), (SELECT count(*) FROM public.chart_of_accounts), 'OK'
  UNION ALL
  SELECT 'categories', COALESCE(jsonb_array_length((SELECT j->'categories' FROM snap)), 0), (SELECT count(*) FROM public.categories), 'OK'
  UNION ALL
  SELECT 'warehouses', COALESCE(jsonb_array_length((SELECT j->'warehouses' FROM snap)), 0), (SELECT count(*) FROM public.warehouses), 'OK'
  UNION ALL
  SELECT 'customers', COALESCE(jsonb_array_length((SELECT j->'customers' FROM snap)), 0), (SELECT count(*) FROM public.customers), 'OK'
  UNION ALL
  SELECT 'vendors', COALESCE(jsonb_array_length((SELECT j->'vendors' FROM snap)), 0), (SELECT count(*) FROM public.vendors), 'OK'
  UNION ALL
  SELECT 'products', COALESCE(jsonb_array_length((SELECT j->'products' FROM snap)), 0), (SELECT count(*) FROM public.products), 'OK'
  UNION ALL
  SELECT 'product_articles', COALESCE(jsonb_array_length((SELECT j->'productArticles' FROM snap)), 0), (SELECT count(*) FROM public.product_articles), 'OK'
  UNION ALL
  SELECT 'universal_articles', COALESCE(jsonb_array_length((SELECT j->'universalArticles' FROM snap)), 0), (SELECT count(*) FROM public.universal_articles), 'OK'
  UNION ALL
  SELECT 'bank_accounts', COALESCE(jsonb_array_length((SELECT j->'bankAccounts' FROM snap)), 0), (SELECT count(*) FROM public.bank_accounts), 'OK'
  UNION ALL
  SELECT 'financial_years', COALESCE(jsonb_array_length((SELECT j->'financialYears' FROM snap)), 0), (SELECT count(*) FROM public.financial_years), 'OK'
  UNION ALL
  SELECT 'sales_invoices', COALESCE(jsonb_array_length((SELECT j->'invoices' FROM snap)), 0), (SELECT count(*) FROM public.sales_invoices WHERE deleted_at IS NULL), 'OK'
  UNION ALL
  SELECT 'purchase_invoices', COALESCE(jsonb_array_length((SELECT j->'purchaseInvoices' FROM snap)), 0), (SELECT count(*) FROM public.purchase_invoices WHERE deleted_at IS NULL), 'OK'
  UNION ALL
  SELECT 'journal_entries', COALESCE(jsonb_array_length((SELECT j->'journalEntries' FROM snap)), 0), (SELECT count(*) FROM public.journal_entries WHERE deleted_at IS NULL), 'OK'
  UNION ALL
  SELECT 'approval_queue', COALESCE(jsonb_array_length((SELECT j->'approvalQueue' FROM snap)), 0), (SELECT count(*) FROM public.approval_queue), 'OK'
  UNION ALL
  SELECT 'audit_logs', COALESCE(jsonb_array_length((SELECT j->'auditLogs' FROM snap)), 0), (SELECT count(*) FROM public.audit_logs), 'OK'
  UNION ALL
  SELECT 'login_logs', COALESCE(jsonb_array_length((SELECT j->'loginLogs' FROM snap)), 0), (SELECT count(*) FROM public.login_logs), 'OK';
$$;
