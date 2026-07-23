import { useEffect, useState } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { useCustomers, useInvoiceItems, useProducts, useWarehouses } from '@/lib/queries';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { SalesInvoice } from '@/lib/types';
import { Modal } from './Modal';

interface Props {
  invoice: SalesInvoice;
  onClose: () => void;
}

export function InvoicePrint({ invoice, onClose }: Props) {
  const { data: customers = [] } = useCustomers();
  const { data: warehouses = [] } = useWarehouses();
  const { data: products = [] } = useProducts();
  const { data: items = [] } = useInvoiceItems(invoice.id);
  const [mode, setMode] = useState<'invoice' | 'gatepass'>('invoice');

  const customer = customers.find((c) => c.id === invoice.customer_id);
  const warehouse = warehouses.find((w) => w.id === invoice.warehouse_id);
  const productName = (id: string | null) => products.find((p) => p.id === id)?.name ?? '—';

  useEffect(() => {
    document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, []);

  function doPrint() {
    window.print();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Print Preview"
      subtitle={`${invoice.invoice_no} — ${mode === 'invoice' ? 'Tax Invoice' : 'Gate Pass'}`}
      size="xl"
      footer={
        <>
          <div className="mr-auto flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-600">
            <button onClick={() => setMode('invoice')} className={`rounded-md px-3 py-1 text-xs ${mode === 'invoice' ? 'bg-amber-500 text-white' : 'text-slate-500'}`}>Tax Invoice</button>
            <button onClick={() => setMode('gatepass')} className={`rounded-md px-3 py-1 text-xs ${mode === 'gatepass' ? 'bg-amber-500 text-white' : 'text-slate-500'}`}>Gate Pass</button>
          </div>
          <button onClick={onClose} className="btn-secondary"><X className="h-4 w-4" /> Close</button>
          <button onClick={doPrint} className="btn-primary"><Printer className="h-4 w-4" /> Print</button>
        </>
      }
    >
      <div className="print-area bg-white p-8 text-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold">AMKAS International</h1>
            <p className="text-sm text-slate-600">Plot 14, Industrial Estate, Karachi</p>
            <p className="text-sm text-slate-600">+92-21-111-222-333 · info@amkasintl.com</p>
            <p className="text-sm text-slate-600">NTN: NTN-4400000-1</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1 text-white">
              <FileText className="h-4 w-4" />
              <span className="font-semibold">{mode === 'invoice' ? 'TAX INVOICE' : 'GATE PASS'}</span>
            </div>
            <p className="mt-2 text-sm"><span className="font-semibold">No:</span> {invoice.invoice_no}</p>
            <p className="text-sm"><span className="font-semibold">Date:</span> {formatDate(invoice.invoice_date)}</p>
            {mode === 'gatepass' && invoice.gate_pass_no && (
              <p className="text-sm"><span className="font-semibold">Gate Pass:</span> {invoice.gate_pass_no}</p>
            )}
          </div>
        </div>

        {/* Parties */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{mode === 'invoice' ? 'Bill To' : 'Consignee'}</p>
            <p className="font-semibold">{customer?.name ?? '—'}</p>
            <p>{customer?.address ?? ''}</p>
            <p>{customer?.city ?? ''}</p>
            <p>{customer?.phone ?? ''}</p>
            {customer?.tax_id && <p>NTN: {customer.tax_id}</p>}
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Warehouse</p>
            <p className="font-semibold">{warehouse?.name ?? '—'}</p>
            <p>{warehouse?.address ?? ''}</p>
            {mode === 'invoice' && (
              <>
                <p className="mt-2"><span className="font-semibold">Terms:</span> {invoice.payment_terms ?? '—'}</p>
                <p><span className="font-semibold">Salesperson:</span> {invoice.salesperson ?? '—'}</p>
              </>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-300 bg-slate-100 text-left">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Rate</th>
              {mode === 'invoice' && <th className="px-3 py-2 text-right font-semibold">Disc</th>}
              {mode === 'invoice' && <th className="px-3 py-2 text-right font-semibold">Tax%</th>}
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-b border-slate-200">
                <td className="px-3 py-2">{idx + 1}</td>
                <td className="px-3 py-2">{it.description || productName(it.product_id)}</td>
                <td className="px-3 py-2 text-right">{it.qty}</td>
                <td className="px-3 py-2 text-right">{Number(it.rate).toFixed(2)}</td>
                {mode === 'invoice' && <td className="px-3 py-2 text-right">{Number(it.discount).toFixed(0)}</td>}
                {mode === 'invoice' && <td className="px-3 py-2 text-right">{Number(it.tax_pct).toFixed(0)}%</td>}
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(it.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {mode === 'invoice' && (
          <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(invoice.subtotal))}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>- {formatCurrency(Number(invoice.discount_total))}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>+ {formatCurrency(Number(invoice.tax_total))}</span></div>
            <div className="flex justify-between border-t-2 border-slate-800 pt-1 text-base font-bold"><span>Total</span><span>{formatCurrency(Number(invoice.total_amount))}</span></div>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-center text-sm">
          <div className="border-t border-slate-400 pt-1">Prepared By</div>
          <div className="border-t border-slate-400 pt-1">Authorized By</div>
          <div className="border-t border-slate-400 pt-1">Received By</div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          This is a computer-generated document from AMKAS International ERP · Status: {invoice.status}
        </p>
      </div>
    </Modal>
  );
}
