import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ROLE_MODULES, type Role, type ModuleKey } from './rbac';
import type {
  Customer,
  Vendor,
  Product,
  Category,
  Warehouse,
  SalesInvoice,
  Quotation,
  SalesOrder,
  CreditNote,
  CustomerReceipt,
  SalesCommission,
  PurchaseRequest,
  PurchaseOrder,
  PurchaseInvoice,
  VendorBill,
  DebitNote,
  VendorPayment,
  StockTransfer,
  StockAdjustment,
  ProductBatch,
  ProductSerial,
  BankAccount,
  BankStatement,
  JournalEntry,
  FinancialYear,
  Organization,
  Branch,
  Department,
  UserEmployee,
  ExchangeRate,
  AuditLog,
  LoginLog,
  ChartOfAccount,
  ApprovalQueueItem,
  ExpenseRecord,
  IncomeRecord,
} from './types';

// Initial Seed Data
const initialCustomers: Customer[] = [
  {
    id: 'c1',
    code: 'CUS-00001',
    name: 'POPO',
    contact_person: 'Mr. Popo',
    phone: '+92 300 1234567',
    email: 'popo@example.com',
    address: 'Main Bazaar',
    city: 'Lahore',
    credit_limit: 50000,
    opening_balance: 0,
    tax_id: 'NTN-123456',
    salesperson: 'admin',
    is_active: true,
  },
  {
    id: 'c2',
    code: 'CUS-00002',
    name: 'OTEX ENTERPRISES',
    contact_person: 'Mr. Otex',
    phone: '+92 321 7654321',
    email: 'otex@example.com',
    address: 'Factory Area',
    city: 'SIALKOT',
    credit_limit: 100000,
    opening_balance: 0,
    tax_id: 'NTN-987654',
    salesperson: 'admin',
    is_active: true,
  },
];

const initialVendors: Vendor[] = [
  {
    id: 'v1',
    code: 'VEN-00001',
    name: 'Top Pops',
    contact_person: 'Sales Rep',
    phone: '+92 300 9998877',
    email: 'toppops@example.com',
    address: 'Industrial Zone',
    city: 'Lahore',
    credit_limit: 200000,
    opening_balance: 0,
    tax_id: 'NTN-554433',
    salesperson: 'admin',
    is_active: false,
  },
  {
    id: 'v2',
    code: 'VEN-00002',
    name: 'AA TEXTILE',
    contact_person: 'Ali Ahmad',
    phone: '+92 333 1122334',
    email: 'aatextile@example.com',
    address: 'Textile Market',
    city: 'MULTAN',
    credit_limit: 150000,
    opening_balance: 0,
    tax_id: 'NTN-112233',
    salesperson: 'admin',
    is_active: true,
  },
  {
    id: 'v3',
    code: 'VEN-00003',
    name: 'DYNAMIC TEXTILE',
    contact_person: 'Usman Ghani',
    phone: '+92 345 5566778',
    email: 'dynamic@example.com',
    address: 'Gulberg',
    city: 'LAHORE',
    credit_limit: 300000,
    opening_balance: 0,
    tax_id: 'NTN-998877',
    salesperson: 'admin',
    is_active: true,
  },
];

const initialProducts: Product[] = [
  {
    id: 'p1',
    code: 'SKU-00001',
    name: 'Hello Cotton Fabric',
    category: 'RUMAL',
    unit: 'pcs',
    length: 0,
    width: 0,
    purchase_price: 150,
    sale_price: 250,
    reorder_level: 10,
    track_batches: true,
    track_serials: false,
    is_active: true,
    opening_average_cost: 140,
    tax_pct: 0,
    barcode_value: 'SKU-00001',
    description: 'Cotton fabric item',
    stock_quantity: 500,
  },
];

const initialCategories: Category[] = [
  { id: 'cat1', name: 'RUMAL', code: '001', description: 'Handkerchief & Linen', is_active: true, created_at: '2026-07-21' },
];

const initialWarehouses: Warehouse[] = [
  {
    id: 'w1',
    code: 'MAIN',
    name: 'Main Warehouse',
    branch_id: 'b1',
    address: 'Head Office Compound',
    is_active: true,
    is_default: true,
  },
];

const initialInvoices: SalesInvoice[] = [
  {
    id: 'inv1',
    invoice_no: 'MS-00001',
    customer_id: 'c2',
    warehouse_id: 'w1',
    invoice_date: '2026-07-15',
    due_date: '2026-07-30',
    salesperson: 'admin',
    currency: 'PKR',
    exchange_rate: 1,
    payment_terms: 'Net 30',
    account_head: 'Default Sales Revenue',
    gate_pass_no: 'GP-1001',
    status: 'POSTED',
    subtotal: 5000,
    discount_total: 0,
    tax_total: 0,
    total_amount: 5000,
    paid_amount: 0,
    notes: 'Sample invoice',
    created_by: 'admin',
    created_at: '2026-07-15T10:00:00Z',
  },
];

