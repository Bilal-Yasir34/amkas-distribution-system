import { useState } from 'react';
import { CheckSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';

export function Approvals() {
  const toast = useToast();
  const { approvalQueue, reviewApproval } = useDataStore();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const handleApprove = (id: string, recordNo: string) => {
    reviewApproval(id, 'APPROVED', 'Approved by administrator');
    toast.success(`Document ${recordNo} approved successfully`);
  };

  const handleReject = (id: string, recordNo: string) => {
    reviewApproval(id, 'REJECTED', 'Rejected by administrator');
    toast.error(`Document ${recordNo} rejected`);
  };

  const filtered = approvalQueue.filter((item) => filterStatus === 'ALL' || item.status === filterStatus);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Approvals & Verification</h1>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
              filterStatus === st
                ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Record No</th>
              <th className="px-4 py-3">Requested By</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No approval requests matching "{filterStatus}".
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 uppercase">{item.module}</td>
                  <td className="px-4 py-3 font-mono text-emerald-500">{item.record_no}</td>
                  <td className="px-4 py-3 text-slate-400">{item.requested_by}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-200">
                    Rs. {(item.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : item.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(item.id, item.record_no)}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(item.id, item.record_no)}
                          className="rounded bg-rose-600/90 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500">{item.review_note || 'Reviewed'}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
