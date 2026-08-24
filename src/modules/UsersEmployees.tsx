import { useState } from 'react';
import { Plus, Search, Eye, X, Edit, Trash2, ShieldCheck, Mail, Phone, Briefcase, Building, DollarSign } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { ROLES } from '@/lib/rbac';
import { useAuth } from '@/lib/auth';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import type { UserEmployee } from '@/lib/types';

export function UsersEmployees() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { users, addUser, updateUser, deleteUser, branches } = useDataStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<UserEmployee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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

  const [selectedRole, setSelectedRole] = useState('super_admin');
  const [selectedBranchId, setSelectedBranchId] = useState('');
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
    setSelectedRole('super_admin');
    setSelectedBranchId(branches[0]?.id || '');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (u: UserEmployee) => {
    setEditingId(u.id);
    setEmployeeCode(u.employee_code || `EMP-001`);
    setFullName(u.full_name);
    setEmail(u.email);
    setPhone(u.phone || '');
    setDesignation(u.designation || '');
    setBaseSalary(String(u.base_salary || 0));
    setAllowances(String(u.allowances || 0));
    setOthers(String(u.others || 0));
    setUsername(u.username || u.email.split('@')[0]);
    setPassword(u.password || '');
    setSelectedRole(u.role || 'super_admin');
    setSelectedBranchId(u.branch_id || branches[0]?.id || '');
    setIsActive(u.is_active);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!fullName.trim() || !email.trim()) {
      return toast.error('Full name and email are required');
    }

    const cleanUsername = username.trim() || email.split('@')[0];

    if (editingId) {
      updateUser(editingId, {
        full_name: fullName,
        email,
        username: cleanUsername,
        phone,
        employee_code: employeeCode,
        designation,
        role: selectedRole,
        branch_id: selectedBranchId || null,
        base_salary: Number(baseSalary) || 0,
        allowances: Number(allowances) || 0,
        others: Number(others) || 0,
        is_active: isActive,
        ...(password ? { password } : {}),
      });
      toast.success(`User ${fullName} updated`);
    } else {
      addUser({
        full_name: fullName,
        email,
        username: cleanUsername,
        phone,
        employee_code: employeeCode || `EMP-00${users.length + 1}`,
        designation,
        role: selectedRole,
        branch_id: selectedBranchId || null,
        department_id: 'd1',
        base_salary: Number(baseSalary) || 0,
        allowances: Number(allowances) || 0,
        others: Number(others) || 0,
        is_active: isActive,
        created_at: new Date().toISOString(),
        last_login: 'Never',
        password: password || '123456',
      });
      toast.success(`User ${fullName} added successfully`);
    }
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteUser(deleteTarget.id);
      toast.success(`User ${deleteTarget.name} deleted`);
      setDeleteTarget(null);
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

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.employee_code && u.employee_code.toLowerCase().includes(q)) ||
      (u.designation && u.designation.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const getRoleLabel = (roleId?: string) => {
    const found = ROLES.find((r) => r.id === roleId || r.label.toLowerCase() === (roleId || '').toLowerCase());
    return found ? found.label : roleId || 'Super Admin';
  };

  const getBranchName = (bId?: string | null) => {
    if (!bId) return 'Head Office • All departments';
    const found = branches.find((b) => b.id === bId);
    return found ? `${found.name} (${found.code})` : 'Head Office • All departments';
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Users & Employment Directory</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL USERS</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{users.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTIVE USERS</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-500">
            {users.filter((u) => u.is_active).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MONTHLY PAYROLL</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-500 font-mono">
            Rs. {totalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IDENTITY, PAYROLL & ACCESS</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">People Directory</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search users, code, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
              />
            </div>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Print employee list
            </button>
            {isAdmin && (
              <button onClick={openCreate} className="flex items-center gap-2 btn-primary">
                <Plus className="h-4 w-4" /> Add user
              </button>
            )}
          </div>
        </div>

        <div className="print-area overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">User & Email</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Access Scope</th>
                <th className="px-4 py-3">Monthly Salary</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No users found matching "{search}".
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const totalMonthly = (u.base_salary || 0) + (u.allowances || 0) + (u.others || 0);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-amber-500">
                        {u.employee_code || 'EMP-001'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {u.full_name}
                        <span className="block text-[10px] text-slate-400">{u.email}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {u.designation || 'Staff Member'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400">
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {getBranchName(u.branch_id)}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-amber-500">
                        Rs. {totalMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <button
                            onClick={() => toggleStatus(u)}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              u.is_active ? 'bg-amber-500/15 text-amber-500' : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              u.is_active ? 'bg-amber-500/15 text-amber-500' : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingUser(u)}
                            className="flex items-center gap-1 text-xs font-semibold text-amber-500 hover:text-amber-600"
                            title="View full user details"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => openEdit(u)}
                                className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                title="Edit user details"
                              >
                                <Edit className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ id: u.id, name: u.full_name })}
                                className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-400"
                                title="Delete user"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW USER DETAILS MODAL */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 font-bold text-base font-mono">
                  {viewingUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{viewingUser.full_name}</h3>
                  <p className="text-[11px] font-mono text-amber-500">{viewingUser.employee_code || 'EMP-001'}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Profile Overview Card */}
              <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">Email Address</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">Phone</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.phone || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">Designation</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingUser.designation || 'Staff'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">Branch Scope</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{getBranchName(viewingUser.branch_id)}</p>
                  </div>
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-400" /> System Role
                  </p>
                  <p className="mt-1 font-bold text-purple-400 text-sm">{getRoleLabel(viewingUser.role)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Status</p>
                  <span
                    className={`mt-1 inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold ${
                      viewingUser.is_active ? 'bg-amber-500/15 text-amber-500' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {viewingUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Monthly Salary Breakdown */}
              <div className="rounded-xl bg-slate-900/60 p-4 text-slate-200 space-y-2 border border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-amber-400" /> Monthly Payroll Breakdown
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <p className="text-[10px] text-slate-400">Base Salary</p>
                    <p className="font-mono font-bold text-xs text-white">Rs. {(viewingUser.base_salary || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Allowances</p>
                    <p className="font-mono font-bold text-xs text-white">Rs. {(viewingUser.allowances || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Others</p>
                    <p className="font-mono font-bold text-xs text-white">Rs. {(viewingUser.others || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center font-mono">
                  <span className="text-[11px] text-slate-400 font-bold">TOTAL MONTHLY SALARY</span>
                  <span className="text-sm font-extrabold text-amber-400">
                    Rs. {((viewingUser.base_salary || 0) + (viewingUser.allowances || 0) + (viewingUser.others || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Login Info */}
              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span>Last Login: <strong className="text-slate-300">{viewingUser.last_login || 'Never'}</strong></span>
                <span>Created: <strong className="text-slate-300">{new Date(viewingUser.created_at || Date.now()).toLocaleDateString()}</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setViewingUser(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    const u = viewingUser;
                    setViewingUser(null);
                    openEdit(u);
                  }}
                  className="btn-primary text-xs px-4 flex items-center gap-1.5"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit User
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">IDENTITY, PAYROLL & ACCESS</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingId ? 'Edit user access' : 'Add user'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
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
                  <span className="font-bold text-amber-400">Rs. {calculatedSalary.toFixed(2)}</span>
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
                      <option key={r.id} value={r.id}>
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
                {editingId ? 'Update user access' : 'Save user access'}
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
        itemType="user account"
      />
    </div>
  );
}
