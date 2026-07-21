import { useState } from 'react';
import { Shield, Check, Save } from 'lucide-react';
import { ROLES, MODULE_LABELS, type ModuleKey } from '@/lib/rbac';

const ALL_MODULE_KEYS: ModuleKey[] = [
  'accounting',
  'banking',
  'branches',
  'categories',
  'chart_of_accounts',
  'customers',
  'dashboard',
  'departments',
  'financial_years',
  'inventory',
  'audit_logs',
  'organizations',
  'products',
  'purchases',
  'reports',
  'roles_permissions',
  'sales',
  'settings',
  'users_employees',
  'vendors',
  'warehouses',
];

interface MatrixRow {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export function RolesPermissions() {
  const [selectedRole, setSelectedRole] = useState('accountant');

  const [matrix, setMatrix] = useState<Record<string, MatrixRow>>(() => {
    const initial: Record<string, MatrixRow> = {};
    ALL_MODULE_KEYS.forEach((m) => {
      initial[m] = {
        view: true,
        create: m === 'accounting' || m === 'banking' || m === 'sales',
        edit: m === 'accounting' || m === 'sales',
        delete: false,
        approve: m === 'accounting',
        export: true,
      };
    });
    return initial;
  });

  const toggleCell = (moduleKey: string, permKey: keyof MatrixRow) => {
    setMatrix((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [permKey]: !prev[moduleKey][permKey],
      },
    }));
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GRANULAR ACCESS CONTROL</p>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 capitalize">{selectedRole}</h3>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              Role template
            </span>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-[#1c2541]">
                <tr>
                  <th className="px-4 py-2.5">MODULE</th>
                  <th className="px-2 py-2.5 text-center">VIEW</th>
                  <th className="px-2 py-2.5 text-center">CREATE</th>
                  <th className="px-2 py-2.5 text-center">EDIT</th>
                  <th className="px-2 py-2.5 text-center">DELETE</th>
                  <th className="px-2 py-2.5 text-center">APPROVE</th>
                  <th className="px-2 py-2.5 text-center">EXPORT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ALL_MODULE_KEYS.map((mKey) => {
                  const row = matrix[mKey] || {
                    view: false,
                    create: false,
                    edit: false,
                    delete: false,
                    approve: false,
                    export: false,
                  };
                  return (
                    <tr key={mKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                        {MODULE_LABELS[mKey]}
                      </td>
                      {(['view', 'create', 'edit', 'delete', 'approve', 'export'] as (keyof MatrixRow)[]).map(
                        (permKey) => (
                          <td key={permKey} className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={row[permKey]}
                              onChange={() => toggleCell(mKey, permKey)}
                              className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                            />
                          </td>
                        )
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
            <span className="text-xs text-slate-400">Changes apply immediately to assigned users.</span>
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
              <Save className="h-4 w-4" /> Save permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
