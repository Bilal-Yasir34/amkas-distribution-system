import { useState } from 'react';
import { Plus, BookOpen, ChevronRight, ChevronDown, Check, X, Edit, Trash2 } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import type { ChartOfAccount } from '@/lib/types';

export function ChartOfAccounts() {
  const toast = useToast();
  const { chartOfAccounts, addCOAccount, updateCOAccount, deleteCOAccount } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<'All accounts' | 'Balance sheet' | 'Profit & loss'>('All accounts');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'>('Asset');
  const [parentId, setParentId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');

  const openCreate = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setAccountType('Asset');
    setParentId('');
    setOpeningBalance('0');
    setModalOpen(true);
  };

  const openEdit = (coa: ChartOfAccount) => {
    setEditingId(coa.id);
    setCode(coa.code);
    setName(coa.name);
    setAccountType(coa.account_type);
    setParentId(coa.parent_id || '');
    setOpeningBalance(String(coa.current_balance || 0));
    setModalOpen(true);
  };

  const handleSaveAccount = () => {
    if (!code.trim() || !name.trim()) {
      return toast.error('Code and account name are required');
    }

    if (editingId) {
      updateCOAccount(editingId, {
        code,
        name,
        account_type: accountType,
        parent_id: parentId || null,
        current_balance: Number(openingBalance) || 0,
      });
      toast.success(`Account ${name} updated`);
    } else {
      addCOAccount({
        code,
        name,
        account_type: accountType,
        parent_id: parentId || null,
        is_active: true,
        current_balance: Number(openingBalance) || 0,
      });
      toast.success(`Account ${code} - ${name} added to Chart of Accounts`);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete account ${name}?`)) {
      deleteCOAccount(id);
      toast.success(`Account ${name} deleted`);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Chart of Accounts</h1>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {['All accounts', 'Balance sheet', 'Profit & loss'].map((tab) => (
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

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FINANCIAL STRUCTURE</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Account hierarchy</h2>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Add account
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {chartOfAccounts.map((coa) => (
                <tr key={coa.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono font-semibold text-emerald-500">{coa.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{coa.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
                      {coa.account_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-200">
                    Rs. {(coa.current_balance || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(coa)} className="text-xs text-slate-400 hover:text-white">
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(coa.id, coa.name)} className="text-xs text-rose-500 hover:text-rose-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Account' : 'New Account'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Account code</label>
                  <input
                    type="text"
                    placeholder="e.g. 1120"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Account type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
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
                <label className="text-[11px] font-semibold text-slate-400">Account name</label>
                <input
                  type="text"
                  placeholder="e.g. Petty Cash"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Parent account (Optional)</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
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
                <label className="text-[11px] font-semibold text-slate-400">Opening balance</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-400">
                Cancel
              </button>
              <button onClick={handleSaveAccount} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
