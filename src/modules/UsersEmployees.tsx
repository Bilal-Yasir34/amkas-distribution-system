import { useState } from 'react';
import { Plus, Users, X, Edit, Trash2 } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { ROLES } from '@/lib/rbac';
import type { UserEmployee } from '@/lib/types';

export function UsersEmployees() {
  const toast = useToast();
  const { users, addUser, updateUser, deleteUser, branches, departments } = useDataStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');

  const [baseSalary, setBaseSalary] = useState('0');
  const [allowances, setAllowances] = useState('0');
  const [others, setOthers] = useState('0');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [require2FA, setRequire2FA] = useState(false);

  const [selectedRole, setSelectedRole] = useState('Super Admin');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [departmentScope, setDepartmentScope] = useState('All departments');
  const [isActive, setIsActive] = useState(true);

  const calculatedSalary = (Number(baseSalary) || 0) + (Number(allowances) || 0) + (Number(others) || 0);

  const openCreate = () => {
    setEditingId(null);
    setEmployeeCode(`EMP-00${users.length + 1}`);
    setFullName('');
    setEmail('');
    setPhone('');
    setDesignation('');
    setBaseSalary('0');
    setAllowances('0');
    setOthers('0');
    setUsername('');
    setPassword('');
    setRequire2FA(false);
    setSelectedRole('Super Admin');
    setSelectedBranchId(branches[0]?.id || '');
    setDepartmentScope('All departments');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (u: UserEmployee) => {
    setEditingId(u.id);
    setEmployeeCode(u.employee_code || 'EMP-001');
    setFullName(u.full_name);
    setEmail(u.email);
    setPhone(u.phone || '');
    setDesignation(u.designation || '');
    setBaseSalary(String(u.base_salary || 0));
    setAllowances(String(u.allowances || 0));
    setOthers(String(u.others || 0));
    setUsername(u.email.split('@')[0]);
    setPassword('');
    setRequire2FA(u.is_2fa_required);
    setSelectedRole(u.role);
    setSelectedBranchId(u.branch_id || branches[0]?.id || '');
    setDepartmentScope('All departments');
    setIsActive(u.is_active);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!fullName.trim() || !email.trim()) {
      return toast.error('Full name and email are required');
    }

    if (editingId) {
      updateUser(editingId, {
        full_name: fullName,
        email,
        phone,
        employee_code: employeeCode,
        designation,
        role: selectedRole,
        branch_id: selectedBranchId || null,
        base_salary: Number(baseSalary) || 0,
        allowances: Number(allowances) || 0,
        others: Number(others) || 0,
        is_2fa_required: require2FA,
        is_active: isActive,
      });
      toast.success(`User ${fullName} updated`);
    } else {
      addUser({
        full_name: fullName,
        email,
        phone,
        employee_code: employeeCode || `EMP-00${users.length + 1}`,
        designation,
        role: selectedRole,
        branch_id: selectedBranchId || null,
        department_id: 'd1',
        base_salary: Number(baseSalary) || 0,
        allowances: Number(allowances) || 0,
        others: Number(others) || 0,
        is_2fa_required: require2FA,
        is_active: isActive,
        created_at: new Date().toISOString(),
        last_login: 'Never',
      });
      toast.success(`User ${fullName} added`);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, uName: string) => {
    if (confirm(`Are you sure you want to delete user ${uName}?`)) {
      deleteUser(id);
      toast.success(`User ${uName} deleted`);
    }
  };

  const toggleStatus = (u: UserEmployee) => {
    const next = !u.is_active;
    updateUser(u.id, { is_active: next });
    toast.success(`${u.full_name} is now ${next ? 'Active' : 'Inactive'}`);
  };

  const totalPayroll = users.reduce(
    (acc, u) => acc + (u.base_salary || 0) + (u.allowances || 0) + (u.others || 0),
    0
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Users & Employees</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL USERS</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{users.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTIVE</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-500">
            {users.filter((u) => u.is_active).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2FA POLICY</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            {users.filter((u) => u.is_2fa_required).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MONTHLY PAYROLL</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-500">
            Rs. {totalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IDENTITY, PAYROLL & ACCESS</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">People directory</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Print employee list
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Add user
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Access Scope</th>
                <th className="px-4 py-3">Monthly Salary</th>
                <th className="px-4 py-3">Security</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const totalMonthly = (u.base_salary || 0) + (u.allowances || 0) + (u.others || 0);
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {u.full_name}
                      <span className="block text-[10px] text-slate-400">{u.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Head Office • All departments</td>
                    <td className="px-4 py-3 font-mono font-semibold">Rs. {totalMonthly.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {u.is_2fa_required ? '2FA Enabled' : 'Password only'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.last_login || 'Never'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(u)}
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.full_name)}
                          className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IDENTITY, PAYROLL & ACCESS</p>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit user access' : 'Add user'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Employee code</label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Status</label>
                  <select
                    value={isActive ? 'Active' : 'Inactive'}
                    onChange={(e) => setIsActive(e.target.value === 'Active')}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              {/* SALARY STRUCTURE */}
              <div className="rounded-lg bg-slate-900/40 p-3 space-y-2 border border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MONTHLY SALARY STRUCTURE</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] text-slate-400">Base salary</label>
                    <input
                      type="number"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(e.target.value)}
                      className="mt-1 w-full rounded bg-slate-800 p-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Allowances</label>
                    <input
                      type="number"
                      value={allowances}
                      onChange={(e) => setAllowances(e.target.value)}
                      className="mt-1 w-full rounded bg-slate-800 p-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Others</label>
                    <input
                      type="number"
                      value={others}
                      onChange={(e) => setOthers(e.target.value)}
                      className="mt-1 w-full rounded bg-slate-800 p-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 font-mono text-xs">
                  <span className="text-slate-400">CALCULATED MONTHLY SALARY</span>
                  <span className="font-bold text-emerald-400">Rs. {calculatedSalary.toFixed(2)}</span>
                </div>
              </div>

              {/* LOGIN CREDENTIALS */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LOGIN CREDENTIALS</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={require2FA}
                    onChange={(e) => setRequire2FA(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    Require two-factor authentication when the 2FA service is activated
                  </span>
                </label>
              </div>

              {/* ACCESS SCOPE */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACCESS SCOPE</p>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Role template</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.label}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Branch</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="">All Branches</option>
                    {branches.filter((b) => b.is_active !== false).map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
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
                {editingId ? 'Update user access' : 'Save user access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
