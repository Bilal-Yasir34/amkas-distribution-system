import { useState } from 'react';
import { Plus, Tags, X, Edit, Trash2, Power } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import type { Category } from '@/lib/types';

export function Categories() {
  const toast = useToast();
  const { categories, addCategory, updateCategory, deleteCategory } = useDataStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setDescription('');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setCode(cat.code || '');
    setDescription(cat.description || '');
    setIsActive(cat.is_active);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error('Category name is required');

    if (editingId) {
      updateCategory(editingId, {
        name,
        code,
        description,
        is_active: isActive,
      });
      toast.success(`Category ${name} updated`);
    } else {
      addCategory({
        name,
        code: code || String(categories.length + 1).padStart(3, '0'),
        description,
        is_active: isActive,
        created_at: new Date().toISOString().slice(0, 10),
      });
      toast.success(`Category ${name} added`);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, catName: string) => {
    if (confirm(`Are you sure you want to delete ${catName}?`)) {
      deleteCategory(id);
      toast.success(`Category ${catName} deleted`);
    }
  };

  const toggleStatus = (cat: Category) => {
    updateCategory(cat.id, { is_active: !cat.is_active });
    toast.success(`${cat.name} is now ${!cat.is_active ? 'Active' : 'Inactive'}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Product Categories</h1>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PRODUCT CATALOG</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Category management</h2>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Add category
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No categories created yet.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {cat.name}
                      {cat.description && (
                        <span className="block text-[10px] text-slate-400">{cat.description}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{cat.code || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          cat.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {cat.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStatus(cat)}
                          className={`flex items-center gap-1 text-xs font-bold transition px-2 py-1 rounded-lg border ${
                            cat.is_active
                              ? 'border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'border-emerald-200 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {cat.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEdit(cat)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PRODUCT CATALOG</p>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit category' : 'New category'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Category name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Category code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 001"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Active Category</span>
              </label>
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
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                {editingId ? 'Update category' : 'Save category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
