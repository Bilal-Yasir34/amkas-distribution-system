import { useState, useMemo } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  ShieldCheck,
  Eye,
  X,
  User,
  Building2,
  Calendar,
  MapPin,
  AlertCircle,
  Tag
} from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { ApprovalQueueItem } from '@/lib/types';

export function Approvals() {
  const toast = useToast();
  const {
    approvalQueue = [],
    reviewApproval,
    warehouses = [],
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
    bankAccounts = [],
  } = useDataStore();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalQueueItem | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const handleApprove = (id: string, recordNo: string, entityType?: string, customNote?: string) => {
    reviewApproval(id, 'APPROVED', customNote || 'Approved by administrator');
    const label = entityType ? entityType.replace('_', ' ').toUpperCase() : 'Document';
    toast.success(`${label} ${recordNo} approved and posted to ledger!`);
    if (selectedRequest && selectedRequest.id === id) {
      setSelectedRequest((prev) => (prev ? { ...prev, status: 'APPROVED', review_note: customNote || 'Approved by administrator', reviewed_by: 'Administrator', reviewed_at: new Date().toISOString() } : null));
    }
  };

  const handleReject = (id: string, recordNo: string, entityType?: string, customNote?: string) => {
    reviewApproval(id, 'REJECTED', customNote || 'Rejected by administrator');
    const label = entityType ? entityType.replace('_', ' ').toUpperCase() : 'Document';
    toast.error(`${label} ${recordNo} rejected`);
    if (selectedRequest && selectedRequest.id === id) {
      setSelectedRequest((prev) => (prev ? { ...prev, status: 'REJECTED', review_note: customNote || 'Rejected by administrator', reviewed_by: 'Administrator', reviewed_at: new Date().toISOString() } : null));
    }
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
        (item.requested_by || '').toLowerCase().includes(q) ||
        (item.requested_by_name || '').toLowerCase().includes(q) ||
        (item.requested_by_role || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [approvalQueue, filterStatus, searchTerm]);

  // Helper to parse Requester Name & Role based strictly on login / registration state
  const getRequesterInfo = (item: ApprovalQueueItem) => {
    const rawRole = (item.requested_by_role || '').trim();
    const rawName = (item.requested_by_name || '').trim();

    if (rawRole) {
      const isAdminRole = rawRole.toLowerCase().includes('admin');
      const roleName = isAdminRole ? 'Admin' : rawRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const isGenericAdmin = rawName.toLowerCase() === 'super admin' || rawName.toLowerCase() === 'admin';
      const cleanName = isGenericAdmin ? '' : rawName;

      return {
        name: cleanName,
        role: roleName,
        hasName: Boolean(cleanName),
      };
    }

    const raw = (item.requested_by || 'Admin').trim();
    const match = raw.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    if (match && match[2]) {
      const name = match[1].trim();
      const roleRaw = match[2].trim();
      const isAdminRole = roleRaw.toLowerCase().includes('admin');
      const roleName = isAdminRole ? 'Admin' : roleRaw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const isGenericAdmin = name.toLowerCase() === 'super admin' || name.toLowerCase() === 'admin';
      const cleanName = isGenericAdmin ? '' : name;

      return {
        name: cleanName,
        role: roleName,
        hasName: Boolean(cleanName),
      };
    }

    if (raw.toLowerCase().includes('admin')) {
      return {
        name: '',
        role: 'Admin',
        hasName: false,
      };
    }

    const formattedRole = raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      name: '',
      role: formattedRole,
      hasName: false,
    };
  };

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
            <ShoppingCart className="h-3 w-3" /> Purchase / GRN
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

  // Find detailed underlying record for the modal review
  const selectedDetails = useMemo(() => {
    if (!selectedRequest) return null;
    const { entity_type, module, record_id, record_no } = selectedRequest;
    const et = (entity_type || '').toLowerCase();
    const mod = (module || '').toLowerCase();
    const rec = (record_no || '').toLowerCase();

    // Sales Invoice
    if (et === 'sales_invoice' || mod === 'sales') {
      const inv = invoices.find((i) => i.id === record_id || i.invoice_no === record_no);
      if (inv) {
        const cust = customers.find((c) => c.id === inv.customer_id) || vendors.find((v) => v.id === inv.customer_id);
        const wh = warehouses.find((w) => w.id === inv.warehouse_id);
        return {
          type: 'sales_invoice',
          title: 'Sales Invoice',
          recordNo: inv.invoice_no,
          date: inv.invoice_date,
          dueDate: inv.due_date,
          partyType: 'Customer',
          partyName: cust?.name || selectedRequest.party_name || 'Customer',
          partyAddress: cust?.address,
          partyPhone: cust?.phone,
          partyTaxId: cust?.tax_id,
          warehouse: wh ? `${wh.code} - ${wh.name}` : inv.warehouse_id,
          salesperson: inv.salesperson,
          paymentTerms: inv.payment_terms,
          accountHead: inv.account_head,
          gatePassNo: inv.gate_pass_no,
          subtotal: inv.subtotal,
          discountTotal: inv.discount_total,
          taxTotal: inv.tax_total,
          grandTotal: inv.total_amount,
          notes: inv.notes,
          termsConditions: inv.terms_conditions,
          items: (inv.items || []).map((it) => {
            const prod = products.find((p) => p.id === it.product_id);
            return {
              productName: prod?.name || it.description || 'Product',
              sku: prod?.code || '',
              description: it.description,
              qty: it.qty,
              unit: (it as any).unit || prod?.unit || 'pcs',
              rate: it.rate,
              discount: it.discount,
              taxPct: it.tax_pct,
              lineTotal: it.line_total,
            };
          }),
        };
      }
    }

    // Purchase Invoice / GRN
    if (et === 'purchase_invoice' || mod === 'purchase') {
      const pi = purchaseInvoices.find((p) => p.id === record_id || p.grn_no === record_no || p.invoice_no === record_no);
      if (pi) {
        const vend = vendors.find((v) => v.id === pi.vendor_id);
        const wh = warehouses.find((w) => w.id === pi.warehouse_id);
        return {
          type: 'purchase_invoice',
          title: 'Purchase Invoice / GRN',
          recordNo: pi.grn_no || pi.invoice_no || record_no,
          vendorInvoiceNo: pi.vendor_invoice_no,
          date: pi.received_date || pi.document_date || '',
          dueDate: pi.due_date,
          partyType: 'Vendor',
          partyName: vend?.name || selectedRequest.party_name || 'Vendor',
          partyAddress: vend?.address,
          partyPhone: vend?.phone,
          partyTaxId: vend?.tax_id,
          warehouse: wh ? `${wh.code} - ${wh.name}` : pi.warehouse_id,
          accountHead: pi.account_head,
          gatePassNo: pi.gate_pass_no,
          subtotal: pi.subtotal ?? (pi.total_amount || 0),
          discountTotal: pi.discount_total || 0,
          taxTotal: pi.tax_total || 0,
          grandTotal: pi.total_amount || 0,
          notes: pi.notes,
          items: (pi.items || []).map((it) => {
            const prod = products.find((p) => p.id === it.product_id);
            return {
              productName: prod?.name || it.description || 'Product',
              sku: prod?.code || '',
              description: it.description,
              qty: it.qty,
              unit: it.unit || prod?.unit || 'pcs',
              rate: it.rate,
              discount: it.discount,
              taxPct: it.tax_pct,
              lineTotal: it.line_total,
            };
          }),
        };
      }
    }

    // Vendor Bill
    if (et === 'vendor_bill') {
      const vb = vendorBills.find((b) => b.id === record_id || b.bill_no === record_no);
      if (vb) {
        const vend = vendors.find((v) => v.id === vb.vendor_id);
        const wh = warehouses.find((w) => w.id === vb.warehouse_id);
        return {
          type: 'vendor_bill',
          title: 'Vendor Bill',
          recordNo: vb.bill_no,
          vendorInvoiceNo: vb.vendor_invoice_no,
          date: vb.bill_date || vb.document_date || '',
          dueDate: vb.due_date,
          partyType: 'Vendor',
          partyName: vend?.name || selectedRequest.party_name || 'Vendor',
          partyAddress: vend?.address,
          partyPhone: vend?.phone,
          partyTaxId: vend?.tax_id,
          warehouse: wh ? `${wh.code} - ${wh.name}` : vb.warehouse_id,
          accountHead: vb.account_head,
          subtotal: vb.subtotal,
          discountTotal: vb.discount_total,
          taxTotal: vb.tax_total,
          grandTotal: vb.total_amount,
          notes: vb.notes,
          items: (vb.items || []).map((it) => {
            const prod = products.find((p) => p.id === it.product_id);
            return {
              productName: prod?.name || it.description || 'Product',
              sku: prod?.code || '',
              description: it.description,
              qty: it.qty,
              unit: prod?.unit || 'pcs',
              rate: it.rate,
              discount: it.discount || 0,
              taxPct: it.tax_pct || 0,
              lineTotal: it.line_total,
            };
          }),
        };
      }
    }

    // Sales Return
    if (et === 'sales_return' || mod === 'sales return') {
      const sr = salesReturns.find((r) => r.id === record_id || r.return_no === record_no);
      if (sr) {
        const cust = customers.find((c) => c.id === sr.customer_id);
        const wh = warehouses.find((w) => w.id === sr.warehouse_id);
        return {
          type: 'sales_return',
          title: 'Sales Return',
          recordNo: sr.return_no,
          date: sr.document_date || '',
          dueDate: sr.due_date,
          partyType: 'Customer',
          partyName: cust?.name || sr.customer_name || selectedRequest.party_name || 'Customer',
          partyAddress: cust?.address,
          partyPhone: cust?.phone,
          partyTaxId: cust?.tax_id,
          warehouse: wh ? `${wh.code} - ${wh.name}` : sr.warehouse_id,
          accountHead: sr.account_head,
          subtotal: sr.subtotal,
          discountTotal: sr.discount_total || 0,
          taxTotal: sr.tax_total || 0,
          grandTotal: sr.total_amount,
          notes: sr.notes || sr.reason,
          items: (sr.items || []).map((it) => {
            const prod = products.find((p) => p.id === it.product_id);
            return {
              productName: prod?.name || it.description || 'Product',
              sku: prod?.code || '',
              description: it.description,
              qty: it.qty,
              unit: prod?.unit || 'pcs',
              rate: it.rate,
              discount: it.discount || 0,
              taxPct: it.tax_pct || 0,
              lineTotal: it.line_total || it.qty * it.rate,
            };
          }),
        };
      }
    }

    // Purchase Return
    if (et === 'purchase_return' || mod === 'purchase return') {
      const pr = purchaseReturns.find((r) => r.id === record_id || r.return_no === record_no);
      if (pr) {
        const vend = vendors.find((v) => v.id === pr.vendor_id);
        const wh = warehouses.find((w) => w.id === pr.warehouse_id);
        return {
          type: 'purchase_return',
          title: 'Purchase Return',
          recordNo: pr.return_no,
          date: pr.document_date || '',
          dueDate: pr.due_date,
          partyType: 'Vendor',
          partyName: vend?.name || pr.vendor_name || selectedRequest.party_name || 'Vendor',
          partyAddress: vend?.address,
          partyPhone: vend?.phone,
          partyTaxId: vend?.tax_id,
          warehouse: wh ? `${wh.code} - ${wh.name}` : pr.warehouse_id,
          accountHead: pr.account_head,
          subtotal: pr.subtotal,
          discountTotal: pr.discount_total || 0,
          taxTotal: pr.tax_total || 0,
          grandTotal: pr.total_amount,
          notes: pr.notes,
          items: (pr.items || []).map((it) => {
            const prod = products.find((p) => p.id === it.product_id);
            return {
              productName: prod?.name || it.description || 'Product',
              sku: prod?.code || '',
              description: it.description,
              qty: it.qty,
              unit: prod?.unit || 'pcs',
              rate: it.rate,
              discount: it.discount || 0,
              taxPct: it.tax_pct || 0,
              lineTotal: it.line_total || it.qty * it.rate,
            };
          }),
        };
      }
    }

    // Customer Receipt (Receive Payment)
    if (et === 'customer_receipt' || et === 'payment_receipt' || mod === 'receive payment' || rec.startsWith('cr')) {
      const cr = customerReceipts.find((r) => r.id === record_id || r.receipt_no === record_no);
      if (cr) {
        const cust = customers.find((c) => c.id === cr.customer_id);
        const depositBank = bankAccounts.find((b) => b.id === cr.deposit_account_id || b.account_name === cr.deposit_to);
        return {
          type: 'customer_receipt',
          title: 'Customer Payment Receipt',
          recordNo: cr.receipt_no,
          date: cr.receipt_date,
          partyType: 'Customer',
          partyName: cust?.name || cr.customer_name || selectedRequest.party_name || 'Customer',
          partyAddress: cust?.address,
          partyPhone: cust?.phone,
          partyTaxId: cust?.tax_id,
          paymentMethod: cr.payment_method,
          accountName: depositBank ? `${depositBank.bank_name} - ${depositBank.account_name}` : cr.deposit_to || cr.deposit_account_id,
          chequeNo: cr.cheque_number,
          chequeDate: cr.cheque_date,
          referenceNo: cr.reference_no,
          grandTotal: cr.amount,
          notes: cr.notes,
        };
      }
    }

    // Vendor Payment (Pay Payment)
    if (et === 'vendor_payment' || et === 'payment_voucher' || mod === 'pay payment' || rec.startsWith('cp') || rec.startsWith('pay-')) {
      const vp = vendorPayments.find((p) => p.id === record_id || p.payment_no === record_no);
      if (vp) {
        const vend = vendors.find((v) => v.id === vp.vendor_id);
        const bank = bankAccounts.find((b) => b.id === vp.paid_from_account_id || b.account_name === vp.pay_from);
        return {
          type: 'vendor_payment',
          title: 'Vendor Payment Voucher',
          recordNo: vp.payment_no,
          date: vp.payment_date,
          partyType: 'Vendor',
          partyName: vend?.name || vp.vendor_name || selectedRequest.party_name || 'Vendor',
          partyAddress: vend?.address,
          partyPhone: vend?.phone,
          partyTaxId: vend?.tax_id,
          paymentMethod: vp.payment_method,
          accountName: bank ? `${bank.bank_name} - ${bank.account_name}` : vp.pay_from || vp.paid_from_account_id,
          chequeNo: vp.cheque_number,
          chequeDate: vp.cheque_date,
          referenceNo: vp.reference_no,
          grandTotal: vp.amount,
          notes: vp.notes,
        };
      }
    }

    // Fallback if full record wasn't found
    return {
      type: 'generic',
      title: selectedRequest.module || 'Document Request',
      recordNo: selectedRequest.record_no || '—',
      date: selectedRequest.created_at || '',
      partyType: 'Party',
      partyName: selectedRequest.party_name || '—',
      warehouse: getWarehouseName(selectedRequest.warehouse_id),
      grandTotal: selectedRequest.amount || 0,
      notes: selectedRequest.items_summary,
    };
  }, [selectedRequest, invoices, purchaseInvoices, vendorBills, salesReturns, purchaseReturns, customerReceipts, vendorPayments, customers, vendors, warehouses, products, bankAccounts]);

  const openReviewModal = (item: ApprovalQueueItem) => {
    setSelectedRequest(item);
    setReviewNote(item.review_note || '');
  };

  const closeReviewModal = () => {
    setSelectedRequest(null);
    setReviewNote('');
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
            Pending Sales, Purchases, Returns, and Payments require verification before ledger posting and inventory adjustments.
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

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search record, party, requester..."
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
              filtered.map((item) => {
                const requester = getRequesterInfo(item);
                return (
                  <tr
                    key={item.id}
                    onClick={() => openReviewModal(item)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    <td className="px-3 py-2 whitespace-nowrap font-medium">
                      {getEntityBadge(item.entity_type, item.module, item.record_no)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono font-bold text-amber-500 group-hover:underline">
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
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-col">
                        {requester.hasName ? (
                          <>
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                              {requester.name}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                              {requester.role}
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20 w-fit">
                            {requester.role}
                          </span>
                        )}
                      </div>
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
                    <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openReviewModal(item)}
                          className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition"
                          title="View all details"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          <span>Review</span>
                        </button>

                        {item.status === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(item.id, item.record_no || '', item.entity_type)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-emerald-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(item.id, item.record_no || '', item.entity_type)}
                              className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-rose-700 transition"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-500 pl-1">
                            {item.reviewed_by || 'Admin'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* COMPREHENSIVE APPROVAL REVIEW MODAL */}
      {selectedRequest && selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500 border border-amber-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {selectedDetails.title}
                    </h2>
                    <span className="font-mono text-sm font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      #{selectedDetails.recordNo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Audit and approve document request before general ledger posting
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    selectedRequest.status === 'APPROVED'
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : selectedRequest.status === 'REJECTED'
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse'
                  }`}
                >
                  {selectedRequest.status === 'APPROVED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {selectedRequest.status === 'REJECTED' && <XCircle className="h-3.5 w-3.5" />}
                  {selectedRequest.status === 'PENDING' && <Clock className="h-3.5 w-3.5" />}
                  {selectedRequest.status}
                </span>
                <button
                  onClick={closeReviewModal}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-200 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Requester & Requisition Info Header Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
                
                {/* Requested By Info */}
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500 border border-indigo-500/20">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted By</p>
                    {getRequesterInfo(selectedRequest).hasName ? (
                      <>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                          {getRequesterInfo(selectedRequest).name}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20 mt-1">
                          Role: {getRequesterInfo(selectedRequest).role}
                        </span>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-amber-500 mt-0.5">
                        {getRequesterInfo(selectedRequest).role}
                      </p>
                    )}
                  </div>
                </div>

                {/* Party Information */}
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 border border-emerald-500/20">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {selectedDetails.partyType || 'Party'} Details
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {selectedDetails.partyName}
                    </p>
                    {selectedDetails.partyPhone && (
                      <p className="text-xs text-slate-400">{selectedDetails.partyPhone}</p>
                    )}
                    {selectedDetails.partyTaxId && (
                      <p className="text-[10px] text-slate-400 font-mono">NTN/STRN: {selectedDetails.partyTaxId}</p>
                    )}
                  </div>
                </div>

                {/* Date & Location Information */}
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500 border border-amber-500/20">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doc Date & Location</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      Date: {formatDate(selectedDetails.date || selectedRequest.created_at || '')}
                    </p>
                    {selectedDetails.warehouse && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-500" />
                        {selectedDetails.warehouse}
                      </p>
                    )}
                    {selectedDetails.gatePassNo && (
                      <p className="text-[10px] text-slate-500 font-mono">Gate Pass: {selectedDetails.gatePassNo}</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Extra Document Details (e.g. for Receipts/Payments or Invoices) */}
              {(selectedDetails.paymentMethod || selectedDetails.accountName || selectedDetails.vendorInvoiceNo || selectedDetails.salesperson) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs">
                  {selectedDetails.paymentMethod && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Mode</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{selectedDetails.paymentMethod}</span>
                    </div>
                  )}
                  {selectedDetails.accountName && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Account</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDetails.accountName}</span>
                    </div>
                  )}
                  {selectedDetails.chequeNo && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Cheque / Ref No</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedDetails.chequeNo}</span>
                    </div>
                  )}
                  {selectedDetails.vendorInvoiceNo && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Supplier Invoice No</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedDetails.vendorInvoiceNo}</span>
                    </div>
                  )}
                  {selectedDetails.salesperson && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Salesperson</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDetails.salesperson}</span>
                    </div>
                  )}
                  {selectedDetails.paymentTerms && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Terms</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDetails.paymentTerms}</span>
                    </div>
                  )}
                </div>
              )}

              {/* LINE ITEMS TABLE (for Invoices, Purchases, Returns) */}
              {selectedDetails.items && selectedDetails.items.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-amber-500" />
                      Document Line Items ({selectedDetails.items.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Item / Description</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">Unit Rate</th>
                          <th className="px-3 py-2 text-right">Discount</th>
                          <th className="px-3 py-2 text-right">Tax</th>
                          <th className="px-3 py-2 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedDetails.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                {item.productName}
                              </span>
                              {item.sku && (
                                <span className="text-[10px] text-slate-500 font-mono block">Code: {item.sku}</span>
                              )}
                              {item.description && item.description !== item.productName && (
                                <span className="text-[10px] text-slate-400 block">{item.description}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-slate-800 dark:text-slate-200">
                              {item.qty} <span className="text-[10px] font-normal text-slate-400">{item.unit || 'pcs'}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                              {formatCurrency(Number(item.rate || 0))}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-500">
                              {item.discount ? formatCurrency(Number(item.discount)) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-500">
                              {item.taxPct ? `${item.taxPct}%` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                              {formatCurrency(Number(item.lineTotal || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : selectedRequest.items_summary ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Items Summary</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{selectedRequest.items_summary}</p>
                </div>
              ) : null}

              {/* Financial Totals & Summary Card */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="space-y-1">
                  {selectedDetails.notes && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Notes / Remarks</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic">{selectedDetails.notes}</p>
                    </div>
                  )}
                  {selectedDetails.termsConditions && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Terms & Conditions</span>
                      <p className="text-[11px] text-slate-500">{selectedDetails.termsConditions}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-64 space-y-1.5 text-xs">
                  {selectedDetails.subtotal !== undefined && (
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-mono">{formatCurrency(Number(selectedDetails.subtotal))}</span>
                    </div>
                  )}
                  {selectedDetails.discountTotal ? (
                    <div className="flex justify-between text-emerald-500">
                      <span>Discount Total:</span>
                      <span className="font-mono">-{formatCurrency(Number(selectedDetails.discountTotal))}</span>
                    </div>
                  ) : null}
                  {selectedDetails.taxTotal ? (
                    <div className="flex justify-between text-slate-500">
                      <span>Tax Total:</span>
                      <span className="font-mono">+{formatCurrency(Number(selectedDetails.taxTotal))}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-sm font-black border-t border-slate-200 dark:border-slate-700 pt-2 text-slate-900 dark:text-white">
                    <span>Total Amount:</span>
                    <span className="font-mono text-amber-500">{formatCurrency(Number(selectedDetails.grandTotal))}</span>
                  </div>
                </div>
              </div>

              {/* Review History / Notes Input */}
              {selectedRequest.status === 'PENDING' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    Reviewer Notes / Verification Remarks (Optional)
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Enter approval note or reason for rejection..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 transition"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 p-3 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Audit Trail</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                    {selectedRequest.status === 'APPROVED' ? 'Approved' : 'Rejected'} by{' '}
                    <strong className="text-slate-900 dark:text-slate-100">{selectedRequest.reviewed_by || 'Administrator'}</strong> on{' '}
                    {formatDate(selectedRequest.reviewed_at || '')}
                  </p>
                  {selectedRequest.review_note && (
                    <p className="text-slate-500 italic mt-1 bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                      "{selectedRequest.review_note}"
                    </p>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={closeReviewModal}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Close Window
              </button>

              {selectedRequest.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleReject(selectedRequest.id, selectedRequest.record_no || '', selectedRequest.entity_type, reviewNote);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 transition"
                  >
                    <XCircle className="h-4 w-4" /> Reject Request
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleApprove(selectedRequest.id, selectedRequest.record_no || '', selectedRequest.entity_type, reviewNote);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve & Post Request
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
