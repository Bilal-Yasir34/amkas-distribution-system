import { useState, useEffect } from 'react';
import { Shield, Save, CheckCircle } from 'lucide-react';
import { ROLES, ROLE_MODULES, MODULE_LABELS, type ModuleKey, type Role } from '@/lib/rbac';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';

const ALL_MODULE_KEYS: ModuleKey[] = [
  'dashboard',
  'approvals',
  'accounting',
  'banking',
  'branches',
  'categories',
  'chart_of_accounts',
  'customers',
  'departments',
  'financial_years',
  'inventory',
  'audit_logs',
  'organizations',
  'products',
  'purchases',
  'receive_payment',
  'pay_payment',
  'reports',
  'roles_permissions',
  'sales',
  'settings',
  'users_employees',
  'vendors',
  'warehouses',
  'maintenance',
];

export function RolesPermissions() {
  const toast = useToast();
  const { rolePermissions, updateRolePermissions } = useDataStore();
  const [selectedRole, setSelectedRole] = useState<Role>('accountant');

  // Derive allowed modules from the store (overrides rbac defaults)
  const [allowedModules, setAllowedModules] = useState<Set<ModuleKey>>(
    () => new Set(rolePermissions[selectedRole] || ROLE_MODULES[selectedRole] || [])
  );

  // When role changes, load that role's current permissions from store
  useEffect(() => {
    setAllowedModules(new Set(rolePermissions[selectedRole] || ROLE_MODULES[selectedRole] || []));
  }, [selectedRole, rolePermissions]);

  const toggleModule = (mKey: ModuleKey) => {
    // super_admin can't be restricted
    if (selectedRole === 'super_admin') {
      toast.error('Super Admin permissions cannot be restricted.');
      return;
    }
    setAllowedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mKey)) {
        next.delete(mKey);
      } else {
        next.add(mKey);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (selectedRole === 'super_admin') {
      toast.error('Super Admin permissions cannot be modified.');
      return;
    }
    updateRolePermissions(selectedRole, Array.from(allowedModules));
    toast.success(`Permissions saved for ${ROLES.find((r) => r.id === selectedRole)?.label || selectedRole}. Changes apply to all users with this role.`);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Roles & Permissions</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left Role Templates */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACCESS TEMPLATES</p>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Roles</h3>

          <div className="mt-4 space-y-2">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={`flex w-full flex-col rounded-lg p-3 text-left transition border ${
                  selectedRole === r.id
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300'
                }`}
              >
                <span className="text-xs font-bold">{r.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{r.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Permission Matrix */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MODULE ACCESS CONTROL</p>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 capitalize">
                {ROLES.find((r) => r.id === selectedRole)?.label || selectedRole}
              </h3>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {selectedRole === 'super_admin' ? 'Full access (protected)' : `${allowedModules.size} / ${ALL_MODULE_KEYS.length} modules enabled`}
            </span>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-[#1c2541]">
                <tr>
                  <th className="px-4 py-2.5">MODULE</th>
                  <th className="px-2 py-2.5 text-center">ACCESS ALLOWED</th>
                  <th className="px-4 py-2.5">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ALL_MODULE_KEYS.map((mKey) => {
                  const isAllowed = selectedRole === 'super_admin' || allowedModules.has(mKey);
                  return (
                    <tr key={mKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                        {MODULE_LABELS[mKey]}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          disabled={selectedRole === 'super_admin'}
                          onChange={() => toggleModule(mKey)}
                          className="h-4 w-4 rounded accent-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${
                            isAllowed
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {isAllowed ? <CheckCircle className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                          {isAllowed ? 'Allowed' : 'Restricted'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
            <span className="text-xs text-slate-400">
              {selectedRole === 'super_admin'
                ? 'Super Admin always has full access.'
                : 'Toggle modules on/off, then click Save to enforce access rules.'}
            </span>
            <button
              onClick={handleSave}
              disabled={selectedRole === 'super_admin'}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" /> Save permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
