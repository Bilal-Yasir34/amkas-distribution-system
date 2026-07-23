import { useState } from 'react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO } from '@/lib/utils';

export function PayPayment() {
  const toast = useToast();
  const { vendors, customers, bankAccounts, vendorBills, vendorPayments, addVendorPayment, updateVendor, updateVendorBill } = useDataStore();

  const paymentNo = `CP-${String(vendorPayments.length + 1).padStart(5, '0')}`;
  const [paidTo, setPaidTo] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [payFrom, setPayFrom] = useState('Cash in Hand');
  const [amount, setAmount] = useState<string | number>('');
  const [accountCategory, setAccountCategory] = useState('Auto select based on selected party');
  const [currency, setCurrency] = useState('PKR');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');

  const handlePostPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidTo) return toast.error('Please select customer, vendor or account');
    if (!amount || Number(amount) <= 0) return toast.error('Please enter a valid payment amount');

    const amtNum = Number(amount);
    const vendorId = paidTo.startsWith('c-') ? '' : paidTo;

    // Auto allocation to oldest vendor bills
    if (vendorId) {
      let remaining = amtNum;
      const vBills = vendorBills
        .filter((b) => b.vendor_id === vendorId && b.status !== 'CANCELLED')
        .sort((a, b) => new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime());

      vBills.forEach((b) => {
        if (remaining <= 0) return;
        const due = (b.total_amount || 0) - (b.paid_amount || 0);
        if (due > 0) {
          const alloc = Math.min(remaining, due);
          const newPaid = (b.paid_amount || 0) + alloc;
          remaining -= alloc;
          updateVendorBill(b.id, {
            paid_amount: newPaid,
            status: newPaid >= (b.total_amount || 0) ? 'POSTED' : b.status,
          });
        }
      });

      const selectedVend = vendors.find((v) => v.id === vendorId);
      if (selectedVend) {
        updateVendor(selectedVend.id, {
          opening_balance: Math.max(0, (selectedVend.opening_balance || 0) - amtNum),
        });
      }
    }

    addVendorPayment({
      payment_no: paymentNo,
      vendor_id: vendorId || vendors[0]?.id || 'v1',
      vendor_bill_id: null,
      payment_date: paymentDate,
      payment_method: payFrom,
      paid_from_account_id: payFrom,
      amount: amtNum,
      reference_no: refNo || null,
      notes: notes || null,
      status: 'POSTED',
      created_by: 'admin',
      created_at: new Date().toISOString(),
    });

    toast.success(`Payment ${paymentNo} posted! Rs. ${amtNum.toLocaleString()} paid.`);

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
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">AMKAS INTERNATIONAL</p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Pay Payment</h1>
      </div>

      <form onSubmit={handlePostPayment} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Card (Left - 2 Columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Pay Payment</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Use one payment screen for vendors, customers or direct account heads.
            </p>
          </div>

          {/* Row 1: Paid to & Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Paid to</label>
              <select
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              >
                <option value="">Select customer, vendor or account</option>
                <optgroup label="Vendors">
                  {vendors.filter((v) => v.is_active).map((v) => (
                    <option key={`v-${v.id}`} value={v.id}>
                      {v.name} ({v.code})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Customers">
                  {customers.filter((c) => c.is_active).map((c) => (
                    <option key={`c-${c.id}`} value={`c-${c.id}`}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Direct Account Heads">
                  <option value="acc-ap">Accounts Payable</option>
                  <option value="acc-advance">Vendor Advances</option>
                  <option value="acc-direct-exp">Direct Expenses</option>
                  <option value="acc-op-exp">Operating Expenses</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 2: Pay from & Amount */}
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {/* Row 3: Account head / category & Currency */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account head / category</label>
              <select
                value={accountCategory}
                onChange={(e) => setAccountCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              >
                <option value="Auto select based on selected party">Auto select based on selected party</option>
                <option value="Accounts Payable">Accounts Payable</option>
                <option value="Vendor Advances">Vendor Advances</option>
                <option value="Accounts Receivable">Accounts Receivable</option>
                <option value="Direct Expenses">Direct Expenses</option>
                <option value="Operating Expenses">Operating Expenses</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              >
                <option value="PKR">PKR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="AED">AED</option>
                <option value="SAR">SAR</option>
              </select>
            </div>
          </div>

          {/* Row 4: Exchange rate & Reference number */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Exchange rate</label>
              <input
                type="number"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Reference number</label>
              <input
                type="text"
                placeholder="Reference number"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 5: Notes Textarea */}
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
              Vendor payments auto-allocate to outstanding bills. Customer/account payments post directly through the journal with CP numbering.
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
