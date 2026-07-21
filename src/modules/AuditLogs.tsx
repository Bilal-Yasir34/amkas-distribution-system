import { useState } from 'react';
import { History, Shield, Printer, Download } from 'lucide-react';

export function AuditLogs() {
  const [activeTab, setActiveTab] = useState<'Activity log' | 'Login history'>('Activity log');

  const activityLogs = [
    { user: 'admin', module: 'Authentication', action: 'Login', desc: 'User signed in', ip: '59.103.102.161', time: '21 Jul 2026, 12:06:25 PM' },
    { user: 'admin', module: 'Authentication', action: 'Login', desc: 'User signed in', ip: '59.103.102.161', time: '21 Jul 2026, 11:06:03 AM' },
    { user: 'admin', module: 'Authentication', action: 'Login', desc: 'User signed in', ip: '59.103.102.161', time: '20 Jul 2026, 06:40:08 PM' },
    { user: 'admin', module: 'Authentication', action: 'Login', desc: 'User signed in', ip: '59.103.102.161', time: '20 Jul 2026, 06:19:36 PM' },
    { user: 'admin', module: 'Purchases', action: 'Create', desc: 'Posted purchase invoice PI-00002', ip: '39.37.158.37', time: '15 Jul 2026, 02:35:06 PM' },
    { user: 'admin', module: 'Purchases', action: 'Create', desc: 'Posted purchase invoice PI-00001', ip: '39.37.158.37', time: '15 Jul 2026, 02:33:53 PM' },
    { user: 'admin', module: 'Accounting', action: 'Create', desc: 'Posted unified payment CP-00003', ip: '39.37.158.37', time: '15 Jul 2026, 02:31:18 PM' },
    { user: 'admin', module: 'Accounting', action: 'Create', desc: 'Posted cash receipt CR-00006', ip: '39.37.158.37', time: '15 Jul 2026, 02:29:01 PM' },
  ];

  const loginLogs = [
    { user: 'admin', status: 'Success', ip: '59.103.102.161', device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', time: '21 Jul 2026, 12:06:25 PM' },
    { user: 'admin', status: 'Logged Out', ip: '59.103.102.161', device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', time: '21 Jul 2026, 12:05:19 PM' },
    { user: 'admin', status: 'Success', ip: '59.103.102.161', device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', time: '21 Jul 2026, 11:06:03 AM' },
    { user: 'admin', status: 'Success', ip: '59.103.102.161', device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', time: '20 Jul 2026, 06:40:08 PM' },
  ];

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
                {activityLogs.map((log, i) => (
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
                ))}
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
                {loginLogs.map((log, i) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
