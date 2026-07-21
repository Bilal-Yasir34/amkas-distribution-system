import {
  LayoutDashboard,
  FileText,
  Package,
  Warehouse,
  Tags,
  Users,
  Truck,
  BookOpen,
  ScrollText,
  BarChart3,
  CheckSquare,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Building2,
  LogOut,
  UserCircle,
  Search,
  PlusCircle,
  MinusCircle,
  Landmark,
  Calendar,
  Layers,
  Shield,
  History,
  Wrench,
  ChevronDown,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useDataStore } from '@/lib/dataStore';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { ROLE_MODULES, MODULE_LABELS, ROLES, type ModuleKey } from '@/lib/rbac';
import { useState, useEffect } from 'react';
import { GlobalSearchModal } from './GlobalSearchModal';

const moduleIcons: Record<ModuleKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  approvals: CheckSquare,
  sales: FileText,
  purchases: FileText,
  receive_payment: PlusCircle,
  pay_payment: MinusCircle,
  inventory: Warehouse,
  banking: Landmark,
  accounting: ScrollText,
  chart_of_accounts: BookOpen,
  financial_years: Calendar,
  reports: BarChart3,
  customers: Users,
  vendors: Truck,
  products: Package,
  categories: Tags,
  warehouses: Warehouse,
  organizations: Building2,
  branches: Layers,
  departments: Layers,
  users_employees: Users,
  roles_permissions: Shield,
  audit_logs: History,
  settings: SettingsIcon,
  maintenance: Wrench,
};

interface NavGroup {
  title: string;
  keys: ModuleKey[];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const { activeModule, setActiveModule, selectedOrg, setSelectedOrg, selectedBranch, setSelectedBranch } = useAppStore();
  const [userMenu, setUserMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const role = profile?.role ?? 'super_admin';
  const allowed = ROLE_MODULES[role] || ROLE_MODULES.super_admin;
  const currentLabel = MODULE_LABELS[activeModule as ModuleKey] ?? 'Dashboard';
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? 'Super Admin';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const groups: NavGroup[] = [
    {
      title: 'OVERVIEW',
      keys: ['dashboard', 'approvals'].filter((k) => allowed.includes(k as ModuleKey)) as ModuleKey[],
    },
    {
      title: 'OPERATIONS',
      keys: ['sales', 'purchases', 'receive_payment', 'pay_payment', 'inventory', 'banking'].filter((k) =>
        allowed.includes(k as ModuleKey)
      ) as ModuleKey[],
    },
    {
      title: 'ACCOUNTING',
      keys: ['accounting', 'chart_of_accounts', 'financial_years', 'reports'].filter((k) =>
        allowed.includes(k as ModuleKey)
      ) as ModuleKey[],
    },
    {
      title: 'MASTER DATA',
      keys: ['customers', 'vendors', 'products', 'categories', 'warehouses'].filter((k) =>
        allowed.includes(k as ModuleKey)
      ) as ModuleKey[],
    },
    {
      title: 'ADMINISTRATION',
      keys: [
        'organizations',
        'branches',
        'departments',
        'users_employees',
        'roles_permissions',
        'audit_logs',
        'settings',
        'maintenance',
      ].filter((k) => allowed.includes(k as ModuleKey)) as ModuleKey[],
    },
  ];

  const { companyLogo } = useDataStore();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-[#0b132b]">
      {/* Sidebar */}
      <aside className="no-print flex w-60 shrink-0 flex-col bg-[#0b132b] text-slate-300">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-800/80 px-5">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 font-bold text-white">
              M
            </div>
          )}
          <div className="leading-tight">
            <p className="text-xs font-bold tracking-tight text-white">MunshiOS</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">ENTERPRISE</p>
          </div>
        </div>

        {/* Workspace Card */}
        <div className="mx-3 mt-3 rounded-lg bg-slate-900/60 p-2.5 border border-slate-800/60">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">WORKSPACE</p>
          <p className="text-xs font-semibold text-emerald-400 truncate">{selectedOrg}</p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {groups.map((group) => {
            if (group.keys.length === 0) return null;
            return (
              <div key={group.title}>
                <p className="px-2 pb-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.keys.map((m) => {
                    const Icon = moduleIcons[m];
                    const active = activeModule === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setActiveModule(m)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'bg-emerald-600/20 text-emerald-400 border-l-2 border-emerald-500'
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{MODULE_LABELS[m]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Card footer */}
        <div className="border-t border-slate-800/80 p-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-900/40 p-2">
            <div className="grid h-7 w-7 place-items-center rounded bg-emerald-600 font-bold text-white text-xs">
              A
            </div>
            <div className="flex-1 truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{profile?.full_name || 'admin'}</p>
              <p className="text-[10px] text-slate-400 truncate">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="no-print flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-[#1c2541]">
          {/* Left Pickers */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="AMKAS INTERNATIONAL">AMKAS INTERNATIONAL</option>
                <option value="Ahmed raza">Ahmed raza</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="All Branches">All Branches</option>
                <option value="Head Office">Head Office</option>
              </select>
            </div>
          </div>

          {/* Search bar & right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex w-72 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5" />
                <span>Search transactions, accounts, people...</span>
              </span>
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                Ctrl K
              </kbd>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenu((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="grid h-6 w-6 place-items-center rounded bg-emerald-600 text-xs font-bold text-white">
                  A
                </div>
                <div className="text-left leading-tight">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{profile?.full_name || 'admin'}</p>
                  <p className="text-[9px] text-slate-400">{roleLabel}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {userMenu && (
                <div className="absolute right-0 top-12 z-30 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[#1e293b]">
                  <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{profile?.email || 'admin@amkas.pk'}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{roleLabel}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenu(false);
                      signOut();
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
