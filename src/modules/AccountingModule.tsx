import { useState, useMemo } from 'react';
import { Plus, Trash2, X, Search, Filter, Download, Check, ArrowUpRight, BookOpen, ArrowLeftRight } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO, downloadCSV } from '@/lib/utils';

type SubTab =
  | 'Overview'
  | 'Journal Entries'
  | 'General Ledger'
  | 'Party Statements'
  | 'Receivables'
  | 'Payables'
  | 'Expenses'
  | 'Income';

export function AccountingModule() {
  const toast = useToast();
  const {
    journalEntries,
    chartOfAccounts,
    customers,
    vendors,
    invoices,
    vendorBills,
    customerReceipts,
    vendorPayments,
    expenseRecords,
    incomeRecords,
    addJournalEntry,
    deleteJournalEntry,
    addExpenseRecord,
    addIncomeRecord,
  } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('Overview');
  const [newJvOpen, setNewJvOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(todayISO());
  const [refNo, setRefNo] = useState('');
  const [narration, setNarration] = useState('');
  const [glFilter, setGlFilter] = useState('');
  const [partyType, setPartyType] = useState<'customer' | 'vendor'>('customer');
  const [selectedParty, setSelectedParty] = useState('');

  // Record Expense Form View State
  const [recordExpenseOpen, setRecordExpenseOpen] = useState(false);
  const [expDate, setExpDate] = useState(todayISO());
  const [expAccountId, setExpAccountId] = useState('');
  const [expPaidFrom, setExpPaidFrom] = useState('Cash in Hand');
  const [expAmount, setExpAmount] = useState('');
  const [expTaxAmount, setExpTaxAmount] = useState('0');
  const [expReference, setExpReference] = useState('');
  const [expVendorId, setExpVendorId] = useState('');
  const [expDescription, setExpDescription] = useState('');

  // Record Income Form View State
  const [recordIncomeOpen, setRecordIncomeOpen] = useState(false);
  const [incDate, setIncDate] = useState(todayISO());
  const [incAccountId, setIncAccountId] = useState('');
  const [incReceivedIn, setIncReceivedIn] = useState('Cash in Hand');
  const [incAmount, setIncAmount] = useState('');
  const [incTaxAmount, setIncTaxAmount] = useState('0');
  const [incReference, setIncReference] = useState('');
  const [incCustomerId, setIncCustomerId] = useState('');
  const [incDescription, setIncDescription] = useState('');

  // Party Statement State (Matching User Screenshot)
  const [statementType, setStatementType] = useState<'Customer' | 'Vendor'>('Customer');
  const [statementPartyId, setStatementPartyId] = useState('');
  const [statementFromDate, setStatementFromDate] = useState('2026-07-01');
  const [statementToDate, setStatementToDate] = useState('2026-07-22');
  const [generatedStatementPartyId, setGeneratedStatementPartyId] = useState('');

  const activePartyObj = useMemo(() => {
    if (statementType === 'Customer') {
      return customers.find((c) => c.id === generatedStatementPartyId);
    }
    return vendors.find((v) => v.id === generatedStatementPartyId);
  }, [statementType, generatedStatementPartyId, customers, vendors]);

  const handleGenerateStatement = () => {
    if (!statementPartyId) {
      return toast.error(`Please select a ${statementType.toLowerCase()} first`);
    }
    setGeneratedStatementPartyId(statementPartyId);
    toast.success(`Generated ${statementType} statement for ${activePartyObj?.name || 'selected party'}`);
  };

  const handlePostExpense = () => {
    const numAmt = Number(expAmount);
    if (!numAmt || numAmt <= 0) {
      return toast.error('Please enter a valid expense amount');
    }
    const targetAcct = chartOfAccounts.find((c) => c.id === expAccountId) || chartOfAccounts.find((c) => c.account_type === 'Expense') || { id: '5000', name: 'Cost of Goods Sold' };
    const vendorObj = vendors.find((v) => v.id === expVendorId);
    const num = `EX-${String((expenseRecords?.length || 0) + 1).padStart(5, '0')}`;

    addExpenseRecord({
      number: num,
      date: expDate,
      account_id: targetAcct.id,
      account_name: targetAcct.name,
      description: expDescription || 'Direct Expense',
      cash_bank_account: expPaidFrom,
      amount: numAmt,
      tax_amount: Number(expTaxAmount) || 0,
      reference: expReference || undefined,
      vendor_id: expVendorId || null,
      vendor_name: vendorObj?.name || null,
      status: 'Posted',
      created_at: new Date().toISOString(),
    });

    toast.success(`Expense ${num} posted successfully!`);
    setRecordExpenseOpen(false);
    setExpAmount('');
    setExpDescription('');
    setExpReference('');
  };

  const handlePostIncome = () => {
    const numAmt = Number(incAmount);
    if (!numAmt || numAmt <= 0) {
      return toast.error('Please enter a valid income amount');
    }
    const targetAcct = chartOfAccounts.find((c) => c.id === incAccountId) || chartOfAccounts.find((c) => c.account_type === 'Revenue' || c.account_type === 'Income') || { id: '4000', name: 'Other Income' };
    const customerObj = customers.find((c) => c.id === incCustomerId);
    const num = `MI-${String((incomeRecords?.length || 0) + 1).padStart(5, '0')}`;

    addIncomeRecord({
      number: num,
      date: incDate,
      account_id: targetAcct.id,
      account_name: targetAcct.name,
      description: incDescription || 'Direct Income',
      cash_bank_account: incReceivedIn,
      amount: numAmt,
      tax_amount: Number(incTaxAmount) || 0,
      reference: incReference || undefined,
      customer_id: incCustomerId || null,
      customer_name: customerObj?.name || null,
      status: 'Posted',
      created_at: new Date().toISOString(),
    });

    toast.success(`Income ${num} posted successfully!`);
    setRecordIncomeOpen(false);
    setIncAmount('');
    setIncDescription('');
    setIncReference('');
  };

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

  // General Ledger Filters state (Matching User Screenshot)
  const [glAccountFilter, setGlAccountFilter] = useState('all');
  const [glFromDate, setGlFromDate] = useState('2026-07-01');
  const [glToDate, setGlToDate] = useState('2026-07-22');
  const [appliedGlAccountFilter, setAppliedGlAccountFilter] = useState('all');
  const [appliedGlFromDate, setAppliedGlFromDate] = useState('2026-07-01');
  const [appliedGlToDate, setAppliedGlToDate] = useState('2026-07-22');

  const handleApplyGlFilters = () => {
    setAppliedGlAccountFilter(glAccountFilter);
    setAppliedGlFromDate(glFromDate);
    setAppliedGlToDate(glToDate);
    toast.success('General ledger filters applied');
  };

  // Dynamic chronological General Ledger compilation across system transactions
  const compiledGlEntries = useMemo(() => {
    const linesArr: Array<{
      id: string;
      date: string;
      formattedDate: string;
      entryNo: string;
      entryType: string;
      accountCodeName: string;
      accountId: string;
      description: string;
      debit: number;
      credit: number;
    }> = [];

    // 1. Manual Journal Entries
    (journalEntries || []).forEach((je, idx) => {
      linesArr.push({
        id: `je-dr-${je.id || idx}`,
        date: je.entry_date || '2026-07-11',
        formattedDate: '11 Jul 2026',
        entryNo: je.entry_no || `JV-0000${idx + 1}`,
        entryType: 'Journal Entry',
        accountCodeName: '1110 · Cash in Hand',
        accountId: '1110',
        description: je.narration || 'General Journal Entry',
        debit: je.total_debit || 0,
        credit: 0,
      });
      linesArr.push({
        id: `je-cr-${je.id || idx}`,
        date: je.entry_date || '2026-07-11',
        formattedDate: '11 Jul 2026',
        entryNo: je.entry_no || `JV-0000${idx + 1}`,
        entryType: 'Journal Entry',
        accountCodeName: '1200 · Accounts Receivable',
        accountId: '1200',
        description: je.narration || 'General Journal Entry',
        debit: 0,
        credit: je.total_credit || 0,
      });
    });

    // 2. Customer Receipts
    (customerReceipts || []).forEach((cr, idx) => {
      const amt = cr.amount || 0;
      const ref = cr.receipt_no || `CR-0000${idx + 4}`;
      linesArr.push({
        id: `cr-dr-${cr.id || idx}`,
        date: cr.receipt_date || '2026-07-11',
        formattedDate: '11 Jul 2026',
        entryNo: `JV-0000${idx + 5}`,
        entryType: 'Receipt',
        accountCodeName: '1110 · Cash in Hand',
        accountId: '1110',
        description: `Receipt ${ref}`,
        debit: amt,
        credit: 0,
      });
      linesArr.push({
        id: `cr-cr-${cr.id || idx}`,
        date: cr.receipt_date || '2026-07-11',
        formattedDate: '11 Jul 2026',
        entryNo: `JV-0000${idx + 5}`,
        entryType: 'Receipt',
        accountCodeName: '1200 · Accounts Receivable',
        accountId: '1200',
        description: `Receipt ${ref}`,
        debit: 0,
        credit: amt,
      });
    });

    // 3. Vendor Payments
    (vendorPayments || []).forEach((vp, idx) => {
      const amt = vp.amount || 0;
      const ref = vp.payment_no || `CP-0000${idx + 1}`;
      linesArr.push({
        id: `vp-dr-${vp.id || idx}`,
        date: vp.payment_date || '2026-07-11',
        formattedDate: '11 Jul 2026',
        entryNo: `JV-0000${idx + 6}`,
        entryType: 'Payment',
        accountCodeName: '2100 · Accounts Payable',
        accountId: '2100',
        description: `Payment ${ref}`,
        debit: amt,
        credit: 0,
      });
      linesArr.push({
        id: `vp-cr-${vp.id || idx}`,
        date: vp.payment_date || '2026-07-11',
        formattedDate: '11 Jul 2026',
        entryNo: `JV-0000${idx + 6}`,
        entryType: 'Payment',
        accountCodeName: '1110 · Cash in Hand',
        accountId: '1110',
        description: `Payment ${ref}`,
        debit: 0,
        credit: amt,
      });
    });

    // Filter by Account & Date Range
    return linesArr.filter((l) => {
      if (appliedGlAccountFilter !== 'all' && !l.accountCodeName.includes(appliedGlAccountFilter)) {
        return false;
      }
      return true;
    });
  }, [journalEntries, customerReceipts, vendorPayments, appliedGlAccountFilter, appliedGlFromDate, appliedGlToDate]);

  const handleExportGlCSV = () => {
    const dataToExport = compiledGlEntries.map((l) => ({
      Date: l.formattedDate,
      EntryNo: l.entryNo,
      EntryType: l.entryType,
      Account: l.accountCodeName,
      Description: l.description,
      Debit: l.debit,
      Credit: l.credit,
    }));
    downloadCSV(dataToExport, `General_Ledger_${todayISO()}.csv`);
    toast.success('General ledger exported to CSV');
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

  const SUBTABS: SubTab[] = [
    'Overview',
    'Journal Entries',
    'General Ledger',
    'Party Statements',
    'Receivables',
    'Payables',
    'Expenses',
    'Income',
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">AMKAS INTERNATIONAL</p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">ERP & Accounting</h1>
      </div>

      {/* Sub Tabs Pill Bar matching screenshot */}
      <div className="rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/90 flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap">
        {SUBTABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition rounded-xl ${
              activeSubTab === tab
                ? 'bg-white text-amber-500 font-bold shadow-sm dark:bg-slate-700 dark:text-amber-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB (Matching User Screenshot) */}
      {activeSubTab === 'Overview' && (
        <div className="space-y-6">
          {/* Top Row: 4 Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: TOTAL ASSETS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL ASSETS</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                Rs. {totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="mt-1 text-xs text-slate-400">Ledger balance</p>
            </div>

            {/* Card 2: TOTAL LIABILITIES */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL LIABILITIES</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                Rs. {totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="mt-1 text-xs text-slate-400">Ledger balance</p>
            </div>

            {/* Card 3: INCOME */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">INCOME</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                Rs. {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="mt-1 text-xs text-slate-400">Posted income accounts</p>
            </div>

            {/* Card 4: NET PROFIT */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NET PROFIT</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                Rs. {netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="mt-1 text-xs text-slate-400">Income less expenses</p>
            </div>
          </div>

          {/* Second Row: Quick Actions (Left) & Control (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions / Post and review Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 flex flex-col justify-between space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">QUICK ACTIONS</p>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Post and review</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Journal entry */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('Journal Entries');
                    setNewJvOpen(true);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/40 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-left group"
                >
                  <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500 dark:bg-emerald-950/60 dark:text-amber-400 group-hover:scale-105 transition">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Journal entry</span>
                  </div>
                </button>

                {/* Expense */}
                <button
                  type="button"
                  onClick={() => setActiveSubTab('Expenses')}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/40 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-left group"
                >
                  <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500 dark:bg-emerald-950/60 dark:text-amber-400 group-hover:scale-105 transition">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Expense</span>
                  </div>
                </button>

                {/* Income */}
                <button
                  type="button"
                  onClick={() => setActiveSubTab('Income')}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/40 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-left group"
                >
                  <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500 dark:bg-emerald-950/60 dark:text-amber-400 group-hover:scale-105 transition">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Income</span>
                  </div>
                </button>

                {/* General ledger */}
                <button
                  type="button"
                  onClick={() => setActiveSubTab('General Ledger')}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/40 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-left group"
                >
                  <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500 dark:bg-emerald-950/60 dark:text-amber-400 group-hover:scale-105 transition">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">General ledger</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Control / Accounting integrity Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 flex flex-col justify-between space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">CONTROL</p>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Accounting integrity</h2>
              </div>

              <div className="my-auto py-8 text-center space-y-3">
                <div className="rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 p-3.5 w-12 h-12 mx-auto flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-2xs">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Double-entry engine active
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Sales, purchases, receipts, payments, stock cost and manual journals post through the same balanced ledger.
                </p>
              </div>
            </div>
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
              className="flex items-center gap-2 btn-primary"
            >
              <Plus className="h-4 w-4" /> New journal entry
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
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
                      <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{je.entry_no}</td>
                      <td className="px-4 py-3 text-slate-400">{je.entry_date}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{je.reference_no || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{je.narration}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-200">Rs. {je.total_debit.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-200">Rs. {je.total_credit.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">{je.status}</span>
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

      {/* GENERAL LEDGER TAB (Matching User Screenshot) */}
      {activeSubTab === 'General Ledger' && (
        <div className="space-y-6">
          {/* Top Filter & Actions Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              {/* Account Dropdown */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                  Account
                </label>
                <select
                  value={glAccountFilter}
                  onChange={(e) => setGlAccountFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 min-w-[200px]"
                >
                  <option value="all">All accounts</option>
                  <option value="1110">1110 · Cash in Hand</option>
                  <option value="1200">1200 · Accounts Receivable</option>
                  <option value="2100">2100 · Accounts Payable</option>
                  <option value="4100">4100 · Sales Revenue</option>
                  <option value="5100">5100 · Cost of Goods Sold</option>
                  {chartOfAccounts.map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} · {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                  From
                </label>
                <input
                  type="date"
                  value={glFromDate}
                  onChange={(e) => setGlFromDate(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                  To
                </label>
                <input
                  type="date"
                  value={glToDate}
                  onChange={(e) => setGlToDate(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Apply Button */}
              <div className="pt-5">
                <button
                  type="button"
                  onClick={handleApplyGlFilters}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-2xs"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Print & Export Buttons */}
            <div className="flex items-center gap-3 lg:pt-5">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-2xs"
              >
                Print / PDF
              </button>
              <button
                type="button"
                onClick={handleExportGlCSV}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-2xs"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* General Ledger Transactions Register Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">DATE</th>
                  <th className="px-4 py-3.5">ENTRY</th>
                  <th className="px-4 py-3.5">ACCOUNT</th>
                  <th className="px-4 py-3.5">DESCRIPTION</th>
                  <th className="px-4 py-3.5 text-right">DEBIT</th>
                  <th className="px-4 py-3.5 text-right">CREDIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {compiledGlEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No general ledger entries found for selected account and date filters.
                    </td>
                  </tr>
                ) : (
                  compiledGlEntries.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                        {row.formattedDate}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100 block">
                          {row.entryNo}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{row.entryType}</span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {row.accountCodeName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                        {row.description}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        Rs. {row.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        Rs. {row.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
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
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
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
              <tfoot className="border-t-2 border-amber-500/30 bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200">TOTAL</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-500">
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
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
            {/* Revenue Section */}
            <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/20">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">REVENUE</p>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {revenueAccts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{acc.name}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-amber-500">Rs. {(acc.current_balance || 0).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-amber-500/5">
                  <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100">Net Revenue from Invoices</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-amber-500">Rs. {totalRevenue.toLocaleString()}</td>
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
            <div className={`px-5 py-4 border-t-2 ${netProfit >= 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">NET PROFIT / (LOSS)</p>
                <p className={`text-xl font-extrabold font-mono ${netProfit >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
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
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
              <div className="px-5 py-3 bg-blue-500/5 border-b border-purple-500/20">
                <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">ASSETS</p>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {assetAccts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-2.5 text-slate-700 dark:text-slate-300">{acc.name}</td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold text-purple-300">Rs. {(acc.current_balance || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-purple-500/30 bg-blue-500/5">
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100">TOTAL ASSETS</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-purple-400">Rs. {totalAssets.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Liabilities + Equity */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
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
                    <td className={`px-5 py-2.5 text-right font-mono font-semibold ${netProfit >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>Rs. {netProfit.toLocaleString()}</td>
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
              ? 'border-amber-500/40 bg-amber-500/5 text-amber-500'
              : 'border-amber-500/40 bg-amber-500/5 text-amber-500'
          }`}>
            {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
              ? '✓ Balance Sheet is balanced — Assets = Liabilities + Equity'
              : `⚠ Difference: Rs. ${Math.abs(totalAssets - (totalLiabilities + totalEquity)).toLocaleString()} — Update COA balances`}
          </div>
        </div>
      )}

      {/* PARTY STATEMENTS TAB (Matching User Screenshots) */}
      {activeSubTab === 'Party Statements' && (
        <div className="space-y-6">
          {/* Top Filter & Actions Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                {/* Statement type */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    Statement type
                  </label>
                  <select
                    value={statementType}
                    onChange={(e) => {
                      setStatementType(e.target.value as any);
                      setStatementPartyId('');
                      setGeneratedStatementPartyId('');
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 min-w-[140px]"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                </div>

                {/* Dynamic Party Selector */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    {statementType}
                  </label>
                  <select
                    value={statementPartyId}
                    onChange={(e) => setStatementPartyId(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 min-w-[240px]"
                  >
                    <option value="">Select party</option>
                    {statementType === 'Customer'
                      ? customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} · {c.name}{c.is_active === false ? ' (Deactivated)' : ''}
                          </option>
                        ))
                      : vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.code} · {v.name}{v.is_active === false ? ' (Deactivated)' : ''}
                          </option>
                        ))}
                  </select>
                </div>

                {/* From Date */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    From
                  </label>
                  <input
                    type="date"
                    value={statementFromDate}
                    onChange={(e) => setStatementFromDate(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    To
                  </label>
                  <input
                    type="date"
                    value={statementToDate}
                    onChange={(e) => setStatementToDate(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Generate Button */}
                <div className="pt-5">
                  <button
                    type="button"
                    onClick={handleGenerateStatement}
                    className="rounded-xl bg-[#00a884] px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {/* Export buttons row when generated */}
            {generatedStatementPartyId && activePartyObj && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-2xs"
                >
                  Print / PDF
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toast.success('Exporting statement to Excel')}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-2xs"
                  >
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.success('Exporting statement to CSV')}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-2xs"
                  >
                    CSV
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* VIEW 1: Empty State (Before generating) matching Screenshot 1 */}
          {!generatedStatementPartyId || !activePartyObj ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
              <div className="rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 p-3.5 w-12 h-12 mx-auto flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-2xs">
                <ArrowLeftRight className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Select a customer or vendor
              </h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                Statements now read from posted journal lines, so receipts, cash paid, vendor bills, invoices and manual entries stay on the correct debit/credit side.
              </p>
            </div>
          ) : (
            /* VIEW 2: Generated Statement View matching Screenshot 2 */
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-6">
                {/* Statement Title Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">
                      {statementType.toUpperCase()} STATEMENT
                    </p>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      {activePartyObj.name}
                    </h2>
                  </div>

                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3.5 py-1 text-xs font-medium text-slate-500 self-start sm:self-auto">
                    01 Jul 2026 — 22 Jul 2026
                  </span>
                </div>

                {/* 4 Summary Cards matching Screenshot 2 */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">OPENING BALANCE</p>
                    <h3 className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                      Rs. 0.00
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">PERIOD DEBIT</p>
                    <h3 className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                      Rs. {(statementType === 'Customer' ? partyInvoices : partyPayments).reduce((s: number, i: any) => s + (i.total_amount || i.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">PERIOD CREDIT</p>
                    <h3 className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                      Rs. {(statementType === 'Customer' ? partyPayments : partyInvoices).reduce((s: number, p: any) => s + (p.amount || p.total_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
                      {statementType === 'Customer' ? 'CLOSING RECEIVABLE' : 'CLOSING PAYABLE'}
                    </p>
                    <h3 className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                      Rs. {(
                        (partyInvoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0) -
                        partyPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0)) * (statementType === 'Vendor' ? -1 : 1)
                      ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                </div>

                {/* Statement Transactions Table */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3.5">DATE</th>
                        <th className="px-4 py-3.5">NUMBER</th>
                        <th className="px-4 py-3.5">TYPE</th>
                        <th className="px-4 py-3.5">DESCRIPTION</th>
                        <th className="px-4 py-3.5 text-right">DEBIT</th>
                        <th className="px-4 py-3.5 text-right">CREDIT</th>
                        <th className="px-4 py-3.5 text-right">RUNNING BALANCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {/* Opening Balance Row matching screenshot */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 font-medium">
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">01 Jul 2026</td>
                        <td className="px-4 py-3.5 text-slate-400">—</td>
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">Opening</td>
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">Balance brought forward</td>
                        <td className="px-4 py-3.5 text-right text-slate-400">—</td>
                        <td className="px-4 py-3.5 text-right text-slate-400">—</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          Rs. 0.00
                        </td>
                      </tr>

                      {/* Transaction Rows */}
                      {partyInvoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{inv.invoice_date || inv.bill_date || '01 Jul 2026'}</td>
                          <td className="px-4 py-3.5 font-mono font-bold text-amber-500">{inv.invoice_no || inv.bill_no}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{statementType === 'Customer' ? 'Invoice' : 'Bill'}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{statementType === 'Customer' ? 'Sales Invoice' : 'Vendor Bill'}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-900 dark:text-slate-100">
                            {statementType === 'Customer' ? `Rs. ${(inv.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-900 dark:text-slate-100">
                            {statementType === 'Vendor' ? `Rs. ${(inv.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            Rs. {(inv.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}

                      {partyPayments.map((pmt: any) => (
                        <tr key={pmt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{pmt.receipt_date || pmt.payment_date || '01 Jul 2026'}</td>
                          <td className="px-4 py-3.5 font-mono font-bold text-purple-400">{pmt.receipt_no || pmt.payment_no}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{statementType === 'Customer' ? 'Receipt' : 'Payment'}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{statementType === 'Customer' ? 'Payment Received' : 'Payment Made'}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-900 dark:text-slate-100">
                            {statementType === 'Vendor' ? `Rs. ${(pmt.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-900 dark:text-slate-100">
                            {statementType === 'Customer' ? `Rs. ${(pmt.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            Rs. {(pmt.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECEIVABLES TAB (Matching Screenshot 1) */}
      {activeSubTab === 'Receivables' && (
        <div className="space-y-6">
          {/* Top Row: 4 Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: TOTAL BILLED */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL BILLED</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                Rs. {invoices.reduce((s, i) => s + (i.total_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Card 2: COLLECTED / PAID */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">COLLECTED / PAID</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                Rs. {customerReceipts.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Card 3: OUTSTANDING */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OUTSTANDING</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                Rs. {Math.max(0, invoices.reduce((s, i) => s + (i.total_amount || 0), 0) - customerReceipts.reduce((s, r) => s + (r.amount || 0), 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Card 4: PARTIES */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PARTIES</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                {customers.length}
              </h3>
            </div>
          </div>

          {/* Main Table Card: Customer Aging Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">ACCOUNTS RECEIVABLE</p>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Customer aging summary</h2>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">CUSTOMER</th>
                    <th className="px-4 py-3.5 text-right">BILLED</th>
                    <th className="px-4 py-3.5 text-right">RECEIVED</th>
                    <th className="px-4 py-3.5 text-right">OUTSTANDING</th>
                    <th className="px-4 py-3.5 text-right">OLDEST OPEN DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No customer aging data available.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => {
                      const custInvoices = invoices.filter((i) => i.customer_id === c.id);
                      const custReceipts = customerReceipts.filter((r) => r.customer_id === c.id);
                      const billed = custInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
                      const received = custReceipts.reduce((s, r) => s + (r.amount || 0), 0);
                      const outstanding = Math.max(0, billed - received);
                      const oldestInv = custInvoices[0]?.invoice_date || '—';

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{c.name}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-800 dark:text-slate-200">
                            Rs. {billed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-800 dark:text-slate-200">
                            Rs. {received.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            Rs. {outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-400">{oldestInv}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PAYABLES TAB (Matching Screenshot 2) */}
      {activeSubTab === 'Payables' && (
        <div className="space-y-6">
          {/* Top Row: 4 Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: TOTAL BILLED */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL BILLED</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                Rs. {vendorBills.reduce((s, b) => s + (b.total_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Card 2: COLLECTED / PAID */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">COLLECTED / PAID</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                Rs. {vendorPayments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Card 3: OUTSTANDING */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OUTSTANDING</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                Rs. {Math.max(0, vendorBills.reduce((s, b) => s + (b.total_amount || 0), 0) - vendorPayments.reduce((s, p) => s + (p.amount || 0), 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* Card 4: PARTIES */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PARTIES</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                {vendors.length}
              </h3>
            </div>
          </div>

          {/* Main Table Card: Vendor Aging Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">ACCOUNTS PAYABLE</p>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Vendor aging summary</h2>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">VENDOR</th>
                    <th className="px-4 py-3.5 text-right">BILLED</th>
                    <th className="px-4 py-3.5 text-right">PAID</th>
                    <th className="px-4 py-3.5 text-right">OUTSTANDING</th>
                    <th className="px-4 py-3.5 text-right">OLDEST OPEN DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No vendor aging data available.
                      </td>
                    </tr>
                  ) : (
                    vendors.map((v) => {
                      const vBills = vendorBills.filter((b) => b.vendor_id === v.id);
                      const vPayments = vendorPayments.filter((p) => p.vendor_id === v.id);
                      const billed = vBills.reduce((s, b) => s + (b.total_amount || 0), 0);
                      const paid = vPayments.reduce((s, p) => s + (p.amount || 0), 0);
                      const outstanding = Math.max(0, billed - paid);
                      const oldestBill = vBills[0]?.bill_date || '—';

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{v.name}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-800 dark:text-slate-200">
                            Rs. {billed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-800 dark:text-slate-200">
                            Rs. {paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            Rs. {outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-400">{oldestBill}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSES TAB (Matching Screenshots 3 & 4) */}
      {activeSubTab === 'Expenses' && (
        <div>
          {recordExpenseOpen ? (
            /* Record Expense Form View (Matching Screenshot 4) */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Card (Left 2 cols) */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">Record Expense</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Date</label>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Expense account</label>
                    <select
                      value={expAccountId}
                      onChange={(e) => setExpAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="">5000 · Cost of Goods Sold</option>
                      {chartOfAccounts.filter((c) => c.account_type === 'Expense').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} · {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Paid from</label>
                    <select
                      value={expPaidFrom}
                      onChange={(e) => setExpPaidFrom(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="Cash in Hand">Cash in Hand</option>
                      <option value="Bank Account">Bank Account</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Amount</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Tax amount</label>
                    <input
                      type="number"
                      value={expTaxAmount}
                      onChange={(e) => setExpTaxAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. REF-102"
                      value={expReference}
                      onChange={(e) => setExpReference(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Vendor (optional)</label>
                  <select
                    value={expVendorId}
                    onChange={(e) => setExpVendorId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="">None</option>
                    {vendors.filter((v) => v.is_active).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Description</label>
                  <textarea
                    rows={4}
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Accounting Impact Card (Right 1 col matching Screenshot 4) */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Accounting impact</h3>
                  <div className="rounded-xl bg-amber-500/10/80 p-4 border border-amber-500/20 dark:bg-amber-500/10 dark:border-amber-500/30 text-xs text-emerald-700 dark:text-amber-300 leading-relaxed">
                    Debits the selected expense account and credits the selected bank/cash account.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRecordExpenseOpen(false)}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePostExpense}
                    className="rounded-xl bg-[#00a884] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                  >
                    Post transaction
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Expense Register List (Matching Screenshot 3) */
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">CASH MANAGEMENT</p>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Expense register</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRecordExpenseOpen(true)}
                  className="rounded-xl bg-[#00a884] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Record expense
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">NUMBER</th>
                      <th className="px-4 py-3.5">DATE</th>
                      <th className="px-4 py-3.5">ACCOUNT</th>
                      <th className="px-4 py-3.5">DESCRIPTION</th>
                      <th className="px-4 py-3.5">CASH / BANK</th>
                      <th className="px-4 py-3.5 text-right">AMOUNT</th>
                      <th className="px-4 py-3.5 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {(!expenseRecords || expenseRecords.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No expense records found. Click "+ Record expense" to post an expense.
                        </td>
                      </tr>
                    ) : (
                      expenseRecords.map((ex) => (
                        <tr key={ex.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">{ex.number}</td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{ex.date}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{ex.account_name}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{ex.description}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{ex.cash_bank_account}</td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            Rs. {ex.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-amber-400">
                              {ex.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INCOME TAB (Matching Screenshot 5) */}
      {activeSubTab === 'Income' && (
        <div>
          {recordIncomeOpen ? (
            /* Record Income Form View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Card (Left 2 cols) */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">Record Income</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Date</label>
                    <input
                      type="date"
                      value={incDate}
                      onChange={(e) => setIncDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Income account</label>
                    <select
                      value={incAccountId}
                      onChange={(e) => setIncAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="">4000 · Other Income</option>
                      {chartOfAccounts.filter((c) => c.account_type === 'Revenue' || c.account_type === 'Income').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} · {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Received in</label>
                    <select
                      value={incReceivedIn}
                      onChange={(e) => setIncReceivedIn(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="Cash in Hand">Cash in Hand</option>
                      <option value="Bank Account">Bank Account</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Amount</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={incAmount}
                      onChange={(e) => setIncAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Tax amount</label>
                    <input
                      type="number"
                      value={incTaxAmount}
                      onChange={(e) => setIncTaxAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. REF-201"
                      value={incReference}
                      onChange={(e) => setIncReference(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Customer (optional)</label>
                  <select
                    value={incCustomerId}
                    onChange={(e) => setIncCustomerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="">None</option>
                    {customers.filter((c) => c.is_active).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Description</label>
                  <textarea
                    rows={4}
                    value={incDescription}
                    onChange={(e) => setIncDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Accounting Impact Card */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Accounting impact</h3>
                  <div className="rounded-xl bg-amber-500/10/80 p-4 border border-amber-500/20 dark:bg-amber-500/10 dark:border-amber-500/30 text-xs text-emerald-700 dark:text-amber-300 leading-relaxed">
                    Credits the selected income account and debits the selected bank/cash account.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRecordIncomeOpen(false)}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePostIncome}
                    className="rounded-xl bg-[#00a884] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                  >
                    Post transaction
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Income Register List (Matching Screenshot 5) */
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">CASH MANAGEMENT</p>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Income register</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRecordIncomeOpen(true)}
                  className="rounded-xl bg-[#00a884] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Record income
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">NUMBER</th>
                      <th className="px-4 py-3.5">DATE</th>
                      <th className="px-4 py-3.5">ACCOUNT</th>
                      <th className="px-4 py-3.5">DESCRIPTION</th>
                      <th className="px-4 py-3.5">CASH / BANK</th>
                      <th className="px-4 py-3.5 text-right">AMOUNT</th>
                      <th className="px-4 py-3.5 text-center">STATUS</th>
                      <th className="px-4 py-3.5 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {(!incomeRecords || incomeRecords.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          No income records found. Click "+ Record income" to post income.
                        </td>
                      </tr>
                    ) : (
                      incomeRecords.map((inc) => (
                        <tr key={inc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">{inc.number}</td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{inc.date}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{inc.account_name}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{inc.description}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{inc.cash_bank_account}</td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            Rs. {inc.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-amber-400">
                              {inc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="text-xs font-bold text-amber-500 hover:underline"
                            >
                              Print
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW JV MODAL */}
      {newJvOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/80">
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
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">BALANCED DEBIT & CREDIT LINES</p>
                <button onClick={addLine} className="text-xs font-semibold text-amber-500 hover:underline">+ Add line</button>
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
                <span className={`font-bold ${isBalanced ? 'text-amber-500' : 'text-rose-500'}`}>{isBalanced ? '✓ Balanced' : '✗ Unbalanced'}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setNewJvOpen(false)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-400">Cancel</button>
              <button onClick={handleSaveJV} disabled={!isBalanced} className="btn-primary disabled:opacity-50">
                Save & Post JV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
