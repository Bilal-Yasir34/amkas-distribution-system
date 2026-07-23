import { useState } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  AlertTriangle,
  Building2,
  Calendar,
  SlidersHorizontal,
  Plus,
  X,
  TrendingDown,
  Banknote,
  Users,
  ShoppingCart,
  Package,
  CheckCircle,
} from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export function Dashboard() {
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  const {
    invoices,
    quotations,
    salesOrders,
    customerReceipts,
    vendorBills,
    vendorPayments,
    purchaseOrders,
    products,
    customers,
    vendors,
    bankAccounts,
    stockTransfers,
    stockAdjustments,
    batches,
    approvalQueue,
    journalEntries,
    branches,
    users,
    auditLogs,
  } = useDataStore();

  const [fromDate, setFromDate] = useState('2026-07-01');
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const [widgets, setWidgets] = useState({
    revenue: true,
    receivables: true,
    payables: true,
    cashBank: true,
    inventory: true,
  });

  // Live KPI Calculations from store
  const totalRevenue = invoices
    .filter((i) => i.status === 'POSTED')
    .reduce((acc, i) => acc + (i.total_amount || 0), 0);

  const totalReceivables = invoices
    .filter((i) => i.status === 'POSTED')
    .reduce((acc, i) => acc + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);

  const totalPayables = vendorBills
    .filter((b) => b.status === 'POSTED')
    .reduce((acc, b) => acc + ((b.total_amount || 0) - (b.paid_amount || 0)), 0);

  const totalCashBank = bankAccounts.reduce((acc, ba) => acc + (ba.current_balance || 0), 0);

  const stockValue = products.reduce(
    (acc, p) => acc + (p.opening_average_cost || p.purchase_price || 0) * (p.stock_quantity || 0),
    0
  );
  const lowStockCount = products.filter(
    (p) => (p.reorder_level || 0) > 0 && (p.stock_quantity || 0) <= (p.reorder_level || 0)
  ).length;

  const pendingApprovals = approvalQueue.filter((a) => a.status === 'PENDING').length;

  // Live 12-Month Financial Performance Calculations
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const monthlyRevenueMap: Record<string, number> = {};
  const monthlyPayableMap: Record<string, number> = {};

  invoices.forEach((inv) => {
    if (inv.status === 'POSTED' && inv.invoice_date) {
      const m = new Date(inv.invoice_date).toLocaleString('en-US', { month: 'short' });
      monthlyRevenueMap[m] = (monthlyRevenueMap[m] || 0) + (inv.total_amount || 0);
    }
  });

  vendorBills.forEach((b) => {
    if (b.status === 'POSTED' && b.bill_date) {
      const m = new Date(b.bill_date).toLocaleString('en-US', { month: 'short' });
      monthlyPayableMap[m] = (monthlyPayableMap[m] || 0) + (b.total_amount || 0);
    }
  });

  const maxVal = Math.max(1, ...months.map((m) => Math.max(monthlyRevenueMap[m] || 0, monthlyPayableMap[m] || 0)));
  const stockGaugePct = stockValue > 0 ? Math.min(100, Math.max(10, Math.round((stockValue / 100000) * 100))) : 0;

  // Recent activity: prioritize auditLogs, fill in with invoice/bill events
  const recentActivities = [
    ...auditLogs.slice(0, 4).map((a) => ({
      action: a.description,
      time: a.timestamp?.slice(0, 10) || 'today',
      type: a.module?.toLowerCase() || 'system',
      color: a.action === 'Login' ? 'slate' : 'emerald',
    })),
    ...invoices.slice(0, 2).map((inv) => ({
      action: `Sales invoice ${inv.invoice_no} ${inv.status.toLowerCase()}`,
      time: inv.created_at?.slice(0, 10) || 'today',
      type: 'sales',
      color: 'emerald',
    })),
    ...vendorBills.slice(0, 2).map((b) => ({
      action: `Vendor bill ${b.bill_no} ${b.status.toLowerCase()}`,
      time: b.created_at?.slice(0, 10) || 'today',
      type: 'purchases',
      color: 'amber',
    })),
  ].slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">AMKAS INTERNATIONAL</p>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Enterprise Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
            <span className="text-slate-400">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent font-medium text-slate-700 dark:text-slate-200 outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
            <span className="text-slate-400">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent font-medium text-slate-700 dark:text-slate-200 outline-none"
            />
          </div>
          <button
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Customize
          </button>
          <button
            onClick={() => setActiveModule('sales')}
            className="flex items-center gap-1.5 btn-primary"
          >
            <Plus className="h-4 w-4" />
            Quick Invoice
          </button>
        </div>
      </div>

      {/* KPI Cards — all live from store */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.revenue && (
          <div className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NET REVENUE</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{invoices.length} invoice(s) posted</p>
              </div>
              <div className="rounded-xl bg-amber-500/15 p-2.5 shadow-sm">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
            </div>
          </div>
        )}

        {widgets.receivables && (
          <div className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">RECEIVABLES</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                  {formatCurrency(totalReceivables)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{customers.length} active customer(s)</p>
              </div>
              <div className="rounded-xl bg-amber-500/15 p-2.5 shadow-sm">
                <Users className="h-4 w-4 text-amber-500" />
              </div>
            </div>
          </div>
        )}

        {widgets.payables && (
          <div className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PAYABLES</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                  {formatCurrency(totalPayables)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{vendorBills.length} vendor bill(s)</p>
              </div>
              <div className="rounded-xl bg-amber-500/15 p-2.5 shadow-sm">
                <ShoppingCart className="h-4 w-4 text-amber-500" />
              </div>
            </div>
          </div>
        )}

        {widgets.cashBank && (
          <div className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CASH & BANK</p>
                <p className="mt-1 text-2xl font-extrabold text-amber-400">
                  {formatCurrency(totalCashBank)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{bankAccounts.length} account(s)</p>
              </div>
              <div className="rounded-xl bg-amber-500/15 p-2.5 shadow-sm">
                <Banknote className="h-4 w-4 text-amber-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Secondary KPI Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div
          className="cursor-pointer card p-3 hover:border-amber-500/60 shadow-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]"
          onClick={() => setActiveModule('sales')}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">QUOTATIONS</p>
          <p className="mt-0.5 text-xl font-extrabold text-slate-800 dark:text-slate-100">{quotations.length}</p>
        </div>
        <div
          className="cursor-pointer card p-3 hover:border-amber-500/60 shadow-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]"
          onClick={() => setActiveModule('purchases')}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PURCHASE ORDERS</p>
          <p className="mt-0.5 text-xl font-extrabold text-amber-500">{purchaseOrders.length}</p>
        </div>
        <div
          className="cursor-pointer card p-3 hover:border-rose-500/60 shadow-sm hover:shadow-[0_0_20px_rgba(244,63,94,0.25)]"
          onClick={() => setActiveModule('approvals')}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PENDING APPROVALS</p>
          <p className="mt-0.5 text-xl font-extrabold text-rose-500">{pendingApprovals}</p>
        </div>
        <div
          className="cursor-pointer card p-3 hover:border-purple-500/60 shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]"
          onClick={() => setActiveModule('inventory')}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LOW STOCK ITEMS</p>
          <p className="mt-0.5 text-xl font-extrabold text-purple-400">{lowStockCount}</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Revenue vs Expenses Chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FINANCIAL PERFORMANCE</p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-heading">Revenue vs purchases</h3>
            </div>
            <button onClick={() => setActiveModule('accounting')} className="text-xs font-bold text-amber-400 hover:underline">
              View P&L
            </button>
          </div>
          <div className="mt-6 flex h-48 items-end justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
            {months.map((m) => {
              const revVal = monthlyRevenueMap[m] || 0;
              const payVal = monthlyPayableMap[m] || 0;
              return (
                <div key={m} className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    <div
                      className="w-2.5 rounded-t bg-amber-500 transition-all shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                      style={{ height: revVal > 0 ? `${Math.min(100, Math.max(8, (revVal / maxVal) * 100))}%` : '0%' }}
                    />
                    <div
                      className="w-2.5 rounded-t bg-rose-400 transition-all shadow-sm"
                      style={{ height: payVal > 0 ? `${Math.min(100, Math.max(8, (payVal / maxVal) * 100))}%` : '0%' }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{m}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2.5 w-2.5 rounded bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2.5 w-2.5 rounded bg-rose-400" /> Purchases
              </span>
            </div>
            <div className="flex gap-4 text-xs font-bold">
              <span className="text-amber-400">Rev: {formatCurrency(totalRevenue)}</span>
              <span className="text-rose-400">Payable: {formatCurrency(totalPayables)}</span>
            </div>
          </div>
        </div>

        {/* Stock Position */}
        {widgets.inventory && (
          <div className="card p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">INVENTORY CONTROL</p>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-heading">Stock position</h3>
              </div>
              <button onClick={() => setActiveModule('inventory')} className="text-xs font-bold text-amber-400 hover:underline">
                Open
              </button>
            </div>
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="relative grid h-40 w-40 place-items-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-200 dark:text-slate-800" strokeWidth="3.8" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-amber-500" strokeDasharray={`${stockGaugePct}, 100`} strokeWidth="3.8" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute text-center">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{formatCurrency(stockValue)}</p>
                  <p className="text-[10px] text-slate-400">Stock value</p>
                </div>
              </div>
              <div className="mt-4 w-full space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400"><span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> Products</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{products.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400"><span className="h-2 w-2 rounded-full bg-purple-500" /> Low stock</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{lowStockCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400"><span className="h-2 w-2 rounded-full bg-rose-500" /> Transfers</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{stockTransfers.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Branch performance */}
        <div className="card p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MULTI-BRANCH ANALYTICS</p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-heading">Branch performance</h3>
            </div>
            <button onClick={() => setActiveModule('branches')} className="text-xs font-bold text-amber-400 hover:underline">Manage</button>
          </div>
          <div className="mt-4 space-y-3">
            {branches.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">No branches configured yet.</p>
            ) : branches.map((branch) => {
              const branchRevenue = invoices
                .filter((i) => !i.branch_id || i.branch_id === branch.id)
                .reduce((acc, i) => acc + (i.total_amount || 0), 0);
              const branchUsers = users.filter((u) => u.branch_id === branch.id).length;
              return (
                <div key={branch.id} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-400 font-bold text-sm">
                      {branch.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{branch.name}</p>
                      <p className="text-[10px] text-slate-400">{branch.code} · {branchUsers} user(s)</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-amber-400">{formatCurrency(branchRevenue)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity — from live store */}
        <div className="card p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GOVERNANCE</p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-heading">Recent activity</h3>
            </div>
            <button onClick={() => setActiveModule('audit_logs')} className="text-xs font-bold text-amber-400 hover:underline">View all</button>
          </div>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-56 overflow-y-auto">
            {recentActivities.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">No recent activity. Start by creating an invoice.</p>
            ) : (
              recentActivities.map((act, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500/15 font-extrabold text-[10px] text-amber-400">
                      A
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{act.action}</p>
                      <p className="text-[10px] text-slate-400">{act.type} • {act.time}</p>
                    </div>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Customize Widgets Modal */}
      {customizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PERSONAL DASHBOARD</p>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Customize widgets</h3>
              </div>
              <button onClick={() => setCustomizeOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {Object.entries(widgets).map(([key, value]) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50 cursor-pointer"
                >
                  <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-200">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => setWidgets((w) => ({ ...w, [key]: !value }))}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setCustomizeOpen(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={() => setCustomizeOpen(false)} className="btn-primary">Save dashboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
