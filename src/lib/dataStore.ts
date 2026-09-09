import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeUUID } from './utils';
import { ROLE_MODULES, type Role, type ModuleKey } from './rbac';
import type {
  Customer,
  Vendor,
  AccountTypeItem,
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
  SalesReturn,
  PurchaseReturn,
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
  ProductArticle,
} from './types';

// Initial Seed Data
const initialCustomers: Customer[] = [];
const initialVendors: Vendor[] = [];
const initialProducts: Product[] = [];
const initialCategories: Category[] = [];

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

const initialInvoices: SalesInvoice[] = [];

const initialCOA: ChartOfAccount[] = [
  { id: 'coa1', code: '1000', name: 'ASSETS', account_type: 'Asset', parent_id: null, is_active: true, current_balance: 0 },
  { id: 'coa2', code: '1100', name: 'Cash & Bank Accounts', account_type: 'Asset', parent_id: 'coa1', is_active: true, current_balance: 0 },
  { id: 'coa3', code: '1110', name: 'Cash in Hand', account_type: 'Asset', parent_id: 'coa2', is_active: true, current_balance: 0 },
  { id: 'coa4', code: '1200', name: 'Accounts Receivable', account_type: 'Asset', parent_id: 'coa1', is_active: true, current_balance: 0 },
  { id: 'coa5', code: '2000', name: 'LIABILITIES', account_type: 'Liability', parent_id: null, is_active: true, current_balance: 0 },
  { id: 'coa6', code: '2100', name: 'Accounts Payable', account_type: 'Liability', parent_id: 'coa5', is_active: true, current_balance: 0 },
  { id: 'coa7', code: '4000', name: 'REVENUE', account_type: 'Revenue', parent_id: null, is_active: true, current_balance: 0 },
  { id: 'coa8', code: '4100', name: 'Sales Revenue', account_type: 'Revenue', parent_id: 'coa7', is_active: true, current_balance: 0 },
  { id: 'coa9', code: '5000', name: 'EXPENSES', account_type: 'Expense', parent_id: null, is_active: true, current_balance: 0 },
  { id: 'coa10', code: '5100', name: 'Cost of Goods Sold', account_type: 'Expense', parent_id: 'coa9', is_active: true, current_balance: 0 },
];

const initialApprovals: ApprovalQueueItem[] = [];

interface DataStoreState {
  // State Arrays
  customers: Customer[];
  vendors: Vendor[];
  accountTypes: AccountTypeItem[];
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
  salesReturns: SalesReturn[];
  purchaseReturns: PurchaseReturn[];
  vendorPayments: VendorPayment[];
  stockTransfers: StockTransfer[];
  stockAdjustments: StockAdjustment[];
  batches: ProductBatch[];
  serials: ProductSerial[];
  productArticles: ProductArticle[];
  universalArticles: string[];
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

  // Maintenance Mode State
  isMaintenanceMode: boolean;

  // Logo / Branding State
  companyLogo: string | null;
  orgSettings: Partial<Organization>;

  // Maintenance Mode Actions
  enableMaintenanceMode: () => void;
  disableMaintenanceMode: (password: string) => { success: boolean; error?: string };

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

  // Account Type Actions
  addAccountType: (at: Omit<AccountTypeItem, 'id'>) => void;
  updateAccountType: (id: string, at: Partial<AccountTypeItem>) => void;
  deleteAccountType: (id: string) => void;

