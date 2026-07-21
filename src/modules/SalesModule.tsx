import { useState } from 'react';
import {
  Plus,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  Printer,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  X,
  Trash2,
  Edit,
  ArrowRight,
} from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO } from '@/lib/utils';
import { InvoicePrint } from '@/components/InvoicePrint';
import type { SalesInvoice, Customer } from '@/lib/types';

export function SalesModule() {
  const toast = useToast();
  const {
    customers,
    products,
    warehouses,
    invoices,
    quotations,
    salesOrders,
    creditNotes,
    customerReceipts,
    commissions,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addQuotation,
    deleteQuotation,
    updateQuotation,
    addSalesOrder,
    deleteSalesOrder,
    updateSalesOrder,
    addCreditNote,
    deleteCreditNote,
    addCustomerReceipt,
    deleteCustomerReceipt,
  } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<
    'Overview' | 'Quotations' | 'Sales Orders' | 'Invoices' | 'Credit Notes' | 'Receipts' | 'Pipeline' | 'Commissions'
  >('Invoices');

  // Modals state
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [genericModalOpen, setGenericModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printInvoice, setPrintInvoice] = useState<SalesInvoice | null>(null);

  // Generic Form State
  const [genericCustId, setGenericCustId] = useState('');
  const [genericAmount, setGenericAmount] = useState('1000');
  const [genericNotes, setGenericNotes] = useState('');

  // Invoice Form State
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [docDate, setDocDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [salesperson, setSalesperson] = useState('admin');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [gatePassNo, setGatePassNo] = useState('');
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState([
    { id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 },
  ]);

  const openCreateInvoice = () => {
    setEditingId(null);
    setCustomerId(customers[0]?.id || '');
    setWarehouseId(warehouses[0]?.id || '');
    setDocDate(todayISO());
    setDueDate(todayISO());
    setSalesperson('admin');
    setPaymentTerms('Net 30');
    setGatePassNo('');
    setNotes('');
    setLineItems([
      { id: crypto.randomUUID(), product_id: products[0]?.id || '', description: products[0]?.name || '', qty: 1, rate: products[0]?.sale_price || 0, discount: 0, tax_pct: 0 },
    ]);
    setNewInvoiceOpen(true);
  };

  const openGenericModal = () => {
    setGenericCustId(customers[0]?.id || '');
    setGenericAmount('1000');
    setGenericNotes('');
    setGenericModalOpen(true);
  };

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 },
    ]);
  };

  const updateLine = (id: string, patch: Partial<(typeof lineItems)[0]>) => {
    setLineItems((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const updated = { ...l, ...patch };
          if (patch.product_id) {
            const p = products.find((x) => x.id === patch.product_id);
            if (p) {
              updated.description = p.name;
              updated.rate = p.sale_price;
            }
          }
          return updated;
        }
        return l;
      })
    );
  };

  const removeLine = (id: string) => {
    if (lineItems.length > 1) setLineItems((prev) => prev.filter((l) => l.id !== id));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    lineItems.forEach((l) => {
      const gross = l.qty * l.rate;
      subtotal += gross;
      discountTotal += l.discount;
      taxTotal += (gross - l.discount) * (l.tax_pct / 100);
    });
    return { subtotal, discountTotal, taxTotal, grandTotal: subtotal - discountTotal + taxTotal };
  };

  const totals = calculateTotals();

  const handleSaveInvoice = (status: 'UNPOSTED' | 'POSTED') => {
    if (!customerId) return toast.error('Please select a customer');

    if (editingId) {
      updateInvoice(editingId, {
        customer_id: customerId,
        warehouse_id: warehouseId,
        invoice_date: docDate,
        due_date: dueDate,
        salesperson,
        payment_terms: paymentTerms,
        gate_pass_no: gatePassNo,
        status,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes,
      });
      toast.success(`Invoice updated (${status})`);
    } else {
      const invoiceNo = `MS-${String(invoices.length + 1).padStart(5, '0')}`;
      addInvoice({
        invoice_no: invoiceNo,
        customer_id: customerId,
        warehouse_id: warehouseId,
        invoice_date: docDate,
        due_date: dueDate,
        salesperson,
        currency: 'PKR',
        exchange_rate: 1,
        payment_terms: paymentTerms,
        account_head: 'Default Sales Revenue',
        gate_pass_no: gatePassNo,
        status,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        paid_amount: 0,
        notes,
        created_by: 'admin',
        created_at: new Date().toISOString(),
      });
      toast.success(`Invoice ${invoiceNo} ${status.toLowerCase()}`);
    }
    setNewInvoiceOpen(false);
  };

  const handleSaveGenericRecord = () => {
    const cust = customers.find((c) => c.id === genericCustId);
    const amountVal = Number(genericAmount) || 1000;

    if (activeSubTab === 'Quotations') {
      const qNo = `MQ-${String(quotations.length + 1).padStart(5, '0')}`;
      addQuotation({
        quotation_no: qNo,
        customer_id: genericCustId,
        quotation_date: todayISO(),
        valid_until: todayISO(),
        salesperson: 'admin',
        currency: 'PKR',
        status: 'OPEN',
        subtotal: amountVal,
        tax_total: 0,
        total_amount: amountVal,
        notes: genericNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Quotation ${qNo} created and added to Quotations register!`);
    } else if (activeSubTab === 'Sales Orders') {
      const soNo = `MSO-${String(salesOrders.length + 1).padStart(5, '0')}`;
      addSalesOrder({
        order_no: soNo,
        customer_id: genericCustId,
        warehouse_id: warehouses[0]?.id || 'w1',
        order_date: todayISO(),
        salesperson: 'admin',
        currency: 'PKR',
        status: 'CONFIRMED',
        subtotal: amountVal,
        tax_total: 0,
        total_amount: amountVal,
        notes: genericNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Sales Order ${soNo} created and added to Sales Orders register!`);
    } else if (activeSubTab === 'Credit Notes') {
      const cnNo = `MCN-${String(creditNotes.length + 1).padStart(5, '0')}`;
      addCreditNote({
        credit_note_no: cnNo,
        sales_invoice_id: null,
        customer_id: genericCustId,
        note_date: todayISO(),
        reason: genericNotes || 'Sales Return',
        status: 'POSTED',
        total_amount: amountVal,
        created_at: new Date().toISOString(),
      });
      toast.success(`Credit Note ${cnNo} created and added to Credit Notes register!`);
    } else if (activeSubTab === 'Receipts') {
      const rNo = `CR-${String(customerReceipts.length + 1).padStart(5, '0')}`;
      addCustomerReceipt({
        receipt_no: rNo,
        customer_id: genericCustId,
        receipt_date: todayISO(),
        payment_method: 'Cash',
        deposit_account_id: 'Cash in Hand',
        amount: amountVal,
        notes: genericNotes,
        status: 'POSTED',
        created_at: new Date().toISOString(),
      });
      toast.success(`Receipt ${rNo} created and added to Receipts register!`);
    }

    setGenericModalOpen(false);
  };

  const totalInvoicedSum = invoices.reduce((acc, i) => acc + (i.total_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sales Management</h1>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {[
          'Overview',
          'Quotations',
          'Sales Orders',
          'Invoices',
          'Credit Notes',
          'Receipts',
          'Pipeline',
          'Commissions',
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab as any)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
              activeSubTab === tab
                ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeSubTab === 'Overview' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL INVOICED</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                Rs. {totalInvoicedSum.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">QUOTATIONS</p>
              <p className="mt-1 text-2xl font-extrabold text-amber-500">{quotations.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES ORDERS</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-500">{salesOrders.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CREDIT NOTES</p>
              <p className="mt-1 text-2xl font-extrabold text-rose-500">{creditNotes.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* INVOICES TAB */}
      {activeSubTab === 'Invoices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Invoice register</h2>
            </div>
            <button
              onClick={openCreateInvoice}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New invoice
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No invoices recorded yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const cust = customers.find((c) => c.id === inv.customer_id);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{inv.invoice_no}</td>
                        <td className="px-4 py-3 text-slate-400">{inv.invoice_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{cust?.name || 'OTEX ENTERPRISES'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                          Rs. {inv.total_amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${inv.status === 'POSTED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setPrintInvoice(inv)} className="p-1 text-slate-400 hover:text-white">
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { deleteInvoice(inv.id); toast.success('Invoice deleted'); }} className="text-xs text-rose-500 hover:underline">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUOTATIONS TAB */}
      {activeSubTab === 'Quotations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Quotations register</h2>
            </div>
            <button
              onClick={openGenericModal}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New quotation
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Quotation No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No quotations recorded yet. Click New Quotation to create one.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => {
                    const cust = customers.find((c) => c.id === q.customer_id);
                    return (
                      <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{q.quotation_no}</td>
                        <td className="px-4 py-3 text-slate-400">{q.quotation_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{cust?.name || 'Customer'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                          Rs. {q.total_amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                            {q.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!q.converted_to_order && (
                              <button
                                onClick={() => {
                                  const orderNo = `SO-${String(salesOrders.length + 1).padStart(5, '0')}`;
                                  addSalesOrder({
                                    order_no: orderNo,
                                    customer_id: q.customer_id,
                                    order_date: todayISO(),
                                    salesperson: q.salesperson,
                                    currency: q.currency,
                                    status: 'CONFIRMED',
                                    subtotal: q.subtotal,
                                    tax_total: q.tax_total,
                                    total_amount: q.total_amount,
                                    notes: q.notes,
                                    quotation_id: q.id,
                                    converted_to_invoice: false,
                                    created_at: new Date().toISOString(),
                                  });
                                  updateQuotation(q.id, { converted_to_order: true, status: 'CONFIRMED' });
                                  toast.success(`Quotation converted → Sales Order ${orderNo}`);
                                  setActiveSubTab('Sales Orders');
                                }}
                                className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 hover:bg-blue-500/20"
                              >
                                <ArrowRight className="h-3 w-3" /> To Order
                              </button>
                            )}
                            {q.converted_to_order && (
                              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">Converted</span>
                            )}
                            <button onClick={() => { deleteQuotation(q.id); toast.success('Quotation deleted'); }} className="text-xs text-rose-500 hover:underline">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SALES ORDERS TAB */}
      {activeSubTab === 'Sales Orders' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Sales orders register</h2>
            </div>
            <button
              onClick={openGenericModal}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New sales order
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Order No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {salesOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No sales orders recorded yet. Click New Sales Order to create one.
                    </td>
                  </tr>
                ) : (
                  salesOrders.map((so) => {
                    const cust = customers.find((c) => c.id === so.customer_id);
                    return (
                      <tr key={so.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{so.order_no}</td>
                        <td className="px-4 py-3 text-slate-400">{so.order_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{cust?.name || 'Customer'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                          Rs. {so.total_amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                            {so.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!so.converted_to_invoice && (
                              <button
                                onClick={() => {
                                  const invNo = `MS-${String(invoices.length + 1).padStart(5, '0')}`;
                                  addInvoice({
                                    invoice_no: invNo,
                                    customer_id: so.customer_id,
                                    warehouse_id: so.warehouse_id || warehouses[0]?.id || null,
                                    invoice_date: todayISO(),
                                    due_date: todayISO(),
                                    salesperson: so.salesperson,
                                    currency: so.currency,
                                    exchange_rate: 1,
                                    payment_terms: 'Net 30',
                                    account_head: 'Sales Revenue',
                                    gate_pass_no: null,
                                    status: 'UNPOSTED',
                                    subtotal: so.subtotal || so.total_amount,
                                    discount_total: 0,
                                    tax_total: so.tax_total || 0,
                                    total_amount: so.total_amount,
                                    paid_amount: 0,
                                    notes: so.notes,
                                    created_by: 'admin',
                                    created_at: new Date().toISOString(),
                                  });
                                  updateSalesOrder(so.id, { converted_to_invoice: true, status: 'COMPLETED' });
                                  toast.success(`Sales Order converted → Invoice ${invNo}`);
                                  setActiveSubTab('Invoices');
                                }}
                                className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 hover:bg-emerald-500/20"
                              >
                                <ArrowRight className="h-3 w-3" /> To Invoice
                              </button>
                            )}
                            {so.converted_to_invoice && (
                              <span className="rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">Invoiced</span>
                            )}
                            <button onClick={() => { deleteSalesOrder(so.id); toast.success('Sales Order deleted'); }} className="text-xs text-rose-500 hover:underline">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREDIT NOTES TAB */}
      {activeSubTab === 'Credit Notes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Credit notes register</h2>
            </div>
            <button
              onClick={openGenericModal}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New credit note
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Credit Note No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {creditNotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No credit notes recorded yet. Click New Credit Note to create one.
                    </td>
                  </tr>
                ) : (
                  creditNotes.map((cn) => {
                    const cust = customers.find((c) => c.id === cn.customer_id);
                    return (
                      <tr key={cn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{cn.credit_note_no}</td>
                        <td className="px-4 py-3 text-slate-400">{cn.note_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{cust?.name || 'Customer'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                          Rs. {cn.total_amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
                            {cn.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { deleteCreditNote(cn.id); toast.success('Credit Note deleted'); }} className="text-xs text-rose-500 hover:underline">
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECEIPTS TAB */}
      {activeSubTab === 'Receipts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Receipts register</h2>
            </div>
            <button
              onClick={openGenericModal}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New receipt
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Receipt No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customerReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No customer receipts recorded yet.
                    </td>
                  </tr>
                ) : (
                  customerReceipts.map((r) => {
                    const cust = customers.find((c) => c.id === r.customer_id);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{r.receipt_no}</td>
                        <td className="px-4 py-3 text-slate-400">{r.receipt_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{cust?.name || 'Customer'}</td>
                        <td className="px-4 py-3 text-slate-300">{r.payment_method}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                          Rs. {r.amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { deleteCustomerReceipt(r.id); toast.success('Receipt deleted'); }} className="text-xs text-rose-500 hover:underline">
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GENERIC SALES MODAL */}
      {genericModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                New {activeSubTab.slice(0, -1)}
              </h3>
              <button onClick={() => setGenericModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Customer</label>
                <select
                  value={genericCustId}
                  onChange={(e) => setGenericCustId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Amount (PKR)</label>
                <input
                  type="number"
                  value={genericAmount}
                  onChange={(e) => setGenericAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={genericNotes}
                  onChange={(e) => setGenericNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setGenericModalOpen(false)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-400">Cancel</button>
              <button onClick={handleSaveGenericRecord} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Save Record</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW INVOICE MODAL */}
      {newInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Sales Invoice' : 'New Sales Invoice'}
              </h3>
              <button onClick={() => setNewInvoiceOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Document date</label>
                <input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">LINE ITEMS</p>
                <button
                  onClick={addLine}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:underline"
                >
                  + Add line
                </button>
              </div>
              <div className="space-y-2">
                {lineItems.map((line) => (
                  <div key={line.id} className="flex items-center gap-2">
                    <select
                      value={line.product_id}
                      onChange={(e) => updateLine(line.id, { product_id: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={line.qty}
                      onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Rate"
                      value={line.rate}
                      onChange={(e) => updateLine(line.id, { rate: Number(e.target.value) })}
                      className="w-24 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                    <span className="w-28 text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Rs. {(line.qty * line.rate).toFixed(2)}
                    </span>
                    <button onClick={() => removeLine(line.id)} className="text-slate-400 hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-1 text-right text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">Rs. {totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 text-sm border-t pt-1">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-500">Rs. {totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setNewInvoiceOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveInvoice('UNPOSTED')}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSaveInvoice('POSTED')}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Save & Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {printInvoice && (
        <InvoicePrint invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
      )}
    </div>
  );
}
