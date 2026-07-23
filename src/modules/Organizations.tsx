import { useState } from 'react';
import { Plus, Building2, X, Edit, Trash2, Power } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import type { Organization } from '@/lib/types';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

export function Organizations() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { organizations, branches = [], users = [], addOrg, updateOrg, deleteOrg } = useDataStore();

  const totalBranchesCount = (branches || []).filter((b) => b.is_active !== false).length;
  const totalUsersCount = (users || []).length || 1;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [code, setCode] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [taxId, setTaxId] = useState('');
  const [firstBranch, setFirstBranch] = useState('Head Office');
  const [status, setStatus] = useState('Active');

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setLegalName('');
    setCode('');
    setCurrency('PKR');
    setTaxId('');
    setFirstBranch('Head Office');
    setStatus('Active');
    setModalOpen(true);
  };

  const openEdit = (o: Organization) => {
    setEditingId(o.id);
    setName(o.name);
    setLegalName(o.legal_name || '');
    setCode(o.org_code || 'ORG01');
    setCurrency(o.currency || 'PKR');
    setTaxId(o.tax_id || '');
    setFirstBranch('Head Office');
    setStatus(o.status || 'Active');
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error('Organization name is required');

    if (editingId) {
      updateOrg(editingId, {
        name,
        legal_name: legalName,
        org_code: code,
        currency,
        tax_id: taxId,
        status,
      });
      toast.success(`Organization ${name} updated`);
    } else {
      addOrg({
        name,
        legal_name: legalName,
        org_code: code || `ORG0${organizations.length + 1}`,
        currency,
        address: 'Lahore, Pakistan',
        phone: '+92 42 111 222 333',
        email: 'info@org.pk',
        tax_id: taxId,
        branches_count: 1,
        users_count: 1,
        status,
      });
      toast.success(`Organization ${name} created`);
    }
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteOrg(deleteTarget.id);
      toast.success(`Organization ${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    }
  };

  const toggleStatus = (o: Organization) => {
    const next = o.status === 'Active' ? 'Inactive' : 'Active';
    updateOrg(o.id, { status: next });
    toast.success(`${o.name} is now ${next}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Organizations</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ORGANIZATIONS</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-heading">{organizations.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTIVE WORKSPACES</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-500 font-heading">
            {organizations.filter((o) => o.status === 'Active').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL BRANCHES</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-heading">{totalBranchesCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ASSIGNED USERS</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-heading">{totalUsersCount}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">COMPANY PORTFOLIO</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Organization directory</h2>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 btn-primary"
          >
            <Plus className="h-4 w-4" /> Add organization
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Branches</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {organizations.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{o.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{o.org_code || 'ORG01'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{o.currency}</td>
                  <td className="px-4 py-3 text-slate-500">{totalBranchesCount}</td>
                  <td className="px-4 py-3 text-slate-500">{totalUsersCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        o.status === 'Active' ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {o.status === 'Active' ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStatus(o)}
                          className={`flex items-center gap-1 text-xs font-bold transition px-2 py-1 rounded-lg border ${
                            o.status === 'Active'
                              ? 'border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'border-amber-500/30 bg-amber-500/10/50 text-amber-500 hover:bg-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {o.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEdit(o)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: o.id, name: o.name })}
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
              ))}
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">COMPANY PORTFOLIO</p>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit organization' : 'New organization'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Organization name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Legal name</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Organization code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Base currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Tax / registration number</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">First branch</label>
                <input
                  type="text"
                  value={firstBranch}
                  onChange={(e) => setFirstBranch(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={status === 'Active'}
                  onChange={(e) => setStatus(e.target.checked ? 'Active' : 'Inactive')}
                  className="h-4 w-4 rounded accent-amber-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Active Organization</span>
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
                className="btn-primary"
              >
                {editingId ? 'Update organization' : 'Save organization'}
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
        itemType="organization"
      />
    </div>
  );
}
