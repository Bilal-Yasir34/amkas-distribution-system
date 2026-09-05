import { useState, useMemo } from 'react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO } from '@/lib/utils';
import { DateInput } from '@/components/DateInput';

export function PayPayment() {
  const toast = useToast();
  const {
    vendors = [],
    customers = [],
    users = [],
    accountTypes = [],
    bankAccounts = [],
    vendorBills = [],
    vendorPayments = [],
    addVendorPayment,
    addApprovalQueueItem,
    updateVendor,
    updateVendorBill,
  } = useDataStore();

  const [selectedAccountType, setSelectedAccountType] = useState(
    (accountTypes || []).filter((at) => at.is_active).find((at) => at.name?.toLowerCase().includes('vendor') || at.name?.toLowerCase().includes('supplier'))?.name ||
    (accountTypes || []).filter((at) => at.is_active)[0]?.name ||
    'Vendor'
  );
  const [paidTo, setPaidTo] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [payFrom, setPayFrom] = useState('Cash in Hand');
  const [amount, setAmount] = useState<string | number>('');
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');

  const allParties = useMemo(() => {
    const list = [
      ...vendors.map((v) => ({ ...v, _origin: 'vendor' as const, account_type: v.account_type || 'Vendor', party_code: v.code })),
      ...customers.map((c) => ({ ...c, _origin: 'customer' as const, account_type: c.account_type || 'Customer', party_code: c.code })),
      ...users.map((u) => ({ ...u, name: u.full_name, _origin: 'user' as const, account_type: (u as any).account_type || u.role || 'Staff', party_code: u.employee_code })),
    ];
    return list.filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);
  }, [vendors, customers, users]);

  const filteredParties = useMemo(() => {
    if (!selectedAccountType) return [];
    return allParties.filter(
      (p) => p.account_type?.toLowerCase() === selectedAccountType.toLowerCase()
    );
  }, [allParties, selectedAccountType]);

  // Auto-generate reference number starting from CP-01
  const autoRefNo = useMemo(() => {
    const existingNums = (vendorPayments || []).map((p) => {
      const match = (p.reference_no || p.payment_no || '').match(/CP-(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    });
    const max = existingNums.length > 0 ? Math.max(0, ...existingNums) : 0;
    return `CP-${String(max + 1).padStart(2, '0')}`;
  }, [vendorPayments]);

  const handlePostPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidTo) return toast.error(`Please select a ${selectedAccountType || 'payee'}`);
    if (!amount || Number(amount) <= 0) return toast.error('Please enter a valid payment amount');

    const amtNum = Number(amount);
    const selectedParty = allParties.find((p) => p.id === paidTo);
    const vendorId = selectedParty?._origin === 'vendor' ? selectedParty.id : '';
    const finalRefNo = refNo.trim() || autoRefNo;
    const paymentNo = finalRefNo;
    const paymentId = crypto.randomUUID();

    const fromAcc = bankAccounts.find(
      (b) => b.account_name === payFrom || b.id === payFrom
    );
    const fromAccId = fromAcc?.id || bankAccounts[0]?.id || 'ba1';

    addVendorPayment({
      id: paymentId,
      payment_no: paymentNo,
      vendor_id: vendorId || selectedParty?.id || vendors[0]?.id || 'v1',
      vendor_bill_id: null,
      payment_date: paymentDate,
      payment_method: payFrom,
      paid_from_account_id: fromAccId,
      amount: amtNum,
      reference_no: finalRefNo,
      notes: notes || null,
      status: 'PENDING',
      created_by: 'Cashier / User',
      created_at: new Date().toISOString(),
    });

    addApprovalQueueItem({
      entity_type: 'vendor_payment',
      module: 'Pay Payment',
      record_id: paymentId,
      record_no: paymentNo,
      party_name: selectedParty?.name || 'Vendor',
      amount: amtNum,
      warehouse_id: null,
      requested_by: 'Cashier / User',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      items_summary: null,
    });

    toast.success(`Payment ${paymentNo} submitted to Approval Center for review!`);

    // Reset Form
    setPaidTo('');
    setAmount('');
    setRefNo('');
    setNotes('');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-2 sm:p-6">
      {/* Title Outside Card matching screenshot */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">NICE ENTERPRISES</p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Pay Payment</h1>
      </div>

      <form onSubmit={handlePostPayment} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Card (Left - 2 Columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Pay Payment</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Select an account type to view and select relevant accounts.
            </p>
          </div>

          {/* Row 1: Account Type, Paid to & Date */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account Type</label>
              <select
                value={selectedAccountType}
                onChange={(e) => {
                  setSelectedAccountType(e.target.value);
                  setPaidTo('');
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 font-semibold"
              >
                <option value="">Select Account Type</option>
                {(accountTypes || []).filter((at) => at.is_active).map((at) => (
                  <option key={at.id} value={at.name}>
                    {at.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Paid to</label>
              <select
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                disabled={!selectedAccountType}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <option value="">
                  {selectedAccountType ? `Select ${selectedAccountType}` : 'Select Account Type first'}
                </option>
                {filteredParties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.party_code ? `(${p.party_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <DateInput
              label="Date"
              value={paymentDate}
              onChange={(val) => setPaymentDate(val)}
            />
          </div>

          {/* Row 2: Pay from, Amount & Reference Number */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pay from</label>
              <select
                value={payFrom || bankAccounts[0]?.account_name || ''}
                onChange={(e) => setPayFrom(e.target.value)}
                className="input"
              >
                {bankAccounts.length === 0 ? (
                  <option value="">No bank accounts added in system</option>
                ) : (
                  bankAccounts.map((b) => (
                    <option key={b.id} value={b.account_name}>
                      {b.account_name} ({b.bank_name})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Amount</label>
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Reference number (Auto)</label>
              <input
                type="text"
                placeholder={autoRefNo}
                value={refNo !== '' ? refNo : autoRefNo}
                onChange={(e) => setRefNo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-bold text-amber-500 dark:border-slate-700 dark:bg-slate-800 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 3: Notes Textarea */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes</label>
            <textarea
              rows={5}
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Right Card: Posting rules (1 Column) matching screenshot */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Posting rules</h3>

            {/* Light Emerald Notice Box matching screenshot */}
            <div className="rounded-xl bg-amber-500/10 dark:bg-amber-500/10 p-3.5 border border-amber-500/30 dark:border-amber-500/20 text-xs font-medium text-amber-800 dark:text-amber-300 leading-relaxed">
              Supplier payments auto-allocate to outstanding bills. Customer/account payments post directly through the journal with CP numbering.
            </div>
          </div>

          {/* Action Buttons at Bottom Right matching screenshot */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setPaidTo('');
                setAmount('');
                setRefNo('');
                setNotes('');
              }}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#00a884] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
            >
              Post payment
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
