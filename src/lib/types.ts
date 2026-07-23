export type InvoiceStatus = 'UNPOSTED' | 'POSTED';
export type DocStatus = 'DRAFT' | 'UNPOSTED' | 'POSTED' | 'PENDING' | 'CONFIRMED' | 'Confirmed' | 'APPROVED' | 'Accepted' | 'REJECTED' | 'COMPLETED' | 'Completed' | 'CANCELLED' | 'OPEN' | 'Open' | 'Sent' | 'Current';
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'Income';

export interface ExpenseRecord {
  id: string;
  number: string;
  date: string;
  account_id: string;
  account_name: string;
  description: string;
  cash_bank_account: string;
  amount: number;
  tax_amount?: number;
  reference?: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
  status: 'Posted' | 'Draft';
  created_at: string;
}

export interface IncomeRecord {
  id: string;
  number: string;
  date: string;
  account_id: string;
  account_name: string;
  description: string;
  cash_bank_account: string;
  amount: number;
  tax_amount?: number;
  reference?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  status: 'Posted' | 'Draft';
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  legal_name: string | null;
  org_code?: string;
  currency: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  logo_url?: string | null;
  decimal_places?: number;
  tax_label?: string;
  default_tax_rate?: number;
  default_invoice_prefix?: string;
  date_format?: string;
  branches_count?: number;
  users_count?: number;
  status?: string;
}

export interface Branch {
  id: string;
  org_id: string | null;
  name: string;
  code: string | null;
  address: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
}

export interface Department {
  id: string;
  branch_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  account_category?: string | null;
  parent_id: string | null;
  is_control_account?: boolean;
  is_active: boolean;
  normal_balance?: 'Debit' | 'Credit';
  current_balance?: number;
}

export interface ControlAccountMapping {
  transaction_type: string;
  account_id: string;
  description: string | null;
}

export interface AccountLedgerEntry {
  id: string;
  account_id: string;
  voucher_no: string | null;
  voucher_type: string | null;
  transaction_date: string | null;
  description: string | null;
  debit: number;
  credit: number;
  party_id: string | null;
  party_type: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit: string;
  length: number;
  width: number;
  purchase_price: number;
  sale_price: number;
  reorder_level: number;
  track_batches: boolean;
  track_serials: boolean;
  is_active: boolean;
  opening_average_cost?: number;
  cost_price?: number;
  tax_pct?: number;
  barcode_value?: string;
  description?: string;
  stock_quantity?: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  branch_id: string | null;
  address: string | null;
  is_active: boolean;
  is_default?: boolean;
}

export interface StockLedgerEntry {
  id: string;
  product_id: string;
  warehouse_id: string | null;
  voucher_no: string | null;
  voucher_type: string | null;
  transaction_date?: string | null;
  qty_in: number;
  qty_out: number;
  unit_cost: number;
  total_cost?: number;
  balance_after?: number;
  created_at: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  company_name?: string | null;
  contact_person?: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  credit_limit: number;
  credit_period_days?: number;
  opening_balance: number;
  current_balance?: number;
  tax_id: string | null;
  salesperson?: string | null;
  is_active: boolean;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  company_name?: string | null;
  contact_person?: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  credit_limit: number;
  opening_balance: number;
  current_balance?: number;
  tax_id: string | null;
  salesperson?: string | null;
  is_active: boolean;
}

export interface SalesInvoice {
  id: string;
  invoice_no: string;
  customer_id: string | null;
  warehouse_id: string | null;
  invoice_date: string;
  due_date: string | null;
  salesperson: string | null;
  currency: string;
  exchange_rate: number;
  payment_terms: string | null;
  account_head: string | null;
  account_category?: string | null;
  gate_pass_no: string | null;
  status: InvoiceStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  paid_amount: number;
  notes: string | null;
  terms_conditions?: string | null;
  commission_rate?: number;
  items?: SalesInvoiceItem[];
  created_by: string | null;
  created_at: string;
}

export interface SalesInvoiceItem {
  id: string;
  sales_invoice_id: string;
  product_id: string | null;
  description: string | null;
  qty: number;
  length: number;
  width: number;
  rate: number;
  discount: number;
  tax_pct: number;
  line_total: number;
}

