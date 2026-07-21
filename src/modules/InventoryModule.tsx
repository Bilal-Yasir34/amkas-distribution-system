import { useState } from 'react';
import {
  Package,
  ArrowLeftRight,
  Sliders,
  Barcode,
  Layers,
  Search,
  Plus,
  Printer,
  Download,
  X,
  Trash2,
  Edit,
} from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { downloadCSV, todayISO } from '@/lib/utils';
import { LabelPrint } from '@/components/LabelPrint';
import type { StockTransfer, StockAdjustment, ProductBatch, ProductSerial } from '@/lib/types';

export function InventoryModule() {
  const toast = useToast();
  const {
    products,
    warehouses,
    stockTransfers,
    stockAdjustments,
    batches,
    serials,
    addStockTransfer,
    deleteStockTransfer,
    addStockAdjustment,
    deleteStockAdjustment,
    addBatch,
    deleteBatch,
    addSerial,
    deleteSerial,
  } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<
    'Overview' | 'Stock on Hand' | 'Stock Ledger' | 'Transfers' | 'Adjustments' | 'Batches' | 'Serial Numbers' | 'Barcodes & Labels'
  >('Stock on Hand');

  const [search, setSearch] = useState('');
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [fromWh, setFromWh] = useState(warehouses[0]?.id || '');
  const [toWh, setToWh] = useState(warehouses[1]?.id || warehouses[0]?.id || '');
  const [transferProdId, setTransferProdId] = useState(products[0]?.id || '');

  // Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustWh, setAdjustWh] = useState(warehouses[0]?.id || '');
  const [adjustProdId, setAdjustProdId] = useState(products[0]?.id || '');
  const [adjustReason, setAdjustReason] = useState('Damaged stock');

  // Batch Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProdId, setBatchProdId] = useState(products[0]?.id || '');
  const [batchNo, setBatchNo] = useState('');
  const [mfgDate, setMfgDate] = useState(todayISO());
  const [expDate, setExpDate] = useState('2027-12-31');
  const [batchQty, setBatchQty] = useState('100');

  // Serial Modal State
  const [serialModalOpen, setSerialModalOpen] = useState(false);
  const [serialProdId, setSerialProdId] = useState(products[0]?.id || '');
  const [serialNo, setSerialNo] = useState('');

  const handleExportCSV = () => {
    downloadCSV('inventory_stock_on_hand', products);
    toast.success('Stock data exported to CSV');
  };

  const handleSaveTransfer = () => {
    if (!transferProdId) return toast.error('Select a product');
    const transferNo = `MST-${String(stockTransfers.length + 1).padStart(5, '0')}`;
    addStockTransfer({
      transfer_no: transferNo,
      from_warehouse_id: fromWh,
      to_warehouse_id: toWh,
      transfer_date: todayISO(),
      status: 'POSTED',
      created_by: 'admin',
      created_at: new Date().toISOString(),
    });
    toast.success(`Stock Transfer ${transferNo} saved and posted`);
    setTransferModalOpen(false);
  };

  const handleSaveAdjustment = () => {
    if (!adjustProdId) return toast.error('Select a product');
    const adjustNo = `MSA-${String(stockAdjustments.length + 1).padStart(5, '0')}`;
    addStockAdjustment({
      adjustment_no: adjustNo,
      warehouse_id: adjustWh,
      adjustment_date: todayISO(),
      reason: adjustReason,
      status: 'POSTED',
      created_by: 'admin',
      created_at: new Date().toISOString(),
    });
    toast.success(`Stock Adjustment ${adjustNo} saved and posted`);
    setAdjustModalOpen(false);
  };

  const handleSaveBatch = () => {
    if (!batchNo.trim()) return toast.error('Enter a batch number');
    addBatch({
      product_id: batchProdId,
      batch_number: batchNo,
      manufacture_date: mfgDate,
      expiry_date: expDate,
      quantity_initial: Number(batchQty) || 0,
      quantity_on_hand: Number(batchQty) || 0,
      unit_cost: 140,
      is_active: true,
    });
    toast.success(`Batch ${batchNo} created`);
    setBatchModalOpen(false);
  };

  const handleSaveSerial = () => {
    if (!serialNo.trim()) return toast.error('Enter a serial number');
    addSerial({
      product_id: serialProdId,
      serial_number: serialNo,
      status: 'AVAILABLE',
      warehouse_id: warehouses[0]?.id || 'w1',
      created_at: new Date().toISOString(),
    });
    toast.success(`Serial Number ${serialNo} created and added to Serials register!`);
    setSerialModalOpen(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Inventory & Stock Control</h1>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {[
          'Overview',
          'Stock on Hand',
          'Stock Ledger',
          'Transfers',
          'Adjustments',
          'Batches',
          'Serial Numbers',
          'Barcodes & Labels',
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

      {/* STOCK ON HAND */}
      {activeSubTab === 'Stock on Hand' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WAREHOUSE CONTROL</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Stock on hand</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search stock..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none w-48"
                />
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5 text-emerald-500" /> Export CSV
              </button>
              <button
                onClick={() => setTransferModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer stock
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Avg Cost</th>
                  <th className="px-4 py-3">Qty on Hand</th>
                  <th className="px-4 py-3">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p) => {
                  const qty = 500;
                  const cost = p.opening_average_cost || p.purchase_price || 140;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{p.code}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Main Warehouse</td>
                      <td className="px-4 py-3 font-mono">Rs. {cost.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-500">{qty} {p.unit || 'pcs'}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-100">
                        Rs. {(qty * cost).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSFERS */}
      {activeSubTab === 'Transfers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">STOCK MOVEMENTS</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Stock transfers register</h2>
            </div>
            <button
              onClick={() => setTransferModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New transfer
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Transfer No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">From Warehouse</th>
                  <th className="px-4 py-3">To Warehouse</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stockTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No stock transfers recorded yet. Click New Transfer to create one.
                    </td>
                  </tr>
                ) : (
                  stockTransfers.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{st.transfer_no}</td>
                      <td className="px-4 py-3 text-slate-400">{st.transfer_date}</td>
                      <td className="px-4 py-3 text-slate-300">Main Warehouse</td>
                      <td className="px-4 py-3 text-slate-300">Secondary Location</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                          {st.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { deleteStockTransfer(st.id); toast.success('Transfer deleted'); }} className="text-xs text-rose-500 hover:underline">
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

      {/* ADJUSTMENTS */}
      {activeSubTab === 'Adjustments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">STOCK CONTROL</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Stock adjustments register</h2>
            </div>
            <button
              onClick={() => setAdjustModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New adjustment
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Adjustment No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stockAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No stock adjustments recorded yet. Click New Adjustment to create one.
                    </td>
                  </tr>
                ) : (
                  stockAdjustments.map((sa) => (
                    <tr key={sa.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{sa.adjustment_no}</td>
                      <td className="px-4 py-3 text-slate-400">{sa.adjustment_date}</td>
                      <td className="px-4 py-3 text-slate-300">{sa.reason}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                          {sa.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { deleteStockAdjustment(sa.id); toast.success('Adjustment deleted'); }} className="text-xs text-rose-500 hover:underline">
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

      {/* BATCHES */}
      {activeSubTab === 'Batches' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LOT CONTROL</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Product batches register</h2>
            </div>
            <button
              onClick={() => setBatchModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New batch
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Qty on Hand</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No product batches recorded yet. Click New Batch to create one.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => {
                    const p = products.find((x) => x.id === b.product_id);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{b.batch_number}</td>
                        <td className="px-4 py-3 text-slate-300">{p?.name || 'Cotton Fabric'}</td>
                        <td className="px-4 py-3 text-slate-400">{b.expiry_date || '—'}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-200">{b.quantity_on_hand}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { deleteBatch(b.id); toast.success('Batch deleted'); }} className="text-xs text-rose-500 hover:underline">
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

      {/* SERIAL NUMBERS */}
      {activeSubTab === 'Serial Numbers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SERIAL TRACKING</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Serial numbers register</h2>
            </div>
            <button
              onClick={() => setSerialModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> New serial number
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Serial Number</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {serials.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No serial numbers recorded yet. Click New Serial Number to add one.
                    </td>
                  </tr>
                ) : (
                  serials.map((sr) => {
                    const p = products.find((x) => x.id === sr.product_id);
                    return (
                      <tr key={sr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{sr.serial_number}</td>
                        <td className="px-4 py-3 text-slate-300">{p?.name || 'Product'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                            {sr.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { deleteSerial(sr.id); toast.success('Serial deleted'); }} className="text-xs text-rose-500 hover:underline">
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

      {/* BARCODES & LABELS */}
      {activeSubTab === 'Barcodes & Labels' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
          <Barcode className="mx-auto h-12 w-12 text-emerald-500" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Barcode & Price Tag Printing</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Generate printable SKU barcode labels with customizable roll size, price tag formatting, and company logo branding.
          </p>
          <button
            onClick={() => setPrintModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 mx-auto"
          >
            <Printer className="h-4 w-4" /> Open label printer
          </button>
        </div>
      )}

      {/* OTHER SUBTABS */}
      {activeSubTab === 'Overview' && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL PRODUCTS</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{products.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TRANSFERS</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-500">{stockTransfers.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ADJUSTMENTS</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-500">{stockAdjustments.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTIVE BATCHES</p>
            <p className="mt-1 text-2xl font-extrabold text-blue-500">{batches.length}</p>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">New Stock Transfer</h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">From warehouse</label>
                <select value={fromWh} onChange={(e) => setFromWh(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
                  {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">To warehouse</label>
                <select value={toWh} onChange={(e) => setToWh(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
                  {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Product</label>
                <select value={transferProdId} onChange={(e) => setTransferProdId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
                  {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setTransferModalOpen(false)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-400">Cancel</button>
              <button onClick={handleSaveTransfer} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Save Transfer</button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUSTMENT MODAL */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">New Stock Adjustment</h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Warehouse</label>
                <select value={adjustWh} onChange={(e) => setAdjustWh(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
                  {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Product</label>
                <select value={adjustProdId} onChange={(e) => setAdjustProdId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
                  {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Adjustment reason</label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setAdjustModalOpen(false)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-400">Cancel</button>
              <button onClick={handleSaveAdjustment} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Save Adjustment</button>
            </div>
          </div>
        </div>
      )}

      {/* SERIAL MODAL */}
      {serialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Create Serial Number</h3>
              <button onClick={() => setSerialModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Serial Number</label>
                <input type="text" value={serialNo} onChange={(e) => setSerialNo(e.target.value)} placeholder="e.g. SN-99887766" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Product</label>
                <select value={serialProdId} onChange={(e) => setSerialProdId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
                  {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setSerialModalOpen(false)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-400">Cancel</button>
              <button onClick={handleSaveSerial} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Save Serial</button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH MODAL */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Create Product Batch</h3>
              <button onClick={() => setBatchModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Batch Number</label>
                <input type="text" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="e.g. BAT-2026-002" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Product</label>
                <select value={batchProdId} onChange={(e) => setBatchProdId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none">
                  {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setBatchModalOpen(false)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-400">Cancel</button>
              <button onClick={handleSaveBatch} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Save Batch</button>
            </div>
          </div>
        </div>
      )}

      {/* Label Print Modal */}
      {printModalOpen && (
        <LabelPrint products={products} onClose={() => setPrintModalOpen(false)} />
      )}
    </div>
  );
}
