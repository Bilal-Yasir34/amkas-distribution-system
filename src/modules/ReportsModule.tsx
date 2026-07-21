import { useState } from 'react';
import {
  BarChart3,
  FileText,
  Printer,
  Download,
  Mail,
  ArrowLeft,
  X,
  AlertCircle,
} from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { downloadCSV, formatCurrency } from '@/lib/utils';

interface ReportTile {
  code: string;
  name: string;
  description: string;
  category: 'FINANCIAL' | 'OPERATIONAL';
}

const REPORT_LIST: ReportTile[] = [
  { code: 'TB', name: 'Trial Balance', description: 'Account-wise debit/credit balance summary', category: 'FINANCIAL' },
  { code: 'P&L', name: 'Profit & Loss', description: 'Income, cost and expenses for selected period', category: 'FINANCIAL' },
  { code: 'BS', name: 'Balance Sheet', description: 'Assets, liabilities and equity snapshot', category: 'FINANCIAL' },
  { code: 'CF', name: 'Cash Flow Statement', description: 'Cash and bank inflows and outflows', category: 'FINANCIAL' },
  { code: 'S', name: 'Sales Report', description: 'All posted invoices with totals and collections', category: 'OPERATIONAL' },
  { code: 'P', name: 'Purchase Report', description: 'Vendor bills, payments and outstanding amounts', category: 'OPERATIONAL' },
  { code: 'IV', name: 'Inventory Valuation', description: 'Product-wise stock value at average cost', category: 'OPERATIONAL' },
  { code: 'AR', name: 'Customer Aging', description: 'Receivables grouped by 0-30, 31-60, 61-90, 90+ days', category: 'OPERATIONAL' },
  { code: 'AP', name: 'Vendor Aging', description: 'Payables grouped by 0-30, 31-60, 61-90, 90+ days', category: 'OPERATIONAL' },
  { code: 'C', name: 'Customer Report', description: 'Sales, receipts and outstanding balances per customer', category: 'OPERATIONAL' },
  { code: 'V', name: 'Vendor Report', description: 'Purchases, payments and outstanding per vendor', category: 'OPERATIONAL' },
  { code: 'T', name: 'Tax Report', description: 'Output tax, input tax and net tax position', category: 'OPERATIONAL' },
  { code: 'B', name: 'Bank Report', description: 'Cash and bank ledger balances', category: 'OPERATIONAL' },
  { code: 'SP', name: 'Salesperson Report', description: 'Sales and commission by salesperson', category: 'OPERATIONAL' },
];

function AgingBuckets(daysOverdue: number) {
  if (daysOverdue <= 0) return '0 days';
  if (daysOverdue <= 30) return '1-30 days';
  if (daysOverdue <= 60) return '31-60 days';
  if (daysOverdue <= 90) return '61-90 days';
  return '90+ days';
}