export interface QuotationItem {
  id: string;
  quotation_id?: string;
  product_id: string | null;
  description: string | null;
  qty: number;
  rate: number;
  discount: number;
  tax_pct: number;
  line_total: number;
}

export interface Quotation {
  id: string;
  quotation_no: string;
  customer_id: string | null;
  quotation_date: string;
  document_date?: string;
  valid_until: string | null;
  salesperson: string | null;
  currency: string;
  exchange_rate?: number;
  status: DocStatus;
  subtotal: number;
  discount_total?: number;
  tax_total: number;
  total_amount: number;
  notes: string | null;
  terms_conditions?: string | null;
  converted_to_order?: boolean;
  org_id?: string | null;
  branch_id?: string | null;
  items?: QuotationItem[];
  created_at: string;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id?: string;
  product_id: string | null;
  description: string | null;
  qty: number;
  rate: number;
  discount: number;
  tax_pct: number;
  line_total: number;
}

export interface SalesOrder {
  id: string;
  order_no: string;
  customer_id: string | null;
  warehouse_id?: string | null;
  order_date: string;
  document_date?: string;
  delivery_date?: string | null;
  salesperson: string | null;
  currency: string;
  exchange_rate?: number;
  status: DocStatus;
  subtotal: number;
  discount_total?: number;
  tax_total: number;
  total_amount: number;
  notes: string | null;
  terms_conditions?: string | null;
  quotation_id?: string | null;
  converted_to_invoice?: boolean;
  org_id?: string | null;
  branch_id?: string | null;
  items?: SalesOrderItem[];
  created_at: string;
}

export interface CreditNoteItem {
  id: string;
  credit_note_id?: string;
  product_id: string | null;
  description: string | null;
  qty: number;
  rate: number;
  discount: number;
  tax_pct: number;
  line_total: number;
}

export interface CreditNote {
  id: string;
  credit_note_no: string;
  customer_id: string | null;
  warehouse_id?: string | null;
  sales_invoice_id?: string | null;
  invoice_id?: string | null;
  note_date: string;
  document_date?: string;
  due_date?: string | null;
  salesperson?: string | null;
  currency?: string;
  exchange_rate?: number;
  reason?: string;
  status: InvoiceStatus | DocStatus | string;
  subtotal?: number;
  discount_total?: number;
  tax_total?: number;
  total_amount: number;
  notes?: string | null;
  terms_conditions?: string | null;
  org_id?: string | null;
  branch_id?: string | null;
  items?: CreditNoteItem[];
  created_at: string;
}

