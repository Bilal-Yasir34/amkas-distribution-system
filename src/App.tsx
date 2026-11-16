import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Toaster } from '@/components/Toaster';
import { useAppStore } from '@/lib/store';
import { useErpData, useRolePermissions } from '@/lib/queries';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useRealtimeSync } from '@/lib/realtime';
import { isSupabaseConfigured, BUILD_ID, SUPABASE_HOST } from '@/lib/supabase';
import { ROLE_MODULES, normalizeRole, type ModuleKey } from '@/lib/rbac';
import { Login } from '@/modules/Login';
import { Dashboard } from '@/modules/Dashboard';
import { Approvals } from '@/modules/Approvals';
import { SalesModule } from '@/modules/SalesModule';
import { SalesReturnModule } from '@/modules/SalesReturnModule';
import { PurchaseModule } from '@/modules/PurchaseModule';
import { PurchaseReturnModule } from '@/modules/PurchaseReturnModule';
import { ReceivePayment } from '@/modules/ReceivePayment';
import { PayPayment } from '@/modules/PayPayment';
import { InventoryModule } from '@/modules/InventoryModule';
import { BankingModule } from '@/modules/BankingModule';
import { AccountingModule } from '@/modules/AccountingModule';
import { ChartOfAccounts } from '@/modules/ChartOfAccounts';
import { FinancialYears } from '@/modules/FinancialYears';
import { ReportsModule } from '@/modules/ReportsModule';
import { AccountTypeModule } from '@/modules/AccountTypeModule';
import { AddAccountModule } from '@/modules/AddAccountModule';
import { Customers } from '@/modules/Customers';
import { Vendors } from '@/modules/Vendors';
import { Products } from '@/modules/Products';
import { Categories } from '@/modules/Categories';
import { Warehouses } from '@/modules/Warehouses';
import { Organizations } from '@/modules/Organizations';
import { Branches } from '@/modules/Branches';
import { Departments } from '@/modules/Departments';
import { UsersEmployees } from '@/modules/UsersEmployees';
import { RolesPermissions } from '@/modules/RolesPermissions';
import { AuditLogs } from '@/modules/AuditLogs';
import { Settings } from '@/modules/Settings';
import { Maintenance } from '@/modules/Maintenance';
import { StylishLoadingScreen } from '@/components/SkeletonLoader';
import { MaintenanceScreen } from '@/components/MaintenanceScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AlertTriangle } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: 2,
    },
  },
});

const modules: Record<ModuleKey, () => JSX.Element> = {
  dashboard: Dashboard,
  approvals: Approvals,
  sales: SalesModule,
  sales_return: SalesReturnModule,
  purchases: PurchaseModule,
  purchase_return: PurchaseReturnModule,
  receive_payment: ReceivePayment,
  pay_payment: PayPayment,
  inventory: InventoryModule,
  banking: BankingModule,
  accounting: AccountingModule,
  chart_of_accounts: ChartOfAccounts,
  financial_years: FinancialYears,
  reports: ReportsModule,
  account_type: AccountTypeModule,
  add_account: AddAccountModule,
  customers: Customers,
  vendors: Vendors,
  products: Products,
  categories: Categories,
  warehouses: Warehouses,
  organizations: Organizations,
  branches: Branches,
  departments: Departments,
  users_employees: UsersEmployees,
  roles_permissions: RolesPermissions,
  audit_logs: AuditLogs,
  settings: Settings,
  maintenance: Maintenance,
};

function Router() {
  const { profile } = useAuth();
  const activeModule = useAppStore((s) => s.activeModule) as ModuleKey;
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const { data: rolePermissions } = useRolePermissions();

  const role = normalizeRole(profile?.role);
  const allowed = Array.from(
    new Set([
      ...(ROLE_MODULES[role] || ROLE_MODULES.super_admin),
      ...(rolePermissions?.[role] || []),
    ])
  );
  const effective = allowed.includes(activeModule) ? activeModule : allowed[0] || 'dashboard';
  const Component = modules[effective] || Dashboard;

  useEffect(() => {
    if (allowed && allowed.length > 0 && !allowed.includes(activeModule)) {
      setActiveModule(allowed[0] || 'dashboard');
    }
  }, [allowed, activeModule, setActiveModule]);

  return <Component />;
}

function ConfigurationMissingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="max-w-lg rounded-3xl border border-rose-500/40 bg-slate-900 p-8 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-rose-400">
          <AlertTriangle className="h-8 w-8 shrink-0" />
          <h1 className="text-xl font-extrabold font-heading">Configuration missing</h1>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Required Supabase environment variables (<code className="text-amber-400">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-amber-400">VITE_SUPABASE_ANON_KEY</code>) are not configured for this build.
        </p>
        <p className="text-xs text-slate-400">
          Set both variables in your <code className="text-slate-200">.env</code> file or hosting provider environment settings, then rebuild the site.
        </p>
        <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-500">
          Build: {BUILD_ID} &bull; Host: {SUPABASE_HOST}
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { session, loading, profile, isAdmin } = useAuth();
  const { isMaintenanceMode } = useErpData();

  // Mount the single Supabase Realtime channel once after authentication
  useRealtimeSync(Boolean(session));

  if (loading) {
    return <StylishLoadingScreen message="Initializing NICE Enterprises Portal..." />;
  }

  // When Maintenance Mode is active, block all unauthenticated visitors and non-admin users
  if (isMaintenanceMode) {
    const isSuperAdmin = session && (isAdmin || normalizeRole(profile?.role) === 'super_admin');
    if (!isSuperAdmin) {
      return <MaintenanceScreen />;
    }
  }

  if (!session) return <Login />;

  return (
    <AppShell>
      <Router />
    </AppShell>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigurationMissingScreen />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