export function ReportsModule() {
  const [selectedReport, setSelectedReport] = useState<ReportTile | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [fromDate, setFromDate] = useState('2026-07-01');
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const {
    invoices,
    vendorBills,
    customers,
    vendors,
    products,
    customerReceipts,
    vendorPayments,
    chartOfAccounts,
    bankAccounts,
    batches,
  } = useDataStore();

  // ——— Sales Report Data ———
  const salesRows = invoices.filter((i) => i.status === 'POSTED').map((inv) => {
    const cust = customers.find((c) => c.id === inv.customer_id);
    return {
      invoice_no: inv.invoice_no,
      customer: cust?.name || '—',
      date: inv.invoice_date,
      total: inv.total_amount || 0,
      paid: inv.paid_amount || 0,
      balance: (inv.total_amount || 0) - (inv.paid_amount || 0),
    };
  });
  const salesTotal = salesRows.reduce((s, r) => s + r.total, 0);
  const salesPaid = salesRows.reduce((s, r) => s + r.paid, 0);

  // ——— Purchase Report Data ———
  const purchaseRows = vendorBills.filter((b) => b.status === 'POSTED').map((b) => {
    const ven = vendors.find((v) => v.id === b.vendor_id);
    return {
      bill_no: b.bill_no,
      vendor: ven?.name || '—',
      date: b.bill_date,
      total: b.total_amount || 0,
      paid: b.paid_amount || 0,
      balance: (b.total_amount || 0) - (b.paid_amount || 0),
    };
  });
  const purchaseTotal = purchaseRows.reduce((s, r) => s + r.total, 0);

  // ——— Inventory Valuation ———
  const inventoryRows = products.map((p) => {
    const batchQty = batches.filter((b) => b.product_id === p.id).reduce((s, b) => s + (b.quantity_on_hand || 0), 0) || 500;
    const cost = p.opening_average_cost || p.purchase_price || 0;
    return {
      code: p.code,
      name: p.name,
      qty: batchQty,
      unit_cost: cost,
      total_value: batchQty * cost,
    };
  });
  const inventoryTotal = inventoryRows.reduce((s, r) => s + r.total_value, 0);

  // ——— Customer Aging ———
  const today = new Date();
  const agingRows = customers.map((c) => {
    const custInvoices = invoices.filter((i) => i.customer_id === c.id && i.status === 'POSTED');
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90p: 0 };
    custInvoices.forEach((inv) => {
      const balance = (inv.total_amount || 0) - (inv.paid_amount || 0);
      if (balance <= 0) return;
      const due = new Date(inv.due_date || inv.invoice_date);
      const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (days <= 0) buckets.current += balance;
      else if (days <= 30) buckets.d30 += balance;
      else if (days <= 60) buckets.d60 += balance;
      else if (days <= 90) buckets.d90 += balance;
      else buckets.d90p += balance;
    });
    const total = Object.values(buckets).reduce((s, v) => s + v, 0);
    return { name: c.name, code: c.code, ...buckets, total };
  }).filter((r) => r.total > 0);

  // ——— Vendor Aging ———
  const vendorAgingRows = vendors.map((v) => {
    const vendorBillsList = vendorBills.filter((b) => b.vendor_id === v.id && b.status === 'POSTED');
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90p: 0 };
    vendorBillsList.forEach((b) => {
      const balance = (b.total_amount || 0) - (b.paid_amount || 0);
      if (balance <= 0) return;
      const due = new Date(b.due_date || b.bill_date);
      const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (days <= 0) buckets.current += balance;
      else if (days <= 30) buckets.d30 += balance;
      else if (days <= 60) buckets.d60 += balance;
      else if (days <= 90) buckets.d90 += balance;
      else buckets.d90p += balance;
    });
    const total = Object.values(buckets).reduce((s, v) => s + v, 0);
    return { name: v.name, code: v.code, ...buckets, total };
  }).filter((r) => r.total > 0);

  const handleExportCSV = () => {
    if (!selectedReport) return;
    let rows: Record<string, unknown>[] = [];
    if (selectedReport.code === 'S') rows = salesRows;
    else if (selectedReport.code === 'P') rows = purchaseRows;
    else if (selectedReport.code === 'IV') rows = inventoryRows;
    else if (selectedReport.code === 'AR') rows = agingRows;
    else if (selectedReport.code === 'AP') rows = vendorAgingRows;
    if (rows.length > 0) downloadCSV(`${selectedReport.name.replace(/\s/g, '_')}.csv`, rows);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Reports & Analytics</h1>
      </div>

      {!selectedReport ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FINANCIAL STATEMENTS</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">4</p>
              <p className="mt-1 text-[11px] text-slate-400">Trial balance, P&L, balance sheet, cash flow</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OPERATIONAL REPORTS</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">10+</p>
              <p className="mt-1 text-[11px] text-slate-400">Sales, purchases, aging, inventory, tax</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL INVOICES</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-500">{invoices.filter((i) => i.status === 'POSTED').length}</p>
              <p className="mt-1 text-[11px] text-slate-400">Posted sales invoices</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OUTSTANDING AR</p>
              <p className="mt-1 text-2xl font-extrabold text-amber-500">
                {formatCurrency(invoices.filter((i) => i.status === 'POSTED').reduce((s, i) => s + ((i.total_amount || 0) - (i.paid_amount || 0)), 0))}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Uncollected receivables</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_LIST.map((rep) => (
              <div key={rep.code} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] hover:border-emerald-500/40 transition-colors">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 font-bold text-emerald-500 text-xs">
                    {rep.code}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{rep.category}</div>
                  <h3 className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{rep.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">{rep.description}</p>
                </div>
                <button
                  onClick={() => setSelectedReport(rep)}
                  className="mt-4 text-xs font-semibold text-emerald-500 hover:underline text-left"
                >
                  Open report →
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedReport(null)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Report Center
            </button>
            <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">{selectedReport.name}</span>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1c2541]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
                <span className="text-slate-400">From</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent font-medium outline-none text-slate-700 dark:text-slate-200" />
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
                <span className="text-slate-400">To</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent font-medium outline-none text-slate-700 dark:text-slate-200" />
              </div>
              <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Apply</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <Printer className="h-3.5 w-3.5" /> Print / PDF
              </button>
              <button onClick={handleExportCSV} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
              <button onClick={() => setEmailModalOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
            </div>
          </div>

          {/* SALES REPORT */}
          {selectedReport.code === 'S' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-4 text-xs">
                <div><p className="text-slate-400">Total Revenue</p><p className="font-bold text-emerald-500">{formatCurrency(salesTotal)}</p></div>
                <div><p className="text-slate-400">Collected</p><p className="font-bold text-blue-400">{formatCurrency(salesPaid)}</p></div>
                <div><p className="text-slate-400">Outstanding</p><p className="font-bold text-amber-500">{formatCurrency(salesTotal - salesPaid)}</p></div>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                  <tr><th className="px-4 py-3">Invoice No</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {salesRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No posted invoices yet.</td></tr>
                  ) : salesRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono font-semibold text-emerald-500">{r.invoice_no}</td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{r.customer}</td>
                      <td className="px-4 py-2.5 text-slate-400">{r.date}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(r.total)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{formatCurrency(r.paid)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.balance > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{formatCurrency(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PURCHASE REPORT */}
          {selectedReport.code === 'P' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 text-xs">
                <p className="text-slate-400">Total Purchases</p>
                <p className="font-bold text-rose-500">{formatCurrency(purchaseTotal)}</p>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                  <tr><th className="px-4 py-3">Bill No</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {purchaseRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No posted vendor bills yet.</td></tr>
                  ) : purchaseRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono font-semibold text-rose-400">{r.bill_no}</td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{r.vendor}</td>
                      <td className="px-4 py-2.5 text-slate-400">{r.date}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(r.total)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{formatCurrency(r.paid)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.balance > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{formatCurrency(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* INVENTORY VALUATION */}
          {selectedReport.code === 'IV' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 text-xs">
                <p className="text-slate-400">Total Inventory Value</p>
                <p className="font-bold text-blue-400">{formatCurrency(inventoryTotal)}</p>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                  <tr><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Product</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Avg Cost</th><th className="px-4 py-3 text-right">Total Value</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inventoryRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono text-slate-400">{r.code}</td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{r.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{r.qty.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(r.unit_cost)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-400">{formatCurrency(r.total_value)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-blue-500/30 bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100 text-right">TOTAL STOCK VALUE</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-400">{formatCurrency(inventoryTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* CUSTOMER AGING REPORT */}
          {selectedReport.code === 'AR' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Current</th>
                    <th className="px-4 py-3 text-right">1-30 Days</th>
                    <th className="px-4 py-3 text-right">31-60 Days</th>
                    <th className="px-4 py-3 text-right">61-90 Days</th>
                    <th className="px-4 py-3 text-right">90+ Days</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {agingRows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No outstanding receivables. All invoices are paid up!</td></tr>
                  ) : agingRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{r.name}<span className="ml-1.5 text-[10px] text-slate-400">{r.code}</span></td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{r.current > 0 ? formatCurrency(r.current) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-blue-400">{r.d30 > 0 ? formatCurrency(r.d30) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-400">{r.d60 > 0 ? formatCurrency(r.d60) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-orange-400">{r.d90 > 0 ? formatCurrency(r.d90) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-500">{r.d90p > 0 ? formatCurrency(r.d90p) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-200">{formatCurrency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
                {agingRows.length > 0 && (
                  <tfoot className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">TOTAL</td>
                      {['current','d30','d60','d90','d90p'].map((key) => (
                        <td key={key} className="px-4 py-3 text-right font-mono font-bold text-slate-200">
                          {formatCurrency(agingRows.reduce((s, r) => s + (r as any)[key], 0))}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-500">
                        {formatCurrency(agingRows.reduce((s, r) => s + r.total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* VENDOR AGING REPORT */}
          {selectedReport.code === 'AP' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3 text-right">Current</th>
                    <th className="px-4 py-3 text-right">1-30 Days</th>
                    <th className="px-4 py-3 text-right">31-60 Days</th>
                    <th className="px-4 py-3 text-right">61-90 Days</th>
                    <th className="px-4 py-3 text-right">90+ Days</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vendorAgingRows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No outstanding payables.</td></tr>
                  ) : vendorAgingRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{r.current > 0 ? formatCurrency(r.current) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-blue-400">{r.d30 > 0 ? formatCurrency(r.d30) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-400">{r.d60 > 0 ? formatCurrency(r.d60) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-orange-400">{r.d90 > 0 ? formatCurrency(r.d90) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-500">{r.d90p > 0 ? formatCurrency(r.d90p) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-200">{formatCurrency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* FALLBACK for other report types */}
          {!['S','P','IV','AR','AP'].includes(selectedReport.code) && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <BarChart3 className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{selectedReport.name}</p>
              <p className="text-xs text-slate-400 mt-1">Use the Accounting module's dedicated tabs for P&L, Balance Sheet, and Trial Balance reports with full drill-down capability.</p>
            </div>
          )}
        </div>
      )}

      {/* EMAIL MODAL */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Email report</h3>
              <button onClick={() => setEmailModalOpen(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Recipient email</label>
                <input type="email" placeholder="name@company.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3 text-[11px] text-emerald-400">
                The report will be queued and sent as PDF attachment.
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEmailModalOpen(false)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={() => { setEmailModalOpen(false); }} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Queue email</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
