import { useState } from 'react';
import { History, Shield, Printer, Download } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';

export function AuditLogs() {
  const [activeTab, setActiveTab] = useState<'Activity log' | 'Login history'>('Activity log');
  const { auditLogs, loginLogs, invoices, vendorBills, customerReceipts } = useDataStore();

  // Combine real store auditLogs with invoice/bill activities if store logs are initial
  const displayAuditLogs = [
    ...auditLogs.map((a) => ({
      user: a.username || 'admin',
      module: a.module || 'System',
      action: a.action || 'Event',
      desc: a.description,
      ip: a.ip_address || '127.0.0.1',
      time: a.timestamp,
    })),
    ...invoices.map((inv) => ({
      user: 'admin',
      module: 'Sales',
      action: inv.status,
      desc: `Sales invoice ${inv.invoice_no} (${inv.customer_name || 'Customer'})`,
      ip: '127.0.0.1',
      time: inv.created_at?.slice(0, 10) || '2026-07-22',
    })),
    ...vendorBills.map((vb) => ({
      user: 'admin',
      module: 'Purchases',
      action: vb.status,
      desc: `Vendor bill ${vb.bill_no} (${vb.vendor_name || 'Vendor'})`,
      ip: '127.0.0.1',
      time: vb.created_at?.slice(0, 10) || '2026-07-22',
    })),
    ...customerReceipts.map((cr) => ({
      user: 'admin',
      module: 'Accounting',
      action: 'POSTED',
      desc: `Customer receipt ${cr.receipt_no}`,
      ip: '127.0.0.1',
      time: cr.created_at?.slice(0, 10) || '2026-07-22',
    })),
  ];

  const displayLoginLogs = loginLogs.map((l) => ({
    user: l.username || 'admin',
    status: l.status || 'Success',
    ip: l.ip_address || '127.0.0.1',
    device: l.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    time: l.timestamp,
  }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Audit & Login Logs</h1>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1">
        {['Activity log', 'Login history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
              activeTab === tab
                ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Activity log' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SECURITY INTELLIGENCE</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Business audit trail</h2>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              <Printer className="h-3.5 w-3.5" /> Export / Print
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No activity logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  displayAuditLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{log.user}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.module}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{log.desc}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{log.ip}</td>
                      <td className="px-4 py-3 text-slate-500">{log.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Login history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SECURITY INTELLIGENCE</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Authentication events</h2>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              <Printer className="h-3.5 w-3.5" /> Export / Print
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayLoginLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No authentication events recorded yet.
                    </td>
                  </tr>
                ) : (
                  displayLoginLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{log.user}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            log.status === 'Success'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{log.ip}</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{log.device}</td>
                      <td className="px-4 py-3 text-slate-500">{log.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
