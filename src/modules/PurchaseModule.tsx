import { useState } from 'react';
import { Plus, ShoppingCart, DollarSign, FileText, CheckCircle, Clock, X, Trash2, Edit } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO } from '@/lib/utils';
import type { VendorBill, Vendor } from '@/lib/types';

export function PurchaseModule() {
  const toast = useToast();
  const {
    vendors,
    products,
    warehouses,
    vendorBills,
    purchaseRequests,
    purchaseOrders,
    purchaseInvoices,
    debitNotes,
    vendorPayments,
    addVendorBill,
    updateVendorBill,
    deleteVendorBill,
    addPurchaseRequest,
    deletePurchaseRequest,
    addPurchaseOrder,
    deletePurchaseOrder,
    addPurchaseInvoice,
    deletePurchaseInvoice,
    addDebitNote,
    deleteDebitNote,
    addVendorPayment,
    deleteVendorPayment,
  } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<
    'Overview' | 'Requests' | 'Purchase Orders' | 'Purchase Invoices' | 'Vendor Bills' | 'Debit Notes' | 'Payments'
  >('Vendor Bills');

  const [newBillOpen, setNewBillOpen] = useState(false);
  const [genericModalOpen, setGenericModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Generic Form State
  const [genericVendorId, setGenericVendorId] = useState('');
  const [genericAmount, setGenericAmount] = useState('1000');
  const [genericNotes, setGenericNotes] = useState('');

  // Bill Form state
  const [vendorId, setVendorId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [billDate, setBillDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState([
    { id: '1', product_id: '', description: '', qty: 1, rate: 0, tax_pct: 0 },
  ]);

  const openCreateBill = () => {
    setEditingId(null);
    setVendorId(vendors[0]?.id || '');
    setWarehouseId(warehouses[0]?.id || '');
    setBillDate(todayISO());
    setDueDate(todayISO());
    setVendorInvoiceNo('');
    setNotes('');
    setLineItems([
      { id: crypto.randomUUID(), product_id: products[0]?.id || '', description: products[0]?.name || '', qty: 1, rate: products[0]?.purchase_price || 0, tax_pct: 0 },
    ]);
    setNewBillOpen(true);
  };

  const openGenericModal = () => {
    setGenericVendorId(vendors[0]?.id || '');
    setGenericAmount('1000');
    setGenericNotes('');
    setGenericModalOpen(true);
  };

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), product_id: '', description: '', qty: 1, rate: 0, tax_pct: 0 },
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
              updated.rate = p.purchase_price;
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
    let taxTotal = 0;
    lineItems.forEach((l) => {
      const gross = l.qty * l.rate;
      subtotal += gross;
      taxTotal += gross * (l.tax_pct / 100);
    });
    return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
  };

  const totals = calculateTotals();

  const handleSaveBill = (status: 'UNPOSTED' | 'POSTED') => {
    if (!vendorId) return toast.error('Please select a vendor');

    if (editingId) {
      updateVendorBill(editingId, {
        vendor_id: vendorId,
        warehouse_id: warehouseId,
        bill_date: billDate,
        due_date: dueDate,
        vendor_invoice_no: vendorInvoiceNo,
        status,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes,
      });
      toast.success(`Vendor Bill updated (${status})`);
    } else {
      const billNo = `MP-${String(vendorBills.length + 1).padStart(5, '0')}`;
      addVendorBill({
        bill_no: billNo,
        vendor_id: vendorId,
        warehouse_id: warehouseId,
        bill_date: billDate,
        due_date: dueDate,
        vendor_invoice_no: vendorInvoiceNo || billNo,
        currency: 'PKR',
        exchange_rate: 1,
        payment_terms: 'Net 30',
        account_head: 'Default Procurement Payable',
        status,
        subtotal: totals.subtotal,
        discount_total: 0,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        paid_amount: 0,
        notes,
        created_by: 'admin',
        created_at: new Date().toISOString(),
      });
      toast.success(`Vendor Bill ${billNo} saved and ${status.toLowerCase()}`);
    }
    setNewBillOpen(false);
  };

  const handleSaveGenericRecord = () => {
    const amountVal = Number(genericAmount) || 1000;

    if (activeSubTab === 'Requests') {
      const prNo = `MPR-${String(purchaseRequests.length + 1).padStart(5, '0')}`;
      addPurchaseRequest({
        request_no: prNo,
        department_id: 'd1',
        request_date: todayISO(),
        required_date: todayISO(),
        requested_by: 'admin',
        status: 'PENDING',
        notes: genericNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Request ${prNo} created and added to Requests register!`);
    } else if (activeSubTab === 'Purchase Orders') {
      const poNo = `MPO-${String(purchaseOrders.length + 1).padStart(5, '0')}`;
      addPurchaseOrder({
        po_no: poNo,
        vendor_id: genericVendorId,
        warehouse_id: warehouses[0]?.id || 'w1',
        po_date: todayISO(),
        expected_delivery: todayISO(),
        currency: 'PKR',
        status: 'POSTED',
        subtotal: amountVal,
        tax_total: 0,
        total_amount: amountVal,
        notes: genericNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Order ${poNo} created and added to Purchase Orders register!`);
    } else if (activeSubTab === 'Purchase Invoices') {
      const piNo = `PI-${String(purchaseInvoices.length + 1).padStart(5, '0')}`;
      addPurchaseInvoice({
        grn_no: piNo,
        po_id: null,
        vendor_id: genericVendorId,
        warehouse_id: warehouses[0]?.id || 'w1',
        received_date: todayISO(),
        status: 'POSTED',
        notes: genericNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Invoice ${piNo} created and added to Purchase Invoices register!`);
    } else if (activeSubTab === 'Debit Notes') {
      const dnNo = `MDN-${String(debitNotes.length + 1).padStart(5, '0')}`;
      addDebitNote({
        debit_note_no: dnNo,
        vendor_bill_id: null,
        vendor_id: genericVendorId,
        note_date: todayISO(),
        reason: genericNotes || 'Purchase Return',
        status: 'POSTED',
        total_amount: amountVal,
        created_at: new Date().toISOString(),
      });
      toast.success(`Debit Note ${dnNo} created and added to Debit Notes register!`);
    } else if (activeSubTab === 'Payments') {
      const vpNo = `CP-${String(vendorPayments.length + 1).padStart(5, '0')}`;
      addVendorPayment({
        payment_no: vpNo,
        vendor_id: genericVendorId,
        payment_date: todayISO(),
        payment_method: 'Cash',
        paid_from_account_id: 'Cash in Hand',
        amount: amountVal,
        notes: genericNotes,
        status: 'POSTED',
        created_at: new Date().toISOString(),
      });
      toast.success(`Vendor Payment ${vpNo} created and added to Payments register!`);
    }

    setGenericModalOpen(false);
  };

  const totalProcuredSum = vendorBills.reduce((acc, b) => acc + (b.total_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Purchase Management</h1>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {['Overview', 'Requests', 'Purchase Orders', 'Purchase Invoices', 'Vendor Bills', 'Debit Notes', 'Payments'].map(
          (tab) => (
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
          )
        )}
      </div>

      {/* OVERVIEW */}
      {activeSubTab === 'Overview' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL PROCURED</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                Rs. {totalProcuredSum.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PURCHASE ORDERS</p>
              <p className="mt-1 text-2xl font-extrabold text-amber-500">{purchaseOrders.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">VENDOR BILLS</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-500">{vendorBills.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DEBIT NOTES</p>
              <p className="mt-1 text-2xl font-extrabold text-rose-500">{debitNotes.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR BILLS TAB */}
      {activeSubTab === 'Vendor Bills' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Vendor bills register</h2>
            </div>
            <button
              onClick={openCreateBill}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New vendor bill
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Bill Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {vendorBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No vendor bills recorded yet.
                    </td>
                  </tr>
                ) : (
                  vendorBills.map((b) => {
                    const vend = vendors.find((v) => v.id === b.vendor_id);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{b.bill_no}</td>
                        <td className="px-4 py-3 text-slate-400">{b.bill_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{vend?.name || 'Top Pops'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                          Rs. {b.total_amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${b.status === 'POSTED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { deleteVendorBill(b.id); toast.success('Vendor bill deleted'); }} className="text-xs text-rose-500 hover:underline">
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

      {/* PURCHASE REQUESTS TAB */}
      {activeSubTab === 'Requests' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Purchase requests register</h2>
            </div>
            <button
              onClick={openGenericModal}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New request
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Request No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Requested By</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchaseRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No purchase requests recorded yet. Click New Request to create one.
                    </td>
                  </tr>
                ) : (
                  purchaseRequests.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{pr.request_no}</td>
                      <td className="px-4 py-3 text-slate-400">{pr.request_date}</td>
                      <td className="px-4 py-3 text-slate-300">{pr.requested_by}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                          {pr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { deletePurchaseRequest(pr.id); toast.success('Request deleted'); }} className="text-xs text-rose-500 hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PURCHASE ORDERS TAB */}
      {activeSubTab === 'Purchase Orders' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Purchase orders register</h2>
            </div>
            <button
              onClick={openGenericModal}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New purchase order
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No purchase orders recorded yet. Click New Purchase Order to create one.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => {
                    const vend = vendors.find((v) => v.id === po.vendor_id);
                    return (
                      <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{po.po_no}</td>
                        <td className="px-4 py-3 text-slate-400">{po.po_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{vend?.name || 'Vendor'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                          Rs. {po.total_amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { deletePurchaseOrder(po.id); toast.success('Purchase Order deleted'); }} className="text-xs text-rose-500 hover:underline">
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

      {/* DEBIT NOTES TAB */}
      {activeSubTab === 'Debit Notes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Debit notes register</h2>
            </div>
            <button
              onClick={openGenericModal}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New debit note
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Debit Note No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {debitNotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No debit notes recorded yet. Click New Debit Note to create one.
                    </td>
                  </tr>
                ) : (
                  debitNotes.map((dn) => {
                    const vend = vendors.find((v) => v.id === dn.vendor_id);
                    return (
                      <tr key={dn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{dn.debit_note_no}</td>
                        <td className="px-4 py-3 text-slate-400">{dn.note_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{vend?.name || 'Vendor'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                          Rs. {dn.total_amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
                            {dn.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { deleteDebitNote(dn.id); toast.success('Debit Note deleted'); }} className="text-xs text-rose-500 hover:underline">
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

      {/* PAYMENTS TAB */}
      {activeSubTab === 'Payments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Vendor payments register</h2>
            </div>
            <button
              onClick={openGenericModal}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New payment
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Payment No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {vendorPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No vendor payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  vendorPayments.map((vp) => {
                    const vend = vendors.find((v) => v.id === vp.vendor_id);
                    return (
                      <tr key={vp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{vp.payment_no}</td>
                        <td className="px-4 py-3 text-slate-400">{vp.payment_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{vend?.name || 'Vendor'}</td>
                        <td className="px-4 py-3 text-slate-300">{vp.payment_method}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-rose-400">
                          Rs. {vp.amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { deleteVendorPayment(vp.id); toast.success('Payment deleted'); }} className="text-xs text-rose-500 hover:underline">
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

      {/* GENERIC PURCHASE MODAL */}
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
                <label className="text-[11px] font-semibold text-slate-400">Vendor</label>
                <select
                  value={genericVendorId}
                  onChange={(e) => setGenericVendorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
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

      {/* NEW VENDOR BILL MODAL */}
      {newBillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Vendor Bill' : 'New Vendor Bill'}
              </h3>
              <button onClick={() => setNewBillOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Vendor</label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Bill date</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
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
                      <option value="">Select item / SKU</option>
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
                onClick={() => setNewBillOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveBill('UNPOSTED')}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSaveBill('POSTED')}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Save & Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
