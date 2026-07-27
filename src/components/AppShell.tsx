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
  Menu,
  X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useDataStore } from '@/lib/dataStore';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { ROLE_MODULES, MODULE_LABELS, ROLES, type ModuleKey } from '@/lib/rbac';
import { useState, useEffect } from 'react';
import { GlobalSearchModal } from './GlobalSearchModal';
import { ModuleSkeleton, DashboardSkeleton } from './SkeletonLoader';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = profile?.role ?? 'super_admin';
  const { rolePermissions } = useDataStore();
  const allowed = rolePermissions[role] || ROLE_MODULES[role] || ROLE_MODULES.super_admin;
  const currentLabel = MODULE_LABELS[activeModule as ModuleKey] ?? 'Dashboard';
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? 'Super Admin';

  useEffect(() => {
    if (allowed && allowed.length > 0 && !allowed.includes(activeModule as ModuleKey)) {
      setActiveModule(allowed[0]);
    }
  }, [role, allowed, activeModule, setActiveModule]);

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

  const { companyLogo, organizations, branches } = useDataStore();
  const [moduleLoading, setModuleLoading] = useState(false);

  const handleNavModuleClick = (m: ModuleKey) => {
    setMobileMenuOpen(false);
    if (m === activeModule) return;
    setModuleLoading(true);
    setActiveModule(m);
    setTimeout(() => setModuleLoading(false), 250);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-[#0f172a]">
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-Over Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-amber-500/20 text-slate-300 shadow-2xl backdrop-blur-2xl transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-amber-500/20 px-5">
          <div className="flex items-center gap-2.5">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="h-8 w-8 rounded-xl object-cover ring-2 ring-amber-500/30" />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 font-extrabold text-slate-950 shadow-lg shadow-amber-500/30 ring-1 ring-white/30">
                A
              </div>
            )}
            <div className="leading-tight">
              <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white font-heading">AMKAS ERP</p>
              <p className="text-[9px] uppercase tracking-widest text-amber-500 dark:text-amber-400 font-bold">ENTERPRISE SUITE</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:text-slate-100 transition"
          >
            <X className="h-5 w-5 text-amber-500" />
          </button>
        </div>

        {/* Mobile Workspace Card */}
        <div className="mx-3 mt-3.5 rounded-2xl bg-amber-500/10 p-3 border border-amber-500/20 shadow-sm backdrop-blur-md">
          <p className="text-[9px] uppercase font-extrabold text-amber-500 tracking-wider">ACTIVE WORKSPACE</p>
          <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-amber-300 truncate">{selectedOrg}</p>
        </div>

        {/* Mobile Nav Links */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {groups.map((group) => {
            if (group.keys.length === 0) return null;
            return (
              <div key={group.title}>
                <p className="px-3 pb-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.keys.map((m) => {
                    const Icon = moduleIcons[m];
                    const active = activeModule === m;
                    return (
                      <button
                        key={m}
                        onClick={() => handleNavModuleClick(m)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                          active
                            ? 'bg-gradient-to-r from-amber-500/25 to-amber-500/10 text-amber-500 dark:text-amber-400 border-l-4 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-amber-500/10 hover:text-amber-500 dark:hover:text-amber-300'
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

        {/* Mobile User Footer */}
        <div className="border-t border-slate-200/80 dark:border-amber-500/20 p-3.5">
          <div className="flex items-center gap-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-2.5 border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 font-extrabold text-slate-950 text-xs shadow-sm">
              A
            </div>
            <div className="flex-1 truncate">
              <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">{profile?.full_name || 'admin'}</p>
              <p className="text-[10px] text-amber-500 dark:text-amber-400 font-bold truncate">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Glassmorphic Sidebar */}
      <aside className="no-print hidden md:flex w-60 shrink-0 flex-col bg-white/90 dark:bg-slate-900/90 text-slate-300 border-r border-slate-200/80 dark:border-amber-500/20 backdrop-blur-2xl shadow-2xl z-20">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200/80 dark:border-amber-500/20 px-5">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="h-8 w-8 rounded-xl object-cover ring-2 ring-amber-500/30" />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 font-extrabold text-slate-950 shadow-lg shadow-amber-500/30 ring-1 ring-white/30">
              A
            </div>
          )}
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white font-heading">AMKAS ERP</p>
            <p className="text-[9px] uppercase tracking-widest text-amber-500 dark:text-amber-400 font-bold">ENTERPRISE SUITE</p>
          </div>
        </div>

        {/* Workspace Card */}
        <div className="mx-3 mt-3.5 rounded-2xl bg-amber-500/10 p-3 border border-amber-500/20 shadow-sm backdrop-blur-md">
          <p className="text-[9px] uppercase font-extrabold text-amber-500 tracking-wider">ACTIVE WORKSPACE</p>
          <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-amber-300 truncate">{selectedOrg}</p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {groups.map((group) => {
            if (group.keys.length === 0) return null;
            return (
              <div key={group.title}>
                <p className="px-3 pb-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.keys.map((m) => {
                    const Icon = moduleIcons[m];
                    const active = activeModule === m;
                    return (
                      <button
                        key={m}
                        onClick={() => handleNavModuleClick(m)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                          active
                            ? 'bg-gradient-to-r from-amber-500/25 to-amber-500/10 text-amber-500 dark:text-amber-400 border-l-4 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-amber-500/10 hover:text-amber-500 dark:hover:text-amber-300'
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
        <div className="border-t border-slate-200/80 dark:border-amber-500/20 p-3.5">
          <div className="flex items-center gap-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-2.5 border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 font-extrabold text-slate-950 text-xs shadow-sm">
              A
            </div>
            <div className="flex-1 truncate">
              <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">{profile?.full_name || 'admin'}</p>
              <p className="text-[10px] text-amber-500 dark:text-amber-400 font-bold truncate">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden w-full min-w-0">
        {/* Top Glassmorphic Header */}
        <header className="no-print flex h-16 items-center justify-between border-b border-slate-200/90 bg-white/80 px-3 sm:px-6 dark:border-amber-500/20 dark:bg-slate-900/80 backdrop-blur-2xl shadow-sm z-10 gap-2">
          {/* Hamburger + Pickers */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden grid h-9 w-9 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:border-amber-500/40 dark:border-amber-500/30 dark:bg-slate-800 dark:text-amber-400 transition shrink-0"
              aria-label="Open navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-amber-500" /> : <Menu className="h-5 w-5 text-amber-500" />}
            </button>
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="rounded-2xl border border-slate-300/80 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:border-amber-500/30 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 dark:focus:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition"
              >
                {organizations.length > 0 ? (
                  organizations.map((o) => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))
                ) : (
                  <option value="AMKAS INTERNATIONAL">AMKAS INTERNATIONAL</option>
                )}
              </select>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="rounded-2xl border border-slate-300/80 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:border-amber-500/30 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 dark:focus:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition"
              >
                <option value="All Branches">All Branches</option>
                {branches.filter((b) => b.is_active !== false).map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search bar & right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="group flex w-60 lg:w-72 items-center justify-between rounded-2xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-2 text-xs font-medium text-slate-500 shadow-sm backdrop-blur-md hover:border-amber-500/50 hover:bg-white hover:shadow-[0_0_20px_rgba(245,158,11,0.18)] dark:border-amber-500/30 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-amber-400/60 dark:hover:bg-slate-800/80 transition-all duration-200"
            >
              <span className="flex items-center gap-2.5">
                <Search className="h-4 w-4 text-amber-500 transition-transform group-hover:scale-110" />
                <span className="truncate">Quick search system...</span>
              </span>
              <kbd className="rounded-xl border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold font-mono text-slate-500 dark:border-slate-700/80 dark:bg-slate-800 dark:text-amber-400 shadow-inner">
                ⌘K
              </kbd>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenu((v) => !v)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs transition hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] dark:border-amber-500/30 dark:bg-slate-800"
              >
                <div className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-extrabold text-slate-950 shadow-sm">
                  A
                </div>
                <div className="text-left leading-tight">
                  <p className="font-extrabold text-slate-800 dark:text-slate-100">{profile?.full_name || 'admin'}</p>
                  <p className="text-[9px] text-amber-500 dark:text-amber-400 font-bold">{roleLabel}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {userMenu && (
                <div className="absolute right-0 top-12 z-30 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-amber-500/30 dark:bg-slate-900 backdrop-blur-2xl">
                  <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{profile?.email || 'admin@amkas.pk'}</p>
                    <p className="mt-0.5 text-[10px] text-amber-500 font-bold">{roleLabel}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenu(false);
                      signOut();
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold"
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
              className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] dark:border-amber-500/30 dark:bg-slate-800 dark:text-amber-400 transition"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-6">
          {moduleLoading ? (
            activeModule === 'dashboard' ? <DashboardSkeleton /> : <ModuleSkeleton />
          ) : allowed && allowed.length > 0 && !allowed.includes(activeModule as ModuleKey) ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-rose-500/30 shadow-2xl">
              <Shield className="h-16 w-16 text-rose-500 mb-4 animate-bounce" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-heading">Access Restricted</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2">
                You do not have permission from the Administrator to access the <span className="font-bold text-amber-500">{currentLabel}</span> module.
              </p>
              <button
                onClick={() => handleNavModuleClick(allowed[0] || 'dashboard')}
                className="mt-6 btn-primary"
              >
                Return to Authorized Portal Page
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
