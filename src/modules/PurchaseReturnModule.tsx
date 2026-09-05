import { useState, useMemo } from 'react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO, safeUUID , formatDate} from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Plus, Edit, Trash2, X, ShoppingBag, Receipt, Sparkles, CheckCircle2, History, RotateCcw } from 'lucide-react';
import { getAllArticles, getProductsForArticle, getArticleForProduct } from '@/lib/articleUtils';

export function PurchaseReturnModule() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const {
    vendors,
    customers,
    users = [],
    warehouses,
    products,
    vendorBills = [],
    purchaseInvoices = [],
    purchaseOrders = [],
    purchaseReturns,
    addPurchaseReturn,
    updatePurchaseReturn,
    deletePurchaseReturn,
    updateProduct,
    productArticles,
    universalArticles = [],
    accountTypes
  } = useDataStore();

  const allArticles = useMemo(
    () => getAllArticles(universalArticles, products, productArticles),
    [universalArticles, products, productArticles]
  );

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [partyType, setPartyType] = useState<string>('Vendor');
  const [vendorId, setVendorId] = useState('');
  const [docDate, setDocDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [warehouseId, setWarehouseId] = useState('');
  const [returnNo, setReturnNo] = useState('');
  const [accountCategory, setAccountCategory] = useState('Purchase Returns & Allowances');
  const [accountHead, setAccountHead] = useState('Purchase Returns & Allowances');
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState<
    { id: string; product_id: string; article_id?: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', article_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  // All unified parties in the system
  const allParties = useMemo(() => {
    const list = [
      ...vendors.map(v => ({ ...v, _origin: 'vendor' as const, account_type: v.account_type || 'Vendor' })),
      ...customers.map(c => ({ ...c, _origin: 'customer' as const, account_type: c.account_type || 'Customer' })),
      ...users.map(u => ({ ...u, _origin: 'user' as const, account_type: (u as any).account_type || u.role || 'Staff' }))
    ];
    return list.filter((item, idx, arr) => arr.findIndex(x => x.id === item.id) === idx);
  }, [vendors, customers, users]);

  const selectedPartyObj = useMemo(() => {
    return allParties.find(p => p.id === vendorId);
  }, [allParties, vendorId]);

  // Dynamically find all products bought from the selected vendor across Vendor Bills & Purchase Invoices
  const boughtProductsFromParty = useMemo(() => {
    if (!vendorId) return [];
    
    // Match vendor by ID or name
    const partyBills = (vendorBills || []).filter(
      (b) => b.vendor_id === vendorId || (selectedPartyObj && (b as any).vendor_name === selectedPartyObj.name)
    );
    const partyInvoices = (purchaseInvoices || []).filter((pi) => pi.vendor_id === vendorId);
    const partyOrders = (purchaseOrders || []).filter((po) => po.vendor_id === vendorId);

    const map = new Map<string, {
      productId: string;
      productName: string;
      productCode: string;
      articleName: string;
      boughtRate: number;
      totalBoughtQty: number;
      lastBoughtDate: string;
      billNo: string;
      taxPct: number;
      discount: number;
    }>();

    // Scan vendor bills
    partyBills.forEach((b) => {
      (b.items || []).forEach((item) => {
        if (!item.product_id) return;
        const prod = products.find((p) => p.id === item.product_id);
        const art = getArticleForProduct(item.product_id, products, productArticles) || (prod?.article_name || '');
        const key = `${item.product_id}-${item.rate}`;
        const existing = map.get(key);
        if (existing) {
          existing.totalBoughtQty += item.qty || 0;
          if ((b.bill_date || '') > existing.lastBoughtDate) {
            existing.lastBoughtDate = b.bill_date || '';
            existing.billNo = b.bill_no;
          }
        } else {
          map.set(key, {
            productId: item.product_id,
            productName: prod?.name || item.description || 'Product',
            productCode: prod?.code || '',
            articleName: art,
            boughtRate: item.rate ?? prod?.purchase_price ?? prod?.cost_price ?? 0,
            totalBoughtQty: item.qty || 0,
            lastBoughtDate: b.bill_date || b.document_date || '',
            billNo: b.bill_no || '',
            taxPct: item.tax_pct ?? prod?.tax_pct ?? 0,
            discount: item.discount ?? 0,
          });
        }
      });
    });

    // Scan purchase orders
    partyOrders.forEach((ord) => {
      ((ord as any).items || []).forEach((item: any) => {
        if (!item.product_id) return;
        const prod = products.find((p) => p.id === item.product_id);
        const art = getArticleForProduct(item.product_id, products, productArticles) || (prod?.article_name || '');
        const key = `${item.product_id}-${item.rate}`;
        if (!map.has(key)) {
          map.set(key, {
            productId: item.product_id,
            productName: prod?.name || item.description || 'Product',
            productCode: prod?.code || '',
            articleName: art,
            boughtRate: item.rate ?? prod?.purchase_price ?? prod?.cost_price ?? 0,
            totalBoughtQty: item.qty || 0,
            lastBoughtDate: ord.po_date || ord.document_date || '',
            billNo: ord.po_no || '',
            taxPct: item.tax_pct ?? prod?.tax_pct ?? 0,
            discount: item.discount ?? 0,
          });
        }
      });
    });

    return Array.from(map.values());
  }, [vendorId, vendorBills, purchaseInvoices, purchaseOrders, products, productArticles, selectedPartyObj]);

  const handlePartyTypeChange = (type: string) => {
    setPartyType(type);
    if (!type || type === 'ALL') {
      setVendorId(allParties[0]?.id || '');
    } else {
      const filtered = allParties.filter(c => c.account_type?.toLowerCase() === type.toLowerCase());
      setVendorId(filtered[0]?.id || '');
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setPartyType(accountTypes[0]?.name || 'ALL');
    setVendorId(vendors[0]?.id || customers[0]?.id || '');
    setDocDate(todayISO());
    setDueDate(todayISO());
    setWarehouseId(warehouses[0]?.id || 'w1');
    const autoNo = `PR-${String((purchaseReturns || []).length + 1).padStart(5, '0')}`;
    setReturnNo(autoNo);
    setAccountCategory('Purchase Returns & Allowances');
    setAccountHead('Purchase Returns & Allowances');
    setNotes('');
    setLineItems([
      {
        id: safeUUID(),
        product_id: products[0]?.id || '',
          article_id: '',
          description: products[0]?.name || '',
        qty: 1,
        rate: products[0]?.purchase_price || products[0]?.cost_price || 0,
        discount: 0,
        tax_pct: products[0]?.tax_pct || 0,
      },
    ]);
    setViewMode('form');
  };

  const openEditForm = (pr: any) => {
    setEditingId(pr.id);
    const party = customers.find((c) => c.id === pr.vendor_id) || vendors.find((v) => v.id === pr.vendor_id);
    let pType = 'Vendor';
    if (party?.account_type) {
      const matchingType = accountTypes.find(at => at.name.toLowerCase() === party?.account_type?.toLowerCase());
      if (matchingType) pType = matchingType.name;
    }
    setPartyType(pType);
    setVendorId(pr.vendor_id || '');
    setDocDate(pr.document_date || todayISO());
    setDueDate(pr.due_date || todayISO());
    setWarehouseId(pr.warehouse_id || warehouses[0]?.id || 'w1');
    setReturnNo(pr.return_no || '');
    setAccountCategory(pr.account_category || 'Purchase Returns & Allowances');
    setAccountHead(pr.account_head || 'Purchase Returns & Allowances');
    setNotes(pr.notes || '');
    if (pr.items && pr.items.length > 0) {
      setLineItems(
        pr.items.map((item: any) => ({
          id: item.id || safeUUID(),
          product_id: item.product_id || '',
            article_id: item.article_id || '',
            description: item.description || '',
          qty: item.qty || 1,
          rate: item.rate || 0,
          discount: item.discount || 0,
          tax_pct: item.tax_pct || 0,
        }))
      );
    } else {
      setLineItems([{ id: safeUUID(), product_id: '', article_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);
    }
    setViewMode('form');
  };

  const addBoughtItemToLines = (item: {
    productId: string;
    productName: string;
    productCode: string;
    articleName: string;
    boughtRate: number;
    totalBoughtQty: number;
    billNo: string;
    taxPct: number;
    discount: number;
  }) => {
    // If the first line is blank, replace it
    const isFirstBlank = lineItems.length === 1 && !lineItems[0].product_id;
    const newLine = {
      id: safeUUID(),
      product_id: item.productId,
      article_id: item.articleName,
      description: item.articleName ? `[${item.articleName}] ${item.productName}` : item.productName,
      qty: 1,
      rate: item.boughtRate,
      discount: item.discount || 0,
      tax_pct: item.taxPct || 0,
    };

    if (isFirstBlank) {
      setLineItems([newLine]);
    } else {
      setLineItems((prev) => [...prev, newLine]);
    }

    toast.success(`Added "${item.productName}" at purchased rate of Rs. ${item.boughtRate}`);
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: safeUUID(),
        product_id: '',
        article_id: '',
        description: '',
        qty: 1,
        rate: 0,
        discount: 0,
        tax_pct: 0,
      },
    ]);
  };

  const updateLineItem = (id: string, patch: Partial<(typeof lineItems)[0]>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        const p = products.find((prod) => prod.id === (patch.product_id !== undefined ? patch.product_id : item.product_id));

        if (patch.article_id !== undefined && patch.product_id === undefined) {
          const newArt = patch.article_id;
          const validProds = getProductsForArticle(newArt, products, productArticles);
          const stillValid = validProds.some((vp) => vp.id === item.product_id);
          if (!stillValid) {
            updated.product_id = '';
            updated.description = newArt ? `[${newArt}]` : '';
            updated.rate = 0;
          }
        }

        if (patch.product_id) {
          if (p) {
            const currentArt = updated.article_id || getArticleForProduct(p.id, products, productArticles);
            updated.description = currentArt ? `[${currentArt}] ${p.name}` : (p.description || p.name);
            
            // Check if this product was purchased from this vendor
            const boughtMatch = boughtProductsFromParty.find(bp => bp.productId === p.id);
            if (boughtMatch) {
              updated.rate = boughtMatch.boughtRate;
              updated.tax_pct = boughtMatch.taxPct;
              updated.discount = boughtMatch.discount;
              if (boughtMatch.articleName) updated.article_id = boughtMatch.articleName;
            } else {
              updated.rate = p.purchase_price || p.cost_price || 0;
              updated.tax_pct = p.tax_pct || 0;
            }

            if (!updated.article_id && currentArt) {
              updated.article_id = currentArt;
            }
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
    if (!vendorId) return toast.error('Please select a party');
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
          article_id: i.article_id,
        description: i.description,
        qty: i.qty,
        rate: i.rate,
        discount: i.discount,
        tax_pct: i.tax_pct,
        line_total: net + tax,
      };
    });

    const payload = {
      return_no: returnNo || `PR-${String((purchaseReturns || []).length + 1).padStart(5, '0')}`,
      party_type: partyType,
      vendor_id: vendorId,
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
      updatePurchaseReturn(editingId, payload);
      toast.success(`Purchase Return ${payload.return_no} updated successfully!`);
    } else {
      addPurchaseReturn(payload);

      // Inventory effect: Company returns bought product to party -> Stock decreases
      if (status === 'POSTED') {
        lineItems.forEach((item) => {
          const prod = products.find((p) => p.id === item.product_id);
          if (prod) {
            updateProduct(prod.id, {
              stock_quantity: Math.max(0, (prod.stock_quantity || 0) - (item.qty || 0)),
            });
          }
        });
      }

      toast.success(`Purchase Return ${payload.return_no} posted! Party Debited (DR) & Company Credited (CR).`);
    }

    setViewMode('list');
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Purchase Return Management</h1>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT RETURNS</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Purchase return register</h2>
            </div>
            <button onClick={openCreateForm} className="flex items-center gap-2 btn-primary shadow-sm">
              <Plus className="h-4 w-4" /> New Purchase Return
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Return No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Party / Vendor (Debit)</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Accounting Rule</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(purchaseReturns || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No purchase returns recorded yet. Click New Purchase Return to create one.
                    </td>
                  </tr>
                ) : (
                  (purchaseReturns || []).map((pr) => {
                    const party = vendors.find((v) => v.id === pr.vendor_id) || customers.find((c) => c.id === pr.vendor_id);
                    const wh = warehouses.find((w) => w.id === pr.warehouse_id);
                    return (
                      <tr key={pr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{pr.return_no}</td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(pr.document_date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{party?.name || 'Party'}</td>
                        <td className="px-4 py-3 text-slate-400">{wh?.name || 'Main Warehouse'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-amber-400">
                          Rs. {(pr.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="text-amber-400 font-semibold">Party DR</span> | <span className="text-emerald-400 font-semibold">Company CR</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                            {pr.status || 'POSTED'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditForm(pr)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition"
                              title="Edit Purchase Return"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  deletePurchaseReturn(pr.id);
                                  toast.success('Purchase Return deleted');
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

      {/* NEW / EDIT PURCHASE RETURN FORM MODAL */}
      {viewMode === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 font-mono">PURCHASE RETURN WORKFLOW</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingId ? 'Edit Purchase Return' : 'New Purchase Return'}
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
                  {editingId ? 'Edit Purchase Return' : 'New Purchase Return'}
                </h2>

                {/* Row 1: Type, Select Party, Document date, Due date */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Type</label>
                    <select
                      value={partyType}
                      onChange={(e) => handlePartyTypeChange(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    >
                      <option value="ALL">All Types</option>
                      {accountTypes.map((at) => (
                        <option key={at.id} value={at.name}>{at.name}</option>
                      ))}
                    </select>
                  </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Select Party (Debit Party)
                    </label>
                    {boughtProductsFromParty.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                        {boughtProductsFromParty.length} bought item(s)
                      </span>
                    )}
                  </div>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="">Select {partyType === 'ALL' ? 'Party' : partyType}</option>
                    {allParties
                      .filter((c) => !partyType || partyType === 'ALL' || c.account_type?.toLowerCase() === partyType.toLowerCase())
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.account_type ? `(${c.account_type})` : ''}
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
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Due / Debit date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Row 2: Warehouse & Return No */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Warehouse</label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code ? `${w.code} · ` : ''}{w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Return / Reference No</label>
                  <input
                    type="text"
                    value={returnNo}
                    onChange={(e) => setReturnNo(e.target.value)}
                    placeholder="e.g. PR-00001"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Account category & Account head */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account category</label>
                  <select
                    value={accountCategory}
                    onChange={(e) => setAccountCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                  >
                    <option value="Purchase Returns & Allowances">Purchase Returns & Allowances</option>
                    <option value="Inventory Accounts">Inventory Accounts</option>
                    <option value="Current Assets">Current Assets</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account head</label>
                  <select
                    value={accountHead}
                    onChange={(e) => setAccountHead(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                  >
                    <option value="Purchase Returns & Allowances">Purchase Returns & Allowances</option>
                    <option value="Vendor Debit Account">Vendor Debit Account</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Accounting Rule Card (Right - 1 Col) */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-sm dark:bg-slate-900/70 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">ACCOUNTING DIRECTIVE</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Purchase Return Rules</h3>
                <div className="rounded-xl bg-white/70 dark:bg-slate-800/80 p-4 border border-amber-500/20 text-xs font-medium text-slate-800 dark:text-slate-200 space-y-2 leading-relaxed">
                  <p>
                    <strong className="text-amber-500 font-bold">Party / Vendor = DEBIT (DR)</strong>
                  </p>
                  <p>
                    <strong className="text-emerald-500 font-bold">Company / We = CREDIT (CR)</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                    Products bought from a party are returned to them. Inventory is reduced and payables are reduced.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
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
                  className="rounded-xl bg-[#00a884] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                >
                  Save & Post Return
                </button>
              </div>
            </div>
          </div>

          {/* QUICK SELECTION OF PRODUCTS BOUGHT FROM THIS VENDOR */}
          {vendorId && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Products Purchased from {selectedPartyObj?.name || 'Selected Party'}
                  </h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                    {boughtProductsFromParty.length} record(s) found
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Click <strong className="text-amber-600 dark:text-amber-400">+ Return</strong> to auto-apply exact purchase rate
                </p>
              </div>

              {boughtProductsFromParty.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center">
                  <p className="text-xs text-slate-400">
                    No previous purchase bills found for {selectedPartyObj?.name || 'this vendor'}. You can still select any product from the catalog below.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {boughtProductsFromParty.map((bp) => (
                    <div
                      key={`${bp.productId}-${bp.boughtRate}`}
                      className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 hover:border-amber-400 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {bp.productName}
                            </p>
                            {bp.articleName && (
                              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                Article: {bp.articleName}
                              </p>
                            )}
                          </div>
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {bp.productCode || 'PROD'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                          <span>Bought Qty: <strong>{bp.totalBoughtQty}</strong></span>
                          {bp.billNo && (
                            <span>Bill: <strong>{bp.billNo}</strong></span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 pt-2.5 mt-2.5">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Bought Rate:</span>
                          <p className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                            Rs. {bp.boughtRate.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addBoughtItemToLines(bp)}
                          className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 shadow-sm transition"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          + Return
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Line Items Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">RETURN ITEMS</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Returned Products and Services</h3>
              </div>
              <button
                type="button"
                onClick={addLineItem}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-sm"
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
                          {(() => {
                            const currentArt = item.article_id || getArticleForProduct(item.product_id, products, productArticles);
                            const availableProds = getProductsForArticle(currentArt, products, productArticles);

                            // Filter bought products under this article if any
                            const boughtUnderArt = boughtProductsFromParty.filter(bp => !currentArt || bp.articleName === currentArt);

                            return (
                              <div className="space-y-1.5 min-w-[210px]">
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block mb-0.5">
                                    Article (Major Head)
                                  </label>
                                  <select
                                    value={currentArt}
                                    onChange={(e) => {
                                      const newArt = e.target.value;
                                      updateLineItem(item.id, {
                                        article_id: newArt,
                                        product_id: '',
                                        description: newArt ? `[${newArt}]` : '',
                                        rate: 0,
                                      });
                                    }}
                                    className="w-full rounded-xl border border-amber-300/80 bg-amber-50/40 p-2 text-xs font-semibold text-slate-800 dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-slate-100 outline-none"
                                  >
                                    <option value="">-- Select Article --</option>
                                    {allArticles.map((art) => (
                                      <option key={art} value={art}>
                                        {art}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                                    Product / Option
                                  </label>
                                  <select
                                    value={item.product_id}
                                    disabled={!currentArt && availableProds.length === 0}
                                    onChange={(e) =>
                                      updateLineItem(item.id, {
                                        product_id: e.target.value,
                                        article_id: currentArt,
                                      })
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 disabled:opacity-50"
                                  >
                                    <option value="">
                                      {currentArt ? '-- Select Product under this Article --' : '-- Select Article first --'}
                                    </option>
                                    {boughtUnderArt.length > 0 && (
                                      <optgroup label="★ Purchased from this Vendor (Bought Rate Auto-Applies)">
                                        {boughtUnderArt.map((bp) => (
                                          <option key={`bought-${bp.productId}`} value={bp.productId}>
                                            ★ {bp.productName} [{bp.productCode}] — Bought @ Rs {bp.boughtRate}
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    <optgroup label="Catalog Products">
                                      {availableProds.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name} [{p.code}] — Catalog Rs {p.purchase_price || p.cost_price || p.sale_price}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="Optional description"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateLineItem(item.id, { qty: Math.max(1, (item.qty || 1) - 1) })}
                            className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateLineItem(item.id, { qty: Math.max(1, Number(e.target.value)) })}
                            className="w-12 text-center text-xs font-bold text-slate-800 dark:text-slate-100 outline-none border-none bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => updateLineItem(item.id, { qty: (item.qty || 1) + 1 })}
                            className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                          >
                            +
                          </button>
                        </div>
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
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="text-slate-400 hover:text-rose-500 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary Grid */}
            {(() => {
              const t = calcTotals();
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-center divide-x divide-slate-200 dark:divide-slate-800">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SUBTOTAL</p>
                    <p className="mt-1 text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                      Rs. {t.subtotal.toFixed(2)}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DISCOUNT</p>
                    <p className="mt-1 text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                      Rs. {t.discountTotal.toFixed(2)}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TAX</p>
                    <p className="mt-1 text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                      Rs. {t.taxTotal.toFixed(2)}
                    </p>
                  </div>

                  <div className="grand-total-box">
                    <p className="grand-total-label">GRAND TOTAL</p>
                    <p className="grand-total-value">
                      Rs. {t.grandTotal.toFixed(2)}
                    </p>
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
