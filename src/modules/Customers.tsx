import { useState } from 'react';
import { Plus, Users, Search, X, Edit, Trash2, Power, Download } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { downloadCSV } from '@/lib/utils';
import type { Customer } from '@/lib/types';

export function Customers() {
  const toast = useToast();
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useDataStore();

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
  const [creditLimit, setCreditLimit] = useState('0');
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
    setCreditLimit('0');
    setOpeningBalance('0');
    setAddress('');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setCity(c.city || '');
    setTaxId(c.tax_id || '');
    setSalesperson(c.salesperson || 'admin');
    setCreditLimit(String(c.credit_limit || 0));
    setOpeningBalance(String(c.opening_balance || 0));
    setAddress(c.address || '');
    setIsActive(c.is_active);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      return toast.error('Customer name is required');
    }

    if (editingId) {
      updateCustomer(editingId, {
        name,
        phone,
        email,
        city,
        tax_id: taxId,
        salesperson,
        credit_limit: Number(creditLimit) || 0,
        opening_balance: Number(openingBalance) || 0,
        address,
        is_active: isActive,
      });
      toast.success(`Customer ${name} updated`);
    } else {
      const code = `CUS-${String(customers.length + 1).padStart(5, '0')}`;
      addCustomer({
        code,
        name,
        contact_person: name,
        phone,
        email,
        city,
        tax_id: taxId,
        salesperson,
        credit_limit: Number(creditLimit) || 0,
        opening_balance: Number(openingBalance) || 0,
        address,
        is_active: isActive,
      });
      toast.success(`Customer ${name} added`);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, customerName: string) => {
    if (confirm(`Are you sure you want to delete ${customerName}?`)) {
      deleteCustomer(id);
      toast.success(`Customer ${customerName} deleted`);
    }
  };

  const toggleStatus = (c: Customer) => {
    updateCustomer(c.id, { is_active: !c.is_active });
    toast.success(`${c.name} is now ${!c.is_active ? 'Active' : 'Inactive'}`);
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    downloadCSV('customers_directory', customers);
    toast.success('Customer directory exported to CSV');
  };

  const activeCount = customers.filter((c) => c.is_active).length;
  const uniqueCities = new Set(customers.map((c) => c.city).filter(Boolean)).size;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Customers</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL CUSTOMERS</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{customers.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">Visible in current access scope</p>
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACCOUNTS RECEIVABLE</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Customer directory</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
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
              <Plus className="h-4 w-4" /> Add customer
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Salesperson</th>
                <th className="px-4 py-3">Credit Limit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No customers found matching "{search}".
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {c.name}
                      <span className="block text-[10px] text-slate-400">
                        {c.email || 'No email'} • Organization-wide
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{c.code}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.city || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.salesperson || 'admin'}</td>
                    <td className="px-4 py-3 font-mono">Rs. {c.credit_limit?.toLocaleString() || '0.00'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(c)}
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                          c.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
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
                  {editingId ? 'Edit customer' : 'New customer'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Customer name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Customer code</label>
                  <input
                    type="text"
                    disabled
                    value={editingId ? customers.find((c) => c.id === editingId)?.code : 'Auto-generated'}
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
                    placeholder="e.g. Lahore"
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Credit limit</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
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
                {editingId ? 'Update customer' : 'Save customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