  // Vendor Actions
  addVendor: (v: Omit<Vendor, 'id'>) => void;
  updateVendor: (id: string, v: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;

  // Product Actions
  addProduct: (p: Omit<Product, 'id'> & { id?: string }) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Product Article Actions
  addProductArticle: (a: Omit<ProductArticle, 'id'>) => void;
  updateProductArticle: (id: string, a: Partial<ProductArticle>) => void;
  deleteProductArticle: (id: string) => void;
  addUniversalArticle: (name: string) => void;
  removeUniversalArticle: (name: string) => void;

  // Category Actions
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Warehouse Actions
  addWarehouse: (w: Omit<Warehouse, 'id'>) => void;
  updateWarehouse: (id: string, w: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;

  // Invoice & Sales Actions
  addInvoice: (inv: Omit<SalesInvoice, 'id'> & { id?: string }) => void;
  updateInvoice: (id: string, inv: Partial<SalesInvoice>) => void;
  deleteInvoice: (id: string) => void;

  addQuotation: (q: Omit<Quotation, 'id'> & { id?: string }) => void;
  updateQuotation: (id: string, q: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;

  addSalesOrder: (so: Omit<SalesOrder, 'id'> & { id?: string }) => void;
  updateSalesOrder: (id: string, so: Partial<SalesOrder>) => void;
  deleteSalesOrder: (id: string) => void;

  addCreditNote: (cn: Omit<CreditNote, 'id'> & { id?: string }) => void;
  updateCreditNote: (id: string, cn: Partial<CreditNote>) => void;
  deleteCreditNote: (id: string) => void;

  addCustomerReceipt: (r: Omit<CustomerReceipt, 'id'> & { id?: string }) => void;
  updateCustomerReceipt: (id: string, r: Partial<CustomerReceipt>) => void;
  deleteCustomerReceipt: (id: string) => void;

  addCommission: (c: Omit<SalesCommission, 'id'> & { id?: string }) => void;
  updateCommission: (id: string, c: Partial<SalesCommission>) => void;
  deleteCommission: (id: string) => void;

  // Purchase Actions
  addPurchaseRequest: (pr: Omit<PurchaseRequest, 'id'> & { id?: string }) => void;
  updatePurchaseRequest: (id: string, pr: Partial<PurchaseRequest>) => void;
  deletePurchaseRequest: (id: string) => void;

  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'> & { id?: string }) => void;
  updatePurchaseOrder: (id: string, po: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;

  addPurchaseInvoice: (pi: Omit<PurchaseInvoice, 'id'> & { id?: string }) => void;
  updatePurchaseInvoice: (id: string, pi: Partial<PurchaseInvoice>) => void;
  deletePurchaseInvoice: (id: string) => void;

  addVendorBill: (vb: Omit<VendorBill, 'id'> & { id?: string }) => void;
  updateVendorBill: (id: string, vb: Partial<VendorBill>) => void;
  deleteVendorBill: (id: string) => void;

  addDebitNote: (dn: Omit<DebitNote, 'id'> & { id?: string }) => void;
  updateDebitNote: (id: string, dn: Partial<DebitNote>) => void;
  deleteDebitNote: (id: string) => void;

  addSalesReturn: (sr: Omit<SalesReturn, 'id'> & { id?: string }) => void;
  updateSalesReturn: (id: string, patch: Partial<SalesReturn>) => void;
  deleteSalesReturn: (id: string) => void;

  addPurchaseReturn: (pr: Omit<PurchaseReturn, 'id'> & { id?: string }) => void;
  updatePurchaseReturn: (id: string, patch: Partial<PurchaseReturn>) => void;
  deletePurchaseReturn: (id: string) => void;

  addVendorPayment: (vp: Omit<VendorPayment, 'id'> & { id?: string }) => void;
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

  addFinancialYear: (fy: Omit<FinancialYear, 'id'> & { id?: string }) => void;
  updateFinancialYear: (id: string, fy: Partial<FinancialYear>) => void;
  deleteFinancialYear: (id: string) => void;

  // Approvals Action
  addApprovalQueueItem: (item: Omit<ApprovalQueueItem, 'id'>) => string;
  reviewApproval: (id: string, status: 'APPROVED' | 'REJECTED', note?: string, reviewer?: string) => void;

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
      accountTypes: [
        { id: 'at-1', code: 'AT-001', name: 'Customer', description: 'Customer account for sales and receivables', is_active: true, created_at: new Date().toISOString() },
        { id: 'at-2', code: 'AT-002', name: 'Supplier', description: 'Supplier / Vendor account for purchases and payables', is_active: true, created_at: new Date().toISOString() },
        { id: 'at-3', code: 'AT-003', name: 'Salesperson', description: 'Sales agent account with commission tracking', is_active: true, created_at: new Date().toISOString() },
        { id: 'at-4', code: 'AT-004', name: 'Vendor', description: 'Third-party vendor account', is_active: true, created_at: new Date().toISOString() },
        { id: 'at-5', code: 'AT-005', name: 'Distributor', description: 'Distributor and channel partner account', is_active: true, created_at: new Date().toISOString() },
      ],
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
      salesReturns: [],
      purchaseReturns: [],
      vendorPayments: [],
      stockTransfers: [],
      stockAdjustments: [],
      batches: [],
      serials: [],
      productArticles: [],
      universalArticles: [],
      bankAccounts: [
        { id: 'ba1', account_name: 'Cash in Hand', bank_name: 'Cash', account_number: '1110', iban: null, currency: 'PKR', opening_balance: 0, current_balance: 0, account_type: 'Cash', status: 'Active' },
        { id: 'ba2', account_name: 'Meezan Islamic Main Account', bank_name: 'Meezan Bank', account_number: '0102998877', iban: 'PK36MEZN000102998877', currency: 'PKR', opening_balance: 0, current_balance: 0, account_type: 'Bank', status: 'Active' }
      ],
      bankStatements: [],
      journalEntries: [],
      financialYears: [
        { id: 'fy1', name: '2026-27', start_date: '2026-07-01', end_date: '2027-06-30', is_current: true, status: 'Current' },
        { id: 'fy2', name: '2025-26', start_date: '2025-07-01', end_date: '2026-06-30', is_current: false, status: 'Open' },
      ],
      chartOfAccounts: initialCOA,
      approvalQueue: initialApprovals,
      organizations: [
        {
          id: 'org1',
          name: 'NICE ENTERPRISES',
          legal_name: 'NICE ENTERPRISES ERP',
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
        { id: 'b1', org_id: 'org1', name: 'Head Office', code: 'HO', address: 'Main Blvd, Lahore', phone: '+92 42 35000000', email: 'ho@niceenterprises.pk', is_active: true }
      ],
      departments: [
        { id: 'd1', branch_id: 'b1', name: 'Administration', code: 'ADMIN', is_active: true }
      ],
      users: [
        {
          id: 'u1',
          full_name: 'Super Admin',
          email: 'admin@niceenterprises.pk',
          phone: '+92 300 0000000',
          employee_code: 'EMP-001',
          designation: 'System Administrator',
          role: 'Super Admin',
          password: 'Amkas@123',
          branch_id: 'b1',
          department_id: 'd1',
          base_salary: 0,
          allowances: 0,
          others: 0,
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
      incomeRecords: [],

      isMaintenanceMode: false,

      // Maintenance Mode Actions
      enableMaintenanceMode: () =>
        set((s) => ({
          isMaintenanceMode: true,
          auditLogs: [
            {
              id: crypto.randomUUID(),
              username: 'System Admin',
              module: 'Maintenance',
              action: 'Enable Maintenance Mode',
              description: 'System Maintenance Mode was ENABLED',
              ip_address: '127.0.0.1',
              timestamp: new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' }),
            },
            ...s.auditLogs,
          ],
        })),

      disableMaintenanceMode: (password: string) => {
        if (password !== 'AmkasMaintenanceOff!') {
          return { success: false, error: 'Incorrect password for turning off maintenance mode.' };
        }
        set((s) => ({
          isMaintenanceMode: false,
          auditLogs: [
            {
              id: crypto.randomUUID(),
              username: 'System Admin',
              module: 'Maintenance',
              action: 'Disable Maintenance Mode',
              description: 'System Maintenance Mode was DISABLED using admin verification password',
              ip_address: '127.0.0.1',
              timestamp: new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' }),
            },
            ...s.auditLogs,
          ],
        }));
        return { success: true };
      },

      companyLogo: null,
      orgSettings: {
        name: 'NICE ENTERPRISES',
        legal_name: 'NICE ENTERPRISES ERP',
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
                { id: crypto.randomUUID(), username: 'admin', module: 'Customers', action: 'Update', description: `Customer updated: ${patch.name}`, ip_address: '127.0.0.1', timestamp: new Date().toISOString() },
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
            auditLogs: [{ id: crypto.randomUUID(), username: 'admin', module: 'Customers', action: 'Delete', description: `Customer deleted: ${cust?.name || id}`, ip_address: '127.0.0.1', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      // Account Type Actions
      addAccountType: (at) => set((s) => ({ accountTypes: [{ id: crypto.randomUUID(), ...at }, ...(s.accountTypes || [])] })),
      updateAccountType: (id, patch) =>
        set((s) => ({
          accountTypes: (s.accountTypes || []).map((at) => (at.id === id ? { ...at, ...patch } : at)),
        })),
      deleteAccountType: (id) =>
        set((s) => ({
          accountTypes: (s.accountTypes || []).filter((at) => at.id !== id),
        })),

      // Vendor Actions
      addVendor: (v) => set((s) => ({ vendors: [{ id: crypto.randomUUID(), ...v }, ...s.vendors] })),
      updateVendor: (id, patch) =>
        set((s) => ({
          vendors: s.vendors.map((v) => (v.id === id ? { ...v, ...patch } : v)),
          auditLogs: patch.name
            ? [{ id: crypto.randomUUID(), username: 'admin', module: 'Vendors', action: 'Update', description: `Vendor updated: ${patch.name}`, ip_address: '127.0.0.1', timestamp: new Date().toISOString() }, ...s.auditLogs]
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
            auditLogs: [{ id: crypto.randomUUID(), username: 'admin', module: 'Vendors', action: 'Delete', description: `Vendor deleted: ${vend?.name || id}`, ip_address: '127.0.0.1', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      // Product Actions
      addProduct: (p) =>
        set((s) => {
          const id = (p as any).id || crypto.randomUUID();
          return { products: [{ ...p, id }, ...s.products] };
        }),
      updateProduct: (id, patch) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          // If product name changes, cascade description in invoice items that reference it
          invoices: patch.name
            ? s.invoices.map((inv) => ({
                ...inv,
                items: inv.items?.map((item) =>
                  item.product_id === id ? { ...item, description: patch.name || item.description } : item
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
            // Remove from batches, serials, and product articles
            batches: s.batches.filter((b) => b.product_id !== id),
            serials: s.serials.filter((sr) => sr.product_id !== id),
            productArticles: s.productArticles.filter((a) => a.product_id !== id),
            auditLogs: [{ id: crypto.randomUUID(), username: 'admin', module: 'Products', action: 'Delete', description: `Product deleted: ${prod?.name || id}`, ip_address: '127.0.0.1', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      // Product Article Actions
      addProductArticle: (a) =>
        set((s) => {
          const trimmed = a.name?.trim();
          const existingUniversal = s.universalArticles || [];
          const universalArticles =
            trimmed && !existingUniversal.some((u) => u.toLowerCase() === trimmed.toLowerCase())
              ? [...existingUniversal, trimmed]
              : existingUniversal;
          return {
            productArticles: [{ id: crypto.randomUUID(), ...a }, ...s.productArticles],
            universalArticles,
          };
        }),
      updateProductArticle: (id, patch) =>
        set((s) => {
          const trimmed = patch.name?.trim();
          const existingUniversal = s.universalArticles || [];
          const universalArticles =
            trimmed && !existingUniversal.some((u) => u.toLowerCase() === trimmed.toLowerCase())
              ? [...existingUniversal, trimmed]
              : existingUniversal;
          return {
            productArticles: s.productArticles.map((a) => (a.id === id ? { ...a, ...patch } : a)),
            universalArticles,
          };
        }),
      deleteProductArticle: (id) => set((s) => ({ productArticles: s.productArticles.filter((a) => a.id !== id) })),
      addUniversalArticle: (name) =>
        set((s) => {
          const trimmed = name.trim();
          if (!trimmed) return s;
          const current = s.universalArticles || [];
          if (current.some((u) => u.toLowerCase() === trimmed.toLowerCase())) return s;
          return { universalArticles: [...current, trimmed] };
        }),
      removeUniversalArticle: (name) =>
        set((s) => ({
          universalArticles: (s.universalArticles || []).filter((u) => u.toLowerCase() !== name.trim().toLowerCase()),
        })),

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
            auditLogs: [{ id: crypto.randomUUID(), username: 'admin', module: 'Categories', action: 'Delete', description: `Category deleted: ${cat?.name || id}`, ip_address: '127.0.0.1', timestamp: new Date().toISOString() }, ...s.auditLogs],
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
            auditLogs: [{ id: crypto.randomUUID(), username: 'admin', module: 'Warehouses', action: 'Delete', description: `Warehouse deleted: ${wh?.name || id}`, ip_address: '127.0.0.1', timestamp: new Date().toISOString() }, ...s.auditLogs],
          };
        }),

      // Invoice Actions
      addInvoice: (inv) =>
        set((s) => {
          const newInv = { id: (inv as any).id || crypto.randomUUID(), ...inv };
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
          const newCn = { id: (cn as any).id || crypto.randomUUID(), ...cn };
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

      addCommission: (c) => set((s) => ({ commissions: [{ id: crypto.randomUUID(), ...c }, ...(s.commissions || [])] })),
      updateCommission: (id, patch) => set((s) => ({ commissions: (s.commissions || []).map((comm) => (comm.id === id ? { ...comm, ...patch } : comm)) })),
      deleteCommission: (id) => set((s) => ({ commissions: (s.commissions || []).filter((comm) => comm.id !== id) })),

      addCustomerReceipt: (r) =>
        set((s) => {
          const newReceipt = { id: (r as any).id || crypto.randomUUID(), ...r };
          const newReceipts = [newReceipt, ...(s.customerReceipts || [])];
          let newBankAccounts = [...(s.bankAccounts || [])];
          let newJournalEntries = [...(s.journalEntries || [])];

          // Only post immediately if status is explicitly POSTED
          if (r.status === 'POSTED') {
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
          }

          return {
            customerReceipts: newReceipts,
            bankAccounts: newBankAccounts,
            journalEntries: newJournalEntries,
          };
        }),
      updateCustomerReceipt: (id, patch) => set((s) => ({ customerReceipts: (s.customerReceipts || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteCustomerReceipt: (id) => set((s) => ({ customerReceipts: (s.customerReceipts || []).filter((r) => r.id !== id) })),

      // Purchase Actions
      addPurchaseRequest: (pr) => set((s) => ({ purchaseRequests: [{ id: (pr as any).id || crypto.randomUUID(), ...pr }, ...s.purchaseRequests] })),
      updatePurchaseRequest: (id, patch) => set((s) => ({ purchaseRequests: s.purchaseRequests.map((pr) => (pr.id === id ? { ...pr, ...patch } : pr)) })),
      deletePurchaseRequest: (id) => set((s) => ({ purchaseRequests: s.purchaseRequests.filter((pr) => pr.id !== id) })),

      addPurchaseOrder: (po) => set((s) => ({ purchaseOrders: [{ id: (po as any).id || crypto.randomUUID(), ...po }, ...s.purchaseOrders] })),
      updatePurchaseOrder: (id, patch) => set((s) => ({ purchaseOrders: s.purchaseOrders.map((po) => (po.id === id ? { ...po, ...patch } : po)) })),
      deletePurchaseOrder: (id) => set((s) => ({ purchaseOrders: s.purchaseOrders.filter((po) => po.id !== id) })),

      addPurchaseInvoice: (pi) => set((s) => ({ purchaseInvoices: [{ id: (pi as any).id || crypto.randomUUID(), ...pi }, ...s.purchaseInvoices] })),
      updatePurchaseInvoice: (id, patch) => set((s) => ({ purchaseInvoices: s.purchaseInvoices.map((pi) => (pi.id === id ? { ...pi, ...patch } : pi)) })),
      deletePurchaseInvoice: (id) => set((s) => ({ purchaseInvoices: s.purchaseInvoices.filter((pi) => pi.id !== id) })),

      addVendorBill: (vb) => set((s) => ({ vendorBills: [{ id: (vb as any).id || crypto.randomUUID(), ...vb }, ...s.vendorBills] })),
      updateVendorBill: (id, patch) => set((s) => ({ vendorBills: s.vendorBills.map((vb) => (vb.id === id ? { ...vb, ...patch } : vb)) })),
      deleteVendorBill: (id) => set((s) => ({ vendorBills: s.vendorBills.filter((vb) => vb.id !== id) })),

      addDebitNote: (dn) => set((s) => ({ debitNotes: [{ id: (dn as any).id || crypto.randomUUID(), ...dn }, ...s.debitNotes] })),
      updateDebitNote: (id, patch) => set((s) => ({ debitNotes: s.debitNotes.map((dn) => (dn.id === id ? { ...dn, ...patch } : dn)) })),
      deleteDebitNote: (id) => set((s) => ({ debitNotes: s.debitNotes.filter((dn) => dn.id !== id) })),

      addSalesReturn: (sr) => set((s) => ({ salesReturns: [{ id: (sr as any).id || crypto.randomUUID(), ...sr }, ...s.salesReturns] })),
      updateSalesReturn: (id, patch) => set((s) => ({ salesReturns: s.salesReturns.map((sr) => (sr.id === id ? { ...sr, ...patch } : sr)) })),
      deleteSalesReturn: (id) => set((s) => ({ salesReturns: s.salesReturns.filter((sr) => sr.id !== id) })),

      addPurchaseReturn: (pr) => set((s) => ({ purchaseReturns: [{ id: (pr as any).id || crypto.randomUUID(), ...pr }, ...s.purchaseReturns] })),
      updatePurchaseReturn: (id, patch) => set((s) => ({ purchaseReturns: s.purchaseReturns.map((pr) => (pr.id === id ? { ...pr, ...patch } : pr)) })),
      deletePurchaseReturn: (id) => set((s) => ({ purchaseReturns: s.purchaseReturns.filter((pr) => pr.id !== id) })),

      addVendorPayment: (vp) => set((s) => ({ vendorPayments: [{ id: (vp as any).id || crypto.randomUUID(), ...vp }, ...s.vendorPayments] })),
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

      addFinancialYear: (fy) => set((s) => ({ financialYears: [{ id: (fy as any).id || crypto.randomUUID(), ...fy }, ...s.financialYears] })),
      updateFinancialYear: (id, patch) => set((s) => ({ financialYears: s.financialYears.map((fy) => (fy.id === id ? { ...fy, ...patch } : fy)) })),
      deleteFinancialYear: (id) => set((s) => ({ financialYears: s.financialYears.filter((fy) => fy.id !== id) })),

      // Approvals Action
      addApprovalQueueItem: (item) => {
        const id = (item as any).id || safeUUID();
        const et = (item.entity_type || '').toLowerCase();
        const mod = (item.module || '').toLowerCase();
        const rec = (item.record_no || '').toLowerCase();
        const isPayment =
          et.includes('receipt') ||
          et.includes('payment') ||
          et.includes('voucher') ||
          et.includes('receive') ||
          et.includes('pay') ||
          mod.includes('receipt') ||
          mod.includes('payment') ||
          mod.includes('receive') ||
          mod.includes('pay') ||
          rec.startsWith('cr') ||
          rec.startsWith('cp') ||
          rec.startsWith('pv') ||
          rec.startsWith('rv') ||
          rec.startsWith('pay') ||
          rec.startsWith('rec');

        const sanitizedItem = isPayment
          ? { ...item, warehouse_id: null, items_summary: null }
          : item;

        set((s) => {
          const existingIdx = s.approvalQueue.findIndex(
            (a) =>
              (item.record_id && a.record_id === item.record_id) ||
              (item.record_no && a.record_no === item.record_no && a.module === item.module)
          );

          if (existingIdx >= 0) {
            const updatedQueue = [...s.approvalQueue];
            updatedQueue[existingIdx] = {
              ...updatedQueue[existingIdx],
              ...sanitizedItem,
              status: 'PENDING',
              review_note: undefined,
              reviewed_by: undefined,
              reviewed_at: undefined,
              created_at: new Date().toISOString(),
            };
            return { approvalQueue: updatedQueue };
          }

          return {
            approvalQueue: [{ id, ...sanitizedItem, created_at: item.created_at || new Date().toISOString() }, ...s.approvalQueue],
          };
        });
        return id;
      },

      reviewApproval: (id, status, note, reviewer) =>
        set((s) => {
          const item = s.approvalQueue.find((a) => a.id === id);
          if (!item) return s;

          const updatedQueue = s.approvalQueue.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status,
                  review_note: note,
                  reviewed_by: reviewer || 'Administrator',
                  reviewed_at: new Date().toISOString(),
                }
              : a
          );

          if (status === 'REJECTED') {
            const targetStatus = 'REJECTED';
            let newInvoices = s.invoices;
            let newVendorBills = s.vendorBills;
            let newPurchaseInvoices = s.purchaseInvoices;
            let newSalesReturns = s.salesReturns;
            let newPurchaseReturns = s.purchaseReturns;
            let newCustomerReceipts = s.customerReceipts;
            let newVendorPayments = s.vendorPayments;

            if (item.entity_type === 'sales_invoice') {
              newInvoices = s.invoices.map((inv) =>
                inv.id === item.record_id || inv.invoice_no === item.record_no ? { ...inv, status: targetStatus } : inv
              );
            } else if (item.entity_type === 'vendor_bill' || item.entity_type === 'purchase_invoice') {
              newVendorBills = s.vendorBills.map((b) =>
                b.id === item.record_id || b.bill_no === item.record_no ? { ...b, status: targetStatus } : b
              );
              newPurchaseInvoices = s.purchaseInvoices.map((p) =>
                p.id === item.record_id || p.grn_no === item.record_no ? { ...p, status: targetStatus } : p
              );
            } else if (item.entity_type === 'sales_return') {
              newSalesReturns = s.salesReturns.map((sr) =>
                sr.id === item.record_id || sr.return_no === item.record_no ? { ...sr, status: targetStatus } : sr
              );
            } else if (item.entity_type === 'purchase_return') {
              newPurchaseReturns = s.purchaseReturns.map((pr) =>
                pr.id === item.record_id || pr.return_no === item.record_no ? { ...pr, status: targetStatus } : pr
              );
            } else if (item.entity_type === 'customer_receipt' || item.entity_type === 'payment_receipt') {
              newCustomerReceipts = (s.customerReceipts || []).map((cr) =>
                cr.id === item.record_id || cr.receipt_no === item.record_no ? { ...cr, status: targetStatus } : cr
              );
            } else if (item.entity_type === 'vendor_payment' || item.entity_type === 'payment_voucher') {
              newVendorPayments = (s.vendorPayments || []).map((vp) =>
                vp.id === item.record_id || vp.payment_no === item.record_no ? { ...vp, status: targetStatus } : vp
              );
            }

            return {
              approvalQueue: updatedQueue,
              invoices: newInvoices,
              vendorBills: newVendorBills,
              purchaseInvoices: newPurchaseInvoices,
              salesReturns: newSalesReturns,
              purchaseReturns: newPurchaseReturns,
              customerReceipts: newCustomerReceipts,
              vendorPayments: newVendorPayments,
            };
          }

          if (status === 'APPROVED') {
            let newProducts = [...s.products];
            let newInvoices = s.invoices;
            let newVendorBills = s.vendorBills;
            let newPurchaseInvoices = s.purchaseInvoices;
            let newSalesReturns = s.salesReturns;
            let newPurchaseReturns = s.purchaseReturns;
            let newCustomerReceipts = s.customerReceipts;
            let newVendorPayments = s.vendorPayments;
            let newBankAccounts = [...s.bankAccounts];
            let newJournalEntries = [...s.journalEntries];

            // 1. Sales Invoice Approved -> status POSTED, decrement product inventory
            if (item.entity_type === 'sales_invoice') {
              const inv = s.invoices.find((i) => i.id === item.record_id || i.invoice_no === item.record_no);
              if (inv) {
                newInvoices = s.invoices.map((i) =>
                  i.id === inv.id ? { ...i, status: 'POSTED' } : i
                );
                (inv.items || []).forEach((invItem) => {
                  if (!invItem.product_id) return;
                  newProducts = newProducts.map((p) =>
                    p.id === invItem.product_id
                      ? { ...p, stock_quantity: Math.max(0, (p.stock_quantity || 0) - (invItem.qty || 0)) }
                      : p
                  );
                });
              }
            }

            // 2. Vendor Bill / Purchase Invoice Approved -> status POSTED, increment product inventory
            else if (item.entity_type === 'vendor_bill' || item.entity_type === 'purchase_invoice') {
              const bill = s.vendorBills.find((b) => b.id === item.record_id || b.bill_no === item.record_no);
              if (bill) {
                newVendorBills = s.vendorBills.map((b) =>
                  b.id === bill.id ? { ...b, status: 'POSTED' } : b
                );
                (bill.items || []).forEach((bItem) => {
                  if (!bItem.product_id) return;
                  newProducts = newProducts.map((p) =>
                    p.id === bItem.product_id
                      ? { ...p, stock_quantity: (p.stock_quantity || 0) + (bItem.qty || 0) }
                      : p
                  );
                });
              }
              const pi = s.purchaseInvoices.find((p) => p.id === item.record_id || p.grn_no === item.record_no);
              if (pi) {
                newPurchaseInvoices = s.purchaseInvoices.map((p) =>
                  p.id === pi.id ? { ...p, status: 'POSTED' } : p
                );
                (pi.items || []).forEach((piItem) => {
                  if (!piItem.product_id) return;
                  newProducts = newProducts.map((p) =>
                    p.id === piItem.product_id
                      ? { ...p, stock_quantity: (p.stock_quantity || 0) + (piItem.qty || 0) }
                      : p
                  );
                });
              }
            }

            // 3. Sales Return Approved -> status POSTED, increment product inventory (items returned to company)
            else if (item.entity_type === 'sales_return') {
              const sr = s.salesReturns.find((r) => r.id === item.record_id || r.return_no === item.record_no);
              if (sr) {
                newSalesReturns = s.salesReturns.map((r) =>
                  r.id === sr.id ? { ...r, status: 'POSTED' } : r
                );
                (sr.items || []).forEach((srItem) => {
                  if (!srItem.product_id) return;
                  newProducts = newProducts.map((p) =>
                    p.id === srItem.product_id
                      ? { ...p, stock_quantity: (p.stock_quantity || 0) + (srItem.qty || 0) }
                      : p
                  );
                });
              }
            }

            // 5. Customer / Payment Receipt Approved -> status POSTED, auto-allocate customer invoices, update bank balance, post journal entry
            else if (item.entity_type === 'customer_receipt' || item.entity_type === 'payment_receipt') {
              const receipt = (s.customerReceipts || []).find((r) => r.id === item.record_id || r.receipt_no === item.record_no);
              if (receipt) {
                newCustomerReceipts = (s.customerReceipts || []).map((r) =>
                  r.id === receipt.id ? { ...r, status: 'POSTED' } : r
                );

                // Auto allocate oldest customer invoices if customer_id is present
                if (receipt.customer_id) {
                  let remaining = receipt.amount || 0;
                  newInvoices = newInvoices.map((inv) => {
                    if (inv.customer_id === receipt.customer_id && inv.status !== 'CANCELLED' && remaining > 0) {
                      const due = (inv.total_amount || 0) - (inv.paid_amount || 0);
                      if (due > 0) {
                        const alloc = Math.min(remaining, due);
                        const newPaid = (inv.paid_amount || 0) + alloc;
                        remaining -= alloc;
                        return {
                          ...inv,
                          paid_amount: newPaid,
                          status: newPaid >= (inv.total_amount || 0) ? 'POSTED' : inv.status,
                        };
                      }
                    }
                    return inv;
                  });
                }

                // Update Bank Account balance
                const bankIdx = newBankAccounts.findIndex(
                  (b) => b.id === receipt.deposit_account_id || b.account_name === receipt.deposit_to
                );
                if (bankIdx !== -1) {
                  newBankAccounts[bankIdx] = {
                    ...newBankAccounts[bankIdx],
                    current_balance: (newBankAccounts[bankIdx].current_balance || 0) + (receipt.amount || 0),
                  };
                }

                // Add Journal Entry
                const depositName = receipt.deposit_to || newBankAccounts[bankIdx]?.account_name || 'Cash in Hand';
                newJournalEntries.unshift({
                  id: crypto.randomUUID(),
                  entry_no: `JV-${receipt.receipt_no}`,
                  entry_date: receipt.receipt_date,
                  reference_no: receipt.receipt_no,
                  source: 'Customer Payment',
                  narration: `Customer payment ${receipt.receipt_no} deposited to ${depositName}`,
                  total_debit: receipt.amount,
                  total_credit: receipt.amount,
                  status: 'POSTED',
                  created_at: new Date().toISOString(),
                });
              }
            }

            // 6. Vendor / Pay Payment Approved -> status POSTED, auto-allocate vendor bills, deduct bank balance, post journal entry
            else if (item.entity_type === 'vendor_payment' || item.entity_type === 'payment_voucher') {
              const payment = (s.vendorPayments || []).find((p) => p.id === item.record_id || p.payment_no === item.record_no);
              if (payment) {
                newVendorPayments = (s.vendorPayments || []).map((p) =>
                  p.id === payment.id ? { ...p, status: 'POSTED' } : p
                );

                // Auto allocate oldest vendor bills if vendor_id is present
                if (payment.vendor_id) {
                  let remaining = payment.amount || 0;
                  newVendorBills = newVendorBills.map((b) => {
                    if (b.vendor_id === payment.vendor_id && b.status !== 'CANCELLED' && remaining > 0) {
                      const due = (b.total_amount || 0) - (b.paid_amount || 0);
                      if (due > 0) {
                        const alloc = Math.min(remaining, due);
                        const newPaid = (b.paid_amount || 0) + alloc;
                        remaining -= alloc;
                        return {
                          ...b,
                          paid_amount: newPaid,
                          status: newPaid >= (b.total_amount || 0) ? 'POSTED' : b.status,
                        };
                      }
                    }
                    return b;
                  });
                }

                // Deduct from Bank Account balance
                const bankIdx = newBankAccounts.findIndex(
                  (b) => b.id === payment.paid_from_account_id || b.account_name === payment.payment_method
                );
                if (bankIdx !== -1) {
                  newBankAccounts[bankIdx] = {
                    ...newBankAccounts[bankIdx],
                    current_balance: Math.max(0, (newBankAccounts[bankIdx].current_balance || 0) - (payment.amount || 0)),
                  };
                }

                // Add Journal Entry
                const payFromName = payment.payment_method || newBankAccounts[bankIdx]?.account_name || 'Cash in Hand';
                newJournalEntries.unshift({
                  id: crypto.randomUUID(),
                  entry_no: `JV-${payment.payment_no}`,
                  entry_date: payment.payment_date,
                  reference_no: payment.payment_no,
                  source: 'Vendor Payment',
                  narration: `Payment ${payment.payment_no} paid from ${payFromName}`,
                  total_debit: payment.amount,
                  total_credit: payment.amount,
                  status: 'POSTED',
                  created_at: new Date().toISOString(),
                });
              }
            }

            return {
              approvalQueue: updatedQueue,
              products: newProducts,
              invoices: newInvoices,
              vendorBills: newVendorBills,
              purchaseInvoices: newPurchaseInvoices,
              salesReturns: newSalesReturns,
              purchaseReturns: newPurchaseReturns,
              customerReceipts: newCustomerReceipts,
              vendorPayments: newVendorPayments,
              bankAccounts: newBankAccounts,
              journalEntries: newJournalEntries,
            };
          }

          return { approvalQueue: updatedQueue };
        }),

      // Org & Branch & Dept Actions
      addOrg: (o) =>
        set((s) => {
          const newOrgs = [{ id: crypto.randomUUID(), ...o }, ...s.organizations];
          return {
            organizations: newOrgs,
            orgSettings: {
              ...s.orgSettings,
              name: o.name || s.orgSettings.name,
              legal_name: o.legal_name || s.orgSettings.legal_name,
              currency: o.currency || s.orgSettings.currency,
              phone: o.phone || s.orgSettings.phone,
              email: o.email || s.orgSettings.email,
              address: o.address || s.orgSettings.address,
              tax_id: o.tax_id || s.orgSettings.tax_id,
            },
          };
        }),
      updateOrg: (id, patch) =>
        set((s) => {
          const updatedOrgs = s.organizations.map((o) => (o.id === id ? { ...o, ...patch } : o));
          const targetOrg = updatedOrgs.find((o) => o.id === id) || updatedOrgs[0];
          return {
            organizations: updatedOrgs,
            orgSettings: {
              ...s.orgSettings,
              name: targetOrg?.name || s.orgSettings.name,
              legal_name: targetOrg?.legal_name || s.orgSettings.legal_name,
              currency: targetOrg?.currency || s.orgSettings.currency,
              phone: targetOrg?.phone || s.orgSettings.phone,
              email: targetOrg?.email || s.orgSettings.email,
              address: targetOrg?.address || s.orgSettings.address,
              tax_id: targetOrg?.tax_id || s.orgSettings.tax_id,
              default_invoice_prefix: targetOrg?.default_invoice_prefix || s.orgSettings.default_invoice_prefix,
            },
            // If org is deactivated, deactivate all its branches
            branches: patch.status === 'Inactive'
              ? s.branches.map((b) => b.org_id === id ? { ...b, is_active: false } : b)
              : s.branches,
          };
        }),
      deleteOrg: (id) =>
        set((s) => {
          const org = s.organizations.find((o) => o.id === id);
          return {
            organizations: s.organizations.filter((o) => o.id !== id),
            // Cascade: null org_id in branches and sales documents
            branches: s.branches.map((b) => b.org_id === id ? { ...b, org_id: null } : b),
            quotations: s.quotations.map((q) => q.org_id === id ? { ...q, org_id: null } : q),
            salesOrders: s.salesOrders.map((so) => so.org_id === id ? { ...so, org_id: null } : so),
            auditLogs: [{ id: crypto.randomUUID(), username: 'admin', module: 'Organizations', action: 'Delete', description: `Organization deleted: ${org?.name || id}`, ip_address: '127.0.0.1', timestamp: new Date().toISOString() }, ...s.auditLogs],
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
            auditLogs: [{ id: crypto.randomUUID(), username: 'admin', module: 'Branches', action: 'Delete', description: `Branch deleted: ${br?.name || id}`, ip_address: '127.0.0.1', timestamp: new Date().toISOString() }, ...s.auditLogs],
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
            auditLogs: [{ id: crypto.randomUUID(), username: 'admin', module: 'Departments', action: 'Delete', description: `Department deleted: ${dept?.name || id}`, ip_address: '127.0.0.1', timestamp: new Date().toISOString() }, ...s.auditLogs],
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
      updateOrgSettings: (patch) =>
        set((s) => {
          const updatedSettings = { ...s.orgSettings, ...patch };
          const updatedOrgs = s.organizations.map((o, idx) =>
            idx === 0
              ? {
                  ...o,
                  name: patch.name || o.name,
                  legal_name: patch.legal_name || o.legal_name,
                  currency: patch.currency || o.currency,
                  address: patch.address || o.address,
                  phone: patch.phone || o.phone,
                  email: patch.email || o.email,
                  tax_id: patch.tax_id || o.tax_id,
                }
              : o
          );
          return {
            orgSettings: updatedSettings,
            organizations: updatedOrgs,
          };
        }),

      // Reset all business data, entries, products, balances, transactions for a completely clean slate
      resetBusinessData: () =>
        set((s) => ({
          customers: [],
          vendors: [],
          products: [],
          categories: [],
          productArticles: [],
          universalArticles: [],
          warehouses: [
            {
              id: 'w1',
              code: 'MAIN',
              name: 'Main Warehouse',
              branch_id: 'b1',
              address: 'Head Office Compound',
              is_active: true,
              is_default: true,
            },
          ],
          invoices: [],
          quotations: [],
          salesOrders: [],
          creditNotes: [],
          salesReturns: [],
          customerReceipts: [],
          commissions: [],
          purchaseRequests: [],
          purchaseOrders: [],
          purchaseInvoices: [],
          vendorBills: [],
          debitNotes: [],
          purchaseReturns: [],
          vendorPayments: [],
          approvalQueue: [],
          bankAccounts: [
            { id: 'ba1', account_name: 'Cash in Hand', bank_name: 'Cash', account_number: '1110', iban: null, currency: 'PKR', opening_balance: 0, current_balance: 0, account_type: 'Cash', status: 'Active' },
            { id: 'ba2', account_name: 'Meezan Islamic Main Account', bank_name: 'Meezan Bank', account_number: '0102998877', iban: 'PK36MEZN000102998877', currency: 'PKR', opening_balance: 0, current_balance: 0, account_type: 'Bank', status: 'Active' },
          ],
          bankStatements: [],
          journalEntries: [],
          chartOfAccounts: (s.chartOfAccounts && s.chartOfAccounts.length > 0 ? s.chartOfAccounts : initialCOA).map((coa) => ({
            ...coa,
            current_balance: 0,
          })),
          expenseRecords: [],
          incomeRecords: [],
          stockTransfers: [],
          stockAdjustments: [],
          batches: [],
          serials: [],
          auditLogs: [],
          loginLogs: [],
          users: s.users.map((u) => ({
            ...u,
            base_salary: 0,
            allowances: 0,
            others: 0,
          })),
        })),
    }),
    {
      name: 'amkas-erp-data-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.organizations) {
            state.organizations = state.organizations.map((o) =>
              o.name === 'AMKAS INTERNATIONAL' ? { ...o, name: 'NICE ENTERPRISES' } : o
            );
          }
          if (state.orgSettings?.name === 'AMKAS INTERNATIONAL') {
            state.orgSettings.name = 'NICE ENTERPRISES';
          }
          if (state.customers?.some((c) => c.id === 'c1' || c.id === 'c2')) {
            state.customers = state.customers.filter((c) => c.id !== 'c1' && c.id !== 'c2');
          }
          if (state.vendors?.some((v) => v.id === 'v1' || v.id === 'v2' || v.id === 'v3')) {
            state.vendors = state.vendors.filter((v) => v.id !== 'v1' && v.id !== 'v2' && v.id !== 'v3');
          }
          if (state.products?.some((p) => p.id === 'p1')) {
            state.products = state.products.filter((p) => p.id !== 'p1');
          }
          if (state.categories?.some((cat) => cat.id === 'cat1')) {
            state.categories = state.categories.filter((cat) => cat.id !== 'cat1');
          }
          if (state.invoices?.some((i) => i.id === 'inv1')) {
            state.invoices = state.invoices.filter((i) => i.id !== 'inv1');
          }
          if (state.incomeRecords?.some((i) => i.id === 'inc1')) {
            state.incomeRecords = state.incomeRecords.filter((i) => i.id !== 'inc1');
          }
          if (state.approvalQueue?.some((a) => a.id === 'app1')) {
            state.approvalQueue = state.approvalQueue.filter((a) => a.id !== 'app1');
          }
          if (state.batches?.some((b) => b.id === 'b1')) {
            state.batches = state.batches.filter((b) => b.id !== 'b1');
          }
          if (state.journalEntries?.some((j) => j.id === 'j1')) {
            state.journalEntries = state.journalEntries.filter((j) => j.id !== 'j1');
          }
          if (state.approvalQueue) {
            state.approvalQueue = state.approvalQueue.map((a) => {
              const et = (a.entity_type || '').toLowerCase();
              const mod = (a.module || '').toLowerCase();
              const rec = (a.record_no || '').toLowerCase();
              const isPayment =
                et.includes('receipt') ||
                et.includes('payment') ||
                et.includes('voucher') ||
                et.includes('receive') ||
                et.includes('pay') ||
                mod.includes('receipt') ||
                mod.includes('payment') ||
                mod.includes('receive') ||
                mod.includes('pay') ||
                rec.startsWith('cr') ||
                rec.startsWith('cp') ||
                rec.startsWith('pv') ||
                rec.startsWith('rv') ||
                rec.startsWith('pay') ||
                rec.startsWith('rec');
              if (isPayment) {
                return { ...a, warehouse_id: null, items_summary: null };
              }
              return a;
            });
          }
        }
      },
    }
  )
);
