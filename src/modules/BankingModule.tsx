import { useState } from 'react';
import { Landmark, Plus, Upload, CheckCircle, FileText, Printer, X, Trash2, Edit } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { CashFlowPrint } from '@/components/CashFlowPrint';
import type { BankAccount } from '@/lib/types';

export function BankingModule() {
  const toast = useToast();
  const { bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<
    'Overview' | 'Bank Accounts' | 'Statement Imports' | 'Reconciliation' | 'Cash Flow'
  >('Bank Accounts');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cashFlowPrintOpen, setCashFlowPrintOpen] = useState(false);

  // Form State
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [accountType, setAccountType] = useState<'Bank' | 'Cash' | 'Wallet'>('Bank');
  const [openingBalance, setOpeningBalance] = useState('0');

  const openCreate = () => {
    setEditingId(null);
    setAccountName('');
    setBankName('Meezan Bank');
    setAccountNumber('');
    setIban('');
    setCurrency('PKR');
    setAccountType('Bank');
    setOpeningBalance('0');
    setModalOpen(true);
  };

  const openEdit = (ba: BankAccount) => {
    setEditingId(ba.id);
    setAccountName(ba.account_name);
    setBankName(ba.bank_name);
    setAccountNumber(ba.account_number);
    setIban(ba.iban || '');
    setCurrency(ba.currency);
    setAccountType(ba.account_type);
    setOpeningBalance(String(ba.opening_balance));
    setModalOpen(true);
  };

  const handleSaveAccount = () => {
    if (!accountName.trim()) return toast.error('Account name is required');

    const bal = Number(openingBalance) || 0;

    if (editingId) {
      updateBankAccount(editingId, {
        account_name: accountName,
        bank_name: bankName,
        account_number: accountNumber,
        iban: iban || null,
        currency,
        account_type: accountType,
        opening_balance: bal,
      });
      toast.success(`Bank Account ${accountName} updated`);
    } else {
      addBankAccount({
        account_name: accountName,
        bank_name: bankName,
        account_number: accountNumber || '00000000',
        iban: iban || null,
        currency,
        account_type: accountType,
        opening_balance: bal,
        current_balance: bal,
        status: 'Active',
      });
      toast.success(`Bank Account ${accountName} added`);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete account ${name}?`)) {
      deleteBankAccount(id);
      toast.success(`Bank account ${name} deleted`);
    }
  };

  const totalBankBalance = bankAccounts.reduce((acc, ba) => acc + (ba.current_balance || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Banking & Cash Management</h1>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {['Overview', 'Bank Accounts', 'Statement Imports', 'Reconciliation', 'Cash Flow'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab as any)}
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

      {/* BANK ACCOUNTS */}
      {activeSubTab === 'Bank Accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TREASURY</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Bank & Cash Accounts</h2>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Add bank account
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {bankAccounts.map((ba) => (
              <div
                key={ba.id}
                className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                      {ba.account_type}
                    </span>
                    <h3 className="mt-1 font-bold text-slate-800 dark:text-slate-100">{ba.account_name}</h3>
                    <p className="text-xs text-slate-400">{ba.bank_name}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(ba)} className="p-1 text-slate-400 hover:text-white">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(ba.id, ba.account_name)} className="p-1 text-slate-400 hover:text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] uppercase text-slate-400">Account No</p>
                    <p className="font-mono text-xs text-slate-300">{ba.account_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-slate-400">Balance</p>
                    <p className="font-mono text-base font-bold text-emerald-500">
                      Rs. {(ba.current_balance || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CASH FLOW */}
      {activeSubTab === 'Cash Flow' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
          <Landmark className="mx-auto h-12 w-12 text-emerald-500" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Cash Flow Statement</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            View net operating, investing, and financing cash flows for the organization across all active liquidity accounts.
          </p>
          <button
            onClick={() => setCashFlowPrintOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 mx-auto"
          >
            <Printer className="h-4 w-4" /> Print cash flow statement
          </button>
        </div>
      )}

      {/* OTHER SUBTABS */}
      {activeSubTab !== 'Bank Accounts' && activeSubTab !== 'Cash Flow' && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-sm text-slate-400">Register view active for {activeSubTab}.</p>
        </div>
      )}

      {/* FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Bank Account' : 'New Bank Account'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Account display name</label>
                <input
                  type="text"
                  placeholder="e.g. Meezan Islamic Main"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Bank name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Account type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="Bank">Bank</option>
                    <option value="Cash">Cash</option>
                    <option value="Wallet">Wallet</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Account number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Opening balance</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">IBAN</label>
                <input
                  type="text"
                  placeholder="e.g. PK36MEZN..."
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAccount}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                {editingId ? 'Update Account' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Print */}
      {cashFlowPrintOpen && (
        <CashFlowPrint onClose={() => setCashFlowPrintOpen(false)} />
      )}
    </div>
  );
}
