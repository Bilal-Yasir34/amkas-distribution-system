import { useState } from 'react';
import { ArrowUpRight, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO } from '@/lib/utils';

export function PayPayment() {
  const toast = useToast();
  const { vendors, bankAccounts, vendorBills, vendorPayments, addVendorPayment, updateVendor, updateVendorBill } = useDataStore();

  const [billId, setBillId] = useState('');

  const paymentNo = `CP-${String(vendorPayments.length + 1).padStart(5, '0')}`;
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [vendorId, setVendorId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidFromAccount, setPaidFromAccount] = useState('Cash in Hand');
  const [amount, setAmount] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  const selectedVendor = vendors.find((v) => v.id === vendorId);

  // Outstanding vendor bills for selected vendor
  const vendorOutstandingBills = vendorBills.filter(
    (b) => b.vendor_id === vendorId && b.status === 'POSTED' && (b.total_amount || 0) > (b.paid_amount || 0)
  );

  const selectedBill = vendorBills.find((b) => b.id === billId);
  const billBalance = selectedBill ? (selectedBill.total_amount || 0) - (selectedBill.paid_amount || 0) : 0;

  const handlePostPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return toast.error('Please select a vendor');
    if (!amount || Number(amount) <= 0) return toast.error('Please enter a valid payment amount');

    const amtNum = Number(amount);

    addVendorPayment({
      payment_no: paymentNo,
      vendor_id: vendorId,
      vendor_bill_id: billId || null,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      paid_from_account_id: paidFromAccount,
      amount: amtNum,
      cheque_number: chequeNo || null,
      cheque_date: chequeDate || null,
      reference_no: null,
      notes: notes || null,
      status: 'POSTED',
      created_by: 'admin',
      created_at: new Date().toISOString(),
    });

    // Update bill paid amount
    if (billId && selectedBill) {
      updateVendorBill(billId, { paid_amount: (selectedBill.paid_amount || 0) + amtNum });
    }

    if (selectedVendor) {
      updateVendor(selectedVendor.id, {
        opening_balance: Math.max(0, (selectedVendor.opening_balance || 0) - amtNum),
      });
    }

    toast.success(`Vendor payment ${paymentNo} posted! Rs. ${amtNum.toLocaleString()} paid.`);

    // Reset Form
    setVendorId('');
    setBillId('');
    setAmount('');
    setChequeNo('');
    setNotes('');
    setPaidFromAccount('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">DIRECT FINANCIAL ENTRY</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pay Vendor / Account</h1>
      </div>

      <form onSubmit={handlePostPayment} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACCOUNTS PAYABLE</p>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Vendor payment voucher</h3>
          </div>
          <span className="font-mono text-xs font-bold text-rose-400">{paymentNo}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-400">Vendor</label>
            <select
              value={vendorId}
              onChange={(e) => { setVendorId(e.target.value); setBillId(''); setAmount(''); }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400">Payment date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
            />
          </div>
        </div>

        {/* Outstanding Vendor Bills */}
        {vendorId && (
          <div>
            <label className="text-[11px] font-semibold text-slate-400">Apply against vendor bill (optional)</label>
            {vendorOutstandingBills.length === 0 ? (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-500/5 p-3 text-xs text-amber-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No outstanding bills for this vendor. Payment will be posted as advance.
              </div>
            ) : (
              <div className="mt-1 space-y-1">
                <select
                  value={billId}
                  onChange={(e) => {
                    setBillId(e.target.value);
                    const bill = vendorBills.find((b) => b.id === e.target.value);
                    if (bill) setAmount(String((bill.total_amount || 0) - (bill.paid_amount || 0)));
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">-- No specific bill (advance payment) --</option>
                  {vendorOutstandingBills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bill_no} — Balance: Rs. {((b.total_amount || 0) - (b.paid_amount || 0)).toLocaleString()}
                    </option>
                  ))}
                </select>
                {billId && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs text-rose-400">
                    <span className="font-semibold">Outstanding balance:</span> Rs. {billBalance.toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-400">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Online / POS">Online / POS</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400">Paid from account</label>
            <select
              value={paidFromAccount}
              onChange={(e) => setPaidFromAccount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="">Select account</option>
              {bankAccounts.map((ba) => (
                <option key={ba.id} value={ba.account_name}>
                  {ba.account_name} ({ba.bank_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400">Amount paid (PKR)</label>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-mono font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 outline-none"
          />
        </div>

        {paymentMethod === 'Cheque' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Cheque number</label>
              <input
                type="text"
                value={chequeNo}
                onChange={(e) => setChequeNo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Cheque date</label>
              <input
                type="date"
                value={chequeDate}
                onChange={(e) => setChequeDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-[11px] font-semibold text-slate-400">Reference / Narration</label>
          <textarea
            rows={2}
            placeholder="Enter payment notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
          />
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-md"
          >
            <CheckCircle className="h-4 w-4" /> Post Payment
          </button>
        </div>
      </form>
    </div>
  );
}
