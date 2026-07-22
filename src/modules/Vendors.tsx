import { useState } from 'react';
import { Plus, Truck, Search, X, Edit, Trash2, Power, Download } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { downloadCSV } from '@/lib/utils';
import type { Vendor } from '@/lib/types';

export function Vendors() {
  const toast = useToast();
  const { vendors, addVendor, updateVendor, deleteVendor } = useDataStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [taxId, setTaxId] = useState('');
  const [salesperson, setSalesperson] = useState('admin');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setCity('');
    setTaxId('');
    setSalesperson('admin');
    setOpeningBalance('0');
    setAddress('');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (v: Vendor) => {
    setEditingId(v.id);
    setName(v.name);
    setPhone(v.phone || '');
    setEmail(v.email || '');
    setCity(v.city || '');
    setTaxId(v.tax_id || '');
    setSalesperson(v.salesperson || 'admin');
    setOpeningBalance(String(v.opening_balance || 0));
    setAddress(v.address || '');
    setIsActive(v.is_active);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      return toast.error('Vendor name is required');
    }

    if (editingId) {
      updateVendor(editingId, {
        name,
        phone,
        email,
        city,
        tax_id: taxId,
        salesperson,
        opening_balance: Number(openingBalance) || 0,
        address,
        is_active: isActive,
      });
      toast.success(`Vendor ${name} updated`);
    } else {
      const code = `VEN-${String(vendors.length + 1).padStart(5, '0')}`;
      addVendor({
        code,
        name,
        contact_person: name,
        phone,
        email,
        city,
        tax_id: taxId,
        salesperson,
        credit_limit: 0,
        opening_balance: Number(openingBalance) || 0,
        address,
        is_active: isActive,
      });
      toast.success(`Vendor ${name} added`);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, vendorName: string) => {
    if (confirm(`Are you sure you want to delete ${vendorName}?`)) {
      deleteVendor(id);
      toast.success(`Vendor ${vendorName} deleted`);
    }
  };

  const toggleStatus = (v: Vendor) => {
    updateVendor(v.id, { is_active: !v.is_active });
    toast.success(`${v.name} is now ${!v.is_active ? 'Active' : 'Inactive'}`);
  };

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.code.toLowerCase().includes(search.toLowerCase()) ||
      (v.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    downloadCSV('vendors_directory', vendors);
    toast.success('Vendor directory exported to CSV');
  };

  const activeCount = vendors.filter((v) => v.is_active).length;
  const uniqueCities = new Set(vendors.map((v) => v.city).filter(Boolean)).size;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Vendors</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL VENDORS</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{vendors.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">Visible in your current access scope</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTIVE</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-500">{activeCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Available for transactions</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CITIES</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{uniqueCities || 1}</p>
          <p className="mt-1 text-[11px] text-slate-400">Geographic coverage</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALESPEOPLE</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">1</p>
          <p className="mt-1 text-[11px] text-slate-400">Attributed directory records</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACCOUNTS PAYABLE</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Vendor directory</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none w-48"
              />
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Add vendor
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Salesperson</th>
                <th className="px-4 py-3">Opening Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No vendors found matching "{search}".
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {v.name}
                      <span className="block text-[10px] text-slate-400">
                        {v.email || 'No email'} • Organization-wide
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{v.code}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.city || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.salesperson || 'admin'}</td>
                    <td className="px-4 py-3 font-mono">Rs. {v.opening_balance?.toLocaleString() || '0.00'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          v.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {v.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStatus(v)}
                          className={`flex items-center gap-1 text-xs font-bold transition px-2 py-1 rounded-lg border ${
                            v.is_active
                              ? 'border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'border-emerald-200 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {v.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEdit(v)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(v.id, v.name)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SHARED DIRECTORY</p>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit vendor' : 'New vendor'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Vendor name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Vendor code</label>
                  <input
                    type="text"
                    disabled
                    value={editingId ? vendors.find((v) => v.id === editingId)?.code : 'Auto-generated'}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 p-2 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/50"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Multan"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Tax number</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Salesperson</label>
                <select
                  value={salesperson}
                  onChange={(e) => setSalesperson(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="Unassigned">Unassigned</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Opening balance</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
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

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Status</span>
                <select
                  value={isActive ? 'Active' : 'Inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'Active')}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                {editingId ? 'Update vendor' : 'Save vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
