import { useState } from 'react';
import { ArrowDownLeft, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO } from '@/lib/utils';

export function ReceivePayment() {
  const toast = useToast();
  const { customers, bankAccounts, invoices, customerReceipts, addCustomerReceipt, updateCustomer, updateInvoice } = useDataStore();

  const [receiptDate, setReceiptDate] = useState(todayISO());
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [depositAccount, setDepositAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(todayISO());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Outstanding invoices for selected customer
  const customerInvoices = invoices.filter(
    (inv) => inv.customer_id === customerId && inv.status === 'POSTED' && (inv.total_amount || 0) > (inv.paid_amount || 0)
  );

  const selectedInvoice = invoices.find((i) => i.id === invoiceId);
  const invoiceBalance = selectedInvoice ? (selectedInvoice.total_amount || 0) - (selectedInvoice.paid_amount || 0) : 0;

  const receiptNo = `CR-${String(customerReceipts.length + 1).padStart(5, '0')}`;

  const handlePostReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return toast.error('Please select a customer');
    if (!amount || Number(amount) <= 0) return toast.error('Please enter a valid receipt amount');
    if (!depositAccount) return toast.error('Please select a deposit account');

    const amtNum = Number(amount);

    addCustomerReceipt({
      receipt_no: receiptNo,
      customer_id: customerId,
      sales_invoice_id: invoiceId || null,
      receipt_date: receiptDate,
      payment_method: paymentMethod,
      deposit_account_id: depositAccount,
      amount: amtNum,
      cheque_number: chequeNo || null,
      cheque_date: chequeDate || null,
      reference_no: reference || null,
      notes: notes || null,
      status: 'POSTED',
      created_by: 'admin',
      created_at: new Date().toISOString(),
    });

    // Update invoice paid amount
    if (invoiceId && selectedInvoice) {
      updateInvoice(invoiceId, {
        paid_amount: (selectedInvoice.paid_amount || 0) + amtNum,
      });
    }

    // Update customer balance
    if (selectedCustomer) {
      updateCustomer(selectedCustomer.id, {
        opening_balance: Math.max(0, (selectedCustomer.opening_balance || 0) - amtNum),
      });
    }

    toast.success(`Receipt ${receiptNo} posted! Rs. ${amtNum.toLocaleString()} received.`);

    // Reset form
    setCustomerId('');
    setInvoiceId('');
    setAmount('');
    setChequeNo('');
    setReference('');
    setNotes('');
    setDepositAccount('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">DIRECT FINANCIAL ENTRY</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Receive Customer Payment</h1>
      </div>

      <form onSubmit={handlePostReceipt} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACCOUNTS RECEIVABLE</p>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Customer receipt voucher</h3>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-500">{receiptNo}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-400">Customer *</label>
            <select
              value={customerId}
              onChange={(e) => { setCustomerId(e.target.value); setInvoiceId(''); setAmount(''); }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400">Receipt date</label>
            <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
          </div>
        </div>

        {/* Outstanding Invoices */}
        {customerId && (
          <div>
            <label className="text-[11px] font-semibold text-slate-400">Apply to invoice (optional)</label>
            {customerInvoices.length === 0 ? (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-500/5 p-3 text-xs text-amber-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No outstanding invoices for this customer. Payment will be posted as advance.
              </div>
            ) : (
              <div className="mt-1 space-y-1">
                <select
                  value={invoiceId}
                  onChange={(e) => {
                    setInvoiceId(e.target.value);
                    const inv = invoices.find((i) => i.id === e.target.value);
                    if (inv) setAmount(String((inv.total_amount || 0) - (inv.paid_amount || 0)));
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">-- No specific invoice (advance) --</option>
                  {customerInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_no} — Balance: Rs. {((inv.total_amount || 0) - (inv.paid_amount || 0)).toLocaleString()}
                    </option>
                  ))}
                </select>
                {invoiceId && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-emerald-400">
                    <span className="font-semibold">Outstanding balance:</span> Rs. {invoiceBalance.toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-400">Payment method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Online / POS">Online / POS</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400">Deposit account *</label>
            <select value={depositAccount} onChange={(e) => setDepositAccount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
              <option value="">Select account</option>
              {bankAccounts.map((ba) => (
                <option key={ba.id} value={ba.account_name}>{ba.account_name} ({ba.bank_name})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400">Amount received (PKR) *</label>
          <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-mono font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400 outline-none" />
        </div>

        {paymentMethod === 'Cheque' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Cheque number</label>
              <input type="text" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Cheque date</label>
              <input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
            </div>
          </div>
        )}

        <div>
          <label className="text-[11px] font-semibold text-slate-400">Reference / Narration</label>
          <textarea rows={2} placeholder="Enter payment reference or notes..." value={notes} onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
        </div>

        {/* Receipt History */}
        {customerReceipts.length > 0 && (
          <div className="border-t pt-4 dark:border-slate-700">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">RECENT RECEIPTS</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {customerReceipts.slice(0, 5).map((r) => {
                const cust = customers.find((c) => c.id === r.customer_id);
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="font-mono font-semibold text-emerald-500">{r.receipt_no}</span>
                      <span className="text-slate-400">{cust?.name}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">Rs. {r.amount?.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3">
          <button type="submit" className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-md">
            <CheckCircle className="h-4 w-4" /> Post Receipt
          </button>
        </div>
      </form>
    </div>
  );
}