export interface CustomerReceipt {
  id: string;
  receipt_no: string;
  customer_id: string | null;
  sales_invoice_id?: string | null;
  receipt_date: string;
  payment_method: string;
  deposit_account_id: string;
  deposit_to?: string;
  amount: number;
  cheque_number?: string | null;
  cheque_date?: string | null;
  reference_no?: string | null;
  currency?: string;
  exchange_rate?: number;
  status?: string;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface SalesCommission {
  id: string;
  invoice_no: string;
  customer_name: string;
  salesperson: string;
  rate_pct: number;
  commission_amount: number;
  status: 'ACCRUED' | 'APPROVED' | 'PAID';
  created_at: string;
}

export interface PurchaseRequest {
  id: string;
  request_no: string;
  department_id?: string | null;
  request_date: string;
  document_date?: string;
  required_date: string | null;
  requested_by: string | null;
  status: DocStatus;
  total_amount?: number;
  purpose_reason?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_no: string;
  vendor_id: string | null;
  warehouse_id?: string | null;
  po_date: string;
  document_date?: string;
  expected_delivery?: string | null;
  expected_date?: string | null;
  currency: string;
  exchange_rate?: number;
  supplier_ref?: string | null;
  status: DocStatus;
  subtotal?: number;
  tax_total?: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
}

export interface PurchaseInvoice {
  id: string;
  grn_no: string;
  invoice_no?: string;
  po_id: string | null;
  vendor_id: string | null;
  warehouse_id: string | null;
  received_date: string;
  document_date?: string;
  due_date?: string | null;
  gate_pass_no?: string | null;
  account_head?: string | null;
  account_category?: string | null;
  status: DocStatus | InvoiceStatus;
  subtotal?: number;
  discount_total?: number;
  tax_total?: number;
  total_amount?: number;
  notes: string | null;
  created_at: string;
}

export interface VendorBill {
  id: string;
  bill_no: string;
  vendor_id: string | null;
  warehouse_id: string | null;
  bill_date: string;
  document_date?: string;
  due_date: string | null;
  vendor_invoice_no?: string | null;
  gate_pass_no?: string | null;
  account_head: string | null;
  account_category?: string | null;
  currency: string;
  exchange_rate: number;
  payment_terms?: string | null;
  supplier_ref?: string | null;
  status: InvoiceStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  paid_amount?: number;
  notes: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface DebitNote {
  id: string;
  debit_note_no: string;
  vendor_id: string | null;
  vendor_bill_id: string | null;
  warehouse_id?: string | null;
  note_date: string;
  document_date?: string;
  due_date?: string | null;
  reason: string;
  status: InvoiceStatus | DocStatus;
  total_amount: number;
  purpose_reason?: string | null;
  created_at: string;
}

export interface VendorPayment {
  id: string;
  payment_no: string;
  vendor_id: string | null;
  vendor_bill_id?: string | null;
  payment_date: string;
  payment_method: string;
  paid_from_account_id: string;
  pay_from?: string;
  amount: number;
  cheque_number?: string | null;
  cheque_date?: string | null;
  reference_no?: string | null;
  currency?: string;
  exchange_rate?: number;
  status?: string;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface StockTransfer {
  id: string;
  transfer_no: string;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  transfer_date: string;
  status: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface StockAdjustment {
  id: string;
  adjustment_no: string;
  warehouse_id: string | null;
  adjustment_date: string;
  reason: string | null;
  status: string;
  created_by?: string | null;
  created_at: string;
}

export interface ProductBatch {
  id: string;
  product_id: string;
  batch_number: string;
  batch_no?: string;
  warehouse_id?: string | null;
  manufacture_date?: string | null;
  expiry_date: string | null;
  quantity_initial: number;
  quantity_on_hand: number;
  qty?: number;
  unit_cost: number;
  is_active: boolean;
  status?: string;
}

export interface ProductSerial {
  id: string;
  product_id: string;
  serial_number: string;
  serial_no?: string;
  warehouse_id: string | null;
  status: string;
  reference_no?: string | null;
  created_at: string;
}

export interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  iban: string | null;
  currency: string;
  opening_balance: number;
  current_balance: number;
  account_type: string;
  status: string;
}

export interface BankStatement {
  id: string;
  bank_account_id?: string | null;
  account_name: string;
  transaction_date?: string;
  description?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  file_name?: string;
  period?: string | null;
  total_rows?: number;
  is_reconciled?: boolean;
  status: string;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  entry_no: string;
  entry_date: string;
  reference_no: string | null;
  source: string;
  narration: string | null;
  total_debit: number;
  total_credit: number;
  status: string;
  created_at: string;
}

export interface FinancialYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: string;
}

export interface UserEmployee {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  employee_code: string;
  designation: string | null;
  role: string;
  branch_id: string | null;
  department_id: string | null;
  base_salary: number;
  allowances: number;
  others: number;
  is_2fa_required?: boolean;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  password?: string;
}

export interface DocumentSequence {
  document_type: string;
  prefix: string;
  next_number: number;
  padding: number;
  description: string | null;
}

export interface ExchangeRate {
  id: string;
  currency: string;
  rate_date: string;
  rate_to_pkr: number;
  updated_at: string;
}

export interface ModulePermission {
  role_id: string;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
}

export interface AuditLog {
  id: string;
  username: string;
  module: string;
  action: string;
  description: string;
  ip_address: string;
  timestamp: string;
}

export interface LoginLog {
  id: string;
  username: string;
  status: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

export interface ApprovalQueueItem {
  id: string;
  module?: string;
  entity_type?: string;
  record_id?: string;
  entity_id?: string;
  voucher_no?: string | null;
  record_no?: string;
  amount: number;
  requested_by: string | null;
  status: string;
  reviewed_by?: string | null;
  review_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

export interface Category {
  id: string;
  name: string;
  code?: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}
