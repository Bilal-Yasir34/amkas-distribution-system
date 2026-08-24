import { useState } from 'react';
import { Plus, Search, X, Edit, Trash2, Power, Download, Tags } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { downloadCSV } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import type { AccountTypeItem } from '@/lib/types';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

export function AccountTypeModule() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { accountTypes = [], addAccountType, updateAccountType, deleteAccountType } = useDataStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openCreate = () => {
    setEditingId(null);
    setCode(`AT-00${(accountTypes || []).length + 1}`);
    setName('');
    setDescription('');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (at: AccountTypeItem) => {
    setEditingId(at.id);
    setCode(at.code);
    setName(at.name);
    setDescription(at.description || '');
    setIsActive(at.is_active);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error('Account Type name is required');

    if (editingId) {
      updateAccountType(editingId, {
        code,
        name: name.trim(),
        description: description.trim(),
        is_active: isActive,
      });
      toast.success(`Account Type "${name}" updated successfully!`);
    } else {
      addAccountType({
        code: code || `AT-00${(accountTypes || []).length + 1}`,
        name: name.trim(),
        description: description.trim(),
        is_active: isActive,
        created_at: new Date().toISOString(),
      });
      toast.success(`Account Type "${name}" added successfully!`);
    }
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteAccountType(deleteTarget.id);
      toast.success(`Account Type "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    }
  };

  const toggleStatus = (at: AccountTypeItem) => {
    updateAccountType(at.id, { is_active: !at.is_active });
    toast.success(`"${at.name}" is now ${!at.is_active ? 'Active' : 'Inactive'}`);
  };

  const filtered = (accountTypes || []).filter(
    (at) =>
      at.name.toLowerCase().includes(search.toLowerCase()) ||
      at.code.toLowerCase().includes(search.toLowerCase()) ||
      (at.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    downloadCSV('account_types', (accountTypes || []) as unknown as Record<string, unknown>[]);
    toast.success('Account Types exported to CSV');
  };

  const activeCount = (accountTypes || []).filter((at) => at.is_active).length;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Account Type Management</h1>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL ACCOUNT TYPES</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{(accountTypes || []).length}</p>
          <p className="mt-1 text-[11px] text-slate-400">Configured account categories</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTIVE TYPES</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-500">{activeCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Available across the system</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DYNAMIC SYNC</p>
          <p className="mt-1 text-base font-bold text-emerald-500 flex items-center gap-1.5">
            <Tags className="h-4 w-4" /> Real-time System Sync
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Visible in all party selectors</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search account types..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button onClick={openCreate} className="btn-primary text-xs flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add Account Type
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account Type Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No account types found. Click Add Account Type to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((at) => (
                  <tr key={at.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold font-mono text-amber-500">{at.code}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{at.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{at.description || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(at)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                          at.is_active
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        {at.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(at)}
                            className="p-1 text-slate-400 hover:text-amber-500 transition"
                            title="Edit Account Type"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: at.id, name: at.name })}
                            className="p-1 text-slate-400 hover:text-rose-500 transition"
                            title="Delete Account Type"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">View Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingId ? 'Edit Account Type' : 'Add New Account Type'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input text-xs font-mono mt-1"
                  placeholder="e.g. AT-001"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Account Type Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="e.g. Customer, Supplier, Salesperson, Vendor, Distributor"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="Description of this account type..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Active (Available for account creation and selection across the site)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary text-xs px-5">
                {editingId ? 'Update Type' : 'Save Type'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={true}
          title="Delete Account Type"
          message={`Are you sure you want to delete account type "${deleteTarget.name}"?`}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
