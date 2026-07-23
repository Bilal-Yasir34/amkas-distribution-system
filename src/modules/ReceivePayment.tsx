import { useState } from 'react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO } from '@/lib/utils';

export function ReceivePayment() {
  const toast = useToast();
  const { customers, vendors, bankAccounts, invoices, customerReceipts, addCustomerReceipt, updateInvoice } = useDataStore();

  const [receivedFrom, setReceivedFrom] = useState('');
  const [receiptDate, setReceiptDate] = useState(todayISO());
  const [depositTo, setDepositTo] = useState('Cash in Hand');
  const [amount, setAmount] = useState<number | ''>('');
  const [accountCategory, setAccountCategory] = useState('Auto select based on selected party');
  const [currency, setCurrency] = useState('PKR');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');

  const receiptNo = `CR-${String(customerReceipts.length + 1).padStart(5, '0')}`;

  const handlePostReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedFrom) return toast.error('Please select customer, vendor or account');
    if (!amount || Number(amount) <= 0) return toast.error('Please enter a valid receipt amount');

    const amtNum = Number(amount);
    const customerId = receivedFrom.startsWith('v-') ? '' : receivedFrom;

    const depositAcc = bankAccounts.find(
      (b) => b.account_name === depositTo || b.id === depositTo
    );
    const depositAccId = depositAcc?.id || bankAccounts[0]?.id || 'ba1';

    // Auto allocation for customer invoices
    if (customerId) {
      let remaining = amtNum;
      const custInvoices = invoices
        .filter((i) => i.customer_id === customerId && i.status !== 'CANCELLED')
        .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());

      custInvoices.forEach((inv) => {
        if (remaining <= 0) return;
        const due = (inv.total_amount || 0) - (inv.paid_amount || 0);
        if (due > 0) {
          const alloc = Math.min(remaining, due);
          const newPaid = (inv.paid_amount || 0) + alloc;
          remaining -= alloc;
          updateInvoice(inv.id, {
            paid_amount: newPaid,
            status: newPaid >= (inv.total_amount || 0) ? 'POSTED' : inv.status,
          });
        }
      });
    }

    addCustomerReceipt({
      receipt_no: receiptNo,
      customer_id: customerId || customers[0]?.id || 'c1',
      sales_invoice_id: null,
      receipt_date: receiptDate,
      payment_method: depositTo.includes('Cash') ? 'Cash' : 'Bank Transfer',
      deposit_account_id: depositAccId,
      deposit_to: depositTo,
      amount: amtNum,
      reference_no: refNo || null,
      notes: notes || null,
      currency,
      status: 'POSTED',
      created_by: 'admin',
      created_at: new Date().toISOString(),
    });

    toast.success(`Receipt ${receiptNo} posted! Rs. ${amtNum.toLocaleString()} received.`);

    // Reset form
    setReceivedFrom('');
    setAmount('');
    setRefNo('');
    setNotes('');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-2 sm:p-6">
      {/* Title Outside Card matching screenshot */}
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Receive Payment</h1>

      <form onSubmit={handlePostReceipt} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Card (Left - 2 Columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Receive Payment</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Use one receipt screen for customers, vendors or direct account heads.
            </p>
          </div>

          {/* Row 1: Received from & Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Received from</label>
              <select
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              >
                <option value="">Select customer, vendor or account</option>
                <optgroup label="Customers">
                  {customers.filter((c) => c.is_active).map((c) => (
                    <option key={`c-${c.id}`} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Vendors">
                  {vendors.filter((v) => v.is_active).map((v) => (
                    <option key={`v-${v.id}`} value={`v-${v.id}`}>
                      {v.name} ({v.code})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Direct Account Heads">
                  <option value="acc-ar">Accounts Receivable</option>
                  <option value="acc-advance">Customer Advances</option>
                  <option value="acc-other">Other Income / Revenue</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Date</label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 2: Deposit to & Amount */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Deposit to</label>
              <select
                value={depositTo || bankAccounts[0]?.account_name || ''}
                onChange={(e) => setDepositTo(e.target.value)}
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
                <option value="Accounts Receivable">Accounts Receivable</option>
                <option value="Customer Advances">Customer Advances</option>
                <option value="Accounts Payable">Accounts Payable</option>
                <option value="Other Income">Other Income</option>
                <option value="Sales Revenue">Sales Revenue</option>
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
              placeholder="Payment notes or remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Right Card: Posting rules (1 Column) matching screenshot */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Posting rules</h3>

            {/* Light Emerald Notice Box matching screenshot */}
            <div className="rounded-xl bg-amber-500/10 p-4 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs leading-relaxed border border-amber-500/20 dark:border-amber-500/20">
              Customer receipts auto-allocate to outstanding invoices. Vendor/account receipts post directly through the journal with CR numbering.
            </div>
          </div>

          {/* Action Buttons at Bottom Right matching screenshot */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setReceivedFrom('');
                setAmount('');
                setRefNo('');
                setNotes('');
              }}
              className="btn btn-secondary py-2.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2.5 text-xs"
            >
              Post receipt
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
