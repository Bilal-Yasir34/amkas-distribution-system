import { TABLES } from './supabase';

/**
 * Single source of truth for React Query key roots.
 * Every key root matches its exact Supabase table name in `TABLES` so that
 * `queryClient.invalidateQueries({ queryKey: [tableName] })` from the
 * Realtime listener or mutations invalidates all queries for that table.
 */
export const QUERY_KEYS = {
  organizations: [TABLES.organizations] as const,
  organization: (id: string) => [TABLES.organizations, id] as const,

  branches: [TABLES.branches] as const,
  branch: (id: string) => [TABLES.branches, id] as const,

  departments: [TABLES.departments] as const,
  department: (id: string) => [TABLES.departments, id] as const,

  userProfiles: [TABLES.userProfiles] as const,
  userProfile: (id: string) => [TABLES.userProfiles, id] as const,

  rolePermissions: [TABLES.rolePermissions] as const,

  chartOfAccounts: [TABLES.chartOfAccounts] as const,
  chartOfAccount: (id: string) => [TABLES.chartOfAccounts, id] as const,

  controlAccountMappings: [TABLES.controlAccountMappings] as const,

  accountTypes: [TABLES.accountTypes] as const,
  accountType: (id: string) => [TABLES.accountTypes, id] as const,

  accountLedger: [TABLES.accountLedger] as const,
  accountLedgerFiltered: (accountId?: string, partyId?: string) =>
    [TABLES.accountLedger, { accountId: accountId ?? null, partyId: partyId ?? null }] as const,

  journalEntries: [TABLES.journalEntries] as const,
  journalEntry: (id: string) => [TABLES.journalEntries, id] as const,

  financialYears: [TABLES.financialYears] as const,
  financialYear: (id: string) => [TABLES.financialYears, id] as const,

  expenseRecords: [TABLES.expenseRecords] as const,
  expenseRecord: (id: string) => [TABLES.expenseRecords, id] as const,

  incomeRecords: [TABLES.incomeRecords] as const,
  incomeRecord: (id: string) => [TABLES.incomeRecords, id] as const,

  products: [TABLES.products] as const,
  product: (id: string) => [TABLES.products, id] as const,

  productArticles: [TABLES.productArticles] as const,
  productArticle: (id: string) => [TABLES.productArticles, id] as const,

  universalArticles: [TABLES.universalArticles] as const,

  categories: [TABLES.categories] as const,
  category: (id: string) => [TABLES.categories, id] as const,

  warehouses: [TABLES.warehouses] as const,
  warehouse: (id: string) => [TABLES.warehouses, id] as const,

  stockLedger: [TABLES.stockLedger] as const,
  stockLedgerByProduct: (productId?: string) => [TABLES.stockLedger, productId ?? 'ALL'] as const,

  stockTransfers: [TABLES.stockTransfers] as const,
  stockTransfer: (id: string) => [TABLES.stockTransfers, id] as const,

  stockAdjustments: [TABLES.stockAdjustments] as const,
  stockAdjustment: (id: string) => [TABLES.stockAdjustments, id] as const,

  productBatches: [TABLES.productBatches] as const,
  productBatch: (id: string) => [TABLES.productBatches, id] as const,

  productSerials: [TABLES.productSerials] as const,
  productSerial: (id: string) => [TABLES.productSerials, id] as const,

  customers: [TABLES.customers] as const,
  customer: (id: string) => [TABLES.customers, id] as const,

  vendors: [TABLES.vendors] as const,
  vendor: (id: string) => [TABLES.vendors, id] as const,

  salesInvoices: [TABLES.salesInvoices] as const,
  salesInvoice: (id: string) => [TABLES.salesInvoices, id] as const,

  salesInvoiceItems: [TABLES.salesInvoiceItems] as const,
  salesInvoiceItemsByInvoice: (invoiceId: string | null) =>
    [TABLES.salesInvoiceItems, invoiceId ?? 'NONE'] as const,

  quotations: [TABLES.quotations] as const,
  quotation: (id: string) => [TABLES.quotations, id] as const,
  quotationItems: [TABLES.quotationItems] as const,

  salesOrders: [TABLES.salesOrders] as const,
  salesOrder: (id: string) => [TABLES.salesOrders, id] as const,
  salesOrderItems: [TABLES.salesOrderItems] as const,

  creditNotes: [TABLES.creditNotes] as const,
  creditNote: (id: string) => [TABLES.creditNotes, id] as const,

  salesReturns: [TABLES.salesReturns] as const,
  salesReturn: (id: string) => [TABLES.salesReturns, id] as const,

  customerReceipts: [TABLES.customerReceipts] as const,
  customerReceipt: (id: string) => [TABLES.customerReceipts, id] as const,

  salesCommissions: [TABLES.salesCommissions] as const,
  salesCommission: (id: string) => [TABLES.salesCommissions, id] as const,

  purchaseRequests: [TABLES.purchaseRequests] as const,
  purchaseRequest: (id: string) => [TABLES.purchaseRequests, id] as const,

  purchaseOrders: [TABLES.purchaseOrders] as const,
  purchaseOrder: (id: string) => [TABLES.purchaseOrders, id] as const,

  purchaseInvoices: [TABLES.purchaseInvoices] as const,
  purchaseInvoice: (id: string) => [TABLES.purchaseInvoices, id] as const,
  purchaseInvoiceItems: [TABLES.purchaseInvoiceItems] as const,

  vendorBills: [TABLES.vendorBills] as const,
  vendorBill: (id: string) => [TABLES.vendorBills, id] as const,
  vendorBillItems: [TABLES.vendorBillItems] as const,

  debitNotes: [TABLES.debitNotes] as const,
  debitNote: (id: string) => [TABLES.debitNotes, id] as const,

  purchaseReturns: [TABLES.purchaseReturns] as const,
  purchaseReturn: (id: string) => [TABLES.purchaseReturns, id] as const,

  vendorPayments: [TABLES.vendorPayments] as const,
  vendorPayment: (id: string) => [TABLES.vendorPayments, id] as const,

  bankAccounts: [TABLES.bankAccounts] as const,
  bankAccount: (id: string) => [TABLES.bankAccounts, id] as const,

  bankStatements: [TABLES.bankStatements] as const,
  bankStatement: (id: string) => [TABLES.bankStatements, id] as const,

  approvalQueue: [TABLES.approvalQueue] as const,
  approvalQueueFiltered: (status?: string) => [TABLES.approvalQueue, status ?? 'ALL'] as const,

  documentSequences: [TABLES.documentSequences] as const,
  exchangeRates: [TABLES.exchangeRates] as const,

  auditLogs: [TABLES.auditLogs] as const,
  loginLogs: [TABLES.loginLogs] as const,
} as const;

