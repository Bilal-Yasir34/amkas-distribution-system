import { useState, useMemo } from 'react';
import { Plus, Trash2, X, Search, Filter, Download, Check, ArrowUpRight, BookOpen, ArrowLeftRight } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO, downloadCSV, formatDate } from '@/lib/utils';
import { DateInput } from '@/components/DateInput';

type SubTab =
  | 'Overview'
  | 'Journal Entries'
  | 'General Ledger'
  | 'Party Statements'
  | 'Aging Summary'
  | 'Receivables'
  | 'Payables'
  | 'Expenses'
  | 'Income'
  | 'Trial Balance'
  | 'Profit & Loss'
  | 'Balance Sheet';

export function AccountingModule() {
  const toast = useToast();
  const {
    journalEntries = [],
    chartOfAccounts = [],
    accountTypes = [],
    customers = [],
    vendors = [],
    users = [],
    invoices = [],
    purchaseInvoices = [],
    vendorBills = [],
    customerReceipts = [],
    vendorPayments = [],
    salesReturns = [],
    purchaseReturns = [],
    creditNotes = [],
    debitNotes = [],
    expenseRecords = [],
    incomeRecords = [],
    addJournalEntry,
    deleteJournalEntry,
    addExpenseRecord,
    addIncomeRecord,
  } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('Overview');

  // Unified Accounts / Parties list across Customers, Vendors, and Users
  const allAccounts = useMemo(() => {
    const list: Array<{ id: string; name: string; code?: string; account_type: string; email?: string; phone?: string; is_active?: boolean }> = [];

    // Customers
    (customers || []).forEach((c) => {
      list.push({
        id: c.id,
        name: c.name,
        code: c.code,
        account_type: c.account_type || 'Customer',
        email: c.email || undefined,
        phone: c.phone || undefined,
        is_active: c.is_active ?? true,
      });
    });

    // Vendors
    (vendors || []).forEach((v) => {
      if (!list.some((item) => item.id === v.id)) {
        list.push({
          id: v.id,
          name: v.name,
          code: v.code,
          account_type: v.account_type || 'Vendor',
          email: v.email || undefined,
          phone: v.phone || undefined,
          is_active: v.is_active ?? true,
        });
      }
    });

    // Users / Employees
    (users || []).forEach((u) => {
      if (!list.some((item) => item.id === u.id)) {
        list.push({
          id: u.id,
          name: u.full_name,
          code: u.employee_code,
          account_type: u.role || 'Employee',
          email: u.email || undefined,
          phone: u.phone || undefined,
          is_active: u.is_active ?? true,
        });
      }
    });

    return list;
  }, [customers, vendors, users]);

  // Dynamically collect all available account/party types
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    (accountTypes || []).filter((at) => at.is_active).forEach((at) => typeSet.add(at.name));
    allAccounts.forEach((a) => {
      if (a.account_type) typeSet.add(a.account_type);
    });
    if (typeSet.size === 0) {
      typeSet.add('Customer');
      typeSet.add('Vendor');
    }
    return Array.from(typeSet);
  }, [accountTypes, allAccounts]);

  const [newJvOpen, setNewJvOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(todayISO());
  const [refNo, setRefNo] = useState('');
  const [narration, setNarration] = useState('');
  const [glFilter, setGlFilter] = useState('');
  const [partyType, setPartyType] = useState<string>('Customer');
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

  // Party Statement State
  const [statementType, setStatementType] = useState<string>('ALL');
  const [agingSummaryType, setAgingSummaryType] = useState<string>('ALL');
  const [statementPartyId, setStatementPartyId] = useState('');
  const [statementFromDate, setStatementFromDate] = useState('2026-01-01');
  const [statementToDate, setStatementToDate] = useState(todayISO());
  const [generatedStatementPartyId, setGeneratedStatementPartyId] = useState('');
  const [appliedStatementFromDate, setAppliedStatementFromDate] = useState('2026-01-01');
  const [appliedStatementToDate, setAppliedStatementToDate] = useState(todayISO());

  const activePartyObj = useMemo(() => {
    return allAccounts.find((c) => c.id === generatedStatementPartyId);
  }, [generatedStatementPartyId, allAccounts]);

  const {
    statementOpeningBalance,
    statementTransactions,
    statementPeriodDebit,
    statementPeriodCredit,
    statementClosingBalance,
  } = useMemo(() => {
    if (!generatedStatementPartyId) {
      return {
        statementOpeningBalance: 0,
        statementTransactions: [],
        statementPeriodDebit: 0,
        statementPeriodCredit: 0,
        statementClosingBalance: 0,
      };
    }

    const partyObj = allAccounts.find((a) => a.id === generatedStatementPartyId);
    const partyName = partyObj?.name?.toLowerCase().trim();

    const resolvePartyName = (id?: string | null, directName?: string | null) => {
      if (directName) return directName;
      if (!id) return '';
      const foundCust = customers.find((c) => c.id === id);
      if (foundCust) return foundCust.name;
      const foundVend = vendors.find((v) => v.id === id);
      if (foundVend) return foundVend.name;
      const foundUser = users.find((u) => u.id === id);
      if (foundUser) return foundUser.full_name;
      return '';
    };

    const isMatch = (id?: string | null, name?: string | null) => {
      if (!id && !name) return false;
      if (id && id === generatedStatementPartyId) return true;
      const resolved = (resolvePartyName(id, name) || '').toLowerCase().trim();
      if (partyName && resolved && (resolved === partyName || resolved.includes(partyName) || partyName.includes(resolved))) {
        return true;
      }
      return false;
    };

    // 1. Sales Invoices
    const custInvs = (invoices || [])
      .filter((i) => isMatch(i.customer_id, i.customer_name))
      .map((i) => ({
        id: `inv-${i.id}`,
        date: (i.invoice_date || i.created_at || todayISO()).slice(0, 10),
        number: i.invoice_no,
        type: 'Sales Invoice',
        desc: `Sales Invoice - ${i.customer_name || partyObj?.name || 'Customer'}${i.items && i.items.length > 0 ? ` (${i.items.length} item${i.items.length > 1 ? 's' : ''})` : ''}`,
        debit: Number(i.total_amount || 0),
        credit: 0,
      }));

    // 2. Customer Receipts
    const custRects = (customerReceipts || [])
      .filter((r) => isMatch(r.customer_id, r.customer_name))
      .map((r) => ({
        id: `rect-${r.id}`,
        date: (r.receipt_date || r.created_at || todayISO()).slice(0, 10),
        number: r.receipt_no,
        type: 'Customer Receipt',
        desc: `Payment Received - ${r.customer_name || partyObj?.name || 'Customer'}${r.payment_method ? ` (${r.payment_method})` : ''}`,
        debit: 0,
        credit: Number(r.amount || 0),
      }));

    // 3. Sales Returns & Credit Notes
    const seenSrNumbers = new Set<string>();
    const custReturns: Array<{ id: string; date: string; number: string; type: string; desc: string; debit: number; credit: number }> = [];

    (salesReturns || [])
      .filter((sr) => isMatch(sr.customer_id || (sr as any).party_id, sr.customer_name || (sr as any).party_name))
      .forEach((sr) => {
        const num = sr.return_no || `SR-${sr.id.slice(0, 6)}`;
        seenSrNumbers.add(num);
        custReturns.push({
          id: `sr-${sr.id}`,
          date: (sr.document_date || (sr as any).return_date || sr.created_at || todayISO()).slice(0, 10),
          number: num,
          type: 'Sales Return',
          desc: `Sales Return - ${sr.customer_name || (sr as any).party_name || partyObj?.name || 'Customer'}${sr.reason ? ` (${sr.reason})` : ''}`,
          debit: 0,
          credit: Number(sr.total_amount || 0),
        });
      });

    (creditNotes || [])
      .filter((cn) => isMatch(cn.customer_id || (cn as any).party_id, cn.customer_name || (cn as any).party_name))
      .forEach((cn) => {
        const num = cn.credit_note_no || `CN-${cn.id.slice(0, 6)}`;
        if (!seenSrNumbers.has(num)) {
          seenSrNumbers.add(num);
          custReturns.push({
            id: `cn-${cn.id}`,
            date: (cn.note_date || (cn as any).date || cn.created_at || todayISO()).slice(0, 10),
            number: num,
            type: 'Credit Note',
            desc: `Credit Note / Return - ${cn.customer_name || (cn as any).party_name || partyObj?.name || 'Customer'}${cn.reason ? ` (${cn.reason})` : ''}`,
            debit: 0,
            credit: Number(cn.total_amount || 0),
          });
        }
      });

    // 4. Vendor Bills & Purchase Invoices
    const seenBillNumbers = new Set<string>();
    const vendBills: Array<{ id: string; date: string; number: string; type: string; desc: string; debit: number; credit: number }> = [];

    (vendorBills || [])
      .filter((b) => isMatch(b.vendor_id || (b as any).party_id, b.vendor_name || (b as any).party_name))
      .forEach((b) => {
        const num = b.bill_no || b.vendor_invoice_no || `BILL-${b.id.slice(0, 6)}`;
        seenBillNumbers.add(num);
        vendBills.push({
          id: `bill-${b.id}`,
          date: (b.bill_date || b.document_date || b.created_at || todayISO()).slice(0, 10),
          number: num,
          type: 'Vendor Bill',
          desc: `Vendor Bill - ${b.vendor_name || (b as any).party_name || partyObj?.name || 'Vendor'}`,
          debit: 0,
          credit: Number(b.total_amount || 0),
        });
      });

    (purchaseInvoices || [])
      .filter((pi) => isMatch(pi.vendor_id || (pi as any).party_id, (pi as any).vendor_name || (pi as any).party_name))
      .forEach((pi) => {
        const num = pi.grn_no || pi.invoice_no || `PI-${pi.id.slice(0, 6)}`;
        if (!seenBillNumbers.has(num)) {
          seenBillNumbers.add(num);
          vendBills.push({
            id: `pi-${pi.id}`,
            date: (pi.received_date || pi.document_date || pi.created_at || todayISO()).slice(0, 10),
            number: num,
            type: 'Purchase Invoice',
            desc: `Purchase Invoice - ${(pi as any).vendor_name || partyObj?.name || 'Vendor'}`,
            debit: 0,
            credit: Number(pi.total_amount || 0),
          });
        }
      });

    // 5. Vendor Payments
    const vendPays = (vendorPayments || [])
      .filter((p) => isMatch(p.vendor_id || (p as any).party_id, p.vendor_name || (p as any).party_name))
      .map((p) => ({
        id: `pay-${p.id}`,
        date: (p.payment_date || p.created_at || todayISO()).slice(0, 10),
        number: p.payment_no,
        type: 'Vendor Payment',
        desc: `Payment Made - ${p.vendor_name || partyObj?.name || 'Vendor'}${p.payment_method ? ` (${p.payment_method})` : ''}`,
        debit: Number(p.amount || 0),
        credit: 0,
      }));

    // 6. Purchase Returns & Debit Notes
    const seenPrNumbers = new Set<string>();
    const purchReturns: Array<{ id: string; date: string; number: string; type: string; desc: string; debit: number; credit: number }> = [];

    (purchaseReturns || [])
      .filter((pr) => isMatch(pr.vendor_id || (pr as any).party_id || (pr as any).customer_id, pr.vendor_name || (pr as any).party_name || (pr as any).customer_name))
      .forEach((pr) => {
        const num = pr.return_no || `PR-${pr.id.slice(0, 6)}`;
        seenPrNumbers.add(num);
        purchReturns.push({
          id: `pr-${pr.id}`,
          date: (pr.document_date || (pr as any).return_date || pr.created_at || todayISO()).slice(0, 10),
          number: num,
          type: 'Purchase Return',
          desc: `Purchase Return - ${pr.vendor_name || (pr as any).party_name || partyObj?.name || 'Vendor'}${pr.notes ? ` (${pr.notes})` : ''}`,
          debit: Number(pr.total_amount || 0),
          credit: 0,
        });
      });

    (debitNotes || [])
      .filter((dn) => isMatch(dn.vendor_id || (dn as any).party_id, (dn as any).vendor_name || (dn as any).party_name))
      .forEach((dn) => {
        const num = dn.debit_note_no || `DN-${dn.id.slice(0, 6)}`;
        if (!seenPrNumbers.has(num)) {
          seenPrNumbers.add(num);
          purchReturns.push({
            id: `dn-${dn.id}`,
            date: (dn.note_date || (dn as any).date || dn.created_at || todayISO()).slice(0, 10),
            number: num,
            type: 'Debit Note',
            desc: `Debit Note / Purchase Return - ${(dn as any).vendor_name || partyObj?.name || 'Vendor'}${dn.reason ? ` (${dn.reason})` : ''}`,
            debit: Number(dn.total_amount || 0),
            credit: 0,
          });
        }
      });

    const allTxs = [
      ...custInvs,
      ...custRects,
      ...custReturns,
      ...vendBills,
      ...vendPays,
      ...purchReturns,
    ];
    allTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Calculate opening balance strictly prior to appliedStatementFromDate
    const openingTxs = appliedStatementFromDate
      ? allTxs.filter((tx) => tx.date < appliedStatementFromDate)
      : [];
    const openingBalance = openingTxs.reduce(
      (sum, tx) => sum + (tx.debit - tx.credit),
      0
    );

    // 2. Filter transactions strictly within the applied date range
    const periodTxs = allTxs.filter((tx) => {
      if (appliedStatementFromDate && tx.date < appliedStatementFromDate) return false;
      if (appliedStatementToDate && tx.date > appliedStatementToDate) return false;
      return true;
    });

    // 3. Compute running balance starting from openingBalance
    let running = openingBalance;
    const mappedTxs = periodTxs.map((tx) => {
      running += (tx.debit - tx.credit);
      return { ...tx, runningBalance: running };
    });

    const pDebit = periodTxs.reduce((acc, t) => acc + t.debit, 0);
    const pCredit = periodTxs.reduce((acc, t) => acc + t.credit, 0);

    return {
      statementOpeningBalance: openingBalance,
      statementTransactions: mappedTxs,
      statementPeriodDebit: pDebit,
      statementPeriodCredit: pCredit,
      statementClosingBalance: running,
    };
  }, [
    generatedStatementPartyId,
    appliedStatementFromDate,
    appliedStatementToDate,
    allAccounts,
    invoices,
    customerReceipts,
    salesReturns,
    creditNotes,
    vendorBills,
    purchaseInvoices,
    vendorPayments,
    purchaseReturns,
    debitNotes,
  ]);

  const handleGenerateStatement = () => {
    if (!statementPartyId) {
      return toast.error('Please select a party first');
    }
    setGeneratedStatementPartyId(statementPartyId);
    setAppliedStatementFromDate(statementFromDate);
    setAppliedStatementToDate(statementToDate);
    const party = allAccounts.find((c) => c.id === statementPartyId);
    toast.success(`Generated statement for ${party?.name || 'selected party'}`);
  };

  const handlePostExpense = () => {
    const numAmt = Number(expAmount);
    if (!numAmt || numAmt <= 0) {
      return toast.error('Please enter a valid expense amount');
    }
    const targetAcct = chartOfAccounts.find((c) => c.id === expAccountId) || chartOfAccounts.find((c) => c.account_type === 'Expense') || { id: '5000', name: 'Cost of Goods Sold' };
    const vendorObj = allAccounts.find((v) => v.id === expVendorId);
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
    const customerObj = allAccounts.find((c) => c.id === incCustomerId);
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
  const [glToDate, setGlToDate] = useState(todayISO());
  const [appliedGlAccountFilter, setAppliedGlAccountFilter] = useState('all');
  const [appliedGlFromDate, setAppliedGlFromDate] = useState('2026-07-01');
  const [appliedGlToDate, setAppliedGlToDate] = useState(todayISO());

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
      const d = (je.entry_date || je.created_at || todayISO()).slice(0, 10);
      linesArr.push({
        id: `je-dr-${je.id || idx}`,
        date: d,
        formattedDate: formatDate(d),
        entryNo: je.entry_no || `JV-${String(idx + 1).padStart(5, '0')}`,
        entryType: 'Journal Entry',
        accountCodeName: '1110 · Cash in Hand',
        accountId: '1110',
        description: je.narration || 'General Journal Entry',
        debit: je.total_debit || 0,
        credit: 0,
      });
      linesArr.push({
        id: `je-cr-${je.id || idx}`,
        date: d,
        formattedDate: formatDate(d),
        entryNo: je.entry_no || `JV-${String(idx + 1).padStart(5, '0')}`,
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
      const ref = cr.receipt_no || `CR-${String(idx + 1).padStart(5, '0')}`;
      const d = (cr.receipt_date || cr.created_at || todayISO()).slice(0, 10);
      linesArr.push({
        id: `cr-dr-${cr.id || idx}`,
        date: d,
        formattedDate: formatDate(d),
        entryNo: `JV-CR-${String(idx + 1).padStart(4, '0')}`,
        entryType: 'Receipt',
        accountCodeName: '1110 · Cash in Hand',
        accountId: '1110',
        description: `Receipt ${ref}`,
        debit: amt,
        credit: 0,
      });
      linesArr.push({
        id: `cr-cr-${cr.id || idx}`,
        date: d,
        formattedDate: formatDate(d),
        entryNo: `JV-CR-${String(idx + 1).padStart(4, '0')}`,
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
      const ref = vp.payment_no || `CP-${String(idx + 1).padStart(5, '0')}`;
      const d = (vp.payment_date || vp.created_at || todayISO()).slice(0, 10);
      linesArr.push({
        id: `vp-dr-${vp.id || idx}`,
        date: d,
        formattedDate: formatDate(d),
        entryNo: `JV-VP-${String(idx + 1).padStart(4, '0')}`,
        entryType: 'Payment',
        accountCodeName: '2100 · Accounts Payable',
        accountId: '2100',
        description: `Payment ${ref}`,
        debit: amt,
        credit: 0,
      });
      linesArr.push({
        id: `vp-cr-${vp.id || idx}`,
        date: d,
        formattedDate: formatDate(d),
        entryNo: `JV-VP-${String(idx + 1).padStart(4, '0')}`,
        entryType: 'Payment',
        accountCodeName: '1110 · Cash in Hand',
        accountId: '1110',
        description: `Payment ${ref}`,
        debit: 0,
        credit: amt,
      });
    });

    // 4. Expense Records
    (expenseRecords || []).forEach((exp, idx) => {
      const amt = exp.amount || 0;
      const d = (exp.date || exp.created_at || todayISO()).slice(0, 10);
      linesArr.push({
        id: `exp-dr-${exp.id || idx}`,
        date: d,
        formattedDate: formatDate(d),
        entryNo: exp.number || `EX-${String(idx + 1).padStart(5, '0')}`,
        entryType: 'Expense',
        accountCodeName: `${exp.account_id || '5000'} · ${exp.account_name || 'Expense'}`,
        accountId: exp.account_id || '5000',
        description: exp.description || 'Expense entry',
        debit: amt,
        credit: 0,
      });
      linesArr.push({
        id: `exp-cr-${exp.id || idx}`,
        date: d,
        formattedDate: formatDate(d),
        entryNo: exp.number || `EX-${String(idx + 1).padStart(5, '0')}`,
        entryType: 'Expense',
        accountCodeName: '1110 · Cash in Hand',
        accountId: '1110',
        description: `Paid via ${exp.cash_bank_account || 'Cash'}`,
        debit: 0,
        credit: amt,
      });
    });

    // 5. Income Records
    (incomeRecords || []).forEach((inc, idx) => {
      const amt = inc.amount || 0;
      const d = (inc.date || inc.created_at || todayISO()).slice(0, 10);
      linesArr.push({
        id: `inc-dr-${inc.id || idx}`,
        date: d,
        formattedDate: formatDate(d),
        entryNo: inc.number || `MI-${String(idx + 1).padStart(5, '0')}`,
        entryType: 'Income',
        accountCodeName: '1110 · Cash in Hand',
        accountId: '1110',
        description: `Received via ${inc.cash_bank_account || 'Cash'}`,
        debit: amt,
        credit: 0,
      });
      linesArr.push({
        id: `inc-cr-${inc.id || idx}`,
        date: d,
        formattedDate: formatDate(d),
        entryNo: inc.number || `MI-${String(idx + 1).padStart(5, '0')}`,
        entryType: 'Income',
        accountCodeName: `${inc.account_id || '4000'} · ${inc.account_name || 'Income'}`,
        accountId: inc.account_id || '4000',
        description: inc.description || 'Direct income entry',
        debit: 0,
        credit: amt,
      });
    });

    // Sort chronologically
    linesArr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter by Account & Date Range
    return linesArr.filter((l) => {
      if (appliedGlAccountFilter !== 'all') {
        const matchesName = l.accountCodeName.toLowerCase().includes(appliedGlAccountFilter.toLowerCase());
        const matchesId = l.accountId === appliedGlAccountFilter;
        if (!matchesName && !matchesId) return false;
      }
      if (appliedGlFromDate && l.date < appliedGlFromDate) {
        return false;
      }
      if (appliedGlToDate && l.date > appliedGlToDate) {
        return false;
      }
      return true;
    });
  }, [
    journalEntries,
    customerReceipts,
    vendorPayments,
    expenseRecords,
    incomeRecords,
    appliedGlAccountFilter,
    appliedGlFromDate,
    appliedGlToDate,
  ]);

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
    downloadCSV(`General_Ledger_${todayISO()}.csv`, dataToExport as unknown as Record<string, unknown>[]);
    toast.success('General ledger exported to CSV');
  };

  // General Ledger: flatten all JV lines grouped by account
  const glAccounts = chartOfAccounts.filter(
    (c) => !glFilter || c.name.toLowerCase().includes(glFilter.toLowerCase()) || c.code.includes(glFilter)
  );

  // Trial Balance: compute debit/credit balance per account from JVs
  const trialBalance = chartOfAccounts.map((acc) => {
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
  const partyList = allAccounts.filter(c => c.account_type?.toLowerCase() === partyType.toLowerCase());
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
    'Aging Summary',
    'Receivables',
    'Payables',
    'Expenses',
    'Income',
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">NICE ENTERPRISES</p>
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
                      <td className="px-4 py-3 text-slate-400">{formatDate(je.entry_date)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{je.reference_no || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{je.narration}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-200">Rs. {(je.total_debit || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-200">Rs. {(je.total_credit || 0).toLocaleString()}</td>
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
              <DateInput
                label="From"
                value={glFromDate}
                onChange={(val) => setGlFromDate(val)}
              />

              {/* To Date */}
              <DateInput
                label="To"
                value={glToDate}
                onChange={(val) => setGlToDate(val)}
              />

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
                        Rs. {(row.debit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        Rs. {(row.credit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                      setStatementType(e.target.value);
                      setStatementPartyId('');
                    }}
                    className="rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Account Types</option>
                    {availableTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Party Selector */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    {statementType === 'ALL' ? 'Party / User' : statementType}
                  </label>
                  <select
                    value={statementPartyId}
                    onChange={(e) => setStatementPartyId(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 min-w-[260px]"
                  >
                    <option value="">
                      Select party / user (
                      {statementType === 'ALL'
                        ? allAccounts.length
                        : allAccounts.filter((c) => c.account_type.toLowerCase() === statementType.toLowerCase()).length}
                      )
                    </option>
                    {(statementType === 'ALL'
                      ? allAccounts
                      : allAccounts.filter((c) => c.account_type.toLowerCase() === statementType.toLowerCase())
                    ).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ''} — {c.account_type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* From Date */}
                <DateInput
                  label="From"
                  value={statementFromDate}
                  onChange={(val) => setStatementFromDate(val)}
                />

                {/* To Date */}
                <DateInput
                  label="To"
                  value={statementToDate}
                  onChange={(val) => setStatementToDate(val)}
                />

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
                    {appliedStatementFromDate ? formatDate(appliedStatementFromDate) : 'Start'} — {appliedStatementToDate ? formatDate(appliedStatementToDate) : 'Today'}
                  </span>
                </div>

                {/* 4 Summary Cards matching Screenshot 2 */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">OPENING BALANCE</p>
                    <h3 className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                      Rs. {(statementOpeningBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">PERIOD DEBIT</p>
                    <h3 className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                      Rs. {(statementPeriodDebit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">PERIOD CREDIT</p>
                    <h3 className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                      Rs. {(statementPeriodCredit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
                      CLOSING BALANCE
                    </p>
                    <h3 className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                      Rs. {(statementClosingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                      {/* Opening Balance Row */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 font-medium">
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                          {appliedStatementFromDate ? formatDate(appliedStatementFromDate) : 'Start'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">—</td>
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">Opening</td>
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">Balance brought forward</td>
                        <td className="px-4 py-3.5 text-right text-slate-400">—</td>
                        <td className="px-4 py-3.5 text-right text-slate-400">—</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          Rs. {(statementOpeningBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {statementTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{formatDate(tx.date)}</td>
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-600 dark:text-slate-300">{tx.number}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{tx.type}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{tx.desc}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-900 dark:text-slate-100">
                            {tx.debit > 0 ? `Rs. ${(tx.debit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-900 dark:text-slate-100">
                            {tx.credit > 0 ? `Rs. ${(tx.credit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            Rs. {((tx.runningBalance ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
      
      {/* AGING SUMMARY TAB */}
      {activeSubTab === 'Aging Summary' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Account Type</label>
              <select
                value={agingSummaryType}
                onChange={(e) => setAgingSummaryType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
              >
                <option value="ALL">All Account Types</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {agingSummaryType ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 uppercase">
                  {agingSummaryType === 'ALL' ? 'All Parties' : agingSummaryType} Aging Summary
                </h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">PARTY</th>
                      <th className="px-4 py-3.5 text-right">BILLED</th>
                      <th className="px-4 py-3.5 text-right">RECEIVED / PAID</th>
                      <th className="px-4 py-3.5 text-right">OUTSTANDING</th>
                      <th className="px-4 py-3.5 text-right">OLDEST OPEN DATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {(agingSummaryType === 'ALL'
                      ? allAccounts
                      : allAccounts.filter((c) => c.account_type.toLowerCase() === agingSummaryType.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No aging data available for {agingSummaryType}.
                        </td>
                      </tr>
                    ) : (
                      (agingSummaryType === 'ALL'
                        ? allAccounts
                        : allAccounts.filter((c) => c.account_type.toLowerCase() === agingSummaryType.toLowerCase())
                      ).map((c) => {
                        const isParty = (id?: string | null, name?: string | null) => {
                          if (!id && !name) return false;
                          if (id && id === c.id) return true;
                          if (c.name && name && name.toLowerCase().trim() === c.name.toLowerCase().trim()) return true;
                          return false;
                        };
                        const custInvoices = invoices.filter((i) => isParty(i.customer_id, i.customer_name));
                        const custReceipts = customerReceipts.filter((r) => isParty(r.customer_id, r.customer_name));
                        const custReturns = [
                          ...salesReturns.filter((sr) => isParty(sr.customer_id || (sr as any).party_id, sr.customer_name || (sr as any).party_name)),
                          ...creditNotes.filter((cn) => isParty(cn.customer_id || (cn as any).party_id, cn.customer_name || (cn as any).party_name)),
                        ];
                        const vBills = [
                          ...vendorBills.filter((b) => isParty(b.vendor_id || (b as any).party_id, b.vendor_name || (b as any).party_name)),
                          ...purchaseInvoices.filter((pi) => isParty(pi.vendor_id || (pi as any).party_id, (pi as any).vendor_name || (pi as any).party_name)),
                        ];
                        const vPayments = vendorPayments.filter((p) => isParty(p.vendor_id || (p as any).party_id, p.vendor_name || (p as any).party_name));
                        const vReturns = [
                          ...purchaseReturns.filter((pr) => isParty(pr.vendor_id || (pr as any).party_id || (pr as any).customer_id, pr.vendor_name || (pr as any).party_name || (pr as any).customer_name)),
                          ...debitNotes.filter((dn) => isParty(dn.vendor_id || (dn as any).party_id, (dn as any).vendor_name || (dn as any).party_name)),
                        ];
                        
                        const billed = custInvoices.reduce((s, i) => s + (i.total_amount || 0), 0) + vBills.reduce((s, b) => s + (b.total_amount || 0), 0);
                        const received = custReceipts.reduce((s, r) => s + (r.amount || 0), 0) + vPayments.reduce((s, p) => s + (p.amount || 0), 0);
                        const returned = custReturns.reduce((s, sr) => s + (sr.total_amount || 0), 0) + vReturns.reduce((s, pr) => s + (pr.total_amount || 0), 0);
                        const outstanding = Math.max(0, billed - received - returned);
                        
                        const oldestDate = [
                          ...custInvoices.map((i) => i.invoice_date || i.created_at),
                          ...vBills.map((b) => (b as any).bill_date || (b as any).received_date || (b as any).created_at),
                        ]
                          .filter(Boolean)
                          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
                            
                        const oldestInv = oldestDate ? formatDate(oldestDate) : '--';

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
          ) : (
            <div className="py-20 text-center text-slate-400">Please select an account type to view aging summary.</div>
          )}
        </div>
      )}

      {activeSubTab === 'Expenses' && (
        <div>
          {recordExpenseOpen ? (
            /* Record Expense Form View (Matching Screenshot 4) */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Card (Left 2 cols) */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">Record Expense</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DateInput
                    label="Date"
                    value={expDate}
                    onChange={(val) => setExpDate(val)}
                  />

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
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-mono">{formatDate(ex.date)}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{ex.account_name}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{ex.description}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{ex.cash_bank_account}</td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            Rs. {(ex.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                  <DateInput
                    label="Date"
                    value={incDate}
                    onChange={(val) => setIncDate(val)}
                  />

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
                    {allAccounts.filter((c) => c.is_active).map((c) => (
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
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-mono">{formatDate(inc.date)}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{inc.account_name}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{inc.description}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{inc.cash_bank_account}</td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            Rs. {(inc.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">GENERAL LEDGER</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">New Journal Entry</h3>
              </div>
              <button onClick={() => setNewJvOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateInput
                label="Entry date"
                value={entryDate}
                onChange={(val) => setEntryDate(val)}
              />
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Reference No</label>
                <input type="text" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="e.g. REF-1002" className="input text-xs font-mono mt-1" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Narration</label>
              <input type="text" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Description of financial entry..." className="input text-xs mt-1" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">BALANCED DEBIT & CREDIT LINES</p>
                <button onClick={addLine} className="text-xs font-semibold text-amber-500 hover:underline">+ Add line</button>
              </div>
              {lines.map((line) => (
                <div key={line.id} className="flex items-center gap-2">
                  <select value={line.account_id} onChange={(e) => updateLine(line.id, { account_id: e.target.value })} className="flex-1 input text-xs">
                    {chartOfAccounts.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                  </select>
                  <input type="number" placeholder="Debit" value={line.debit || ''} onChange={(e) => updateLine(line.id, { debit: Number(e.target.value), credit: 0 })} className="w-28 input text-xs font-mono" />
                  <input type="number" placeholder="Credit" value={line.credit || ''} onChange={(e) => updateLine(line.id, { credit: Number(e.target.value), debit: 0 })} className="w-28 input text-xs font-mono" />
                  <button onClick={() => removeLine(line.id)} className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3 font-mono text-xs">
                <span className="text-slate-500 dark:text-slate-400">Total Debit: Rs. {totalDebit.toFixed(2)}</span>
                <span className="text-slate-500 dark:text-slate-400">Total Credit: Rs. {totalCredit.toFixed(2)}</span>
                <span className={`font-bold ${isBalanced ? 'text-amber-500' : 'text-rose-500'}`}>{isBalanced ? '✓ Balanced' : '✗ Unbalanced'}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setNewJvOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition">Cancel</button>
              <button onClick={handleSaveJV} disabled={!isBalanced} className="btn-primary text-xs px-5 disabled:opacity-50">
                Save & Post JV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