const initialCOA: ChartOfAccount[] = [
  { id: 'coa1', code: '1000', name: 'ASSETS', account_type: 'Asset', parent_id: null, is_active: true, current_balance: 105054 },
  { id: 'coa2', code: '1100', name: 'Cash & Bank Accounts', account_type: 'Asset', parent_id: 'coa1', is_active: true, current_balance: 5054 },
  { id: 'coa3', code: '1110', name: 'Cash in Hand', account_type: 'Asset', parent_id: 'coa2', is_active: true, current_balance: 5054 },
  { id: 'coa4', code: '1200', name: 'Accounts Receivable', account_type: 'Asset', parent_id: 'coa1', is_active: true, current_balance: 100000 },
  { id: 'coa5', code: '2000', name: 'LIABILITIES', account_type: 'Liability', parent_id: null, is_active: true, current_balance: 45000 },
  { id: 'coa6', code: '2100', name: 'Accounts Payable', account_type: 'Liability', parent_id: 'coa5', is_active: true, current_balance: 45000 },
  { id: 'coa7', code: '4000', name: 'REVENUE', account_type: 'Revenue', parent_id: null, is_active: true, current_balance: 150000 },
  { id: 'coa8', code: '4100', name: 'Sales Revenue', account_type: 'Revenue', parent_id: 'coa7', is_active: true, current_balance: 150000 },
  { id: 'coa9', code: '5000', name: 'EXPENSES', account_type: 'Expense', parent_id: null, is_active: true, current_balance: 25000 },
  { id: 'coa10', code: '5100', name: 'Cost of Goods Sold', account_type: 'Expense', parent_id: 'coa9', is_active: true, current_balance: 25000 },
];

const initialApprovals: ApprovalQueueItem[] = [
  { id: 'app1', module: 'sales_invoice', record_id: 'inv1', record_no: 'MS-00001', requested_by: 'sales_user', amount: 5000, status: 'PENDING', created_at: '2026-07-21T14:00:00Z' }
];

interface DataStoreState {
  // State Arrays
  customers: Customer[];
  vendors: Vendor[];
  products: Product[];
  categories: Category[];
  warehouses: Warehouse[];
  invoices: SalesInvoice[];
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  creditNotes: CreditNote[];
  customerReceipts: CustomerReceipt[];
  commissions: SalesCommission[];
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  purchaseInvoices: PurchaseInvoice[];
  vendorBills: VendorBill[];
  debitNotes: DebitNote[];
  vendorPayments: VendorPayment[];
  stockTransfers: StockTransfer[];
  stockAdjustments: StockAdjustment[];
  batches: ProductBatch[];
  serials: ProductSerial[];
  bankAccounts: BankAccount[];
  bankStatements: BankStatement[];
  journalEntries: JournalEntry[];
  financialYears: FinancialYear[];
  chartOfAccounts: ChartOfAccount[];
  approvalQueue: ApprovalQueueItem[];
  organizations: Organization[];
  branches: Branch[];
  departments: Department[];
  users: UserEmployee[];
  auditLogs: AuditLog[];
  loginLogs: LoginLog[];
  rolePermissions: Record<Role, ModuleKey[]>;
  expenseRecords: ExpenseRecord[];
  incomeRecords: IncomeRecord[];

  // Logo / Branding State
  companyLogo: string | null;
  orgSettings: Partial<Organization>;

  // Audit & Security Actions
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;
  addLoginLog: (log: Omit<LoginLog, 'id'>) => void;
  updateRolePermissions: (role: Role, modules: ModuleKey[]) => void;

  // Expense & Income Actions
  addExpenseRecord: (e: Omit<ExpenseRecord, 'id'>) => void;
  addIncomeRecord: (i: Omit<IncomeRecord, 'id'>) => void;

