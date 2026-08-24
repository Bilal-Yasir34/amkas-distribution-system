import { useState } from 'react';
import { Plus, Layers, X, Edit, Trash2, Power } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import type { Department } from '@/lib/types';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

export function Departments() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { departments, branches, addDepartment, updateDepartment, deleteDepartment } = useDataStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branch, setBranch] = useState('Head Office');
  const [isActive, setIsActive] = useState(true);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setBranch(branches[0]?.name || 'Head Office');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditingId(d.id);
    setName(d.name);
    setCode(d.code || '');
    setBranch(branches[0]?.name || 'Head Office');
    setIsActive(d.is_active !== false);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error('Department name is required');

    if (editingId) {
      updateDepartment(editingId, {
        name,
        code,
        branch_id: branches[0]?.id || 'b1',
        is_active: isActive,
      });
      toast.success(`Department ${name} updated`);
    } else {
      addDepartment({
        branch_id: branches[0]?.id || 'b1',
        name,
        code: code || `DEP-0${departments.length + 1}`,
        is_active: isActive,
      });
      toast.success(`Department ${name} created`);
    }
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteDepartment(deleteTarget.id);
      toast.success(`Department ${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    }
  };

  const toggleStatus = (d: Department) => {
    const next = !d.is_active;
    updateDepartment(d.id, { is_active: next });
    toast.success(`${d.name} is now ${next ? 'Active' : 'Inactive'}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Departments</h1>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WORKFORCE STRUCTURE</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Department directory</h2>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 btn-primary"
          >
            <Plus className="h-4 w-4" /> Add department
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No departments configured.
                  </td>
                </tr>
              ) : (
                departments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{d.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{d.code}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Head Office</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          d.is_active ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {d.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStatus(d)}
                          className={`flex items-center gap-1 text-xs font-bold transition px-2 py-1 rounded-lg border ${
                            d.is_active
                              ? 'border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'border-amber-500/30 bg-amber-500/10/50 text-amber-500 hover:bg-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {d.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEdit(d)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: d.id, name: d.name })}
                          className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">WORKFORCE STRUCTURE</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingId ? 'Edit department' : 'New department'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Department name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Department code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="input text-xs mt-1"
                >
                  <option value="Head Office">Head Office</option>
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Active Department</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary text-xs px-5"
              >
                {editingId ? 'Update department' : 'Save department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.name}
        itemType="department"
      />
    </div>
  );
}
