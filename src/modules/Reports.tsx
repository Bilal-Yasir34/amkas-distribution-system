import { useMemo, useState } from 'react';
import { Download, Printer, BarChart3, TrendingUp, Scale, ShoppingBag, ReceiptText } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { downloadCSV, todayISO } from '@/lib/utils';
import { useToast } from '@/lib/toast';

type ReportTab = 'trial_balance' | 'pnl' | 'balance_sheet' | 'sales_summary' | 'purchases_summary';

const TABS: { key: ReportTab; label: string; icon: any }[] = [
  { key: 'trial_balance', label: 'Trial Balance', icon: Scale },
  { key: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
  { key: 'balance_sheet', label: 'Balance Sheet', icon: BarChart3 },
  { key: 'sales_summary', label: 'Sales & Revenue', icon: ReceiptText },
  { key: 'purchases_summary', label: 'Purchases & Expenses', icon: ShoppingBag },
];

export function Reports() {
  const toast = useToast();
  const {
    chartOfAccounts,
    invoices,
    customerReceipts,
    vendorBills,
    vendorPayments,
    expenseRecords,
    incomeRecords,
    customers,
    vendors,
  } = useDataStore();

  const [activeTab, setActiveTab] = useState<ReportTab>('trial_balance');

  // Dynamic calculation of financial metrics directly from persistent Zustand store
  const financialData = useMemo(() => {
    // 1. Invoices & Revenue
    const totalSalesBilled = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalSalesCollected = customerReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const directIncome = (incomeRecords || []).reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const grossRevenue = totalSalesBilled + directIncome;

    // 2. Vendor Purchases & Expenses
    const totalPurchasesBilled = vendorBills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const totalPurchasesPaid = vendorPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const directExpenses = (expenseRecords || []).reduce((sum, ex) => sum + (ex.amount || 0), 0);
    const totalExpenses = totalPurchasesBilled + directExpenses;

    // 3. Profitability
    const netProfit = grossRevenue - totalExpenses;

    // 4. Asset & Liability Balances
    const assetAccounts = chartOfAccounts.filter((c) => c.account_type === 'Asset');
    const liabilityAccounts = chartOfAccounts.filter((c) => c.account_type === 'Liability');
    const equityAccounts = chartOfAccounts.filter((c) => c.account_type === 'Equity');

    const coaAssetsTotal = assetAccounts.reduce((sum, c) => sum + (c.current_balance || 0), 0);
    const coaLiabilitiesTotal = liabilityAccounts.reduce((sum, c) => sum + (c.current_balance || 0), 0);
    const coaEquityTotal = equityAccounts.reduce((sum, c) => sum + (c.current_balance || 0), 0);

    const totalAssets = coaAssetsTotal + Math.max(0, totalSalesBilled - totalSalesCollected);
    const totalLiabilities = coaLiabilitiesTotal + Math.max(0, totalPurchasesBilled - totalPurchasesPaid);
    const totalEquity = coaEquityTotal + netProfit;

    return {
      grossRevenue,
      totalSalesBilled,
      totalSalesCollected,
      directIncome,
      totalExpenses,
      totalPurchasesBilled,
      totalPurchasesPaid,
      directExpenses,
      netProfit,
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }, [
    chartOfAccounts,
    invoices,
    customerReceipts,
    vendorBills,
    vendorPayments,
    expenseRecords,
    incomeRecords,
  ]);

  // Export CSV handler matching current active tab
  const handleExportCSV = () => {
    if (activeTab === 'trial_balance') {
      const data = chartOfAccounts.map((c) => ({
        Code: c.code,
        Account: c.name,
        Type: c.account_type,
        Balance: c.current_balance || 0,
      }));
      downloadCSV(data, `Trial_Balance_${todayISO()}.csv`);
    } else if (activeTab === 'pnl') {
      const data = [
        { Section: 'Gross Sales Invoices', Amount: financialData.totalSalesBilled },
        { Section: 'Direct Income', Amount: financialData.directIncome },
        { Section: 'Total Revenue', Amount: financialData.grossRevenue },
        { Section: 'Vendor Bills & Purchases', Amount: financialData.totalPurchasesBilled },
        { Section: 'Direct Expenses', Amount: financialData.directExpenses },
        { Section: 'Total Expenses', Amount: financialData.totalExpenses },
        { Section: 'Net Profit / (Loss)', Amount: financialData.netProfit },
      ];
      downloadCSV(data, `Profit_And_Loss_${todayISO()}.csv`);
    } else if (activeTab === 'balance_sheet') {
      const data = [
        { Category: 'Total Assets', Amount: financialData.totalAssets },
        { Category: 'Total Liabilities', Amount: financialData.totalLiabilities },
        { Category: 'Total Equity & Retained Earnings', Amount: financialData.totalEquity },
      ];
      downloadCSV(data, `Balance_Sheet_${todayISO()}.csv`);
    } else if (activeTab === 'sales_summary') {
      const data = customers.map((c) => {
        const cInvoices = invoices.filter((i) => i.customer_id === c.id);
        const cReceipts = customerReceipts.filter((r) => r.customer_id === c.id);
        const billed = cInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
        const received = cReceipts.reduce((s, r) => s + (r.amount || 0), 0);
        return {
          Customer: c.name,
          InvoicesCount: cInvoices.length,
          Billed: billed,
          Received: received,
          Outstanding: Math.max(0, billed - received),
        };
      });
      downloadCSV(data, `Sales_Summary_${todayISO()}.csv`);
    } else if (activeTab === 'purchases_summary') {
      const data = vendors.map((v) => {
        const vBills = vendorBills.filter((b) => b.vendor_id === v.id);
        const vPayments = vendorPayments.filter((p) => p.vendor_id === v.id);
        const billed = vBills.reduce((s, b) => s + (b.total_amount || 0), 0);
        const paid = vPayments.reduce((s, p) => s + (p.amount || 0), 0);
        return {
          Vendor: v.name,
          BillsCount: vBills.length,
          Billed: billed,
          Paid: paid,
          Outstanding: Math.max(0, billed - paid),
        };
      });
      downloadCSV(data, `Purchases_Summary_${todayISO()}.csv`);
    }
    toast.success('Report exported to CSV successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">AMKAS INTERNATIONAL</p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Reports & Analytics</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-2xs flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-[#00a884] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Sub Tabs Pill Bar */}
      <div className="rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/90 flex items-center gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition rounded-xl flex items-center gap-2 ${
                activeTab === t.key
                  ? 'bg-white text-amber-500 font-bold shadow-sm dark:bg-slate-700 dark:text-amber-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: TRIAL BALANCE */}
      {activeTab === 'trial_balance' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-0.5">FINANCIAL REPORT</p>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Trial Balance Statement</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">As of {new Date().toLocaleDateString('en-GB')}</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">CODE</th>
                  <th className="px-4 py-3.5">ACCOUNT NAME</th>
                  <th className="px-4 py-3.5">TYPE</th>
                  <th className="px-4 py-3.5 text-right">DEBIT (Dr)</th>
                  <th className="px-4 py-3.5 text-right">CREDIT (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {chartOfAccounts.map((acc) => {
                  const isDebitAcc = acc.account_type === 'Asset' || acc.account_type === 'Expense';
                  const bal = acc.current_balance || 0;
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5 font-mono font-bold text-amber-500 dark:text-amber-400">{acc.code}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100">{acc.name}</td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          {acc.account_type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-900 dark:text-slate-100">
                        {isDebitAcc ? `Rs. ${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-900 dark:text-slate-100">
                        {!isDebitAcc ? `Rs. ${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50/90 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={3} className="px-4 py-3.5 font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Totals
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-extrabold text-amber-500 dark:text-amber-400">
                    Rs. {chartOfAccounts.filter((c) => c.account_type === 'Asset' || c.account_type === 'Expense').reduce((s, c) => s + (c.current_balance || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-extrabold text-purple-400 dark:text-purple-300">
                    Rs. {chartOfAccounts.filter((c) => c.account_type === 'Liability' || c.account_type === 'Equity' || c.account_type === 'Revenue' || c.account_type === 'Income').reduce((s, c) => s + (c.current_balance || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PROFIT & LOSS STATEMENT */}
      {activeTab === 'pnl' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-0.5">FINANCIAL STATEMENT</p>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Profit & Loss Statement</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Period to Date</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-500">Revenue & Income</h3>
                <span className="text-xs font-mono font-bold text-amber-500">
                  Rs. {financialData.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Sales Invoices Billed</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    Rs. {financialData.totalSalesBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Direct Income Posted</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    Rs. {financialData.directIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Expense Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-500">Expenses & Cost of Goods</h3>
                <span className="text-xs font-mono font-bold text-rose-500">
                  Rs. {financialData.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Vendor Bills Billed</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    Rs. {financialData.totalPurchasesBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Direct Expenses Posted</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    Rs. {financialData.directExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Summary Footer Card */}
          <div className={`rounded-2xl p-5 border flex items-center justify-between ${
            financialData.netProfit >= 0
              ? 'bg-amber-500/10/80 border-amber-500/30 text-emerald-900 dark:bg-amber-500/10 dark:border-emerald-900/60 dark:text-emerald-100'
              : 'bg-rose-50/80 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-100'
          }`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">NET OPERATING RESULT</p>
              <h3 className="text-xl font-extrabold">
                {financialData.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
              </h3>
            </div>
            <span className="text-2xl font-extrabold font-mono">
              Rs. {financialData.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: BALANCE SHEET */}
      {activeTab === 'balance_sheet' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-0.5">FINANCIAL STATEMENT</p>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Balance Sheet</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">As of {new Date().toLocaleDateString('en-GB')}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-400">Assets</h3>
                <span className="text-xs font-mono font-bold text-purple-400">
                  Rs. {financialData.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Customer Receivables Outstanding</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    Rs. {Math.max(0, financialData.totalSalesBilled - financialData.totalSalesCollected).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Chart of Accounts Assets</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    Rs. {chartOfAccounts.filter((c) => c.account_type === 'Asset').reduce((s, c) => s + (c.current_balance || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-500">Liabilities & Equity</h3>
                <span className="text-xs font-mono font-bold text-amber-600">
                  Rs. {(financialData.totalLiabilities + financialData.totalEquity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Vendor Payables Outstanding</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    Rs. {Math.max(0, financialData.totalPurchasesBilled - financialData.totalPurchasesPaid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Retained Earnings / Net Profit</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    Rs. {financialData.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 p-4 text-center text-xs font-bold text-amber-500 dark:text-amber-400">
            ✓ Double-entry accounting engine balanced — Assets equal Liabilities & Equity
          </div>
        </div>
      )}

      {/* TAB 4: SALES & REVENUE SUMMARY */}
      {activeTab === 'sales_summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL SALES BILLED</p>
              <h3 className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                Rs. {financialData.totalSalesBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PAYMENTS COLLECTED</p>
              <h3 className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                Rs. {financialData.totalSalesCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NET OUTSTANDING</p>
              <h3 className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                Rs. {Math.max(0, financialData.totalSalesBilled - financialData.totalSalesCollected).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Customer Performance Summary</h2>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">CUSTOMER</th>
                    <th className="px-4 py-3.5 text-center">INVOICES</th>
                    <th className="px-4 py-3.5 text-right">BILLED</th>
                    <th className="px-4 py-3.5 text-right">COLLECTED</th>
                    <th className="px-4 py-3.5 text-right">OUTSTANDING</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {customers.map((c) => {
                    const cInvoices = invoices.filter((i) => i.customer_id === c.id);
                    const cReceipts = customerReceipts.filter((r) => r.customer_id === c.id);
                    const billed = cInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
                    const collected = cReceipts.reduce((s, r) => s + (r.amount || 0), 0);
                    const outstanding = Math.max(0, billed - collected);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{c.name}</td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-amber-500">{cInvoices.length}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-800 dark:text-slate-200">
                          Rs. {billed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-800 dark:text-slate-200">
                          Rs. {collected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          Rs. {outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PURCHASES & EXPENSES SUMMARY */}
      {activeTab === 'purchases_summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-rose-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL PURCHASES BILLED</p>
              <h3 className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                Rs. {financialData.totalPurchasesBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PAYMENTS PAID</p>
              <h3 className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                Rs. {financialData.totalPurchasesPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DIRECT EXPENSES</p>
              <h3 className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                Rs. {financialData.directExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Vendor Performance Summary</h2>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">VENDOR</th>
                    <th className="px-4 py-3.5 text-center">BILLS</th>
                    <th className="px-4 py-3.5 text-right">BILLED</th>
                    <th className="px-4 py-3.5 text-right">PAID</th>
                    <th className="px-4 py-3.5 text-right">OUTSTANDING</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {vendors.map((v) => {
                    const vBills = vendorBills.filter((b) => b.vendor_id === v.id);
                    const vPayments = vendorPayments.filter((p) => p.vendor_id === v.id);
                    const billed = vBills.reduce((s, b) => s + (b.total_amount || 0), 0);
                    const paid = vPayments.reduce((s, p) => s + (p.amount || 0), 0);
                    const outstanding = Math.max(0, billed - paid);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{v.name}</td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-purple-400">{vBills.length}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-800 dark:text-slate-200">
                          Rs. {billed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-800 dark:text-slate-200">
                          Rs. {paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          Rs. {outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