  // Customer Actions
  addCustomer: (c: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Vendor Actions
  addVendor: (v: Omit<Vendor, 'id'>) => void;
  updateVendor: (id: string, v: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;

  // Product Actions
  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Category Actions
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Warehouse Actions
  addWarehouse: (w: Omit<Warehouse, 'id'>) => void;
  updateWarehouse: (id: string, w: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;

  // Invoice & Sales Actions
  addInvoice: (inv: Omit<SalesInvoice, 'id'>) => void;
  updateInvoice: (id: string, inv: Partial<SalesInvoice>) => void;
  deleteInvoice: (id: string) => void;

  addQuotation: (q: Omit<Quotation, 'id'>) => void;
  updateQuotation: (id: string, q: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;

  addSalesOrder: (so: Omit<SalesOrder, 'id'>) => void;
  updateSalesOrder: (id: string, so: Partial<SalesOrder>) => void;
  deleteSalesOrder: (id: string) => void;

  addCreditNote: (cn: Omit<CreditNote, 'id'>) => void;
  updateCreditNote: (id: string, cn: Partial<CreditNote>) => void;
  deleteCreditNote: (id: string) => void;

  addCustomerReceipt: (r: Omit<CustomerReceipt, 'id'>) => void;
  updateCustomerReceipt: (id: string, r: Partial<CustomerReceipt>) => void;
  deleteCustomerReceipt: (id: string) => void;

  // Purchase Actions
  addPurchaseRequest: (pr: Omit<PurchaseRequest, 'id'>) => void;
  updatePurchaseRequest: (id: string, pr: Partial<PurchaseRequest>) => void;
  deletePurchaseRequest: (id: string) => void;

  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => void;
  updatePurchaseOrder: (id: string, po: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;

  addPurchaseInvoice: (pi: Omit<PurchaseInvoice, 'id'>) => void;
  updatePurchaseInvoice: (id: string, pi: Partial<PurchaseInvoice>) => void;
  deletePurchaseInvoice: (id: string) => void;

  addVendorBill: (vb: Omit<VendorBill, 'id'>) => void;
  updateVendorBill: (id: string, vb: Partial<VendorBill>) => void;
  deleteVendorBill: (id: string) => void;

  addDebitNote: (dn: Omit<DebitNote, 'id'>) => void;
  updateDebitNote: (id: string, dn: Partial<DebitNote>) => void;
  deleteDebitNote: (id: string) => void;

  addVendorPayment: (vp: Omit<VendorPayment, 'id'>) => void;
  updateVendorPayment: (id: string, vp: Partial<VendorPayment>) => void;
  deleteVendorPayment: (id: string) => void;

  // Inventory Actions
  addStockTransfer: (st: Omit<StockTransfer, 'id'>) => void;
  updateStockTransfer: (id: string, st: Partial<StockTransfer>) => void;
  deleteStockTransfer: (id: string) => void;

  addStockAdjustment: (sa: Omit<StockAdjustment, 'id'>) => void;
  updateStockAdjustment: (id: string, sa: Partial<StockAdjustment>) => void;
  deleteStockAdjustment: (id: string) => void;

  addBatch: (b: Omit<ProductBatch, 'id'>) => void;
  updateBatch: (id: string, b: Partial<ProductBatch>) => void;
  deleteBatch: (id: string) => void;

  addSerial: (s: Omit<ProductSerial, 'id'>) => void;
  updateSerial: (id: string, s: Partial<ProductSerial>) => void;
  deleteSerial: (id: string) => void;

  // Banking Actions
  addBankAccount: (ba: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, ba: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;

  // Accounting & COA Actions
  addJournalEntry: (je: Omit<JournalEntry, 'id'>) => void;
  updateJournalEntry: (id: string, je: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;

  addCOAccount: (coa: Omit<ChartOfAccount, 'id'>) => void;
  updateCOAccount: (id: string, coa: Partial<ChartOfAccount>) => void;
  deleteCOAccount: (id: string) => void;

  addFinancialYear: (fy: Omit<FinancialYear, 'id'>) => void;
  updateFinancialYear: (id: string, fy: Partial<FinancialYear>) => void;

  // Approvals Action
  reviewApproval: (id: string, status: 'APPROVED' | 'REJECTED', note?: string) => void;

  // Org & Branch & Dept Actions
  addOrg: (o: Omit<Organization, 'id'>) => void;
  updateOrg: (id: string, o: Partial<Organization>) => void;
  deleteOrg: (id: string) => void;

  addBranch: (b: Omit<Branch, 'id'>) => void;
  updateBranch: (id: string, b: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;

  addDepartment: (d: Omit<Department, 'id'>) => void;
  updateDepartment: (id: string, d: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;

  addUser: (u: Omit<UserEmployee, 'id'>) => void;
  updateUser: (id: string, u: Partial<UserEmployee>) => void;
  deleteUser: (id: string) => void;

  // Logo Upload Action
  setCompanyLogo: (logoUrl: string | null) => void;
  updateOrgSettings: (patch: Partial<Organization>) => void;

  // Clear / Reset Data Action
  resetBusinessData: () => void;
}

export const useDataStore = create<DataStoreState>()(
  persist(
    (set) => ({
      customers: initialCustomers,
      vendors: initialVendors,
      products: initialProducts,
      categories: initialCategories,
      warehouses: initialWarehouses,
      invoices: initialInvoices,
      quotations: [],
      salesOrders: [],
      creditNotes: [],
      customerReceipts: [],
      commissions: [],
      purchaseRequests: [],
      purchaseOrders: [],
      purchaseInvoices: [],
      vendorBills: [],
      debitNotes: [],
      vendorPayments: [],
      stockTransfers: [],
      stockAdjustments: [],
      batches: [
        { id: 'b1', product_id: 'p1', batch_number: 'BAT-2026-001', manufacture_date: '2026-01-01', expiry_date: '2027-12-31', quantity_initial: 500, quantity_on_hand: 500, unit_cost: 140, is_active: true }
      ],
      serials: [],
      bankAccounts: [
        { id: 'ba1', account_name: 'Cash in Hand', bank_name: 'Cash', account_number: '1110', iban: null, currency: 'PKR', opening_balance: 5054, current_balance: 5054, account_type: 'Cash', status: 'Active' },
        { id: 'ba2', account_name: 'Meezan Islamic Main Account', bank_name: 'Meezan Bank', account_number: '0102998877', iban: 'PK36MEZN000102998877', currency: 'PKR', opening_balance: 100000, current_balance: 100000, account_type: 'Bank', status: 'Active' }
      ],
      bankStatements: [],
      journalEntries: [
        { id: 'j1', entry_no: 'JV-00009', entry_date: '2026-07-14', reference_no: 'CP-00003', source: 'Payment', narration: 'Vendor payment CP-00003', total_debit: 900, total_credit: 900, status: 'POSTED', created_at: '2026-07-14T10:00:00Z' }
      ],
      financialYears: [
        { id: 'fy1', name: '2026-27', start_date: '2026-07-01', end_date: '2027-06-30', is_current: true, status: 'Current' },
        { id: 'fy2', name: '2025-26', start_date: '2025-07-01', end_date: '2026-06-30', is_current: false, status: 'Open' },
      ],
      chartOfAccounts: initialCOA,
      approvalQueue: initialApprovals,
      organizations: [
        {
          id: 'org1',
          name: 'AMKAS INTERNATIONAL',
          legal_name: 'AMKAS INTERNATIONAL ERP',
          org_code: 'ORG01',
          currency: 'PKR',
          address: 'Lahore, Pakistan',
          phone: '+92 42 111 222 333',
          email: 'admin123@gmail.com',
          tax_id: 'NTN-1234567',
          logo_url: null,
          decimal_places: 2,
          tax_label: 'GST / NTN',
          default_tax_rate: 0,
          default_invoice_prefix: 'MS-',
          date_format: '21 Jun 2026',
          branches_count: 1,
          users_count: 1,
          status: 'Active',
        },
      ],
      branches: [
        { id: 'b1', org_id: 'org1', name: 'Head Office', code: 'HO', address: 'Main Blvd, Lahore', phone: '+92 42 35000000', email: 'ho@amkas.pk', is_active: true }
      ],
      departments: [
        { id: 'd1', branch_id: 'b1', name: 'Administration', code: 'ADMIN', is_active: true }
      ],
      users: [
        {
          id: 'u1',
          full_name: 'admin',
          email: 'admin@amkas.pk',
          phone: '+92 300 0000000',
          employee_code: 'EMP-001',
          designation: 'System Administrator',
          role: 'Super Admin',
          branch_id: 'b1',
          department_id: 'd1',
          base_salary: 0,
          allowances: 0,
          others: 0,
          is_2fa_required: false,
          is_active: true,
          created_at: '2026-07-21T12:00:00Z',
          last_login: '21 Jul 2026, 12:06 PM',
        }
      ],
      auditLogs: [
        {
          id: 'aud-1',
          username: 'admin',
          module: 'Authentication',
          action: 'Login',
          description: 'User signed in',
          ip_address: '127.0.0.1',
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        },
      ],
      loginLogs: [
        {
          id: 'log-1',
          username: 'admin',
          status: 'Success',
          ip_address: '127.0.0.1',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        },
      ],
      rolePermissions: ROLE_MODULES,
      expenseRecords: [],
      incomeRecords: [
        {
          id: 'inc1',
          number: 'MI-00001',
          date: '26 Jun 2026',
          account_id: 'co10',
          account_name: 'Other Income',
          description: 'test',
          cash_bank_account: 'Cash in Hand',
          amount: 1500,
          status: 'Posted',
          created_at: '2026-06-26T10:00:00Z',
        },
      ],

      companyLogo: null,
      orgSettings: {
        name: 'AMKAS INTERNATIONAL',
        legal_name: 'AMKAS INTERNATIONAL ERP',
        email: 'admin123@gmail.com',
        phone: '+92 42 111 222 333',
        currency: 'PKR',
        decimal_places: 2,
        tax_label: 'GST / NTN',
        default_tax_rate: 0,
        default_invoice_prefix: 'MS-',
        date_format: '21 Jun 2026',
      },

      addExpenseRecord: (e) => set((s) => ({ expenseRecords: [{ id: crypto.randomUUID(), ...e }, ...s.expenseRecords] })),
      addIncomeRecord: (i) => set((s) => ({ incomeRecords: [{ id: crypto.randomUUID(), ...i }, ...s.incomeRecords] })),

      // Customer Actions
      addCustomer: (c) => set((s) => ({ customers: [{ id: crypto.randomUUID(), ...c }, ...s.customers] })),
      updateCustomer: (id, patch) =>
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          // If customer name changes, cascade to audit log description
          auditLogs: patch.name
            ? [
                { id: crypto.randomUUID(), description: `Customer updated: ${patch.name}`, action: 'Update', module: 'Customers', performed_by: 'admin', timestamp: new Date().toISOString() },
                ...s.auditLogs,
              ]
            : s.auditLogs,
        })),
      deleteCustomer: (id) =>
        set((s) => {
          const cust = s.customers.find((c) => c.id === id);
          return {
            customers: s.customers.filter((c) => c.id !== id),
            // Cascade: null out customer_id in all sales documents
            invoices: s.invoices.map((inv) => inv.customer_id === id ? { ...inv, customer_id: null } : inv),
            quotations: s.quotations.map((q) => q.customer_id === id ? { ...q, customer_id: null } : q),
            salesOrders: s.salesOrders.map((so) => so.customer_id === id ? { ...so, customer_id: null } : so),
            creditNotes: (s.creditNotes || []).map((cn) => cn.customer_id === id ? { ...cn, customer_id: null } : cn),
            customerReceipts: (s.customerReceipts || []).map((r) => r.customer_id === id ? { ...r, customer_id: null } : r),
            // Log deletion
            auditLogs: [{ id: crypto.randomUUID(), description: `Customer deleted: ${cust?.name || id}`, action: 'Delete', module: 'Customers', performed_by: 'admin', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      // Vendor Actions
      addVendor: (v) => set((s) => ({ vendors: [{ id: crypto.randomUUID(), ...v }, ...s.vendors] })),
      updateVendor: (id, patch) =>
        set((s) => ({
          vendors: s.vendors.map((v) => (v.id === id ? { ...v, ...patch } : v)),
          auditLogs: patch.name
            ? [{ id: crypto.randomUUID(), description: `Vendor updated: ${patch.name}`, action: 'Update', module: 'Vendors', performed_by: 'admin', timestamp: new Date().toISOString() }, ...s.auditLogs]
            : s.auditLogs,
        })),
      deleteVendor: (id) =>
        set((s) => {
          const vend = s.vendors.find((v) => v.id === id);
          return {
            vendors: s.vendors.filter((v) => v.id !== id),
            // Cascade: null vendor_id in purchase documents
            purchaseOrders: s.purchaseOrders.map((po) => po.vendor_id === id ? { ...po, vendor_id: null } : po),
            purchaseInvoices: s.purchaseInvoices.map((pi) => pi.vendor_id === id ? { ...pi, vendor_id: null } : pi),
            vendorBills: s.vendorBills.map((vb) => vb.vendor_id === id ? { ...vb, vendor_id: null } : vb),
            debitNotes: s.debitNotes.map((dn) => dn.vendor_id === id ? { ...dn, vendor_id: null } : dn),
            vendorPayments: s.vendorPayments.map((vp) => vp.vendor_id === id ? { ...vp, vendor_id: null } : vp),
            purchaseRequests: s.purchaseRequests.map((pr) => pr.vendor_id === id ? { ...pr, vendor_id: null } : pr),
            auditLogs: [{ id: crypto.randomUUID(), description: `Vendor deleted: ${vend?.name || id}`, action: 'Delete', module: 'Vendors', performed_by: 'admin', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      // Product Actions
      addProduct: (p) => set((s) => ({ products: [{ id: crypto.randomUUID(), ...p }, ...s.products] })),
      updateProduct: (id, patch) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          // If product name changes, cascade description in invoice items that reference it
          invoices: patch.name
            ? s.invoices.map((inv) => ({
                ...inv,
                items: inv.items?.map((item) =>
                  item.product_id === id ? { ...item, description: patch.name } : item
                ),
              }))
            : s.invoices,
        })),
      deleteProduct: (id) =>
        set((s) => {
          const prod = s.products.find((p) => p.id === id);
          return {
            products: s.products.filter((p) => p.id !== id),
            // Cascade: null product_id in all line items; keep description as snapshot
            invoices: s.invoices.map((inv) => ({
              ...inv,
              items: inv.items?.map((item) =>
                item.product_id === id ? { ...item, product_id: null, description: `[Deleted] ${prod?.name || item.description}` } : item
              ),
            })),
            quotations: s.quotations.map((q) => ({
              ...q,
              items: q.items?.map((item) =>
                item.product_id === id ? { ...item, product_id: null, description: `[Deleted] ${prod?.name || item.description}` } : item
              ),
            })),
            salesOrders: s.salesOrders.map((so) => ({
              ...so,
              items: so.items?.map((item) =>
                item.product_id === id ? { ...item, product_id: null, description: `[Deleted] ${prod?.name || item.description}` } : item
              ),
            })),
            // Remove from batches and serials
            batches: s.batches.filter((b) => b.product_id !== id),
            serials: s.serials.filter((sr) => sr.product_id !== id),
            auditLogs: [{ id: crypto.randomUUID(), description: `Product deleted: ${prod?.name || id}`, action: 'Delete', module: 'Products', performed_by: 'admin', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      // Category Actions
      addCategory: (cat) => set((s) => ({ categories: [{ id: crypto.randomUUID(), ...cat }, ...s.categories] })),
      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          // If category is deactivated, deactivate all products in that category
          products: patch.is_active === false
            ? s.products.map((p) => {
                const cat = s.categories.find((c) => c.id === id);
                return p.category === cat?.name ? { ...p, is_active: false } : p;
              })
            : s.products,
        })),
      deleteCategory: (id) =>
        set((s) => {
          const cat = s.categories.find((c) => c.id === id);
          return {
            categories: s.categories.filter((c) => c.id !== id),
            // Null out category on products that referenced this category
            products: s.products.map((p) =>
              p.category === cat?.name ? { ...p, category: null } : p
            ),
            auditLogs: [{ id: crypto.randomUUID(), description: `Category deleted: ${cat?.name || id}`, action: 'Delete', module: 'Categories', performed_by: 'admin', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      // Warehouse Actions
      addWarehouse: (w) => set((s) => ({ warehouses: [{ id: crypto.randomUUID(), ...w }, ...s.warehouses] })),
      updateWarehouse: (id, patch) => set((s) => ({ warehouses: s.warehouses.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      deleteWarehouse: (id) =>
        set((s) => {
          const wh = s.warehouses.find((w) => w.id === id);
          return {
            warehouses: s.warehouses.filter((w) => w.id !== id),
            // Cascade: null warehouse_id in all documents referencing this warehouse
            invoices: s.invoices.map((inv) => inv.warehouse_id === id ? { ...inv, warehouse_id: null } : inv),
            salesOrders: s.salesOrders.map((so) => so.warehouse_id === id ? { ...so, warehouse_id: null } : so),
            stockTransfers: s.stockTransfers.map((st) =>
              st.from_warehouse_id === id ? { ...st, from_warehouse_id: null }
              : st.to_warehouse_id === id ? { ...st, to_warehouse_id: null }
              : st
            ),
            stockAdjustments: s.stockAdjustments.map((sa) => sa.warehouse_id === id ? { ...sa, warehouse_id: null } : sa),
            auditLogs: [{ id: crypto.randomUUID(), description: `Warehouse deleted: ${wh?.name || id}`, action: 'Delete', module: 'Warehouses', performed_by: 'admin', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      // Invoice Actions
      addInvoice: (inv) =>
        set((s) => {
          const newInv = { id: crypto.randomUUID(), ...inv };
          const newInvoices = [newInv, ...s.invoices];
          let newCommissions = [...s.commissions];
          let newJournalEntries = [...s.journalEntries];

          if (inv.commission_rate && inv.commission_rate > 0) {
            const commAmount = (inv.total_amount * inv.commission_rate) / 100;
            const cust = s.customers.find((c) => c.id === inv.customer_id);
            newCommissions.unshift({
              id: crypto.randomUUID(),
              invoice_no: inv.invoice_no,
              customer_name: cust?.name || 'Customer',
              salesperson: inv.salesperson || 'admin',
              rate_pct: inv.commission_rate,
              commission_amount: commAmount,
              status: inv.status === 'POSTED' ? 'APPROVED' : 'ACCRUED',
              created_at: new Date().toISOString(),
            });
          }

          if (inv.status === 'POSTED') {
            newJournalEntries.unshift({
              id: crypto.randomUUID(),
              entry_no: `JV-${inv.invoice_no}`,
              entry_date: inv.invoice_date,
              reference_no: inv.invoice_no,
              source: 'Sales Invoice',
              narration: `Sales Invoice ${inv.invoice_no} posted to ${inv.account_head || 'Sales Revenue'}`,
              total_debit: inv.total_amount,
              total_credit: inv.total_amount,
              status: 'POSTED',
              created_at: new Date().toISOString(),
            });
          }

          return {
            invoices: newInvoices,
            commissions: newCommissions,
            journalEntries: newJournalEntries,
          };
        }),
      updateInvoice: (id, patch) => set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      deleteInvoice: (id) => set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) })),

      addQuotation: (q) => set((s) => ({ quotations: [{ id: crypto.randomUUID(), ...q }, ...s.quotations] })),
      updateQuotation: (id, patch) => set((s) => ({ quotations: s.quotations.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
      deleteQuotation: (id) => set((s) => ({ quotations: s.quotations.filter((q) => q.id !== id) })),

      addSalesOrder: (so) => set((s) => ({ salesOrders: [{ id: crypto.randomUUID(), ...so }, ...s.salesOrders] })),
      updateSalesOrder: (id, patch) => set((s) => ({ salesOrders: s.salesOrders.map((so) => (so.id === id ? { ...so, ...patch } : so)) })),
      deleteSalesOrder: (id) => set((s) => ({ salesOrders: s.salesOrders.filter((so) => so.id !== id) })),

      addCreditNote: (cn) =>
        set((s) => {
          const newCn = { id: crypto.randomUUID(), ...cn };
          const newCreditNotes = [newCn, ...(s.creditNotes || [])];
          let newJournalEntries = [...(s.journalEntries || [])];

          if (cn.status === 'POSTED') {
            newJournalEntries.unshift({
              id: crypto.randomUUID(),
              entry_no: `JV-${cn.credit_note_no}`,
              entry_date: cn.document_date || cn.note_date,
              reference_no: cn.credit_note_no,
              source: 'Credit Note',
              narration: `Credit Note ${cn.credit_note_no} posted for customer balance adjustment`,
              total_debit: cn.total_amount,
              total_credit: cn.total_amount,
              status: 'POSTED',
              created_at: new Date().toISOString(),
            });
          }

          return {
            creditNotes: newCreditNotes,
            journalEntries: newJournalEntries,
          };
        }),
      updateCreditNote: (id, patch) => set((s) => ({ creditNotes: (s.creditNotes || []).map((cn) => (cn.id === id ? { ...cn, ...patch } : cn)) })),
      deleteCreditNote: (id) => set((s) => ({ creditNotes: (s.creditNotes || []).filter((cn) => cn.id !== id) })),

      addCustomerReceipt: (r) =>
        set((s) => {
          const newReceipt = { id: crypto.randomUUID(), ...r };
          const newReceipts = [newReceipt, ...(s.customerReceipts || [])];
          let newBankAccounts = [...(s.bankAccounts || [])];
          let newJournalEntries = [...(s.journalEntries || [])];

          const bankIdx = newBankAccounts.findIndex(
            (b) => b.id === r.deposit_account_id || b.account_name === r.deposit_to
          );
          if (bankIdx !== -1) {
            newBankAccounts[bankIdx] = {
              ...newBankAccounts[bankIdx],
              current_balance: (newBankAccounts[bankIdx].current_balance || 0) + (r.amount || 0),
            };
          }

          const depositName = r.deposit_to || newBankAccounts[bankIdx]?.account_name || 'Cash in Hand';
          newJournalEntries.unshift({
            id: crypto.randomUUID(),
            entry_no: `JV-${r.receipt_no}`,
            entry_date: r.receipt_date,
            reference_no: r.receipt_no,
            source: 'Customer Payment',
            narration: `Customer payment ${r.receipt_no} deposited to ${depositName}`,
            total_debit: r.amount,
            total_credit: r.amount,
            status: 'POSTED',
            created_at: new Date().toISOString(),
          });

          return {
            customerReceipts: newReceipts,
            bankAccounts: newBankAccounts,
            journalEntries: newJournalEntries,
          };
        }),
      updateCustomerReceipt: (id, patch) => set((s) => ({ customerReceipts: (s.customerReceipts || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteCustomerReceipt: (id) => set((s) => ({ customerReceipts: (s.customerReceipts || []).filter((r) => r.id !== id) })),

      addCommission: (c) => set((s) => ({ commissions: [{ id: crypto.randomUUID(), ...c }, ...(s.commissions || [])] })),
      updateCommission: (id, patch) => set((s) => ({ commissions: (s.commissions || []).map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCommission: (id) => set((s) => ({ commissions: (s.commissions || []).filter((c) => c.id !== id) })),

      // Purchase Actions
      addPurchaseRequest: (pr) => set((s) => ({ purchaseRequests: [{ id: crypto.randomUUID(), ...pr }, ...s.purchaseRequests] })),
      updatePurchaseRequest: (id, patch) => set((s) => ({ purchaseRequests: s.purchaseRequests.map((pr) => (pr.id === id ? { ...pr, ...patch } : pr)) })),
      deletePurchaseRequest: (id) => set((s) => ({ purchaseRequests: s.purchaseRequests.filter((pr) => pr.id !== id) })),

      addPurchaseOrder: (po) => set((s) => ({ purchaseOrders: [{ id: crypto.randomUUID(), ...po }, ...s.purchaseOrders] })),
      updatePurchaseOrder: (id, patch) => set((s) => ({ purchaseOrders: s.purchaseOrders.map((po) => (po.id === id ? { ...po, ...patch } : po)) })),
      deletePurchaseOrder: (id) => set((s) => ({ purchaseOrders: s.purchaseOrders.filter((po) => po.id !== id) })),

      addPurchaseInvoice: (pi) => set((s) => ({ purchaseInvoices: [{ id: crypto.randomUUID(), ...pi }, ...s.purchaseInvoices] })),
      updatePurchaseInvoice: (id, patch) => set((s) => ({ purchaseInvoices: s.purchaseInvoices.map((pi) => (pi.id === id ? { ...pi, ...patch } : pi)) })),
      deletePurchaseInvoice: (id) => set((s) => ({ purchaseInvoices: s.purchaseInvoices.filter((pi) => pi.id !== id) })),

      addVendorBill: (vb) => set((s) => ({ vendorBills: [{ id: crypto.randomUUID(), ...vb }, ...s.vendorBills] })),
      updateVendorBill: (id, patch) => set((s) => ({ vendorBills: s.vendorBills.map((vb) => (vb.id === id ? { ...vb, ...patch } : vb)) })),
      deleteVendorBill: (id) => set((s) => ({ vendorBills: s.vendorBills.filter((vb) => vb.id !== id) })),

      addDebitNote: (dn) => set((s) => ({ debitNotes: [{ id: crypto.randomUUID(), ...dn }, ...s.debitNotes] })),
      updateDebitNote: (id, patch) => set((s) => ({ debitNotes: s.debitNotes.map((dn) => (dn.id === id ? { ...dn, ...patch } : dn)) })),
      deleteDebitNote: (id) => set((s) => ({ debitNotes: s.debitNotes.filter((dn) => dn.id !== id) })),

      addVendorPayment: (vp) => set((s) => ({ vendorPayments: [{ id: crypto.randomUUID(), ...vp }, ...s.vendorPayments] })),
      updateVendorPayment: (id, patch) => set((s) => ({ vendorPayments: s.vendorPayments.map((vp) => (vp.id === id ? { ...vp, ...patch } : vp)) })),
      deleteVendorPayment: (id) => set((s) => ({ vendorPayments: s.vendorPayments.filter((vp) => vp.id !== id) })),

      // Inventory Actions
      addStockTransfer: (st) => set((s) => ({ stockTransfers: [{ id: crypto.randomUUID(), ...st }, ...s.stockTransfers] })),
      updateStockTransfer: (id, patch) => set((s) => ({ stockTransfers: s.stockTransfers.map((st) => (st.id === id ? { ...st, ...patch } : st)) })),
      deleteStockTransfer: (id) => set((s) => ({ stockTransfers: s.stockTransfers.filter((st) => st.id !== id) })),

      addStockAdjustment: (sa) => set((s) => ({ stockAdjustments: [{ id: crypto.randomUUID(), ...sa }, ...s.stockAdjustments] })),
      updateStockAdjustment: (id, patch) => set((s) => ({ stockAdjustments: s.stockAdjustments.map((sa) => (sa.id === id ? { ...sa, ...patch } : sa)) })),
      deleteStockAdjustment: (id) => set((s) => ({ stockAdjustments: s.stockAdjustments.filter((sa) => sa.id !== id) })),

      addBatch: (b) => set((s) => ({ batches: [{ id: crypto.randomUUID(), ...b }, ...s.batches] })),
      updateBatch: (id, patch) => set((s) => ({ batches: s.batches.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      deleteBatch: (id) => set((s) => ({ batches: s.batches.filter((b) => b.id !== id) })),

      addSerial: (sr) => set((s) => ({ serials: [{ id: crypto.randomUUID(), ...sr }, ...s.serials] })),
      updateSerial: (id, patch) => set((s) => ({ serials: s.serials.map((sr) => (sr.id === id ? { ...sr, ...patch } : sr)) })),
      deleteSerial: (id) => set((s) => ({ serials: s.serials.filter((sr) => sr.id !== id) })),

      // Banking Actions
      addBankAccount: (ba) => set((s) => ({ bankAccounts: [{ id: crypto.randomUUID(), ...ba }, ...s.bankAccounts] })),
      updateBankAccount: (id, patch) => set((s) => ({ bankAccounts: s.bankAccounts.map((ba) => (ba.id === id ? { ...ba, ...patch } : ba)) })),
      deleteBankAccount: (id) => set((s) => ({ bankAccounts: s.bankAccounts.filter((ba) => ba.id !== id) })),

      // Accounting & COA Actions
      addJournalEntry: (je) => set((s) => ({ journalEntries: [{ id: crypto.randomUUID(), ...je }, ...s.journalEntries] })),
      updateJournalEntry: (id, patch) => set((s) => ({ journalEntries: s.journalEntries.map((je) => (je.id === id ? { ...je, ...patch } : je)) })),
      deleteJournalEntry: (id) => set((s) => ({ journalEntries: s.journalEntries.filter((je) => je.id !== id) })),

      addCOAccount: (coa) => set((s) => ({ chartOfAccounts: [{ id: crypto.randomUUID(), ...coa }, ...s.chartOfAccounts] })),
      updateCOAccount: (id, patch) => set((s) => ({ chartOfAccounts: s.chartOfAccounts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCOAccount: (id) => set((s) => ({ chartOfAccounts: s.chartOfAccounts.filter((c) => c.id !== id) })),

      addFinancialYear: (fy) => set((s) => ({ financialYears: [{ id: crypto.randomUUID(), ...fy }, ...s.financialYears] })),
      updateFinancialYear: (id, patch) => set((s) => ({ financialYears: s.financialYears.map((fy) => (fy.id === id ? { ...fy, ...patch } : fy)) })),

      // Approvals Action
      reviewApproval: (id, status, note) => set((s) => ({
        approvalQueue: s.approvalQueue.map((item) => (item.id === id ? { ...item, status, review_note: note } : item))
      })),

      // Org & Branch & Dept Actions
      addOrg: (o) => set((s) => ({ organizations: [{ id: crypto.randomUUID(), ...o }, ...s.organizations] })),
      updateOrg: (id, patch) =>
        set((s) => ({
          organizations: s.organizations.map((o) => (o.id === id ? { ...o, ...patch } : o)),
          // If org is deactivated, deactivate all its branches
          branches: patch.is_active === false
            ? s.branches.map((b) => b.org_id === id ? { ...b, is_active: false } : b)
            : s.branches,
        })),
      deleteOrg: (id) =>
        set((s) => {
          const org = s.organizations.find((o) => o.id === id);
          return {
            organizations: s.organizations.filter((o) => o.id !== id),
            // Cascade: null org_id in branches and sales documents
            branches: s.branches.map((b) => b.org_id === id ? { ...b, org_id: null } : b),
            quotations: s.quotations.map((q) => q.org_id === id ? { ...q, org_id: null } : q),
            salesOrders: s.salesOrders.map((so) => so.org_id === id ? { ...so, org_id: null } : so),
            auditLogs: [{ id: crypto.randomUUID(), description: `Organization deleted: ${org?.name || id}`, action: 'Delete', module: 'Organizations', performed_by: 'admin', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      addBranch: (b) => set((s) => ({ branches: [{ id: crypto.randomUUID(), ...b }, ...s.branches] })),
      updateBranch: (id, patch) =>
        set((s) => ({
          branches: s.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)),
          // If branch is deactivated, deactivate its warehouses and departments
          warehouses: patch.is_active === false
            ? s.warehouses.map((w) => w.branch_id === id ? { ...w, is_active: false } : w)
            : s.warehouses,
          departments: patch.is_active === false
            ? s.departments.map((d) => d.branch_id === id ? { ...d, is_active: false } : d)
            : s.departments,
        })),
      deleteBranch: (id) =>
        set((s) => {
          const br = s.branches.find((b) => b.id === id);
          return {
            branches: s.branches.filter((b) => b.id !== id),
            // Cascade: null branch_id in warehouses, departments, users, quotations, salesOrders
            warehouses: s.warehouses.map((w) => w.branch_id === id ? { ...w, branch_id: null } : w),
            departments: s.departments.map((d) => d.branch_id === id ? { ...d, branch_id: null } : d),
            users: s.users.map((u) => u.branch_id === id ? { ...u, branch_id: null } : u),
            quotations: s.quotations.map((q) => q.branch_id === id ? { ...q, branch_id: null } : q),
            salesOrders: s.salesOrders.map((so) => so.branch_id === id ? { ...so, branch_id: null } : so),
            auditLogs: [{ id: crypto.randomUUID(), description: `Branch deleted: ${br?.name || id}`, action: 'Delete', module: 'Branches', performed_by: 'admin', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      addDepartment: (d) => set((s) => ({ departments: [{ id: crypto.randomUUID(), ...d }, ...s.departments] })),
      updateDepartment: (id, patch) => set((s) => ({ departments: s.departments.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      deleteDepartment: (id) =>
        set((s) => {
          const dept = s.departments.find((d) => d.id === id);
          return {
            departments: s.departments.filter((d) => d.id !== id),
            // Null out department_id in users
            users: s.users.map((u) => u.department_id === id ? { ...u, department_id: null } : u),
            auditLogs: [{ id: crypto.randomUUID(), description: `Department deleted: ${dept?.name || id}`, action: 'Delete', module: 'Departments', performed_by: 'admin', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      addUser: (u) => set((s) => ({ users: [{ id: crypto.randomUUID(), ...u }, ...s.users] })),
      updateUser: (id, patch) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      deleteUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

      // Audit & Security Actions
      addAuditLog: (log) => set((s) => ({ auditLogs: [{ id: crypto.randomUUID(), ...log }, ...s.auditLogs] })),
      addLoginLog: (log) => set((s) => ({ loginLogs: [{ id: crypto.randomUUID(), ...log }, ...s.loginLogs] })),
      updateRolePermissions: (role, modules) =>
        set((s) => ({ rolePermissions: { ...s.rolePermissions, [role]: modules } })),

      // Logo Actions
      setCompanyLogo: (logoUrl) => set({ companyLogo: logoUrl }),
      updateOrgSettings: (patch) => set((s) => ({ orgSettings: { ...s.orgSettings, ...patch } })),

      // Reset
      resetBusinessData: () =>
        set({
          invoices: [],
          quotations: [],
          salesOrders: [],
          creditNotes: [],
          customerReceipts: [],
          commissions: [],
          purchaseRequests: [],
          purchaseOrders: [],
          purchaseInvoices: [],
          vendorBills: [],
          debitNotes: [],
          vendorPayments: [],
          stockTransfers: [],
          stockAdjustments: [],
          batches: [],
          serials: [],
        }),
    }),
    { name: 'amkas-erp-data-store' }
  )
);
