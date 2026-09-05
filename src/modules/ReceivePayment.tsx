import { useState, useMemo } from 'react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO } from '@/lib/utils';
import { DateInput } from '@/components/DateInput';

export function ReceivePayment() {
  const toast = useToast();
  const {
    customers = [],
    vendors = [],
    users = [],
    accountTypes = [],
    bankAccounts = [],
    invoices = [],
    customerReceipts = [],
    addCustomerReceipt,
    addApprovalQueueItem,
  } = useDataStore();

  const [selectedAccountType, setSelectedAccountType] = useState(
    (accountTypes || []).filter((at) => at.is_active)[0]?.name || 'Customer'
  );
  const [receivedFrom, setReceivedFrom] = useState('');
  const [receiptDate, setReceiptDate] = useState(todayISO());
  const [depositTo, setDepositTo] = useState('Cash in Hand');
  const [amount, setAmount] = useState<number | ''>('');
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');

  const allParties = useMemo(() => {
    const list = [
      ...customers.map((c) => ({ ...c, _origin: 'customer' as const, account_type: c.account_type || 'Customer', party_code: c.code })),
      ...vendors.map((v) => ({ ...v, _origin: 'vendor' as const, account_type: v.account_type || 'Vendor', party_code: v.code })),
      ...users.map((u) => ({ ...u, name: u.full_name, _origin: 'user' as const, account_type: (u as any).account_type || u.role || 'Staff', party_code: u.employee_code })),
    ];
    return list.filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);
  }, [customers, vendors, users]);

  const filteredParties = useMemo(() => {
    if (!selectedAccountType) return [];
    return allParties.filter(
      (p) => p.account_type?.toLowerCase() === selectedAccountType.toLowerCase()
    );
  }, [allParties, selectedAccountType]);

  // Auto-generate reference number starting from CR-01
  const autoRefNo = useMemo(() => {
    const existingNums = (customerReceipts || []).map((r) => {
      const match = (r.reference_no || r.receipt_no || '').match(/CR-(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    });
    const max = existingNums.length > 0 ? Math.max(0, ...existingNums) : 0;
    return `CR-${String(max + 1).padStart(2, '0')}`;
  }, [customerReceipts]);

  const handlePostReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedFrom) return toast.error(`Please select a ${selectedAccountType || 'user'}`);
    if (!amount || Number(amount) <= 0) return toast.error('Please enter a valid receipt amount');

    const amtNum = Number(amount);
    const selectedParty = allParties.find((p) => p.id === receivedFrom);
    const customerId = selectedParty?._origin === 'customer' ? selectedParty.id : '';

    const depositAcc = bankAccounts.find(
      (b) => b.account_name === depositTo || b.id === depositTo
    );
    const depositAccId = depositAcc?.id || bankAccounts[0]?.id || 'ba1';
    const receiptId = crypto.randomUUID();
    const finalRefNo = refNo.trim() || autoRefNo;

    addCustomerReceipt({
      id: receiptId,
      receipt_no: finalRefNo,
      customer_id: customerId || selectedParty?.id || customers[0]?.id || 'c1',
      sales_invoice_id: null,
      receipt_date: receiptDate,
      payment_method: depositTo.includes('Cash') ? 'Cash' : 'Bank Transfer',
      deposit_account_id: depositAccId,
      deposit_to: depositTo,
      amount: amtNum,
      reference_no: finalRefNo,
      notes: notes || null,
      currency: 'PKR',
      status: 'PENDING',
      created_by: 'Cashier / User',
      created_at: new Date().toISOString(),
    });

    addApprovalQueueItem({
      entity_type: 'customer_receipt',
      module: 'Receive Payment',
      record_id: receiptId,
      record_no: finalRefNo,
      party_name: selectedParty?.name || 'Customer',
      amount: amtNum,
      warehouse_id: null,
      requested_by: 'Cashier / User',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      items_summary: `Payment receipt of Rs. ${amtNum.toLocaleString()} for ${selectedParty?.name || 'Party'} (Deposit to: ${depositTo})`,
    });

    toast.success(`Receipt ${finalRefNo} submitted to Approval Center for review!`);

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
              Select an account type to view and select relevant accounts.
            </p>
          </div>

          {/* Row 1: Account Type, Received from & Date */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account Type</label>
              <select
                value={selectedAccountType}
                onChange={(e) => {
                  setSelectedAccountType(e.target.value);
                  setReceivedFrom('');
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
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Received from</label>
              <select
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
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
              value={receiptDate}
              onChange={(val) => setReceiptDate(val)}
            />
          </div>

          {/* Row 2: Deposit to, Amount & Reference Number */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Deposit to</label>
              <select
                value={depositTo || bankAccounts[0]?.account_name || ''}
                onChange={(e) => setDepositTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.account_name}>
                    {b.account_name} ({b.bank_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Amount</label>
              <input
                type="number"
                placeholder="0.00"
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
            <div className="rounded-xl bg-amber-500/10 p-4 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs leading-relaxed border border-amber-500/20 dark:border-amber-500/20">
              Customer receipts auto-allocate to outstanding invoices. Supplier/account receipts post directly through the journal with CR numbering.
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
