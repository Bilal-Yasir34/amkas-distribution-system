import { useMemo, useState } from 'react';
import { Plus, Trash2, Save, Send, Printer, Pencil, Eye } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { useToast } from '@/lib/toast';
import {
  useCustomers,
  useDeleteInvoice,
  useInvoiceItems,
  usePostInvoice,
  useProducts,
  useSalesInvoices,
  useWarehouses,
} from '@/lib/queries';
import { supabase, TABLES } from '@/lib/supabase';
import { computeLineTotal, downloadCSV, formatCurrency, formatDate, getCustomerName, getWarehouseName, nextDocNumber, todayISO } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { InvoicePrint } from '@/components/InvoicePrint';
import type { SalesInvoice, SalesInvoiceItem } from '@/lib/types';

interface DraftLine {
  id: string;
  product_id: string;
  description: string;
  qty: number;
  length: number;
  width: number;
  rate: number;
  discount: number;
  tax_pct: number;
}

function emptyLine(): DraftLine {
  return { id: crypto.randomUUID(), product_id: '', description: '', qty: 1, length: 0, width: 0, rate: 0, discount: 0, tax_pct: 0 };
}

export function SalesInvoices() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: invoices = [] } = useSalesInvoices();
  const { data: customers = [] } = useCustomers();
  const { data: warehouses = [] } = useWarehouses();
  const { data: products = [] } = useProducts();
  const postMut = usePostInvoice();
  const delMut = useDeleteInvoice();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPOSTED' | 'POSTED'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printInvoice, setPrintInvoice] = useState<SalesInvoice | null>(null);

  // form state
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [salesperson, setSalesperson] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [gatePassNo, setGatePassNo] = useState('');
  const [notes, setNotes] = useState('');
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const customerName = (id: string | null) => getCustomerName(id, customers);
  const warehouseName = (id: string | null) => getWarehouseName(id, warehouses);

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return i.invoice_no.toLowerCase().includes(q) || customerName(i.customer_id).toLowerCase().includes(q);
      }
      return true;
    });
  }, [invoices, statusFilter, search, customers]);

  const totals = useMemo(() => {
    let subtotal = 0, discountTotal = 0, taxTotal = 0;
    lines.forEach((l) => {
      const gross = l.qty * l.rate;
      subtotal += gross;
      discountTotal += l.discount;
      taxTotal += (gross - l.discount) * (l.tax_pct / 100);
    });
    return { subtotal, discountTotal, taxTotal, total: subtotal - discountTotal + taxTotal };
  }, [lines]);

  function openCreate() {
    setEditingId(null);
    setInvoiceNo(nextDocNumber('MS', invoices.map((i) => i.invoice_no)));
    setCustomerId(customers[0]?.id ?? '');
    setWarehouseId(warehouses[0]?.id ?? '');
    setInvoiceDate(todayISO());
    setSalesperson('');
    setPaymentTerms('Net 30');
    setGatePassNo('');
    setNotes('');
    setShowZeroStock(false);
    setLines([emptyLine()]);
    setFormOpen(true);
  }

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function onProductChange(id: string, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateLine(id, {
      product_id: productId,
      description: p?.name ?? '',
      rate: p?.sale_price ?? 0,
      length: p?.length ?? 0,
      width: p?.width ?? 0,
    });
  }

  async function saveDraft() {
    if (!customerId) return toast.error('Select a customer');
    if (!invoiceNo) return toast.error('Invoice number required');
    await persist(false);
  }

  async function saveAndPost() {
    if (!customerId) return toast.error('Select a customer');
    if (!invoiceNo) return toast.error('Invoice number required');
    if (lines.filter((l) => l.product_id).length === 0) return toast.error('Add at least one line item');
    await persist(true);
  }

  async function persist(post: boolean) {
    try {
      const payload = {
        invoice_no: invoiceNo,
        customer_id: customerId,
        warehouse_id: warehouseId || null,
        invoice_date: invoiceDate,
        salesperson,
        payment_terms: paymentTerms,
        gate_pass_no: gatePassNo || null,
        status: 'UNPOSTED' as const,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.total,
        paid_amount: 0,
        notes,
        created_by: 'user',
      };

      let invoiceId = editingId;
      if (editingId) {
        const { error } = await supabase.from(TABLES.salesInvoices).update(payload).eq('id', editingId);
        if (error) throw error;
        await supabase.from(TABLES.salesInvoiceItems).delete().eq('sales_invoice_id', editingId);
      } else {
        const { data, error } = await supabase.from(TABLES.salesInvoices).insert(payload).select().single();
        if (error) throw error;
        invoiceId = data.id;
      }

      const itemRows = lines
        .filter((l) => l.product_id)
        .map((l) => ({
          sales_invoice_id: invoiceId,
          product_id: l.product_id,
          description: l.description,
          qty: l.qty,
          length: l.length,
          width: l.width,
          rate: l.rate,
          discount: l.discount,
          tax_pct: l.tax_pct,
          line_total: computeLineTotal(l.qty, l.rate, l.discount, l.tax_pct),
        }));
      if (itemRows.length) {
        const { error: ie } = await supabase.from(TABLES.salesInvoiceItems).insert(itemRows);
        if (ie) throw ie;
      }

      if (post && invoiceId) {
        await postMut.mutateAsync(invoiceId);
        toast.success(`Invoice ${invoiceNo} posted to ledger`);
      } else {
        toast.success(`Draft ${invoiceNo} saved`);
      }
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      setFormOpen(false);
    } catch (e) {
      toast.error((e as Error).message || 'Save failed');
    }
  }

  async function handlePost(invoice: SalesInvoice) {
    try {
      await postMut.mutateAsync(invoice.id);
      toast.success(`${invoice.invoice_no} posted`);
    } catch (e) {
      toast.error((e as Error).message || 'Post failed');
    }
  }

  async function handleDelete(invoice: SalesInvoice) {
    if (!confirm(`Delete ${invoice.invoice_no}? This cannot be undone.`)) return;
    try {
      await delMut.mutateAsync(invoice.id);
      toast.success(`${invoice.invoice_no} deleted`);
    } catch (e) {
      toast.error((e as Error).message || 'Delete failed');
    }
  }

  function exportCSV() {
    downloadCSV('sales_invoices.csv', filtered.map((i) => ({
      InvoiceNo: i.invoice_no,
      Date: formatDate(i.invoice_date),
      Customer: customerName(i.customer_id),
      Warehouse: warehouseName(i.warehouse_id),
      Status: i.status,
      Total: i.total_amount,
      GatePass: i.gate_pass_no ?? '',
    })));
  }

  return (
    <div>
      <PageHeader
        title="Sales Invoices"
        subtitle="Draft, post, and print sales invoices with atomic ledger updates"
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search invoice no / customer…"
        actions={
          <>
            <div className="flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-600">
              {(['ALL', 'UNPOSTED', 'POSTED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    statusFilter === s ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button onClick={exportCSV} className="btn-outline">Export CSV</button>
            <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> New Invoice</button>
          </>
        }
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700/40 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice No</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 font-medium">Gate Pass</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="table-row">
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{i.invoice_no}</td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(i.invoice_date)}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{customerName(i.customer_id)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{warehouseName(i.warehouse_id)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{i.gate_pass_no ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700 dark:text-slate-200">{formatCurrency(Number(i.total_amount))}</td>
                  <td className="px-4 py-2.5"><span className={i.status === 'POSTED' ? 'badge-posted' : 'badge-unposted'}>{i.status}</span></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setPrintInvoice(i)} className="btn-ghost !p-1.5" title="Print"><Printer className="h-4 w-4" /></button>
                      {i.status === 'UNPOSTED' && (
                        <>
                          <button onClick={() => handlePost(i)} className="btn-ghost !p-1.5 text-emerald-500" title="Post"><Send className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(i)} className="btn-ghost !p-1.5 text-rose-500" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No invoices match the filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit Invoice' : 'New Sales Invoice'}
        subtitle="Draft saves unposted; Save & Post writes to ledger atomically"
        size="xl"
        footer={
          <>
            <button onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={saveDraft} className="btn-outline"><Save className="h-4 w-4" /> Save Draft</button>
            <button onClick={saveAndPost} className="btn-primary" disabled={postMut.isPending}><Send className="h-4 w-4" /> Save & Post</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="label">Invoice No</label>
              <input className="input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            </div>
            <div>
              <label className="label">Customer</label>
              <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select…</option>
                {customers.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Warehouse</label>
              <select className="input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">Select…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Salesperson</label>
              <input className="input" value={salesperson} onChange={(e) => setSalesperson(e.target.value)} />
            </div>
            <div>
              <label className="label">Payment Terms</label>
              <input className="input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </div>
            <div>
              <label className="label">Gate Pass No</label>
              <input className="input" value={gatePassNo} onChange={(e) => setGatePassNo(e.target.value)} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <input type="checkbox" checked={showZeroStock} onChange={(e) => setShowZeroStock(e.target.checked)} />
              Show zero-stock products
            </label>
          </div>

          {/* Line items */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-700/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Disc</th>
                  <th className="px-3 py-2 text-right font-medium">Tax%</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100 dark:border-slate-700/60">
                    <td className="px-3 py-1.5">
                      <select className="input !py-1 !text-xs" value={l.product_id} onChange={(e) => onProductChange(l.id, e.target.value)}>
                        <option value="">Select…</option>
                        {products
                          .filter((p) => showZeroStock || true)
                          .map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-1.5"><input className="input !py-1 !text-xs" value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} /></td>
                    <td className="px-3 py-1.5"><input type="number" className="input !py-1 !text-xs w-20 text-right" value={l.qty} onChange={(e) => updateLine(l.id, { qty: +e.target.value })} /></td>
                    <td className="px-3 py-1.5"><input type="number" className="input !py-1 !text-xs w-24 text-right" value={l.rate} onChange={(e) => updateLine(l.id, { rate: +e.target.value })} /></td>
                    <td className="px-3 py-1.5"><input type="number" className="input !py-1 !text-xs w-20 text-right" value={l.discount} onChange={(e) => updateLine(l.id, { discount: +e.target.value })} /></td>
                    <td className="px-3 py-1.5"><input type="number" className="input !py-1 !text-xs w-16 text-right" value={l.tax_pct} onChange={(e) => updateLine(l.id, { tax_pct: +e.target.value })} /></td>
                    <td className="px-3 py-1.5 text-right font-medium text-slate-700 dark:text-slate-200">{formatCurrency(computeLineTotal(l.qty, l.rate, l.discount, l.tax_pct))}</td>
                    <td className="px-3 py-1.5"><button onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))} className="btn-ghost !p-1 text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setLines((p) => [...p, emptyLine()])} className="btn-secondary"><Plus className="h-4 w-4" /> Add Line</button>

          {/* Totals */}
          <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between text-slate-500"><span>Discount</span><span>- {formatCurrency(totals.discountTotal)}</span></div>
            <div className="flex justify-between text-slate-500"><span>Tax</span><span>+ {formatCurrency(totals.taxTotal)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-slate-800 dark:border-slate-700 dark:text-white"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
          </div>
        </div>
      </Modal>

      {printInvoice && <InvoicePrint invoice={printInvoice} onClose={() => setPrintInvoice(null)} />}
    </div>
  );
}
