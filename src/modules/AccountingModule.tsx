import { useState } from 'react';
import { Plus, Trash2, X, Search, Filter, Download } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO, downloadCSV } from '@/lib/utils';

type SubTab = 'Overview' | 'Journal Entries' | 'General Ledger' | 'Trial Balance' | 'Profit & Loss' | 'Balance Sheet' | 'Party Statements';

export function AccountingModule() {
  const toast = useToast();
  const { journalEntries, chartOfAccounts, customers, vendors, invoices, vendorBills, customerReceipts, vendorPayments, addJournalEntry, deleteJournalEntry } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('Journal Entries');
  const [newJvOpen, setNewJvOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(todayISO());
  const [refNo, setRefNo] = useState('');
  const [narration, setNarration] = useState('');
  const [glFilter, setGlFilter] = useState('');
  const [partyType, setPartyType] = useState<'customer' | 'vendor'>('customer');
  const [selectedParty, setSelectedParty] = useState('');

  const [lines, setLines] = useState([
    { id: '1', account_id: chartOfAccounts[0]?.id || '', narration: '', debit: 0, credit: 0 },
    { id: '2', account_id: chartOfAccounts[1]?.id || '', narration: '', debit: 0, credit: 0 },
  ]);

  const addLine = () =>
    setLines((prev) => [...prev, { id: crypto.randomUUID(), account_id: chartOfAccounts[0]?.id || '', narration: '', debit: 0, credit: 0 }]);

  const updateLine = (id: string, patch: Partial<(typeof lines)[0]>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const removeLine = (id: string) => {
    if (lines.length > 2) setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const totalDebit = lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSaveJV = () => {
    if (!isBalanced) return toast.error('Journal entry must be balanced (Total Debit == Total Credit > 0)');
    const entryNo = `JV-${String(journalEntries.length + 1).padStart(5, '0')}`;
    addJournalEntry({
      entry_no: entryNo,
      entry_date: entryDate,
      reference_no: refNo || null,
      source: 'Manual JV',
      narration: narration || 'Manual Journal Voucher',
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: 'POSTED',
      created_at: new Date().toISOString(),
    });
    toast.success(`Journal Voucher ${entryNo} posted successfully!`);
    setLines([
      { id: crypto.randomUUID(), account_id: chartOfAccounts[0]?.id || '', narration: '', debit: 0, credit: 0 },
      { id: crypto.randomUUID(), account_id: chartOfAccounts[1]?.id || '', narration: '', debit: 0, credit: 0 },
    ]);
    setRefNo('');
    setNarration('');
    setNewJvOpen(false);
  };

  // General Ledger: flatten all JV lines grouped by account
  const glAccounts = chartOfAccounts.filter(
    (c) => !glFilter || c.name.toLowerCase().includes(glFilter.toLowerCase()) || c.code.includes(glFilter)
  );

  // Trial Balance: compute debit/credit balance per account from JVs
  const trialBalance = chartOfAccounts.map((acc) => {
    const debit = journalEntries.reduce((sum, je) => sum + je.total_debit, 0);
    const credit = journalEntries.reduce((sum, je) => sum + je.total_credit, 0);
    return { ...acc, debit: acc.current_balance || 0, credit: 0 };
  });

  // P&L: Revenue vs Expense accounts
  const revenueAccts = chartOfAccounts.filter((c) => c.account_type === 'Revenue');
  const expenseAccts = chartOfAccounts.filter((c) => c.account_type === 'Expense');
  const totalRevenue = invoices.filter((i) => i.status === 'POSTED').reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalExpenses = vendorBills.filter((b) => b.status === 'POSTED').reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Balance Sheet
  const assetAccts = chartOfAccounts.filter((c) => c.account_type === 'Asset');
  const liabilityAccts = chartOfAccounts.filter((c) => c.account_type === 'Liability');
  const equityAccts = chartOfAccounts.filter((c) => c.account_type === 'Equity');
  const totalAssets = assetAccts.reduce((sum, c) => sum + (c.current_balance || 0), 0);
  const totalLiabilities = liabilityAccts.reduce((sum, c) => sum + (c.current_balance || 0), 0);
  const totalEquity = equityAccts.reduce((sum, c) => sum + (c.current_balance || 0), 0) + netProfit;

  // Party Statements
  const partyList = partyType === 'customer' ? customers : vendors;
  const partyInvoices = partyType === 'customer'
    ? invoices.filter((i) => i.customer_id === selectedParty)
    : vendorBills.filter((b) => b.vendor_id === selectedParty);
  const partyPayments = partyType === 'customer'
    ? customerReceipts.filter((r) => r.customer_id === selectedParty)
    : vendorPayments.filter((p) => p.vendor_id === selectedParty);

  const SUBTABS: SubTab[] = ['Overview', 'Journal Entries', 'General Ledger', 'Trial Balance', 'Profit & Loss', 'Balance Sheet', 'Party Statements'];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Accounting & General Ledger</h1>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {SUBTABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
              activeSubTab === tab
                ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeSubTab === 'Overview' && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">JOURNAL VOUCHERS</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{journalEntries.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NET REVENUE</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-500">Rs. {totalRevenue.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL EXPENSES</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-500">Rs. {totalExpenses.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NET PROFIT</p>
            <p className={`mt-1 text-2xl font-extrabold ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              Rs. {netProfit.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* JOURNAL ENTRIES */}
      {activeSubTab === 'Journal Entries' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FINANCIAL CONTROL</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Journal voucher register</h2>
            </div>
            <button
              onClick={() => setNewJvOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New journal entry
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Entry No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Narration</th>
                  <th className="px-4 py-3">Total Debit</th>
                  <th className="px-4 py-3">Total Credit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {journalEntries.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No journal entries yet. Click New Journal Entry.</td></tr>
                ) : (
                  journalEntries.map((je) => (
                    <tr key={je.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{je.entry_no}</td>
                      <td className="px-4 py-3 text-slate-400">{je.entry_date}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{je.reference_no || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{je.narration}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-200">Rs. {je.total_debit.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-200">Rs. {je.total_credit.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">{je.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { deleteJournalEntry(je.id); toast.success('Journal entry deleted'); }} className="text-xs text-rose-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GENERAL LEDGER */}
      {activeSubTab === 'General Ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACCOUNT REGISTER</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">General ledger</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={glFilter}
                onChange={(e) => setGlFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none w-48"
              />
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Balance (Dr)</th>
                  <th className="px-4 py-3 text-right">Balance (Cr)</th>
                  <th className="px-4 py-3 text-right">Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {glAccounts.map((acc) => {
                  const isDebit = acc.account_type === 'Asset' || acc.account_type === 'Expense';
                  const balance = acc.current_balance || 0;
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-slate-400">{acc.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{acc.name}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          acc.account_type === 'Asset' ? 'bg-blue-500/10 text-blue-500' :
                          acc.account_type === 'Liability' ? 'bg-amber-500/10 text-amber-500' :
                          acc.account_type === 'Revenue' ? 'bg-emerald-500/10 text-emerald-500' :
                          acc.account_type === 'Expense' ? 'bg-rose-500/10 text-rose-500' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>{acc.account_type}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-200">{isDebit ? `Rs. ${balance.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-200">{!isDebit ? `Rs. ${balance.toLocaleString()}` : '—'}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Rs. {balance.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">TOTALS</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500">
                    Rs. {assetAccts.reduce((s, c) => s + (c.current_balance || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-500">
                    Rs. {liabilityAccts.reduce((s, c) => s + (c.current_balance || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-200">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TRIAL BALANCE */}
      {activeSubTab === 'Trial Balance' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FINANCIAL STATEMENTS</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Trial balance</h2>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <Download className="h-3.5 w-3.5" /> Print
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Account Code</th>
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Debit (Rs.)</th>
                  <th className="px-4 py-3 text-right">Credit (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {chartOfAccounts.map((acc) => {
                  const isDebit = acc.account_type === 'Asset' || acc.account_type === 'Expense';
                  const balance = acc.current_balance || 0;
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-slate-400">{acc.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{acc.name}</td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">{acc.account_type}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-200">{isDebit ? balance.toLocaleString() : ''}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-200">{!isDebit ? balance.toLocaleString() : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-emerald-500/30 bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200">TOTAL</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500">
                    {assetAccts.reduce((s, c) => s + (c.current_balance || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-500">
                    {liabilityAccts.reduce((s, c) => s + (c.current_balance || 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* PROFIT & LOSS */}
      {activeSubTab === 'Profit & Loss' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FINANCIAL STATEMENTS</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Profit & loss statement</h2>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <Download className="h-3.5 w-3.5" /> Print
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541] overflow-hidden">
            {/* Revenue Section */}
            <div className="px-5 py-3 bg-emerald-500/5 border-b border-emerald-500/20">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">REVENUE</p>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {revenueAccts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{acc.name}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-emerald-500">Rs. {(acc.current_balance || 0).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-500/5">
                  <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100">Net Revenue from Invoices</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-emerald-500">Rs. {totalRevenue.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Expenses Section */}
            <div className="px-5 py-3 bg-rose-500/5 border-b border-rose-500/20 border-t">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">EXPENSES / COST OF GOODS</p>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenseAccts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{acc.name}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-rose-400">Rs. {(acc.current_balance || 0).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-rose-500/5">
                  <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100">Total Purchases (Vendor Bills)</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-rose-400">Rs. {totalExpenses.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Net Profit */}
            <div className={`px-5 py-4 border-t-2 ${netProfit >= 0 ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">NET PROFIT / (LOSS)</p>
                <p className={`text-xl font-extrabold font-mono ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  Rs. {netProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BALANCE SHEET */}
      {activeSubTab === 'Balance Sheet' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FINANCIAL STATEMENTS</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Balance sheet</h2>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <Download className="h-3.5 w-3.5" /> Print
            </button>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Assets */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541] overflow-hidden">
              <div className="px-5 py-3 bg-blue-500/5 border-b border-blue-500/20">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">ASSETS</p>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {assetAccts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-2.5 text-slate-700 dark:text-slate-300">{acc.name}</td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold text-blue-400">Rs. {(acc.current_balance || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-blue-500/30 bg-blue-500/5">
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100">TOTAL ASSETS</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-blue-500">Rs. {totalAssets.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Liabilities + Equity */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541] overflow-hidden">
              <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/20">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">LIABILITIES</p>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {liabilityAccts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-2.5 text-slate-700 dark:text-slate-300">{acc.name}</td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold text-amber-400">Rs. {(acc.current_balance || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 bg-violet-500/5 border-t border-violet-500/20">
                <p className="text-[11px] font-bold uppercase tracking-wider text-violet-400">EQUITY</p>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {equityAccts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-2.5 text-slate-700 dark:text-slate-300">{acc.name}</td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold text-violet-400">Rs. {(acc.current_balance || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-2.5 text-slate-700 dark:text-slate-300">Retained Earnings / Net Profit</td>
                    <td className={`px-5 py-2.5 text-right font-mono font-semibold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>Rs. {netProfit.toLocaleString()}</td>
                  </tr>
                </tbody>
                <tfoot className="border-t-2 border-amber-500/30 bg-amber-500/5">
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100">TOTAL LIABILITIES + EQUITY</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-amber-500">Rs. {(totalLiabilities + totalEquity).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className={`rounded-xl border p-4 text-center text-xs font-semibold ${
            Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
              ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-500'
              : 'border-amber-500/40 bg-amber-500/5 text-amber-500'
          }`}>
            {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
              ? '✓ Balance Sheet is balanced — Assets = Liabilities + Equity'
              : `⚠ Difference: Rs. ${Math.abs(totalAssets - (totalLiabilities + totalEquity)).toLocaleString()} — Update COA balances`}
          </div>
        </div>
      )}

      {/* PARTY STATEMENTS */}
      {activeSubTab === 'Party Statements' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PARTY LEDGER</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Customer / vendor statement</h2>
            </div>
            <div className="flex items-center gap-2">
              <select value={partyType} onChange={(e) => { setPartyType(e.target.value as any); setSelectedParty(''); }} className="rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
              </select>
              <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none min-w-[180px]">
                <option value="">-- Select {partyType} --</option>
                {partyList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {selectedParty ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541] overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {partyList.find((p) => p.id === selectedParty)?.name} — Account Statement
                </p>
              </div>
              <table className="w-full text-xs">
                <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Document</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {partyInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-400">{inv.invoice_date || inv.bill_date}</td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-emerald-500">{inv.invoice_no || inv.bill_no}</td>
                      <td className="px-4 py-2.5 text-slate-300">{partyType === 'customer' ? 'Sales Invoice' : 'Vendor Bill'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-200">Rs. {(inv.total_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">—</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">Rs. {(inv.total_amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {partyPayments.map((pmt: any) => (
                    <tr key={pmt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-400">{pmt.receipt_date || pmt.payment_date}</td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-blue-400">{pmt.receipt_no || pmt.payment_no}</td>
                      <td className="px-4 py-2.5 text-slate-300">{partyType === 'customer' ? 'Payment Received' : 'Payment Made'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">—</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">Rs. {(pmt.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-400">—Rs. {(pmt.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {partyInvoices.length === 0 && partyPayments.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No transactions found for this party.</td></tr>
                  )}
                </tbody>
                <tfoot className="border-t-2 border-emerald-500/30 bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100 text-right">Outstanding Balance:</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500">
                      Rs. {(partyInvoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0) - partyPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0)).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-sm text-slate-400">Select a {partyType} above to view their account statement.</p>
            </div>
          )}
        </div>
      )}

      {/* NEW JV MODAL */}
      {newJvOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">New Journal Entry</h3>
              <button onClick={() => setNewJvOpen(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Entry date</label>
                <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Reference No</label>
                <input type="text" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="e.g. REF-1002" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[11px] font-semibold text-slate-400">Narration</label>
              <input type="text" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Description of financial entry..." className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">BALANCED DEBIT & CREDIT LINES</p>
                <button onClick={addLine} className="text-xs font-semibold text-emerald-500 hover:underline">+ Add line</button>
              </div>
              {lines.map((line) => (
                <div key={line.id} className="flex items-center gap-2">
                  <select value={line.account_id} onChange={(e) => updateLine(line.id, { account_id: e.target.value })} className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
                    {chartOfAccounts.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                  </select>
                  <input type="number" placeholder="Debit" value={line.debit || ''} onChange={(e) => updateLine(line.id, { debit: Number(e.target.value), credit: 0 })} className="w-28 rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
                  <input type="number" placeholder="Credit" value={line.credit || ''} onChange={(e) => updateLine(line.id, { credit: Number(e.target.value), debit: 0 })} className="w-28 rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
                  <button onClick={() => removeLine(line.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <div className="flex justify-between items-center border-t pt-3 font-mono text-xs">
                <span className="text-slate-400">Total Debit: Rs. {totalDebit.toFixed(2)}</span>
                <span className="text-slate-400">Total Credit: Rs. {totalCredit.toFixed(2)}</span>
                <span className={`font-bold ${isBalanced ? 'text-emerald-500' : 'text-rose-500'}`}>{isBalanced ? '✓ Balanced' : '✗ Unbalanced'}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setNewJvOpen(false)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-400">Cancel</button>
              <button onClick={handleSaveJV} disabled={!isBalanced} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                Save & Post JV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
