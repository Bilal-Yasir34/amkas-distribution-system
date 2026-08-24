import { useState } from 'react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO, safeUUID } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Plus, Edit, Trash2, X } from 'lucide-react';

export function SalesReturnModule() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const {
    customers,
    vendors,
    warehouses,
    products,
    salesReturns,
    addSalesReturn,
    updateSalesReturn,
    deleteSalesReturn,
    updateProduct,
  } = useDataStore();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [partyType, setPartyType] = useState<'Customer' | 'Vendor'>('Customer');
  const [customerId, setCustomerId] = useState('');
  const [docDate, setDocDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [warehouseId, setWarehouseId] = useState('');
  const [returnNo, setReturnNo] = useState('');
  const [accountCategory, setAccountCategory] = useState('Sales Returns & Allowances');
  const [accountHead, setAccountHead] = useState('Sales Returns & Allowances');
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState<
    { id: string; product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  const handlePartyTypeChange = (type: 'Customer' | 'Vendor') => {
    setPartyType(type);
    if (type === 'Customer') {
      setCustomerId(customers[0]?.id || '');
    } else {
      setCustomerId(vendors[0]?.id || '');
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setPartyType('Customer');
    setCustomerId(customers[0]?.id || '');
    setDocDate(todayISO());
    setDueDate(todayISO());
    setWarehouseId(warehouses[0]?.id || 'w1');
    const autoNo = `SR-${String((salesReturns || []).length + 1).padStart(5, '0')}`;
    setReturnNo(autoNo);
    setAccountCategory('Sales Returns & Allowances');
    setAccountHead('Sales Returns & Allowances');
    setNotes('');
    setLineItems([
      {
        id: safeUUID(),
        product_id: products[0]?.id || '',
        description: products[0]?.name || '',
        qty: 1,
        rate: products[0]?.sale_price || 0,
        discount: 0,
        tax_pct: products[0]?.tax_pct || 0,
      },
    ]);
    setViewMode('form');
  };

  const openEditForm = (sr: any) => {
    setEditingId(sr.id);
    const isVendor = vendors.some((v) => v.id === sr.customer_id);
    setPartyType(isVendor ? 'Vendor' : 'Customer');
    setCustomerId(sr.customer_id || (isVendor ? vendors[0]?.id : customers[0]?.id) || '');
    setDocDate(sr.document_date || todayISO());
    setDueDate(sr.due_date || todayISO());
    setWarehouseId(sr.warehouse_id || warehouses[0]?.id || 'w1');
    setReturnNo(sr.return_no || '');
    setAccountCategory(sr.account_category || 'Sales Returns & Allowances');
    setAccountHead(sr.account_head || 'Sales Returns & Allowances');
    setNotes(sr.notes || '');
    if (sr.items && sr.items.length > 0) {
      setLineItems(
        sr.items.map((item: any) => ({
          id: item.id || safeUUID(),
          product_id: item.product_id || '',
          description: item.description || '',
          qty: item.qty || 1,
          rate: item.rate || 0,
          discount: item.discount || 0,
          tax_pct: item.tax_pct || 0,
        }))
      );
    } else {
      setLineItems([{ id: safeUUID(), product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);
    }
    setViewMode('form');
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: safeUUID(),
        product_id: products[0]?.id || '',
        description: products[0]?.name || '',
        qty: 1,
        rate: products[0]?.sale_price || 0,
        discount: 0,
        tax_pct: products[0]?.tax_pct || 0,
      },
    ]);
  };

  const updateLineItem = (id: string, patch: Partial<(typeof lineItems)[0]>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        if (patch.product_id) {
          const p = products.find((prod) => prod.id === patch.product_id);
          if (p) {
            updated.description = p.name;
            updated.rate = p.sale_price || 0;
            updated.tax_pct = p.tax_pct || 0;
          }
        }
        return updated;
      })
    );
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return toast.error('At least one line item is required');
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calcTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    lineItems.forEach((item) => {
      const gross = (item.qty || 0) * (item.rate || 0);
      const disc = item.discount || 0;
      const net = Math.max(0, gross - disc);
      const tax = net * ((item.tax_pct || 0) / 100);

      subtotal += gross;
      discountTotal += disc;
      taxTotal += tax;
    });

    const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal);
    return { subtotal, discountTotal, taxTotal, grandTotal };
  };

  const handleSaveRecord = (status: 'POSTED' | 'UNPOSTED') => {
    if (!customerId) return toast.error('Please select a party');
    if (lineItems.some((i) => !i.product_id)) return toast.error('Please select valid products for all line items');

    const totals = calcTotals();
    const formattedItems = lineItems.map((i) => {
      const gross = (i.qty || 0) * (i.rate || 0);
      const disc = i.discount || 0;
      const net = Math.max(0, gross - disc);
      const tax = net * ((i.tax_pct || 0) / 100);
      return {
        id: i.id,
        product_id: i.product_id,
        description: i.description,
        qty: i.qty,
        rate: i.rate,
        discount: i.discount,
        tax_pct: i.tax_pct,
        line_total: net + tax,
      };
    });

    const payload = {
      return_no: returnNo || `SR-${String((salesReturns || []).length + 1).padStart(5, '0')}`,
      party_type: partyType,
      customer_id: customerId,
      warehouse_id: warehouseId || warehouses[0]?.id || 'w1',
      document_date: docDate,
      due_date: dueDate,
      account_category: accountCategory,
      account_head: accountHead,
      status,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      tax_total: totals.taxTotal,
      total_amount: totals.grandTotal,
      notes,
      items: formattedItems,
      created_at: new Date().toISOString(),
    };

    if (editingId) {
      updateSalesReturn(editingId, payload);
      toast.success(`Sales Return ${payload.return_no} updated successfully!`);
    } else {
      addSalesReturn(payload);

      // Inventory effect: Customer returns product to company -> Stock increases
      if (status === 'POSTED') {
        lineItems.forEach((item) => {
          const prod = products.find((p) => p.id === item.product_id);
          if (prod) {
            updateProduct(prod.id, {
              stock_quantity: (prod.stock_quantity || 0) + (item.qty || 0),
            });
          }
        });
      }

      toast.success(`Sales Return ${payload.return_no} posted! Customer Credited (CR) & Company Debited (DR).`);
    }

    setViewMode('list');
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sales Return Management</h1>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CUSTOMER RETURNS</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Sales return register</h2>
            </div>
            <button onClick={openCreateForm} className="flex items-center gap-2 btn-primary shadow-sm">
              <Plus className="h-4 w-4" /> New Sales Return
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Return No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Party / Customer (Credit)</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Accounting Rule</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(salesReturns || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No sales returns recorded yet. Click New Sales Return to create one.
                    </td>
                  </tr>
                ) : (
                  (salesReturns || []).map((sr) => {
                    const party = customers.find((c) => c.id === sr.customer_id) || vendors.find((v) => v.id === sr.customer_id);
                    const wh = warehouses.find((w) => w.id === sr.warehouse_id);
                    return (
                      <tr key={sr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{sr.return_no}</td>
                        <td className="px-4 py-3 text-slate-400">{sr.document_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{party?.name || 'Party'}</td>
                        <td className="px-4 py-3 text-slate-400">{wh?.name || 'Main Warehouse'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-amber-400">
                          Rs. {(sr.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="text-emerald-400 font-semibold">Party CR</span> | <span className="text-amber-400 font-semibold">Company DR</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                            {sr.status || 'POSTED'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditForm(sr)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition"
                              title="Edit Sales Return"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  deleteSalesReturn(sr.id);
                                  toast.success('Sales Return deleted');
                                }}
                                className="text-xs text-rose-500 hover:underline"
                              >
                                Delete
                              </button>
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
        </div>
      ) : null}

      {/* NEW / EDIT SALES RETURN FORM MODAL */}
      {viewMode === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 font-mono">SALES RETURN WORKFLOW</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingId ? 'Edit Sales Return' : 'New Sales Return'}
                </h3>
              </div>
              <button
                onClick={() => setViewMode('list')}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Header Details Card (2 Cols) */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {editingId ? 'Edit Sales Return' : 'New Sales Return'}
                </h2>

                {/* Row 1: Type, Select Party, Document date, Due date */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Type</label>
                    <select
                      value={partyType}
                      onChange={(e) => handlePartyTypeChange(e.target.value as 'Customer' | 'Vendor')}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    >
                      <option value="Customer">Customer</option>
                      <option value="Supplier">Supplier</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Select Party (Credit Party)
                    </label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    >
                      <option value="">Select {partyType.toLowerCase()}</option>
                      {partyType === 'Customer'
                        ? customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))
                        : vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Document date</label>
                    <input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Due date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Row 2: Warehouse */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Restock Warehouse</label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Accounting Rules Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Accounting Rule</h3>

                  <div className="rounded-xl bg-amber-500/10 p-3.5 border border-amber-500/30 text-xs font-medium text-amber-800 dark:text-amber-300 leading-relaxed">
                    <p className="font-bold text-amber-400">Party (Customer/Supplier): CREDIT</p>
                    <p className="font-bold text-amber-500 mt-1">Company / We: DEBIT</p>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Returned goods increase stock count in warehouse and credit party balance.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveRecord('POSTED')}
                    className="btn-primary text-xs px-5"
                  >
                    Save & Post Return
                  </button>
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">RETURNED ITEMS</p>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Products returned</h3>
                </div>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="btn-primary text-xs"
                >
                  + Add line
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 w-56">PRODUCT</th>
                      <th className="px-4 py-3">DESCRIPTION</th>
                      <th className="px-4 py-3 w-36 text-center">QTY</th>
                      <th className="px-4 py-3 w-28">RATE</th>
                      <th className="px-4 py-3 w-24">DISCOUNT</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="px-4 py-3">
                          <select
                            value={item.product_id}
                            onChange={(e) => updateLineItem(item.id, { product_id: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            placeholder="Reason / details"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateLineItem(item.id, { qty: Math.max(1, Number(e.target.value)) })}
                            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateLineItem(item.id, { rate: Number(e.target.value) })}
                            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateLineItem(item.id, { discount: Number(e.target.value) })}
                            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="text-slate-400 hover:text-rose-500 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const t = calcTotals();
                return (
                  <div className="flex justify-end pt-2">
                    <div className="w-64 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Subtotal</span>
                        <span className="font-mono">Rs. {t.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-slate-900 dark:text-slate-100">
                        <span>Grand Total</span>
                        <span className="font-mono text-amber-500">Rs. {t.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Notes Bottom Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes / Return Reason</label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
