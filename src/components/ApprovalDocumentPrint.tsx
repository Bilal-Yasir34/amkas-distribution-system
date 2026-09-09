import { useEffect, useMemo } from 'react';
import { Printer, X, FileText, CheckCircle2, ShoppingCart, ArrowDownLeft, ArrowUpRight, Receipt, CreditCard } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { formatCurrency, formatDate, amountToWords } from '@/lib/utils';
import type { ApprovalQueueItem } from '@/lib/types';
import { Modal } from './Modal';
import { getArticleForProduct } from '@/lib/articleUtils';

interface Props {
  item: ApprovalQueueItem;
  onClose: () => void;
}

export function ApprovalDocumentPrint({ item, onClose }: Props) {
  const {
    invoices = [],
    purchaseInvoices = [],
    vendorBills = [],
    salesReturns = [],
    purchaseReturns = [],
    customerReceipts = [],
    vendorPayments = [],
    customers = [],
    vendors = [],
    products = [],
    productArticles = [],
    warehouses = [],
    bankAccounts = [],
    orgSettings,
  } = useDataStore();

  useEffect(() => {
    document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, []);

  const doc = useMemo(() => {
    const { entity_type, module, record_id, record_no } = item;
    const et = (entity_type || '').toLowerCase();
    const mod = (module || '').toLowerCase();
    const rec = (record_no || '').toLowerCase();

    // 1. Sales Invoice
    if (et === 'sales_invoice' || mod === 'sales') {
      const inv = invoices.find((i) => i.id === record_id || i.invoice_no === record_no);
      const cust = customers.find((c) => c.id === inv?.customer_id) || vendors.find((v) => v.id === inv?.customer_id);
      const wh = warehouses.find((w) => w.id === inv?.warehouse_id);
      const rawItems = inv?.items || [];
      const items = rawItems.map((it, idx) => {
        const prod = products.find((p) => p.id === it.product_id);
        const art = it.article_id || getArticleForProduct(it.product_id, products, productArticles) || prod?.article_name;
        return {
          id: it.id || String(idx + 1),
          name: prod?.name || it.description || `Item #${idx + 1}`,
          code: prod?.code || '',
          article: art || '',
          description: it.description,
          unit: (it as any).unit || prod?.unit || 'pcs',
          qty: Number(it.qty || 1),
          rate: Number(it.rate || prod?.sale_price || 0),
          discount: Number(it.discount || 0),
          taxPct: Number(it.tax_pct || 0),
          lineTotal: Number(it.line_total !== undefined ? it.line_total : ((it.qty * it.rate) - (it.discount || 0)) * (1 + (it.tax_pct || 0) / 100)),
        };
      });

      return {
        category: 'invoice',
        title: 'SALES / TAX INVOICE',
        badge: 'TAX INVOICE',
        icon: FileText,
        docNo: inv?.invoice_no || record_no,
        date: inv?.invoice_date || inv?.document_date || item.created_at,
        dueDate: inv?.due_date,
        partyTitle: 'CUSTOMER / BILL TO',
        partyName: cust?.name || item.party_name || 'Customer',
        partyCompany: cust?.company_name,
        partyAddress: cust?.address,
        partyCity: cust?.city,
        partyPhone: cust?.phone,
        partyTaxId: cust?.tax_id,
        warehouseName: wh?.name || 'Main Warehouse',
        warehouseCode: wh?.code,
        warehouseAddress: wh?.address,
        salesperson: inv?.salesperson,
        paymentTerms: inv?.payment_terms || 'Net 30 Days',
        gatePassNo: inv?.gate_pass_no,
        accountHead: inv?.account_head,
        subtotal: inv?.subtotal ?? Number(item.amount || 0),
        discountTotal: inv?.discount_total || 0,
        taxTotal: inv?.tax_total || 0,
        grandTotal: inv?.total_amount ?? Number(item.amount || 0),
        notes: inv?.notes,
        terms: inv?.terms_conditions,
        items,
      };
    }

    // 2. Purchase Invoice / GRN
    if (et === 'purchase_invoice' || mod === 'purchase') {
      const pi = purchaseInvoices.find((p) => p.id === record_id || p.grn_no === record_no || p.invoice_no === record_no);
      const vend = vendors.find((v) => v.id === pi?.vendor_id) || customers.find((c) => c.id === pi?.vendor_id);
      const wh = warehouses.find((w) => w.id === pi?.warehouse_id);
      const rawItems = pi?.items || [];
      const items = rawItems.map((it, idx) => {
        const prod = products.find((p) => p.id === it.product_id);
        const art = it.article_id || getArticleForProduct(it.product_id, products, productArticles) || prod?.article_name;
        return {
          id: it.id || String(idx + 1),
          name: prod?.name || it.description || `Item #${idx + 1}`,
          code: prod?.code || '',
          article: art || '',
          description: it.description,
          unit: it.unit || prod?.unit || 'pcs',
          qty: Number(it.qty || 1),
          rate: Number(it.rate || prod?.purchase_price || 0),
          discount: Number(it.discount || 0),
          taxPct: Number(it.tax_pct || 0),
          lineTotal: Number(it.line_total !== undefined ? it.line_total : ((it.qty * it.rate) - (it.discount || 0)) * (1 + (it.tax_pct || 0) / 100)),
        };
      });

      return {
        category: 'purchase',
        title: 'PURCHASE INVOICE / GOODS RECEIPT NOTE',
        badge: 'PURCHASE GRN',
        icon: ShoppingCart,
        docNo: pi?.grn_no || pi?.invoice_no || record_no,
        supplierRef: pi?.vendor_invoice_no,
        date: pi?.received_date || pi?.document_date || item.created_at,
        dueDate: pi?.due_date,
        partyTitle: 'VENDOR / CONSIGNOR',
        partyName: vend?.name || item.party_name || 'Vendor',
        partyCompany: vend?.company_name,
        partyAddress: vend?.address,
        partyCity: vend?.city,
        partyPhone: vend?.phone,
        partyTaxId: vend?.tax_id,
        warehouseName: wh?.name || 'Main Warehouse',
        warehouseCode: wh?.code,
        warehouseAddress: wh?.address,
        gatePassNo: pi?.gate_pass_no,
        accountHead: pi?.account_head,
        subtotal: pi?.subtotal ?? Number(item.amount || 0),
        discountTotal: pi?.discount_total || 0,
        taxTotal: pi?.tax_total || 0,
        grandTotal: pi?.total_amount ?? Number(item.amount || 0),
        notes: pi?.notes,
        items,
      };
    }

    // 3. Vendor Bill
    if (et === 'vendor_bill') {
      const vb = vendorBills.find((b) => b.id === record_id || b.bill_no === record_no);
      const vend = vendors.find((v) => v.id === vb?.vendor_id);
      const wh = warehouses.find((w) => w.id === vb?.warehouse_id);
      const rawItems = vb?.items || [];
      const items = rawItems.map((it, idx) => {
        const prod = products.find((p) => p.id === it.product_id);
        return {
          id: it.id || String(idx + 1),
          name: prod?.name || it.description || `Item #${idx + 1}`,
          code: prod?.code || '',
          article: getArticleForProduct(it.product_id, products, productArticles) || '',
          description: it.description,
          unit: prod?.unit || 'pcs',
          qty: Number(it.qty || 1),
          rate: Number(it.rate || 0),
          discount: Number(it.discount || 0),
          taxPct: Number(it.tax_pct || 0),
          lineTotal: Number(it.line_total || it.qty * it.rate),
        };
      });

      return {
        category: 'bill',
        title: 'VENDOR BILL / PROCUREMENT INVOICE',
        badge: 'VENDOR BILL',
        icon: ShoppingCart,
        docNo: vb?.bill_no || record_no,
        supplierRef: vb?.vendor_invoice_no,
        date: vb?.bill_date || vb?.document_date || item.created_at,
        dueDate: vb?.due_date,
        partyTitle: 'VENDOR / SUPPLIER',
        partyName: vend?.name || item.party_name || 'Vendor',
        partyAddress: vend?.address,
        partyPhone: vend?.phone,
        partyTaxId: vend?.tax_id,
        warehouseName: wh?.name || 'Main Warehouse',
        subtotal: vb?.subtotal ?? Number(item.amount || 0),
        discountTotal: vb?.discount_total || 0,
        taxTotal: vb?.tax_total || 0,
        grandTotal: vb?.total_amount ?? Number(item.amount || 0),
        notes: vb?.notes,
        items,
      };
    }

    // 4. Sales Return
    if (et === 'sales_return' || mod === 'sales return') {
      const sr = salesReturns.find((r) => r.id === record_id || r.return_no === record_no);
      const cust = customers.find((c) => c.id === sr?.customer_id);
      const wh = warehouses.find((w) => w.id === sr?.warehouse_id);
      const rawItems = sr?.items || [];
      const items = rawItems.map((it, idx) => {
        const prod = products.find((p) => p.id === it.product_id);
        const art = it.article_id || getArticleForProduct(it.product_id, products, productArticles) || prod?.article_name;
        return {
          id: it.id || String(idx + 1),
          name: prod?.name || it.description || `Returned Item #${idx + 1}`,
          code: prod?.code || '',
          article: art || '',
          description: it.description,
          unit: prod?.unit || 'pcs',
          qty: Number(it.qty || 1),
          rate: Number(it.rate || 0),
          discount: Number(it.discount || 0),
          taxPct: Number(it.tax_pct || 0),
          lineTotal: Number(it.line_total || it.qty * it.rate),
        };
      });

      return {
        category: 'sales_return',
        title: 'SALES RETURN VOUCHER / CREDIT NOTE',
        badge: 'SALES RETURN',
        icon: ArrowDownLeft,
        docNo: sr?.return_no || record_no,
        date: sr?.document_date || item.created_at,
        dueDate: sr?.due_date,
        partyTitle: 'CUSTOMER (CREDIT PARTY)',
        partyName: cust?.name || sr?.customer_name || item.party_name || 'Customer',
        partyAddress: cust?.address,
        partyPhone: cust?.phone,
        partyTaxId: cust?.tax_id,
        warehouseName: wh?.name || 'Main Warehouse',
        accountHead: sr?.account_head || 'Sales Returns & Allowances',
        subtotal: sr?.subtotal ?? Number(item.amount || 0),
        discountTotal: sr?.discount_total || 0,
        taxTotal: sr?.tax_total || 0,
        grandTotal: sr?.total_amount ?? Number(item.amount || 0),
        notes: sr?.notes || sr?.reason,
        items,
      };
    }

    // 5. Purchase Return
    if (et === 'purchase_return' || mod === 'purchase return') {
      const pr = purchaseReturns.find((r) => r.id === record_id || r.return_no === record_no);
      const vend = vendors.find((v) => v.id === pr?.vendor_id);
      const wh = warehouses.find((w) => w.id === pr?.warehouse_id);
      const rawItems = pr?.items || [];
      const items = rawItems.map((it, idx) => {
        const prod = products.find((p) => p.id === it.product_id);
        const art = it.article_id || getArticleForProduct(it.product_id, products, productArticles) || prod?.article_name;
        return {
          id: it.id || String(idx + 1),
          name: prod?.name || it.description || `Returned Item #${idx + 1}`,
          code: prod?.code || '',
          article: art || '',
          description: it.description,
          unit: prod?.unit || 'pcs',
          qty: Number(it.qty || 1),
          rate: Number(it.rate || 0),
          discount: Number(it.discount || 0),
          taxPct: Number(it.tax_pct || 0),
          lineTotal: Number(it.line_total || it.qty * it.rate),
        };
      });

      return {
        category: 'purchase_return',
        title: 'PURCHASE RETURN VOUCHER / DEBIT NOTE',
        badge: 'PURCHASE RETURN',
        icon: ArrowUpRight,
        docNo: pr?.return_no || record_no,
        date: pr?.document_date || item.created_at,
        dueDate: pr?.due_date,
        partyTitle: 'VENDOR (DEBIT PARTY)',
        partyName: vend?.name || pr?.vendor_name || item.party_name || 'Vendor',
        partyAddress: vend?.address,
        partyPhone: vend?.phone,
        partyTaxId: vend?.tax_id,
        warehouseName: wh?.name || 'Main Warehouse',
        accountHead: pr?.account_head || 'Purchase Returns & Allowances',
        subtotal: pr?.subtotal ?? Number(item.amount || 0),
        discountTotal: pr?.discount_total || 0,
        taxTotal: pr?.tax_total || 0,
        grandTotal: pr?.total_amount ?? Number(item.amount || 0),
        notes: pr?.notes,
        items,
      };
    }

    // 6. Customer Receipt (Receive Payment)
    if (et === 'customer_receipt' || et === 'payment_receipt' || mod === 'receive payment' || rec.startsWith('cr')) {
      const cr = customerReceipts.find((r) => r.id === record_id || r.receipt_no === record_no);
      const cust = customers.find((c) => c.id === cr?.customer_id) || vendors.find((v) => v.id === cr?.customer_id);
      const depositBank = bankAccounts.find((b) => b.id === cr?.deposit_account_id || b.account_name === cr?.deposit_to);

      return {
        category: 'payment',
        title: 'OFFICIAL PAYMENT RECEIPT VOUCHER',
        badge: 'RECEIVE PAYMENT',
        icon: Receipt,
        docNo: cr?.receipt_no || record_no,
        date: cr?.receipt_date || item.created_at,
        partyTitle: 'RECEIVED WITH THANKS FROM',
        partyName: cust?.name || cr?.customer_name || item.party_name || 'Customer',
        partyCompany: cust?.company_name,
        partyAddress: cust?.address,
        partyPhone: cust?.phone,
        partyTaxId: cust?.tax_id,
        paymentMethod: cr?.payment_method || 'Cash',
        accountName: depositBank ? `${depositBank.bank_name} (${depositBank.account_name})` : cr?.deposit_to || 'Cash Account',
        chequeNo: cr?.cheque_number,
        chequeDate: cr?.cheque_date,
        referenceNo: cr?.reference_no,
        grandTotal: Number(cr?.amount ?? item.amount ?? 0),
        notes: cr?.notes,
        items: [],
      };
    }

    // 7. Vendor Payment (Pay Payment)
    if (et === 'vendor_payment' || et === 'payment_voucher' || mod === 'pay payment' || rec.startsWith('cp') || rec.startsWith('pay-')) {
      const vp = vendorPayments.find((p) => p.id === record_id || p.payment_no === record_no);
      const vend = vendors.find((v) => v.id === vp?.vendor_id) || customers.find((c) => c.id === vp?.vendor_id);
      const bank = bankAccounts.find((b) => b.id === vp?.paid_from_account_id || b.account_name === vp?.payment_method);

      return {
        category: 'payment',
        title: 'BANK / CASH PAYMENT VOUCHER',
        badge: 'PAY PAYMENT',
        icon: CreditCard,
        docNo: vp?.payment_no || record_no,
        date: vp?.payment_date || item.created_at,
        partyTitle: 'PAID TO (BENEFICIARY / VENDOR)',
        partyName: vend?.name || vp?.vendor_name || item.party_name || 'Vendor',
        partyCompany: vend?.company_name,
        partyAddress: vend?.address,
        partyPhone: vend?.phone,
        partyTaxId: vend?.tax_id,
        paymentMethod: vp?.payment_method || 'Bank Transfer',
        accountName: bank ? `${bank.bank_name} (${bank.account_name})` : vp?.payment_method || 'Main Bank Account',
        chequeNo: vp?.cheque_number,
        chequeDate: vp?.cheque_date,
        referenceNo: vp?.reference_no,
        grandTotal: Number(vp?.amount ?? item.amount ?? 0),
        notes: vp?.notes,
        items: [],
      };
    }

    // Generic Fallback
    return {
      category: 'generic',
      title: 'EXECUTIVE APPROVAL DOCUMENT',
      badge: item.module || 'DOCUMENT',
      icon: FileText,
      docNo: record_no || 'DOC-000',
      date: item.created_at,
      partyTitle: 'PRIMARY PARTY',
      partyName: item.party_name || '—',
      grandTotal: Number(item.amount || 0),
      notes: item.items_summary,
      items: [],
    };
  }, [item, invoices, purchaseInvoices, vendorBills, salesReturns, purchaseReturns, customerReceipts, vendorPayments, customers, vendors, products, productArticles, warehouses, bankAccounts]);

  const handlePrint = () => {
    window.print();
  };

  const grandTotal = Number(doc.grandTotal || 0);

  return (
    <Modal
      open
      onClose={onClose}
      title="Executive Document Preview"
      subtitle={`${doc.docNo} — ${doc.title}`}
      size="xl"
      footer={
        <>
          <div className="mr-auto flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <span>Document Status: <strong className="text-slate-800 dark:text-slate-200">{item.status}</strong></span>
          </div>
          <button onClick={onClose} className="btn-secondary">
            <X className="h-4 w-4" /> Close
          </button>
          <button onClick={handlePrint} className="btn-primary">
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
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 px-3.5 py-1.5 text-amber-800 font-black text-xs uppercase tracking-wider mb-2">
              <doc.icon className="h-4 w-4 text-amber-600" />
              <span>{doc.title}</span>
            </div>
            <p className="text-xs font-bold text-slate-900">
              Document Ref No: <span className="font-mono text-sm">{doc.docNo}</span>
            </p>
            {doc.supplierRef && (
              <p className="text-xs text-slate-700 font-medium">
                Supplier Invoice #: <span className="font-mono">{doc.supplierRef}</span>
              </p>
            )}
            <p className="text-xs text-slate-700">
              Document Date: <span className="font-semibold">{formatDate(doc.date)}</span>
            </p>
            {doc.dueDate && (
              <p className="text-xs text-slate-700">
                Due Date: <span className="font-semibold">{formatDate(doc.dueDate)}</span>
              </p>
            )}
            {doc.gatePassNo && (
              <p className="text-xs text-slate-700 font-mono">
                Gate Pass No: <span>{doc.gatePassNo}</span>
              </p>
            )}
            {item.requested_by && (
              <p className="text-xs text-slate-600 mt-1">
                Requested By: <span className="font-semibold text-slate-900">{item.requested_by}</span>
              </p>
            )}
          </div>
        </div>

        {/* 2-Column Parties and Document Metadata */}
        <div className="mt-5 grid grid-cols-2 gap-6 text-xs">
          <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {doc.partyTitle}
            </p>
            <p className="text-sm font-bold text-slate-900">{doc.partyName}</p>
            {doc.partyCompany && <p className="font-medium text-slate-700">{doc.partyCompany}</p>}
            {doc.partyAddress && <p className="text-slate-600 mt-0.5">{doc.partyAddress}</p>}
            {doc.partyCity && <p className="text-slate-600">{doc.partyCity}</p>}
            {doc.partyPhone && <p className="text-slate-600">Phone: {doc.partyPhone}</p>}
            {doc.partyTaxId && <p className="text-slate-600 font-mono">NTN / STRN: {doc.partyTaxId}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              TRANSACTION / EXECUTION DETAILS
            </p>
            {doc.warehouseName && (
              <p className="text-xs font-semibold text-slate-800">
                Warehouse: <span className="font-bold text-slate-900">{doc.warehouseName}</span>
                {doc.warehouseCode && <span className="font-mono text-slate-500"> ({doc.warehouseCode})</span>}
              </p>
            )}
            {doc.paymentMethod && (
              <p className="text-xs text-slate-700 mt-0.5">
                Payment Mode: <span className="font-bold text-slate-900 uppercase">{doc.paymentMethod}</span>
              </p>
            )}
            {doc.accountName && (
              <p className="text-xs text-slate-700 mt-0.5">
                Bank / Deposit Account: <span className="font-semibold text-slate-900">{doc.accountName}</span>
              </p>
            )}
            {doc.chequeNo && (
              <p className="text-xs text-slate-700 font-mono mt-0.5">
                Cheque / Txn Ref: <span className="font-bold text-slate-900">{doc.chequeNo}</span>
              </p>
            )}
            {doc.salesperson && (
              <p className="text-xs text-slate-700 mt-0.5">
                Salesperson: <span className="font-semibold text-slate-900">{doc.salesperson}</span>
              </p>
            )}
            {doc.paymentTerms && (
              <p className="text-xs text-slate-700 mt-0.5">
                Terms: <span className="font-semibold text-slate-900">{doc.paymentTerms}</span>
              </p>
            )}
            <p className="text-slate-500 text-[10px] mt-1 font-mono">
              Approval Status: <span className="font-bold text-amber-700">{item.status}</span>
            </p>
          </div>
        </div>

        {/* Line Items Table (For Invoices, Purchases, Bills, Returns) */}
        {doc.items && doc.items.length > 0 ? (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300">
                  <th className="px-3 py-2.5 w-8">#</th>
                  <th className="px-3 py-2.5">Product Name & Specifications</th>
                  <th className="px-3 py-2.5 w-28">Article Head</th>
                  <th className="px-3 py-2.5 text-center w-20">Quantity</th>
                  <th className="px-3 py-2.5 text-right w-24">Unit Rate</th>
                  <th className="px-3 py-2.5 text-right w-20">Discount</th>
                  <th className="px-3 py-2.5 text-right w-16">Tax %</th>
                  <th className="px-3 py-2.5 text-right w-28">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {doc.items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-bold text-slate-900 block text-xs">{it.name}</span>
                      {it.code && <span className="text-[10px] text-slate-500 font-mono">SKU: {it.code}</span>}
                      {it.description && it.description !== it.name && (
                        <span className="text-[10px] text-slate-500 block italic">{it.description}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {it.article ? (
                        <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                          {it.article}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-900 font-mono">
                      {it.qty} <span className="text-[10px] font-normal text-slate-500">{it.unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                      {formatCurrency(it.rate)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                      {it.discount > 0 ? formatCurrency(it.discount) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                      {it.taxPct > 0 ? `${it.taxPct}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : doc.category === 'payment' ? (
          <div className="mt-5 rounded-xl border border-slate-300 p-4 bg-slate-50/50 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
              <span className="font-bold text-slate-700 uppercase">Payment Voucher Allocation / Description</span>
              <span className="font-bold font-mono text-base text-slate-900">{formatCurrency(grandTotal)}</span>
            </div>
            <p className="text-slate-700 font-medium">
              Payment voucher processed for <strong className="text-slate-900">{doc.partyName}</strong> via{' '}
              <strong className="text-slate-900 uppercase">{doc.paymentMethod}</strong> ({doc.accountName}).
            </p>
          </div>
        ) : null}

        {/* Financial Summary & Amount in Words */}
        <div className="mt-5 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-2 flex-1 max-w-md">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Amount in Words
              </span>
              <p className="font-semibold text-slate-800 italic mt-0.5">
                {amountToWords(grandTotal)}
              </p>
            </div>

            {doc.notes && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Remarks / Purpose
                </span>
                <p className="text-slate-700 italic whitespace-pre-line mt-0.5">{doc.notes}</p>
              </div>
            )}
          </div>

          <div className="w-64 space-y-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
            {doc.subtotal !== undefined && (
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal:</span>
                <span className="font-mono font-semibold">{formatCurrency(Number(doc.subtotal))}</span>
              </div>
            )}
            {Number(doc.discountTotal || 0) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Total Discount:</span>
                <span className="font-mono font-semibold">-{formatCurrency(Number(doc.discountTotal))}</span>
              </div>
            )}
            {Number(doc.taxTotal || 0) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Total Tax / VAT:</span>
                <span className="font-mono font-semibold">+{formatCurrency(Number(doc.taxTotal))}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-black text-slate-900">
              <span>Total Requisition:</span>
              <span className="font-mono text-amber-700">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Executive 3-Column Signatures */}
        <div className="mt-14 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-800">
          <div className="border-t border-slate-500 pt-2">
            <p>Prepared / Requested By</p>
            <span className="text-[10px] font-normal text-slate-500">{item.requested_by || 'Staff'}</span>
          </div>
          <div className="border-t border-slate-500 pt-2">
            <p>Verified / Audited By</p>
            <span className="text-[10px] font-normal text-slate-500">Internal Audit & Verification</span>
          </div>
          <div className="border-t border-slate-500 pt-2">
            <p>Authorized Approval</p>
            <span className="text-[10px] font-normal text-slate-500">
              {item.reviewed_by ? `${item.reviewed_by} (${formatDate(item.reviewed_at || '')})` : 'Executive Management'}
            </span>
          </div>
        </div>

        {/* Formal Footer */}
        <p className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2">
          Official Executive Document · NICE ENTERPRISES Governance & Audit Suite · Generated on {formatDate(new Date())}
        </p>

      </div>
    </Modal>
  );
}
