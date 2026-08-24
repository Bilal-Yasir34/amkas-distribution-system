import { useState } from 'react';
import { Plus, Users, Search, X, Edit, Trash2, Power, Download, Percent } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { downloadCSV } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import type { Customer } from '@/lib/types';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

export function AddAccountModule() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { customers = [], vendors = [], accountTypes = [], addCustomer, updateCustomer, deleteCustomer } = useDataStore();

  // Combine customers and vendors into unified accounts list or use customers as primary party store
  const allAccounts = [...customers, ...vendors];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<string>('Customer');
  const [commissionPct, setCommissionPct] = useState<string | number>('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [taxId, setTaxId] = useState('');
  const [salesperson, setSalesperson] = useState('admin');
  const [creditLimit, setCreditLimit] = useState('100000');
  const [creditPeriod, setCreditPeriod] = useState('30');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const activeAccountTypes = (accountTypes || []).filter((at) => at.is_active);

  const openCreate = () => {
    setEditingId(null);
    setCode(`ACC-00${customers.length + 1}`);
    setName('');
    setAccountType(activeAccountTypes[0]?.name || 'Customer');
    setCommissionPct('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('Lahore');
    setTaxId('');
    setCreditLimit('100000');
    setCreditPeriod('30');
    setOpeningBalance('0');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setCode(c.code);
    setName(c.name);
    setAccountType(c.account_type || 'Customer');
    setCommissionPct(c.commission_pct !== undefined && c.commission_pct !== null ? c.commission_pct : '');
    setCompanyName(c.company_name || '');
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setCity(c.city || 'Lahore');
    setTaxId(c.tax_id || '');
    setCreditLimit(String(c.credit_limit || 0));
    setCreditPeriod(String(c.credit_period_days || 30));
    setIsActive(c.is_active);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error('Account name is required');
    if (!accountType) return toast.error('Please select an account type');

    const commVal = commissionPct === '' ? null : Number(commissionPct);

    if (editingId) {
      updateCustomer(editingId, {
        name: name.trim(),
        account_type: accountType,
        commission_pct: commVal,
        company_name: companyName,
        email,
        phone,
        address,
        city,
        tax_id: taxId,
        credit_limit: Number(creditLimit) || 0,
        credit_period_days: Number(creditPeriod) || 30,
        is_active: isActive,
      });
      toast.success(`Account "${name}" updated successfully!`);
    } else {
      addCustomer({
        code: code || `ACC-00${customers.length + 1}`,
        name: name.trim(),
        account_type: accountType,
        commission_pct: commVal,
        company_name: companyName,
        contact_person: name,
        email,
        phone,
        address,
        city,
        tax_id: taxId,
        credit_limit: Number(creditLimit) || 0,
        credit_period_days: Number(creditPeriod) || 30,
        opening_balance: Number(openingBalance) || 0,
        current_balance: Number(openingBalance) || 0,
        is_active: isActive,
      });
      toast.success(`Account "${name}" added successfully!`);
    }
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteCustomer(deleteTarget.id);
      toast.success(`Account "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    }
  };

  const toggleStatus = (c: Customer) => {
    updateCustomer(c.id, { is_active: !c.is_active });
    toast.success(`"${c.name}" is now ${!c.is_active ? 'Active' : 'Inactive'}`);
  };

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.account_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedTypeFilter === 'ALL' || (c.account_type || 'Customer') === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

  const handleExportCSV = () => {
    downloadCSV('accounts_directory', customers as unknown as Record<string, unknown>[]);
    toast.success('Accounts directory exported to CSV');
  };

  const activeCount = customers.filter((c) => c.is_active).length;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Add Account / Accounts Register</h1>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL ACCOUNTS</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{customers.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">Registered system accounts</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTIVE ACCOUNTS</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-500">{activeCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Available for transactions</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FILTERED VIEW</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-500">{filtered.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">Matching current criteria</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search accounts by name, code or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 text-xs"
              />
            </div>

            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
            >
              <option value="ALL">All Account Types</option>
              {activeAccountTypes.map((at) => (
                <option key={at.id} value={at.name}>
                  {at.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button onClick={openCreate} className="btn-primary text-xs flex items-center gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" /> Add Account
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Account Type</th>
                <th className="px-4 py-3">Commission %</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No accounts found. Click Add Account to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold font-mono text-amber-500">{c.code}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">
                      {c.name}
                      {c.company_name && <span className="block text-[11px] font-normal text-slate-400">{c.company_name}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {c.account_type || 'Customer'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-500">
                      {c.commission_pct !== undefined && c.commission_pct !== null && c.commission_pct !== ('' as any)
                        ? `${c.commission_pct}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.city || '—'}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-200">
                      Rs. {(c.current_balance || c.opening_balance || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(c)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                          c.is_active
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        {c.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1 text-slate-400 hover:text-amber-500 transition"
                          title="Edit Account"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                          className="p-1 text-slate-400 hover:text-rose-500 transition"
                          title="Delete Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* CREATE / EDIT ACCOUNT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingId ? 'Edit Account' : 'Add New Account'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input text-xs font-mono mt-1"
                  placeholder="e.g. ACC-00001"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Account Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="Full name of account / party"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Account Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="input text-xs mt-1"
                >
                  <option value="">Select account type</option>
                  {activeAccountTypes.map((at) => (
                    <option key={at.id} value={at.name}>
                      {at.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Commission % (for Salesperson / Parties)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.5"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(e.target.value)}
                    className="input text-xs pr-8 font-mono"
                  />
                  <Percent className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Company / Business Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="Optional company name"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="0300-1234567"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="account@company.com"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="e.g. Lahore"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="Full street address"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">NTN / Tax ID</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="Tax ID / NTN"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Assigned Salesperson</label>
                <select
                  value={salesperson}
                  onChange={(e) => setSalesperson(e.target.value)}
                  className="input text-xs mt-1"
                >
                  <option value="admin">System Admin</option>
                  <option value="sales_manager">Sales Manager</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Credit Limit (Rs.)</label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="input text-xs font-mono mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Credit Period (Days)</label>
                <input
                  type="number"
                  value={creditPeriod}
                  onChange={(e) => setCreditPeriod(e.target.value)}
                  className="input text-xs font-mono mt-1"
                />
              </div>

              {!editingId && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Opening Balance (Rs.)</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="input text-xs font-mono mt-1"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 sm:col-span-2">
                <input
                  type="checkbox"
                  id="accountActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="accountActiveCheck" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Active (Available for invoices, bills, receipts, and payments)
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
                {editingId ? 'Update Account' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={true}
          title="Delete Account"
          message={`Are you sure you want to delete account "${deleteTarget.name}"?`}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
