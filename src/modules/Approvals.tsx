import { useState, useMemo } from 'react';
import { CheckSquare, CheckCircle2, XCircle, Clock, FileText, ShoppingCart, ArrowDownLeft, ArrowUpRight, Search, ShieldCheck } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { formatDate, formatCurrency } from '@/lib/utils';

export function Approvals() {
  const toast = useToast();
  const { approvalQueue = [], reviewApproval, warehouses = [] } = useDataStore();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const handleApprove = (id: string, recordNo: string, entityType?: string) => {
    reviewApproval(id, 'APPROVED', 'Approved by administrator');
    const label = entityType ? entityType.replace('_', ' ').toUpperCase() : 'Document';
    toast.success(`${label} ${recordNo} approved and posted to ledger!`);
  };

  const handleReject = (id: string, recordNo: string, entityType?: string) => {
    reviewApproval(id, 'REJECTED', 'Rejected by administrator');
    const label = entityType ? entityType.replace('_', ' ').toUpperCase() : 'Document';
    toast.error(`${label} ${recordNo} rejected`);
  };

  const pendingCount = useMemo(() => approvalQueue.filter((a) => a.status === 'PENDING').length, [approvalQueue]);
  const approvedCount = useMemo(() => approvalQueue.filter((a) => a.status === 'APPROVED').length, [approvalQueue]);
  const rejectedCount = useMemo(() => approvalQueue.filter((a) => a.status === 'REJECTED').length, [approvalQueue]);

  const filtered = useMemo(() => {
    return approvalQueue.filter((item) => {
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        (item.record_no || '').toLowerCase().includes(q) ||
        (item.party_name || '').toLowerCase().includes(q) ||
        (item.module || '').toLowerCase().includes(q) ||
        (item.entity_type || '').toLowerCase().includes(q) ||
        (item.requested_by || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [approvalQueue, filterStatus, searchTerm]);

  const getEntityBadge = (entityType?: string, moduleName?: string, recordNo?: string) => {
    const et = (entityType || '').toLowerCase();
    const mod = (moduleName || '').toLowerCase();
    const rec = (recordNo || '').toLowerCase();

    if (
      et === 'customer_receipt' ||
      et === 'payment_receipt' ||
      mod === 'receive payment' ||
      mod === 'sales / receipts' ||
      rec.startsWith('cr')
    ) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckSquare className="h-3 w-3" /> Receive Payment
        </span>
      );
    }

    if (
      et === 'vendor_payment' ||
      et === 'payment_voucher' ||
      mod === 'pay payment' ||
      mod === 'purchase / payments' ||
      rec.startsWith('cp') ||
      rec.startsWith('pay-')
    ) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
          <CheckSquare className="h-3 w-3" /> Pay Payment
        </span>
      );
    }

    switch (entityType) {
      case 'sales_invoice':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <FileText className="h-3 w-3" /> Sales Invoice
          </span>
        );
      case 'purchase_invoice':
      case 'vendor_bill':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ShoppingCart className="h-3 w-3" /> Purchase / Bill
          </span>
        );
      case 'sales_return':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <ArrowDownLeft className="h-3 w-3" /> Sales Return
          </span>
        );
      case 'purchase_return':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <ArrowUpRight className="h-3 w-3" /> Purchase Return
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-500/20">
            {moduleName || 'Document'}
          </span>
        );
    }
  };

  const isPaymentDoc = (entityType?: string, moduleName?: string, recordNo?: string) => {
    const et = (entityType || '').toLowerCase();
    const mod = (moduleName || '').toLowerCase();
    const rec = (recordNo || '').toLowerCase();
    return (
      et.includes('receipt') ||
      et.includes('payment') ||
      et.includes('voucher') ||
      et.includes('receive') ||
      et.includes('pay') ||
      mod.includes('receipt') ||
      mod.includes('payment') ||
      mod.includes('receive') ||
      mod.includes('pay') ||
      rec.startsWith('cr') ||
      rec.startsWith('cp') ||
      rec.startsWith('pv') ||
      rec.startsWith('rv') ||
      rec.startsWith('pay') ||
      rec.startsWith('rec') ||
      rec.startsWith('pmt')
    );
  };

  const getWarehouseName = (whId?: string | null) => {
    if (!whId) return null;
    const wh = warehouses.find((w) => w.id === whId || w.code === whId);
    return wh ? `${wh.code} - ${wh.name}` : whId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 font-mono">GOVERNANCE & AUDIT</p>
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Approval Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Pending Sales, Purchases, and Returns require verification before ledger posting and inventory adjustments.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total in Queue</p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{approvalQueue.length}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm dark:border-amber-500/20">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending Approval</p>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500 mt-1">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm dark:border-emerald-500/20">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Approved & Posted</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-500 mt-1">{approvedCount}</p>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 shadow-sm dark:border-rose-500/20">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Rejected</p>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-500 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex space-x-1">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-4 py-2 text-xs font-semibold whitespace-nowrap rounded-lg transition ${
                filterStatus === st
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              {st === 'ALL' ? 'All Records' : st}
              {st === 'PENDING' && pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search record no, party..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
            <tr>
              <th className="px-3 py-2.5 whitespace-nowrap">Document Type</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Record No</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Party Name</th>
              <th className="px-3 py-2.5">Warehouse / Items</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Requested By</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Total Amount</th>
              <th className="px-3 py-2.5 text-center whitespace-nowrap">Status</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  No approval requests matching "{filterStatus}".
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="px-3 py-2 whitespace-nowrap font-medium">
                    {getEntityBadge(item.entity_type, item.module, item.record_no)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono font-bold text-amber-500">
                    {item.record_no || '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                    {item.party_name || '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {isPaymentDoc(item.entity_type, item.module, item.record_no) ? (
                      <span className="text-slate-600 dark:text-slate-600 font-mono text-xs">—</span>
                    ) : (
                      <>
                        {item.warehouse_id && (
                          <div className="text-[11px] text-slate-300 font-medium truncate max-w-[150px]" title={getWarehouseName(item.warehouse_id) || '—'}>
                            {getWarehouseName(item.warehouse_id)}
                          </div>
                        )}
                        {item.items_summary && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]" title={item.items_summary}>
                            {item.items_summary}
                          </div>
                        )}
                        {!item.warehouse_id && !item.items_summary && (
                          <span className="text-slate-600 dark:text-slate-600 font-mono text-xs">—</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap text-[11px]">
                    {formatDate(item.created_at || '')}
                  </td>
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                      {item.requested_by || 'admin'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {formatCurrency(Number(item.amount || 0))}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : item.status === 'REJECTED'
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {item.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
                      {item.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                      {item.status === 'PENDING' && <Clock className="h-3 w-3" />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {item.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleApprove(item.id, item.record_no || '', item.entity_type)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-emerald-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(item.id, item.record_no || '', item.entity_type)}
                          className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-rose-700 transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-right whitespace-nowrap">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {item.reviewed_by || 'Admin'}
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {formatDate(item.reviewed_at || '')}
                        </span>
                      </div>
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
