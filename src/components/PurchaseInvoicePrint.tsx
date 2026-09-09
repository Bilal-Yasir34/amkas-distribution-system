import { useEffect, useState, useMemo } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { formatCurrency, formatDate, amountToWords } from '@/lib/utils';
import type { PurchaseInvoice, PurchaseInvoiceItem } from '@/lib/types';
import { Modal } from './Modal';
import { getArticleForProduct } from '@/lib/articleUtils';

interface Props {
  invoice: PurchaseInvoice;
  onClose: () => void;
}

export function PurchaseInvoicePrint({ invoice: initialInvoice, onClose }: Props) {
  const {
    vendors = [],
    customers = [],
    warehouses = [],
    products = [],
    productArticles = [],
    purchaseInvoices = [],
    vendorBills = [],
    orgSettings,
  } = useDataStore();

  const [mode, setMode] = useState<'invoice' | 'gatepass'>('invoice');

  // Resolve full invoice with line items from store if passed object was shallow
  const invoice = useMemo(() => {
    const fullStoreInv = purchaseInvoices.find(
      (p) => p.id === initialInvoice.id || (p.grn_no && p.grn_no === initialInvoice.grn_no) || (p.invoice_no && p.invoice_no === initialInvoice.invoice_no)
    );
    if (fullStoreInv && fullStoreInv.items && fullStoreInv.items.length > 0) {
      return { ...fullStoreInv, ...initialInvoice, items: fullStoreInv.items };
    }
    const fullStoreBill = vendorBills.find(
      (b) => b.id === initialInvoice.id || (b.bill_no && b.bill_no === (initialInvoice.grn_no || initialInvoice.invoice_no))
    );
    if (fullStoreBill && fullStoreBill.items && fullStoreBill.items.length > 0) {
      return { ...fullStoreBill, ...initialInvoice, items: fullStoreBill.items as any };
    }
    return initialInvoice;
  }, [initialInvoice, purchaseInvoices, vendorBills]);

  const allParties = useMemo(() => [...vendors, ...customers], [vendors, customers]);
  const vendor = useMemo(() => allParties.find((v) => v.id === invoice.vendor_id), [allParties, invoice.vendor_id]);
  const warehouse = useMemo(() => warehouses.find((w) => w.id === invoice.warehouse_id), [warehouses, invoice.warehouse_id]);

  // Map items with complete real product details from store
  const resolvedItems = useMemo(() => {
    const rawItems: PurchaseInvoiceItem[] = (invoice.items && invoice.items.length > 0 ? invoice.items : []) as PurchaseInvoiceItem[];
    return rawItems.map((it, idx) => {
      const prod = products.find((p) => p.id === it.product_id);
      const artName = it.article_id || getArticleForProduct(it.product_id, products, productArticles) || prod?.article_name;
      const name = prod?.name || it.description || `Item #${idx + 1}`;
      const code = prod?.code || '';
      const unit = it.unit || prod?.unit || 'pcs';
      const qty = Number(it.qty || 1);
      const rate = Number(it.rate || prod?.purchase_price || prod?.cost_price || 0);
      const discount = Number(it.discount || 0);
      const taxPct = Number(it.tax_pct || 0);
      const gross = qty * rate;
      const lineTotal = Number(it.line_total !== undefined ? it.line_total : (gross - discount) * (1 + taxPct / 100));

      return {
        id: it.id || String(idx + 1),
        product_id: it.product_id,
        name,
        code,
        article: artName,
        description: it.description,
        unit,
        qty,
        rate,
        discount,
        taxPct,
        lineTotal,
      };
    });
  }, [invoice.items, products, productArticles]);

  useEffect(() => {
    document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, []);

  function doPrint() {
    window.print();
  }

  const invoiceNo = invoice.invoice_no || invoice.grn_no || 'PI-000';
  const docDate = invoice.received_date || invoice.document_date || new Date().toISOString();
  const grandTotal = Number(invoice.total_amount || 0);

  return (
    <Modal
      open
      onClose={onClose}
      title="Executive Document Preview"
      subtitle={`${invoiceNo} — ${mode === 'invoice' ? 'Purchase Invoice / Goods Receipt Note' : 'Inward Gate Pass'}`}
      size="xl"
      footer={
        <>
          <div className="mr-auto flex rounded-xl border border-slate-300 p-0.5 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setMode('invoice')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                mode === 'invoice' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              Purchase Invoice / GRN
            </button>
            <button
              onClick={() => setMode('gatepass')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                mode === 'gatepass' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              Inward Gate Pass
            </button>
          </div>
          <button onClick={onClose} className="btn-secondary">
            <X className="h-4 w-4" /> Close
          </button>
          <button onClick={doPrint} className="btn-primary">
            <Printer className="h-4 w-4" /> Print Document
          </button>
        </>
      }
    >
      <div className="print-area print-document bg-white p-8 text-slate-900 font-sans shadow-sm">
        
        {/* Executive Commercial Letterhead */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 font-heading">
              {orgSettings?.name || 'NICE ENTERPRISES'}
            </h1>
            <p className="text-xs font-medium text-slate-700 mt-1">
              {orgSettings?.legal_name || 'Plot 14, Industrial Estate, Karachi, Pakistan'}
            </p>
            <p className="text-xs text-slate-600">
              Phone: {orgSettings?.phone || '+92-21-111-222-333'} · Email: {orgSettings?.email || 'info@niceenterprises.com'}
            </p>
            <p className="text-xs font-semibold text-slate-800 font-mono mt-0.5">
              NTN / STRN: {orgSettings?.tax_label || 'NTN-4400000-1'}
            </p>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 px-3.5 py-1.5 text-amber-700 font-black text-xs uppercase tracking-wider mb-2">
              <FileText className="h-4 w-4" />
              <span>{mode === 'invoice' ? 'PURCHASE INVOICE / GRN' : 'INWARD GATE PASS'}</span>
            </div>
            <p className="text-xs font-bold text-slate-900">
              GRN / Document No: <span className="font-mono text-sm">{invoiceNo}</span>
            </p>
            {invoice.vendor_invoice_no && (
              <p className="text-xs text-slate-700 font-medium">
                Supplier Invoice #: <span className="font-mono">{invoice.vendor_invoice_no}</span>
              </p>
            )}
            <p className="text-xs text-slate-700">
              Receipt Date: <span className="font-semibold">{formatDate(docDate)}</span>
            </p>
            {invoice.due_date && mode === 'invoice' && (
              <p className="text-xs text-slate-700">
                Payment Due: <span className="font-semibold">{formatDate(invoice.due_date)}</span>
              </p>
            )}
            {invoice.gate_pass_no && (
              <p className="text-xs text-slate-700 font-mono">
                Gate Pass No: <span>{invoice.gate_pass_no}</span>
              </p>
            )}
          </div>
        </div>

        {/* 2-Column Parties and Delivery Details */}
        <div className="mt-5 grid grid-cols-2 gap-6 text-xs">
          <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {mode === 'invoice' ? 'SUPPLIER / VENDOR (CONSIGNOR)' : 'GOODS DISPATCHED BY'}
            </p>
            <p className="text-sm font-bold text-slate-900">{vendor?.name || '—'}</p>
            {vendor?.company_name && <p className="font-medium text-slate-700">{vendor.company_name}</p>}
            {vendor?.address && <p className="text-slate-600 mt-0.5">{vendor.address}</p>}
            {vendor?.city && <p className="text-slate-600">{vendor.city}</p>}
            {vendor?.phone && <p className="text-slate-600">Phone: {vendor.phone}</p>}
            {vendor?.tax_id && <p className="text-slate-600 font-mono">NTN/STRN: {vendor.tax_id}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              RECEIVING WAREHOUSE & DESTINATION
            </p>
            <p className="text-sm font-bold text-slate-900">{warehouse?.name || 'Main Warehouse'}</p>
            {warehouse?.code && <p className="font-mono text-slate-600">Location Code: {warehouse.code}</p>}
            {warehouse?.address && <p className="text-slate-600 mt-0.5">{warehouse.address}</p>}
            {mode === 'invoice' && invoice.account_head && (
              <p className="text-slate-600 mt-1 text-[11px]">
                Account Head: <span className="font-semibold text-slate-800">{invoice.account_head}</span>
              </p>
            )}
            <p className="text-slate-500 text-[10px] mt-1 font-mono">
              Status: <span className="font-bold text-amber-700">{invoice.status || 'PENDING'}</span>
            </p>
          </div>
        </div>

        {/* Real Product Line Items Table */}
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-300">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300">
                <th className="px-3 py-2.5 w-8">#</th>
                <th className="px-3 py-2.5">Product Name & Specifications</th>
                <th className="px-3 py-2.5 w-28">Article Head</th>
                <th className="px-3 py-2.5 text-center w-20">Quantity</th>
                <th className="px-3 py-2.5 text-right w-24">Unit Rate</th>
                {mode === 'invoice' && <th className="px-3 py-2.5 text-right w-20">Discount</th>}
                {mode === 'invoice' && <th className="px-3 py-2.5 text-right w-16">Tax %</th>}
                <th className="px-3 py-2.5 text-right w-28">Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {resolvedItems.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500 font-mono">1</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">
                    {invoice.notes || 'Purchased Stock Items (Pending Goods Receipt Verification)'}
                  </td>
                  <td className="px-3 py-3 text-slate-400 font-mono">—</td>
                  <td className="px-3 py-3 text-center font-bold font-mono">1</td>
                  <td className="px-3 py-3 text-right font-mono font-semibold">{formatCurrency(grandTotal)}</td>
                  {mode === 'invoice' && <td className="px-3 py-3 text-right font-mono">—</td>}
                  {mode === 'invoice' && <td className="px-3 py-3 text-right font-mono">—</td>}
                  <td className="px-3 py-3 text-right font-mono font-bold">{formatCurrency(grandTotal)}</td>
                </tr>
              ) : (
                resolvedItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-bold text-slate-900 block text-xs">
                        {item.name}
                      </span>
                      {item.code && (
                        <span className="text-[10px] text-slate-500 font-mono">SKU: {item.code}</span>
                      )}
                      {item.description && item.description !== item.name && (
                        <span className="text-[10px] text-slate-500 block italic">{item.description}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.article ? (
                        <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                          {item.article}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-900 font-mono">
                      {item.qty} <span className="text-[10px] font-normal text-slate-500">{item.unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                      {formatCurrency(item.rate)}
                    </td>
                    {mode === 'invoice' && (
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                        {item.discount > 0 ? formatCurrency(item.discount) : '—'}
                      </td>
                    )}
                    {mode === 'invoice' && (
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                        {item.taxPct > 0 ? `${item.taxPct}%` : '—'}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Amount in Words */}
        {mode === 'invoice' && (
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-2 flex-1 max-w-md">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Amount in Words
                </span>
                <p className="font-semibold text-slate-800 italic mt-0.5">
                  {amountToWords(grandTotal)}
                </p>
              </div>

              {invoice.notes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Special Remarks / Inspection Notes
                  </span>
                  <p className="text-slate-700 italic whitespace-pre-line mt-0.5">{invoice.notes}</p>
                </div>
              )}
            </div>

            <div className="w-64 space-y-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal:</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(Number(invoice.subtotal || grandTotal))}
                </span>
              </div>
              {Number(invoice.discount_total || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Trade Discount:</span>
                  <span className="font-mono font-semibold">
                    -{formatCurrency(Number(invoice.discount_total))}
                  </span>
                </div>
              )}
              {Number(invoice.tax_total || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Sales Tax / VAT:</span>
                  <span className="font-mono font-semibold">
                    +{formatCurrency(Number(invoice.tax_total))}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-black text-slate-900">
                <span>Net Total Payable:</span>
                <span className="font-mono text-amber-700">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Executive Signatures */}
        <div className="mt-14 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-800">
          <div className="border-t border-slate-500 pt-2">
            <p>Goods Received & Inspected</p>
            <span className="text-[10px] font-normal text-slate-500">Store In-Charge</span>
          </div>
          <div className="border-t border-slate-500 pt-2">
            <p>Accountant / Verified</p>
            <span className="text-[10px] font-normal text-slate-500">Finance Department</span>
          </div>
          <div className="border-t border-slate-500 pt-2">
            <p>Authorized Signatory</p>
            <span className="text-[10px] font-normal text-slate-500">Management Approval</span>
          </div>
        </div>

        {/* Formal Footer */}
        <p className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2">
          Official Executive Document · NICE ENTERPRISES ERP System · Generated on {formatDate(new Date())}
        </p>

      </div>
    </Modal>
  );
}
