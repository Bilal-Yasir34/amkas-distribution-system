import { useEffect, useState } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseInvoice, PurchaseInvoiceItem } from '@/lib/types';
import { Modal } from './Modal';

interface Props {
  invoice: PurchaseInvoice;
  onClose: () => void;
}

export function PurchaseInvoicePrint({ invoice, onClose }: Props) {
  const { vendors = [], customers = [], warehouses = [], products = [], productArticles = [], orgSettings } = useDataStore();
  const [mode, setMode] = useState<'invoice' | 'gatepass'>('invoice');

  const items: PurchaseInvoiceItem[] = (invoice.items && invoice.items.length > 0 ? invoice.items : []) as PurchaseInvoiceItem[];

  const allParties = [...vendors, ...customers];
  const vendor = allParties.find((v) => v.id === invoice.vendor_id);
  const warehouse = warehouses.find((w) => w.id === invoice.warehouse_id);

  const productName = (id: string | null) => products.find((p) => p.id === id)?.name ?? '—';
  const productArticle = (id: string | null) => {
    if (!id) return undefined;
    const p = products.find((prod) => prod.id === id);
    if (p?.article_name) return p.article_name;
    const pa = productArticles.find((a) => a.product_id === id);
    return pa?.article_name;
  };

  useEffect(() => {
    document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, []);

  function doPrint() {
    window.print();
  }

  const invoiceNo = invoice.invoice_no || invoice.grn_no || 'PI-000';
  const docDate = invoice.received_date || invoice.document_date || new Date().toISOString();

  return (
    <Modal
      open
      onClose={onClose}
      title="Purchase Print Preview"
      subtitle={`${invoiceNo} — ${mode === 'invoice' ? 'Purchase Invoice / Goods Receipt' : 'Inward Gate Pass'}`}
      size="xl"
      footer={
        <>
          <div className="mr-auto flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-600">
            <button
              onClick={() => setMode('invoice')}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                mode === 'invoice' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Purchase Invoice / GRN
            </button>
            <button
              onClick={() => setMode('gatepass')}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                mode === 'gatepass' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Inward Gate Pass
            </button>
          </div>
          <button onClick={onClose} className="btn-secondary">
            <X className="h-4 w-4" /> Close
          </button>
          <button onClick={doPrint} className="btn-primary">
            <Printer className="h-4 w-4" /> Print
          </button>
        </>
      }
    >
      <div className="print-area bg-white p-8 text-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold">{orgSettings?.name || 'NICE Enterprises'}</h1>
            <p className="text-sm text-slate-600">{orgSettings?.legal_name || 'Plot 14, Industrial Estate, Karachi'}</p>
            <p className="text-sm text-slate-600">
              {orgSettings?.phone || '+92-21-111-222-333'} · {orgSettings?.email || 'info@niceenterprises.com'}
            </p>
            <p className="text-sm text-slate-600">NTN: {orgSettings?.tax_label || 'NTN-4400000-1'}</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1 text-white">
              <FileText className="h-4 w-4" />
              <span className="font-semibold uppercase tracking-wider text-xs">
                {mode === 'invoice' ? 'PURCHASE INVOICE / GRN' : 'INWARD GATE PASS'}
              </span>
            </div>
            <p className="mt-2 text-sm">
              <span className="font-semibold">GRN / Ref No:</span> <span className="font-mono">{invoiceNo}</span>
            </p>
            {invoice.vendor_invoice_no && (
              <p className="text-sm">
                <span className="font-semibold">Supplier Inv No:</span> <span className="font-mono">{invoice.vendor_invoice_no}</span>
              </p>
            )}
            <p className="text-sm">
              <span className="font-semibold">Date:</span> {formatDate(docDate)}
            </p>
            {invoice.due_date && mode === 'invoice' && (
              <p className="text-sm">
                <span className="font-semibold">Due Date:</span> {formatDate(invoice.due_date)}
              </p>
            )}
            {invoice.gate_pass_no && (
              <p className="text-sm">
                <span className="font-semibold">Gate Pass:</span> {invoice.gate_pass_no}
              </p>
            )}
          </div>
        </div>

        {/* Parties */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
              {mode === 'invoice' ? 'Vendor / Supplier' : 'Consignor'}
            </p>
            <p className="font-semibold text-base text-slate-900">{vendor?.name ?? '—'}</p>
            {vendor?.company_name && <p className="text-slate-700">{vendor.company_name}</p>}
            {vendor?.address && <p className="text-slate-600">{vendor.address}</p>}
            {vendor?.city && <p className="text-slate-600">{vendor.city}</p>}
            {vendor?.phone && <p className="text-slate-600">Phone: {vendor.phone}</p>}
            {vendor?.tax_id && <p className="text-slate-600">NTN / Tax ID: {vendor.tax_id}</p>}
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
              {mode === 'invoice' ? 'Receiving Warehouse' : 'Destination'}
            </p>
            <p className="font-semibold text-base text-slate-900">{warehouse?.name ?? 'Main Warehouse'}</p>
            {warehouse?.code && <p className="text-slate-600">Code: {warehouse.code}</p>}
            {warehouse?.address && <p className="text-slate-600">{warehouse.address}</p>}
            {mode === 'invoice' && invoice.account_head && (
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-semibold">Account:</span> {invoice.account_head}
              </p>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-300 bg-slate-100 text-left">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Description / Article</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Rate</th>
              {mode === 'invoice' && <th className="px-3 py-2 text-right font-semibold">Disc</th>}
              {mode === 'invoice' && <th className="px-3 py-2 text-right font-semibold">Tax%</th>}
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2">1</td>
                <td className="px-3 py-2 font-semibold">Procured Inventory Items</td>
                <td className="px-3 py-2 text-right">1</td>
                <td className="px-3 py-2 text-right">{Number(invoice.total_amount || 0).toFixed(2)}</td>
                {mode === 'invoice' && <td className="px-3 py-2 text-right">0</td>}
                {mode === 'invoice' && <td className="px-3 py-2 text-right">0%</td>}
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(invoice.total_amount || 0))}</td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const artName = it.article_id || productArticle(it.product_id);
                return (
                  <tr key={it.id || idx} className="border-b border-slate-200">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold">{it.description || productName(it.product_id)}</span>
                      {artName && (
                        <span className="block text-xs font-medium text-amber-700">Article: {artName}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{it.qty}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(it.rate || 0).toFixed(2)}</td>
                    {mode === 'invoice' && <td className="px-3 py-2 text-right font-mono">{Number(it.discount || 0).toFixed(0)}</td>}
                    {mode === 'invoice' && <td className="px-3 py-2 text-right font-mono">{Number(it.tax_pct || 0).toFixed(0)}%</td>}
                    <td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(Number(it.line_total || (it.qty * it.rate)))}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {mode === 'invoice' && (
          <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(Number(invoice.subtotal || invoice.total_amount || 0))}</span>
            </div>
            {Number(invoice.discount_total || 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span className="font-mono">- {formatCurrency(Number(invoice.discount_total))}</span>
              </div>
            )}
            {Number(invoice.tax_total || 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span className="font-mono">+ {formatCurrency(Number(invoice.tax_total))}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-slate-800 pt-1 text-base font-bold text-slate-900">
              <span>Total</span>
              <span className="font-mono text-amber-600">{formatCurrency(Number(invoice.total_amount || 0))}</span>
            </div>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-4 border-t border-slate-200 pt-2 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Remarks / Notes:</p>
            <p className="whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-center text-sm text-slate-700">
          <div className="border-t border-slate-400 pt-1 font-medium">Prepared By</div>
          <div className="border-t border-slate-400 pt-1 font-medium">Verified / Inspected By</div>
          <div className="border-t border-slate-400 pt-1 font-medium">Authorized Signature</div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Official Computer-Generated Document from {orgSettings?.name || 'NICE Enterprises'} ERP · Status: {invoice.status || 'POSTED'}
        </p>
      </div>
    </Modal>
  );
}
