import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';

export function ChartOfAccounts() {
  const toast = useToast();
  const { chartOfAccounts, addCOAccount } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<'All accounts' | 'Balance sheet' | 'Profit & loss'>('All accounts');
  const [modalOpen, setModalOpen] = useState(false);

  // Form state for creating new accounts
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'>('Asset');
  const [parentId, setParentId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');

  const openCreate = () => {
    setCode('');
    setName('');
    setAccountType('Asset');
    setParentId('');
    setOpeningBalance('0');
    setModalOpen(true);
  };

  const handleSaveAccount = () => {
    if (!code.trim() || !name.trim()) {
      return toast.error('Code and account name are required');
    }

    addCOAccount({
      code,
      name,
      account_type: accountType,
      parent_id: parentId || null,
      is_active: true,
      current_balance: Number(openingBalance) || 0,
    });
    toast.success(`Account ${code} - ${name} added to Chart of Accounts`);
    setModalOpen(false);
  };

  // Filter accounts according to selected tab
  const filteredAccounts = chartOfAccounts.filter((coa) => {
    if (activeSubTab === 'Balance sheet') {
      return coa.account_type === 'Asset' || coa.account_type === 'Liability' || coa.account_type === 'Equity';
    }
    if (activeSubTab === 'Profit & loss') {
      return coa.account_type === 'Revenue' || coa.account_type === 'Expense' || coa.account_type === 'Income';
    }
    return true; // 'All accounts'
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">AMKAS INTERNATIONAL</p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Chart of Accounts</h1>
      </div>

      {/* Sub Tabs Pill Bar */}
      <div className="rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/90 flex items-center gap-1 overflow-x-auto">
        {['All accounts', 'Balance sheet', 'Profit & loss'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab as any)}
            className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition rounded-xl ${
              activeSubTab === tab
                ? 'bg-white text-emerald-600 font-bold shadow-sm dark:bg-slate-700 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">FINANCIAL STRUCTURE</p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {activeSubTab} ({filteredAccounts.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-[#00a884] px-4 py-2 text-xs font-bold text-white hover:bg-[#008f70] transition shadow-md"
          >
            <Plus className="h-4 w-4" /> Add account
          </button>
        </div>

        {/* Read-Only Account Hierarchy Table (Non-editable / Non-deletable) */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">CODE</th>
                <th className="px-4 py-3.5">ACCOUNT NAME</th>
                <th className="px-4 py-3.5">TYPE</th>
                <th className="px-4 py-3.5 text-right">CURRENT BALANCE</th>
                <th className="px-4 py-3.5 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No accounts found for {activeSubTab}.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((coa) => (
                  <tr key={coa.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{coa.code}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100">{coa.name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${
                        coa.account_type === 'Asset' ? 'bg-blue-500/10 text-blue-500' :
                        coa.account_type === 'Liability' ? 'bg-amber-500/10 text-amber-500' :
                        coa.account_type === 'Equity' ? 'bg-purple-500/10 text-purple-500' :
                        coa.account_type === 'Revenue' || coa.account_type === 'Income' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-rose-500/10 text-rose-500'
                      }`}>
                        {coa.account_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      Rs. {(coa.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW ACCOUNT FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                New Account
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account code</label>
                  <input
                    type="text"
                    placeholder="e.g. 1120"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account name</label>
                <input
                  type="text"
                  placeholder="e.g. Petty Cash"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Parent account (Optional)</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">None (Top level head)</option>
                  {chartOfAccounts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Opening balance</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs text-slate-400">
                Cancel
              </button>
              <button onClick={handleSaveAccount} className="rounded-xl bg-[#00a884] px-4 py-2 text-xs font-bold text-white hover:bg-[#008f70]">
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
