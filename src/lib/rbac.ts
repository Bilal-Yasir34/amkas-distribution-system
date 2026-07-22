export type Role =
  | 'super_admin'
  | 'accountant'
  | 'sales_manager'
  | 'purchase_clerk'
  | 'salesman'
  | 'store_keeper'
  | 'viewer';

export interface RoleInfo {
  id: Role;
  label: string;
  description: string;
}

export const ROLES: RoleInfo[] = [
  { id: 'super_admin', label: 'Super Admin', description: 'Full system access, company setup, user management, DB resets' },
  { id: 'accountant', label: 'Accountant', description: 'Accounting, banking, vouchers, ledger, financial reports, posting' },
  { id: 'sales_manager', label: 'Sales Manager', description: 'Quotations, sales orders, invoices, returns, customers, commissions' },
  { id: 'purchase_clerk', label: 'Purchase Clerk', description: 'Purchase requests, POs, vendor bills, debit notes, vendor directory' },
  { id: 'salesman', label: 'Salesman', description: 'Assigned customers, route, field collections, own sales orders' },
  { id: 'store_keeper', label: 'Store Keeper', description: 'Inventory, stock transfers, adjustments, barcodes, gate passes' },
  { id: 'viewer', label: 'Viewer / Management', description: 'Read-only dashboard, analytics, financial reports' },
];

export function normalizeRole(roleStr: string | null | undefined): Role {
  if (!roleStr) return 'super_admin';
  const lower = roleStr.toLowerCase().trim();
  if (lower === 'super admin' || lower === 'super_admin' || lower === 'admin') return 'super_admin';
  if (lower === 'accountant') return 'accountant';
  if (lower === 'sales manager' || lower === 'sales_manager') return 'sales_manager';
  if (lower === 'purchase clerk' || lower === 'purchase_clerk') return 'purchase_clerk';
  if (lower === 'salesman') return 'salesman';
  if (lower === 'store keeper' || lower === 'store_keeper') return 'store_keeper';
  if (lower === 'viewer' || lower === 'viewer / management') return 'viewer';
  const found = ROLES.find((r) => r.id === lower || r.label.toLowerCase() === lower);
  return (found?.id || 'super_admin') as Role;
}

export type ModuleKey =
  | 'dashboard'
  | 'approvals'
  | 'sales'
  | 'purchases'
  | 'receive_payment'
  | 'pay_payment'
  | 'inventory'
  | 'banking'
  | 'accounting'
  | 'chart_of_accounts'
  | 'financial_years'
  | 'reports'
  | 'customers'
  | 'vendors'
  | 'products'
  | 'categories'
  | 'warehouses'
  | 'organizations'
  | 'branches'
  | 'departments'
  | 'users_employees'
  | 'roles_permissions'
  | 'audit_logs'
  | 'settings'
  | 'maintenance';

export const ROLE_MODULES: Record<Role, ModuleKey[]> = {
  super_admin: [
    'dashboard',
    'approvals',
    'sales',
    'purchases',
    'receive_payment',
    'pay_payment',
    'inventory',
    'banking',
    'accounting',
    'chart_of_accounts',
    'financial_years',
    'reports',
    'customers',
    'vendors',
    'products',
    'categories',
    'warehouses',
    'organizations',
    'branches',
    'departments',
    'users_employees',
    'roles_permissions',
    'audit_logs',
    'settings',
    'maintenance',
  ],
  accountant: [
    'dashboard',
    'approvals',
    'sales',
    'purchases',
    'receive_payment',
    'pay_payment',
    'banking',
    'accounting',
    'chart_of_accounts',
    'financial_years',
    'reports',
  ],
  sales_manager: [
    'dashboard',
    'sales',
    'receive_payment',
    'customers',
    'products',
    'categories',
    'reports',
  ],
  purchase_clerk: [
    'dashboard',
    'purchases',
    'pay_payment',
    'vendors',
    'products',
    'categories',
    'warehouses',
    'reports',
  ],
  salesman: ['dashboard', 'sales', 'receive_payment', 'customers'],
  store_keeper: [
    'dashboard',
    'inventory',
    'products',
    'categories',
    'warehouses',
    'reports',
  ],
  viewer: ['dashboard', 'reports'],
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  approvals: 'Approval Center',
  sales: 'Sales',
  purchases: 'Purchases',
  receive_payment: 'Receive Payment',
  pay_payment: 'Pay Payment',
  inventory: 'Inventory',
  banking: 'Banking',
  accounting: 'Accounting',
  chart_of_accounts: 'Chart of Accounts',
  financial_years: 'Financial Years',
  reports: 'Reports & Analytics',
  customers: 'Customers',
  vendors: 'Vendors',
  products: 'Products',
  categories: 'Product Categories',
  warehouses: 'Warehouses',
  organizations: 'Organizations',
  branches: 'Branches',
  departments: 'Departments',
  users_employees: 'Users & Employees',
  roles_permissions: 'Roles & Permissions',
  audit_logs: 'Audit & Login Logs',
  settings: 'Settings',
  maintenance: 'Maintenance',
};
