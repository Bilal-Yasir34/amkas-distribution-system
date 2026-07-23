import { useState } from 'react';
import { Plus, Warehouse as WhIcon, X, Edit, Trash2, Power } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import type { Warehouse } from '@/lib/types';

export function Warehouses() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse, branches } = useDataStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [address, setAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setCode(`WH-0${warehouses.length + 1}`);
    setBranchId(branches[0]?.id || '');
    setAddress('');
    setIsDefault(false);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditingId(w.id);
    setName(w.name);
    setCode(w.code);
    setBranchId(w.branch_id || '');
    setAddress(w.address || '');
    setIsDefault(w.is_default || false);
    setIsActive(w.is_active);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error('Warehouse name is required');

    if (editingId) {
      updateWarehouse(editingId, {
        name,
        code,
        branch_id: branchId,
        address,
        is_active: isActive,
        is_default: isDefault,
      });
      toast.success(`Warehouse ${name} updated`);
    } else {
      addWarehouse({
        code: code || `WH-0${warehouses.length + 1}`,
        name,
        branch_id: branchId,
        address,
        is_active: isActive,
        is_default: isDefault,
      });
      toast.success(`Warehouse ${name} added`);
    }
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteWarehouse(deleteTarget.id);
      toast.success(`Warehouse ${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    }
  };

  const toggleStatus = (w: Warehouse) => {
    updateWarehouse(w.id, { is_active: !w.is_active });
    toast.success(`${w.name} is now ${!w.is_active ? 'Active' : 'Inactive'}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Warehouses</h1>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">INVENTORY STRUCTURE</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Warehouse directory</h2>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 btn-primary"
          >
            <Plus className="h-4 w-4" /> Add warehouse
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {warehouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No warehouses configured yet.
                  </td>
                </tr>
              ) : (
                warehouses.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{w.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{w.code}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {branches.find((b) => b.id === w.branch_id)?.name || 'Head Office'}
                    </td>
                    <td className="px-4 py-3">
                      {w.is_default && (
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          w.is_active ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {w.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleStatus(w)}
                            className={`flex items-center gap-1 text-xs font-bold transition px-2 py-1 rounded-lg border ${
                              w.is_active
                                ? 'border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'border-amber-500/30 bg-amber-500/10/50 text-amber-500 hover:bg-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {w.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => openEdit(w)}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: w.id, name: w.name })}
                            className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
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

      {/* FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">INVENTORY STRUCTURE</p>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit warehouse' : 'New warehouse'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Warehouse name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Warehouse code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Branch</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    {branches.filter((b) => b.is_active !== false).map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                    {branches.length === 0 && <option value="">No branches configured</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Use as default stock location</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Active Warehouse</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
              >
                {editingId ? 'Update warehouse' : 'Save warehouse'}
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
        itemType="warehouse"
      />
    </div>
  );
}
