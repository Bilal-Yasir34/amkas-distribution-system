import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Toaster } from '@/components/Toaster';
import { useAppStore } from '@/lib/store';
import { useDataStore } from '@/lib/dataStore';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ROLE_MODULES, type ModuleKey } from '@/lib/rbac';
import { Login } from '@/modules/Login';
import { Dashboard } from '@/modules/Dashboard';
import { Approvals } from '@/modules/Approvals';
import { SalesModule } from '@/modules/SalesModule';
import { PurchaseModule } from '@/modules/PurchaseModule';
import { ReceivePayment } from '@/modules/ReceivePayment';
import { PayPayment } from '@/modules/PayPayment';
import { InventoryModule } from '@/modules/InventoryModule';
import { BankingModule } from '@/modules/BankingModule';
import { AccountingModule } from '@/modules/AccountingModule';
import { ChartOfAccounts } from '@/modules/ChartOfAccounts';
import { FinancialYears } from '@/modules/FinancialYears';
import { ReportsModule } from '@/modules/ReportsModule';
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
import { Building2, Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
    },
  },
});

const modules: Record<ModuleKey, () => JSX.Element> = {
  dashboard: Dashboard,
  approvals: Approvals,
  sales: SalesModule,
  purchases: PurchaseModule,
  receive_payment: ReceivePayment,
  pay_payment: PayPayment,
  inventory: InventoryModule,
  banking: BankingModule,
  accounting: AccountingModule,
  chart_of_accounts: ChartOfAccounts,
  financial_years: FinancialYears,
  reports: ReportsModule,
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
  const { rolePermissions } = useDataStore();

  const role = profile?.role ?? 'super_admin';
  const allowed = rolePermissions[role] || ROLE_MODULES[role] || ROLE_MODULES.super_admin;
  const effective = allowed.includes(activeModule) ? activeModule : (allowed[0] || 'dashboard');
  const Component = modules[effective] || Dashboard;

  useEffect(() => {
    if (allowed && allowed.length > 0 && !allowed.includes(activeModule)) {
      setActiveModule(allowed[0] || 'dashboard');
    }
  }, [allowed, activeModule, setActiveModule]);

  return <Component />;
}

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b132b]">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-600">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-500" />
          <p className="mt-2 text-xs text-slate-500">Loading AMKAS ERP…</p>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <AppShell>
      <Router />
    </AppShell>
  );
}

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function App() {
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
