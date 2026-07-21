-- Extended AMKAS ERP Schema Migration

-- Organizations & Branches & Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Extended User Profiles & Employees
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  employee_code TEXT UNIQUE,
  designation TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  base_salary NUMERIC DEFAULT 0,
  allowances NUMERIC DEFAULT 0,
  others NUMERIC DEFAULT 0,
  is_2fa_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_no TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  document_date DATE NOT NULL,
  valid_until DATE,
  salesperson TEXT,
  currency TEXT DEFAULT 'PKR',
  exchange_rate NUMERIC DEFAULT 1,
  status TEXT DEFAULT 'DRAFT', -- DRAFT, APPROVED, CONVERTED, REJECTED
  subtotal NUMERIC DEFAULT 0,
  discount_total NUMERIC DEFAULT 0,
  tax_total NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  terms_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT,
  qty NUMERIC DEFAULT 1,
  rate NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  tax_pct NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0
);

-- Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  document_date DATE NOT NULL,
  delivery_date DATE,
  salesperson TEXT,
  currency TEXT DEFAULT 'PKR',
  exchange_rate NUMERIC DEFAULT 1,
  status TEXT DEFAULT 'DRAFT', -- DRAFT, CONFIRMED, DELIVERED, CANCELLED
  subtotal NUMERIC DEFAULT 0,
  discount_total NUMERIC DEFAULT 0,
  tax_total NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  terms_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT,
  qty NUMERIC DEFAULT 1,
  rate NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  tax_pct NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0
);

-- Credit Notes / Sale Returns
CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_no TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
  document_date DATE NOT NULL,
  due_date DATE,
  salesperson TEXT,
  currency TEXT DEFAULT 'PKR',
  exchange_rate NUMERIC DEFAULT 1,
  status TEXT DEFAULT 'UNPOSTED', -- UNPOSTED, POSTED
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  terms_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Receipts & Smart Allocation
CREATE TABLE IF NOT EXISTS customer_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  receipt_date DATE NOT NULL,
  deposit_to TEXT NOT NULL, -- Cash in Hand / Bank Account
  amount NUMERIC DEFAULT 0,
  reference_no TEXT,
  currency TEXT DEFAULT 'PKR',
  exchange_rate NUMERIC DEFAULT 1,
  status TEXT DEFAULT 'POSTED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sales Commissions
CREATE TABLE IF NOT EXISTS sales_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL,
  customer_name TEXT,
  salesperson TEXT NOT NULL,
  rate_pct NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'ACCRUED', -- ACCRUED, APPROVED, PAID
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Requests
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no TEXT UNIQUE NOT NULL,
  document_date DATE NOT NULL,
  required_date DATE,
  requested_by TEXT,
  status TEXT DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, REJECTED
  total_amount NUMERIC DEFAULT 0,
  purpose_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no TEXT UNIQUE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  document_date DATE NOT NULL,
  expected_date DATE,
  currency TEXT DEFAULT 'PKR',
  exchange_rate NUMERIC DEFAULT 1,
  supplier_ref TEXT,
  status TEXT DEFAULT 'DRAFT', -- DRAFT, APPROVED, RECEIVED, CANCELLED
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Invoices
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  document_date DATE NOT NULL,
  due_date DATE,
  gate_pass_no TEXT,
  account_head TEXT,
  status TEXT DEFAULT 'UNPOSTED', -- UNPOSTED, POSTED
  subtotal NUMERIC DEFAULT 0,
  discount_total NUMERIC DEFAULT 0,
  tax_total NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor Bills
CREATE TABLE IF NOT EXISTS vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_no TEXT UNIQUE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  document_date DATE NOT NULL,
  due_date DATE,
  gate_pass_no TEXT,
  account_head TEXT,
  currency TEXT DEFAULT 'PKR',
  exchange_rate NUMERIC DEFAULT 1,
  supplier_ref TEXT,
  status TEXT DEFAULT 'UNPOSTED',
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Debit Notes / Purchase Returns
CREATE TABLE IF NOT EXISTS debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_no TEXT UNIQUE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  document_date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'UNPOSTED',
  total_amount NUMERIC DEFAULT 0,
  purpose_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor Payments
CREATE TABLE IF NOT EXISTS vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no TEXT UNIQUE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL,
  pay_from TEXT NOT NULL, -- Cash in Hand / Bank Account
  amount NUMERIC DEFAULT 0,
  reference_no TEXT,
  currency TEXT DEFAULT 'PKR',
  exchange_rate NUMERIC DEFAULT 1,
  status TEXT DEFAULT 'POSTED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_no TEXT UNIQUE NOT NULL,
  transfer_date DATE NOT NULL,
  from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'COMPLETED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_no TEXT UNIQUE NOT NULL,
  adjustment_date DATE NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT DEFAULT 'POSTED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Batches & Serials
CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_no TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  qty NUMERIC DEFAULT 0,
  expiry_date DATE,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no TEXT UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'In Stock',
  reference_no TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bank Accounts & Bank Statement Imports
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  iban TEXT,
  currency TEXT DEFAULT 'PKR',
  opening_balance NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  account_type TEXT DEFAULT 'Bank account',
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  period TEXT,
  total_rows INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Imported',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no TEXT UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  reference_no TEXT,
  source TEXT DEFAULT 'Manual Journal',
  narration TEXT,
  total_debit NUMERIC DEFAULT 0,
  total_credit NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'POSTED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial Years
CREATE TABLE IF NOT EXISTS financial_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document Numbering Sequences
CREATE TABLE IF NOT EXISTS document_sequences (
  document_type TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  next_number INTEGER DEFAULT 1,
  padding INTEGER DEFAULT 5,
  description TEXT
);

-- Currencies & Exchange Rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency TEXT NOT NULL,
  rate_date DATE NOT NULL,
  rate_to_pkr NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Roles & Permission Matrix
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  module_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  PRIMARY KEY (role_id, module_key)
);

-- Audit & Login Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  status TEXT NOT NULL, -- Success, Logged Out, Failed
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);