/**
 * Related table invalidation map: when a table changes (via mutation or Realtime),
 * these dependent table query roots are also invalidated automatically.
 */
export const RELATED_TABLE_KEYS: Record<string, readonly string[]> = {
  [TABLES.salesInvoices]: [
    TABLES.salesInvoiceItems,
    TABLES.products,
    TABLES.stockLedger,
    TABLES.accountLedger,
    TABLES.journalEntries,
    TABLES.approvalQueue,
    TABLES.salesCommissions,
    TABLES.customers,
  ],
  [TABLES.salesInvoiceItems]: [TABLES.salesInvoices, TABLES.products, TABLES.stockLedger],
  [TABLES.purchaseInvoices]: [
    TABLES.purchaseInvoiceItems,
    TABLES.products,
    TABLES.stockLedger,
    TABLES.accountLedger,
    TABLES.journalEntries,
    TABLES.approvalQueue,
    TABLES.vendors,
  ],
  [TABLES.purchaseInvoiceItems]: [TABLES.purchaseInvoices, TABLES.products, TABLES.stockLedger],
  [TABLES.vendorBills]: [
    TABLES.vendorBillItems,
    TABLES.products,
    TABLES.stockLedger,
    TABLES.journalEntries,
    TABLES.approvalQueue,
    TABLES.vendors,
  ],
  [TABLES.approvalQueue]: [
    TABLES.salesInvoices,
    TABLES.purchaseInvoices,
    TABLES.vendorBills,
    TABLES.salesReturns,
    TABLES.purchaseReturns,
    TABLES.customerReceipts,
    TABLES.vendorPayments,
    TABLES.products,
    TABLES.bankAccounts,
    TABLES.journalEntries,
    TABLES.stockLedger,
  ],
  [TABLES.customerReceipts]: [
    TABLES.salesInvoices,
    TABLES.bankAccounts,
    TABLES.journalEntries,
    TABLES.accountLedger,
    TABLES.approvalQueue,
    TABLES.customers,
  ],
  [TABLES.vendorPayments]: [
    TABLES.vendorBills,
    TABLES.purchaseInvoices,
    TABLES.bankAccounts,
    TABLES.journalEntries,
    TABLES.accountLedger,
    TABLES.approvalQueue,
    TABLES.vendors,
  ],
  [TABLES.salesReturns]: [
    TABLES.products,
    TABLES.stockLedger,
    TABLES.journalEntries,
    TABLES.approvalQueue,
    TABLES.customers,
  ],
  [TABLES.purchaseReturns]: [
    TABLES.products,
    TABLES.stockLedger,
    TABLES.journalEntries,
    TABLES.approvalQueue,
    TABLES.vendors,
  ],
  [TABLES.stockTransfers]: [TABLES.products, TABLES.stockLedger],
  [TABLES.stockAdjustments]: [TABLES.products, TABLES.stockLedger],
  [TABLES.products]: [TABLES.productArticles, TABLES.stockLedger],
  [TABLES.productArticles]: [TABLES.products, TABLES.universalArticles],
  [TABLES.journalEntries]: [TABLES.accountLedger, TABLES.chartOfAccounts],
};
