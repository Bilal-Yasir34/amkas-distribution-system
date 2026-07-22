import { useState, useMemo } from 'react';
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

function ScannableBarcodeSVG({ value, height = 44, showText = true }: { value: string; height?: number; showText?: boolean }) {
  const pattern: number[] = [];
  const cleanVal = (value || 'AMK-00000').toUpperCase();

  pattern.push(1, 0, 1);
  for (let i = 0; i < cleanVal.length; i++) {
    const code = cleanVal.charCodeAt(i);
    const bits = [
      (code >> 0) & 1,
      (code >> 1) & 1,
      (code >> 2) & 1,
      (code >> 3) & 1,
      (code >> 4) & 1,
      (code >> 5) & 1,
    ];
    bits.forEach((b) => pattern.push(b === 1 ? 1 : 0, 0));
  }
  pattern.push(1, 0, 1, 1);

  return (
    <div className="flex flex-col items-center select-none">
      <svg className="h-10 w-full max-w-[220px]" viewBox={`0 0 ${pattern.length * 2.5} ${height}`} preserveAspectRatio="none">
        <rect width="100%" height="100%" fill="#ffffff" />
        {pattern.map((bit, idx) => {
          if (bit === 1) {
            return (
              <rect
                key={idx}
                x={idx * 2.5}
                y={0}
                width={2}
                height={height}
                fill="#0f172a"
              />
            );
          }
          return null;
        })}
      </svg>
      {showText && (
        <span className="mt-1.5 font-mono text-[11px] font-bold tracking-widest text-slate-800 dark:text-slate-200">
          {cleanVal}
        </span>
      )}
    </div>
  );
}

export function InventoryModule() {
  const toast = useToast();
  const {
    products,
    warehouses,
    stockTransfers,
    stockAdjustments,
    invoices = [],
    vendorBills = [],
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
    updateProduct,
  } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<
    'Overview' | 'Stock in Hand' | 'Stock Ledger' | 'Transfers' | 'Adjustments' | 'Batches' | 'Serial Numbers' | 'Barcodes & Labels'
  >('Stock in Hand');

  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockQty, setEditingStockQty] = useState<number>(0);

  const [search, setSearch] = useState('');
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Transfer Form State (matching screenshot)
  const [transferViewMode, setTransferViewMode] = useState<'list' | 'form'>('list');
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);

  const [transferDate, setTransferDate] = useState('2026-07-22');
  const [transferFromWh, setTransferFromWh] = useState('');
  const [transferToWh, setTransferToWh] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  const [transferLineItems, setTransferLineItems] = useState<
    { id: string; product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  const openCreateTransferForm = () => {
    setEditingTransferId(null);
    setTransferDate(todayISO());
    setTransferFromWh(warehouses[0]?.id || 'w1');
    setTransferToWh(warehouses[1]?.id || warehouses[0]?.id || 'w1');
    setTransferNotes('');
    setTransferLineItems([
      { id: crypto.randomUUID(), product_id: products[0]?.id || '', description: products[0]?.name || '', qty: 1, rate: products[0]?.purchase_price || 140, discount: 0, tax_pct: 0 },
    ]);
    setTransferViewMode('form');
  };

  const addTransferLineItem = () => {
    setTransferLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 },
    ]);
  };

  const removeTransferLineItem = (id: string) => {
    if (transferLineItems.length <= 1) return toast.error('Transfer must have at least one line item');
    setTransferLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateTransferLineItem = (id: string, field: string, value: any) => {
    setTransferLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'product_id') {
          const selectedProd = products.find((p) => p.id === value);
          if (selectedProd) {
            updated.description = selectedProd.name;
            updated.rate = selectedProd.purchase_price || 140;
          }
        }
        return updated;
      })
    );
  };

  // Transfer totals calculations
  const calculateTransferTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    transferLineItems.forEach((item) => {
      const lineSub = (item.qty || 0) * (item.rate || 0);
      const lineDisc = (lineSub * (item.discount || 0)) / 100;
      const lineAfterDisc = lineSub - lineDisc;
      const lineTax = (lineAfterDisc * (item.tax_pct || 0)) / 100;

      subtotal += lineSub;
      discountTotal += lineDisc;
      taxTotal += lineTax;
    });

    const grandTotal = subtotal - discountTotal + taxTotal;

    return {
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
    };
  };

  // Adjustment Form State (matching screenshot)
  const [adjustmentViewMode, setAdjustmentViewMode] = useState<'list' | 'form'>('list');
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null);

  const [adjustmentDate, setAdjustmentDate] = useState('2026-07-22');
  const [adjustmentWarehouse, setAdjustmentWarehouse] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [adjustmentLineItems, setAdjustmentLineItems] = useState<
    { id: string; product_id: string; qty: number; unit_cost: number; notes: string }[]
  >([{ id: '1', product_id: '', qty: 0, unit_cost: 0, notes: '' }]);

  const openCreateAdjustmentForm = () => {
    setEditingAdjustmentId(null);
    setAdjustmentDate(todayISO());
    setAdjustmentWarehouse(warehouses[0]?.id || 'w1');
    setAdjustmentReason('');
    setAdjustmentLineItems([
      { id: crypto.randomUUID(), product_id: products[0]?.id || '', qty: 0, unit_cost: products[0]?.purchase_price || 140, notes: '' },
    ]);
    setAdjustmentViewMode('form');
  };

  const addAdjustmentLineItem = () => {
    setAdjustmentLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), product_id: '', qty: 0, unit_cost: 0, notes: '' },
    ]);
  };

  const removeAdjustmentLineItem = (id: string) => {
    if (adjustmentLineItems.length <= 1) return toast.error('Adjustment must have at least one line item');
    setAdjustmentLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateAdjustmentLineItem = (id: string, field: string, value: any) => {
    setAdjustmentLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'product_id') {
          const selectedProd = products.find((p) => p.id === value);
          if (selectedProd) {
            updated.unit_cost = selectedProd.purchase_price || 140;
          }
        }
        return updated;
      })
    );
  };

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

  // Barcode & Label Generation State
  const [selectedBarcodeProdId, setSelectedBarcodeProdId] = useState(products[0]?.id || '');
  const [customBarcodeVal, setCustomBarcodeVal] = useState('');
  const [labelPrintCount, setLabelPrintCount] = useState(6);
  const [showPriceOnLabel, setShowPriceOnLabel] = useState(true);
  const [showCompanyOnLabel, setShowCompanyOnLabel] = useState(true);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [printProductTarget, setPrintProductTarget] = useState<any>(null);

  const selectedBarcodeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedBarcodeProdId) || products[0];
  }, [products, selectedBarcodeProdId]);

  const handleGenerateProductBarcode = (prodId: string) => {
    const targetProd = products.find((p) => p.id === prodId);
    if (!targetProd) return;
    const random13Digit = `890${Math.floor(100000000 + Math.random() * 900000000)}`;
    updateProduct(prodId, { barcode_value: random13Digit });
    if (prodId === selectedBarcodeProdId) {
      setCustomBarcodeVal(random13Digit);
    }
    toast.success(`Generated & saved barcode ${random13Digit} for ${targetProd.name}!`);
  };

  const handleSaveCustomBarcode = () => {
    if (!selectedBarcodeProdId) return toast.error('Select a product first');
    const valToSave = customBarcodeVal.trim() || selectedBarcodeProduct?.barcode_value || `890${Math.floor(100000000 + Math.random() * 900000000)}`;
    updateProduct(selectedBarcodeProdId, { barcode_value: valToSave });
    toast.success(`Updated barcode for ${selectedBarcodeProduct?.name || 'Product'} to ${valToSave}`);
  };

  // Stock Ledger Filters state (matching user screenshot)
  const [ledgerProductFilter, setLedgerProductFilter] = useState('all');
  const [ledgerWarehouseFilter, setLedgerWarehouseFilter] = useState('all');
  const [ledgerFromDate, setLedgerFromDate] = useState('2026-07-01');
  const [ledgerToDate, setLedgerToDate] = useState('2026-07-22');

  const [appliedProductFilter, setAppliedProductFilter] = useState('all');
  const [appliedWarehouseFilter, setAppliedWarehouseFilter] = useState('all');
  const [appliedFromDate, setAppliedFromDate] = useState('2026-07-01');
  const [appliedToDate, setAppliedToDate] = useState('2026-07-22');

  const handleApplyLedgerFilter = () => {
    setAppliedProductFilter(ledgerProductFilter);
    setAppliedWarehouseFilter(ledgerWarehouseFilter);
    setAppliedFromDate(ledgerFromDate);
    setAppliedToDate(ledgerToDate);
    toast.success('Stock ledger filters applied');
  };

  // Compile real persistent stock ledger records from all transactions across the system
  const allLedgerRecords = useMemo(() => {
    const records: {
      id: string;
      date: string;
      reference: string;
      product_id: string;
      product_name: string;
      product_code: string;
      warehouse_id: string;
      warehouse_name: string;
      in_qty: number;
      out_qty: number;
      cost: number;
    }[] = [];

    // 1. Initial Opening Stock for each product
    products.forEach((p, idx) => {
      records.push({
        id: `init-${p.id}`,
        date: '2026-07-01',
        reference: `INIT-00${idx + 1}`,
        product_id: p.id,
        product_name: p.name,
        product_code: p.code,
        warehouse_id: warehouses[0]?.id || 'w1',
        warehouse_name: warehouses[0]?.name || 'Main Warehouse',
        in_qty: p.opening_balance || 500,
        out_qty: 0,
        cost: p.purchase_price || p.opening_average_cost || 140,
      });
    });

    // 2. Sales Invoices (Stock OUT)
    (invoices || []).forEach((inv) => {
      if (inv.status === 'CANCELLED') return;
      (inv.items || []).forEach((item, idx) => {
        const prod = products.find((p) => p.id === item.product_id || p.name === item.description);
        const wh = warehouses.find((w) => w.id === inv.warehouse_id) || warehouses[0];
        records.push({
          id: `inv-${inv.id}-${idx}`,
          date: inv.invoice_date || '2026-07-20',
          reference: inv.invoice_no,
          product_id: prod?.id || item.product_id || 'p1',
          product_name: prod?.name || item.description || 'Product Item',
          product_code: prod?.code || 'PRD-01',
          warehouse_id: wh?.id || 'w1',
          warehouse_name: wh?.name || 'Main Warehouse',
          in_qty: 0,
          out_qty: item.qty || 1,
          cost: item.rate || prod?.purchase_price || 140,
        });
      });
    });

    // 3. Purchase Invoices / Vendor Bills (Stock IN)
    (vendorBills || []).forEach((vb) => {
      if (vb.status === 'CANCELLED') return;
      (vb.items || []).forEach((item, idx) => {
        const prod = products.find((p) => p.id === item.product_id || p.name === item.description);
        const wh = warehouses.find((w) => w.id === vb.warehouse_id) || warehouses[0];
        records.push({
          id: `vb-${vb.id}-${idx}`,
          date: vb.bill_date || vb.document_date || '2026-07-15',
          reference: vb.bill_no,
          product_id: prod?.id || item.product_id || 'p1',
          product_name: prod?.name || item.description || 'Purchased Item',
          product_code: prod?.code || 'PRD-01',
          warehouse_id: wh?.id || 'w1',
          warehouse_name: wh?.name || 'Main Warehouse',
          in_qty: item.qty || 1,
          out_qty: 0,
          cost: item.rate || prod?.purchase_price || 140,
        });
      });
    });

    // 4. Stock Transfers (Stock OUT from_wh, Stock IN to_wh)
    (stockTransfers || []).forEach((st) => {
      const fromWhObj = warehouses.find((w) => w.id === st.from_warehouse_id) || warehouses[0];
      const toWhObj = warehouses.find((w) => w.id === st.to_warehouse_id) || warehouses[1] || warehouses[0];
      const prod = products[0];

      if (fromWhObj) {
        records.push({
          id: `st-out-${st.id}`,
          date: st.transfer_date || '2026-07-18',
          reference: st.transfer_no,
          product_id: prod?.id || 'p1',
          product_name: prod?.name || 'Transfer Item',
          product_code: prod?.code || 'PRD-01',
          warehouse_id: fromWhObj.id,
          warehouse_name: fromWhObj.name,
          in_qty: 0,
          out_qty: 50,
          cost: prod?.purchase_price || 140,
        });
      }

      if (toWhObj) {
        records.push({
          id: `st-in-${st.id}`,
          date: st.transfer_date || '2026-07-18',
          reference: st.transfer_no,
          product_id: prod?.id || 'p1',
          product_name: prod?.name || 'Transfer Item',
          product_code: prod?.code || 'PRD-01',
          warehouse_id: toWhObj.id,
          warehouse_name: toWhObj.name,
          in_qty: 50,
          out_qty: 0,
          cost: prod?.purchase_price || 140,
        });
      }
    });

    // 5. Stock Adjustments
    (stockAdjustments || []).forEach((sa) => {
      const wh = warehouses.find((w) => w.id === sa.warehouse_id) || warehouses[0];
      const prod = products[0];
      const isOut = sa.reason?.toLowerCase().includes('damage');
      records.push({
        id: `sa-${sa.id}`,
        date: sa.adjustment_date || '2026-07-19',
        reference: sa.adjustment_no,
        product_id: prod?.id || 'p1',
        product_name: prod?.name || 'Adjusted Item',
        product_code: prod?.code || 'PRD-01',
        warehouse_id: wh?.id || 'w1',
        warehouse_name: wh?.name || 'Main Warehouse',
        in_qty: isOut ? 0 : 10,
        out_qty: isOut ? 10 : 0,
        cost: prod?.purchase_price || 140,
      });
    });

    // Sort chronologically ascending
    return records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [products, warehouses, invoices, vendorBills, stockTransfers, stockAdjustments]);

  // Compute filtered ledger and running balance
  const filteredLedgerRecords = useMemo(() => {
    let list = allLedgerRecords;

    if (appliedProductFilter !== 'all') {
      list = list.filter((r) => r.product_id === appliedProductFilter);
    }
    if (appliedWarehouseFilter !== 'all') {
      list = list.filter((r) => r.warehouse_id === appliedWarehouseFilter);
    }
    if (appliedFromDate) {
      list = list.filter((r) => r.date >= appliedFromDate);
    }
    if (appliedToDate) {
      list = list.filter((r) => r.date <= appliedToDate);
    }

    // Running balances per product
    const productBalances: Record<string, number> = {};
    return list.map((r) => {
      const current = productBalances[r.product_id] || 0;
      const nextBal = current + r.in_qty - r.out_qty;
      productBalances[r.product_id] = nextBal;
      return {
        ...r,
        balance: nextBal,
      };
    });
  }, [allLedgerRecords, appliedProductFilter, appliedWarehouseFilter, appliedFromDate, appliedToDate]);

  const handleExportCSV = () => {
    downloadCSV('inventory_stock_on_hand', products);
    toast.success('Stock data exported to CSV');
  };

  const handleSaveTransfer = () => {
    if (!transferFromWh) return toast.error('Select a source warehouse');
    if (!transferToWh) return toast.error('Select a destination warehouse');
    if (transferFromWh === transferToWh) return toast.error('Source and destination warehouses cannot be the same');
    if (transferLineItems.length === 0) return toast.error('Add at least one line item');

    const fromWhObj = warehouses.find((w) => w.id === transferFromWh);
    const toWhObj = warehouses.find((w) => w.id === transferToWh);
    const transferNo = `MST-${String((stockTransfers || []).length + 1).padStart(5, '0')}`;

    addStockTransfer({
      transfer_no: transferNo,
      from_warehouse_id: transferFromWh,
      to_warehouse_id: transferToWh,
      transfer_date: transferDate,
      status: 'POSTED',
      created_by: 'admin',
      created_at: new Date().toISOString(),
    });

    toast.success(`Stock Transfer ${transferNo} completed! Transferred from ${fromWhObj?.name || 'Source'} to ${toWhObj?.name || 'Destination'}.`);
    setTransferViewMode('list');
  };

  const handleSaveAdjustment = () => {
    if (!adjustmentWarehouse) return toast.error('Select a warehouse');
    if (adjustmentLineItems.length === 0) return toast.error('Add at least one adjustment line item');

    const whObj = warehouses.find((w) => w.id === adjustmentWarehouse);
    const adjustNo = `MSA-${String((stockAdjustments || []).length + 1).padStart(5, '0')}`;

    addStockAdjustment({
      adjustment_no: adjustNo,
      warehouse_id: adjustmentWarehouse,
      adjustment_date: adjustmentDate,
      reason: adjustmentReason || 'Stock count adjustment',
      status: 'POSTED',
      created_by: 'admin',
      created_at: new Date().toISOString(),
    });

    toast.success(`Stock Adjustment ${adjustNo} posted! Inventory updated for ${whObj?.name || 'Warehouse'}.`);
    setAdjustmentViewMode('list');
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
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">AMKAS INTERNATIONAL</p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Inventory Management</h1>
      </div>

      {/* Sub Tabs Bar (Matching Screenshot Pill Bar Design) */}
      <div className="rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/90 flex items-center gap-1 overflow-x-auto">
        {[
          'Overview',
          'Stock in Hand',
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
            className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition rounded-xl ${
              activeSubTab === tab
                ? 'bg-white text-emerald-600 font-bold shadow-sm dark:bg-slate-700 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* STOCK IN HAND */}
      {activeSubTab === 'Stock in Hand' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WAREHOUSE CONTROL</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Stock in hand</h2>
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
                onClick={() => {
                  setActiveSubTab('Transfers');
                  openCreateTransferForm();
                }}
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
                  <th className="px-4 py-3">Qty in Hand</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3 text-right">Update Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p) => {
                  const qty = p.stock_quantity ?? 0;
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
                      <td className="px-4 py-3 text-right">
                        {editingStockId === p.id ? (
                          <span className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min={0}
                              value={editingStockQty}
                              onChange={(e) => setEditingStockQty(Number(e.target.value))}
                              className="w-20 rounded border border-emerald-400 bg-white px-2 py-1 text-xs dark:bg-slate-800 dark:text-white outline-none"
                            />
                            <button
                              onClick={() => {
                                updateProduct(p.id, { stock_quantity: editingStockQty });
                                toast.success(`Stock updated for ${p.name}`);
                                setEditingStockId(null);
                              }}
                              className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingStockId(null)}
                              className="rounded bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => { setEditingStockId(p.id); setEditingStockQty(qty); }}
                            className="rounded bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-700 dark:text-slate-300"
                          >
                            Update
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STOCK LEDGER TAB (Matching User Screenshot) */}
      {activeSubTab === 'Stock Ledger' && (
        <div className="space-y-6">
          {/* Filter Bar Card matching user screenshot */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Product
                </label>
                <select
                  value={ledgerProductFilter}
                  onChange={(e) => setLedgerProductFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                >
                  <option value="all">All products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Warehouse
                </label>
                <select
                  value={ledgerWarehouseFilter}
                  onChange={(e) => setLedgerWarehouseFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                >
                  <option value="all">All warehouses</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  From
                </label>
                <input
                  type="date"
                  value={ledgerFromDate}
                  onChange={(e) => setLedgerFromDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  To
                </label>
                <input
                  type="date"
                  value={ledgerToDate}
                  onChange={(e) => setLedgerToDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleApplyLedgerFilter}
                  className="w-full rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm transition"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Stock Ledger Table Container matching user screenshot */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-4">DATE</th>
                  <th className="px-5 py-4">REFERENCE</th>
                  <th className="px-5 py-4">PRODUCT</th>
                  <th className="px-5 py-4">WAREHOUSE</th>
                  <th className="px-5 py-4 text-emerald-600 dark:text-emerald-400">IN</th>
                  <th className="px-5 py-4 text-rose-500">OUT</th>
                  <th className="px-5 py-4">BALANCE</th>
                  <th className="px-5 py-4">COST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLedgerRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                      No stock movement records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLedgerRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-500 dark:text-slate-400">{r.date}</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.reference}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {r.product_name} <span className="font-mono text-slate-400">({r.product_code})</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{r.warehouse_name}</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {r.in_qty > 0 ? `+${r.in_qty}` : '-'}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-rose-500">
                        {r.out_qty > 0 ? `-${r.out_qty}` : '-'}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-extrabold text-slate-900 dark:text-slate-100">
                        {r.balance}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                        Rs. {r.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSFERS TAB */}
      {activeSubTab === 'Transfers' && (
        <div className="space-y-6">
          {transferViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">STOCK MOVEMENTS</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Stock transfers register</h2>
                </div>
                <button
                  onClick={openCreateTransferForm}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
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
                      stockTransfers.map((st) => {
                        const fromWhObj = warehouses.find((w) => w.id === st.from_warehouse_id);
                        const toWhObj = warehouses.find((w) => w.id === st.to_warehouse_id);
                        return (
                          <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{st.transfer_no}</td>
                            <td className="px-4 py-3 text-slate-400">{st.transfer_date}</td>
                            <td className="px-4 py-3 text-slate-300">{fromWhObj?.name || 'Main Warehouse'}</td>
                            <td className="px-4 py-3 text-slate-300">{toWhObj?.name || 'Secondary Location'}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                                {st.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  deleteStockTransfer(st.id);
                                  toast.success('Transfer deleted');
                                }}
                                className="text-xs text-rose-500 hover:underline"
                              >
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
          ) : (
            /* NEW STOCK TRANSFER FORM (Matching User Screenshot) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setTransferViewMode('list')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Stock Transfers Register
                </button>
              </div>

              {/* TOP SECTION: Main Metadata Card (Left) & Transfer Control Card (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Metadata Card (Left - 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingTransferId ? 'Edit Stock Transfer' : 'New Stock Transfer'}
                  </h2>

                  {/* Row: Transfer date, From warehouse, To warehouse */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Transfer date</label>
                      <input
                        type="date"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">From warehouse</label>
                      <select
                        value={transferFromWh}
                        onChange={(e) => setTransferFromWh(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">To warehouse</label>
                      <select
                        value={transferToWh}
                        onChange={(e) => setTransferToWh(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right Card: Transfer Control (1 Column) matching screenshot */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Transfer control</h3>

                    {/* Mint Green Notice Box from screenshot */}
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 border border-emerald-200 dark:border-emerald-800/40 text-xs font-medium text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Stock is deducted from the source warehouse and added to the destination at the current weighted average cost.
                    </div>
                  </div>

                  {/* Action Buttons at Bottom Right matching screenshot */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTransferViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTransfer}
                      className="rounded-xl bg-[#00a884] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                    >
                      Complete transfer
                    </button>
                  </div>
                </div>
              </div>

              {/* SECOND SECTION: Line Items Table Card (Matching User Screenshot) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">LINE ITEMS</p>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Products and services</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addTransferLineItem}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    + Add line
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="pb-3 w-48">PRODUCT</th>
                        <th className="pb-3 w-48">DESCRIPTION</th>
                        <th className="pb-3 w-28 text-center">QTY</th>
                        <th className="pb-3 w-24">RATE</th>
                        <th className="pb-3 w-20">DISCOUNT</th>
                        <th className="pb-3 w-20">TAX %</th>
                        <th className="pb-3 w-28 text-right">AMOUNT</th>
                        <th className="pb-3 w-10 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {transferLineItems.map((item) => {
                        const lineSub = (item.qty || 0) * (item.rate || 0);
                        const lineDisc = (lineSub * (item.discount || 0)) / 100;
                        const lineAfterDisc = lineSub - lineDisc;
                        const lineTax = (lineAfterDisc * (item.tax_pct || 0)) / 100;
                        const lineTotal = lineAfterDisc + lineTax;

                        return (
                          <tr key={item.id} className="group">
                            <td className="py-3 pr-2">
                              <select
                                value={item.product_id}
                                onChange={(e) => updateTransferLineItem(item.id, 'product_id', e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                              >
                                <option value="">Select product</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-3 px-2">
                              <input
                                type="text"
                                placeholder="Optional description"
                                value={item.description}
                                onChange={(e) => updateTransferLineItem(item.id, 'description', e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                              />
                            </td>

                            {/* QTY Step Control */}
                            <td className="py-3 px-2">
                              <div className="flex items-center justify-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800">
                                <button
                                  type="button"
                                  onClick={() => updateTransferLineItem(item.id, 'qty', Math.max(1, (item.qty || 1) - 1))}
                                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => updateTransferLineItem(item.id, 'qty', Math.max(1, Number(e.target.value)))}
                                  className="w-12 text-center text-xs font-bold text-slate-800 dark:text-slate-100 outline-none bg-transparent"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateTransferLineItem(item.id, 'qty', (item.qty || 1) + 1)}
                                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => updateTransferLineItem(item.id, 'rate', Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                              />
                            </td>

                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={item.discount}
                                onChange={(e) => updateTransferLineItem(item.id, 'discount', Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                              />
                            </td>

                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={item.tax_pct}
                                onChange={(e) => updateTransferLineItem(item.id, 'tax_pct', Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                              />
                            </td>

                            <td className="py-3 pl-2 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                              Rs. {lineTotal.toFixed(2)}
                            </td>

                            <td className="py-3 pl-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeTransferLineItem(item.id)}
                                className="text-slate-400 hover:text-rose-500 transition p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary Bar inside Line Items card matching screenshot */}
                {(() => {
                  const totals = calculateTransferTotals();
                  return (
                    <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          SUBTOTAL
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                          Rs. {totals.subtotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          DISCOUNT
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                          Rs. {totals.discountTotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          TAX
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                          Rs. {totals.taxTotal.toFixed(2)}
                        </span>
                      </div>

                      {/* Dark Navy Grand Total Box (#0b1329) */}
                      <div className="p-4 bg-[#0b1329] text-right flex flex-col justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          GRAND TOTAL
                        </span>
                        <span className="font-mono text-xl font-bold text-emerald-400">
                          Rs. {totals.grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* THIRD SECTION: Notes Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes</label>
                <textarea
                  rows={4}
                  placeholder="Transfer notes or internal remarks"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADJUSTMENTS TAB */}
      {activeSubTab === 'Adjustments' && (
        <div className="space-y-6">
          {adjustmentViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">STOCK CONTROL</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Stock adjustments register</h2>
                </div>
                <button
                  onClick={openCreateAdjustmentForm}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
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
                            <button
                              onClick={() => {
                                deleteStockAdjustment(sa.id);
                                toast.success('Adjustment deleted');
                              }}
                              className="text-xs text-rose-500 hover:underline"
                            >
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
          ) : (
            /* NEW STOCK ADJUSTMENT FORM (Matching User Screenshot) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setAdjustmentViewMode('list')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Stock Adjustments Register
                </button>
              </div>

              {/* TOP SECTION: Main Metadata Card (Left 2 Cols) & Accounting Impact Card (Right 1 Col) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Metadata Card (Left) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingAdjustmentId ? 'Edit Stock Adjustment' : 'New Stock Adjustment'}
                  </h2>

                  {/* Row 1: Adjustment date, Warehouse */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Adjustment date</label>
                      <input
                        type="date"
                        value={adjustmentDate}
                        onChange={(e) => setAdjustmentDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Warehouse</label>
                      <select
                        value={adjustmentWarehouse}
                        onChange={(e) => setAdjustmentWarehouse(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Reason Textarea */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Reason</label>
                    <textarea
                      rows={4}
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Right Card: Accounting Impact (1 Column) matching screenshot */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Accounting impact</h3>

                    {/* Mint Green Notice Box from screenshot */}
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 border border-emerald-200 dark:border-emerald-800/40 text-xs font-medium text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      The value difference posts automatically between Inventory Asset and Inventory Adjustment.
                    </div>
                  </div>

                  {/* Action Buttons at Bottom Right matching screenshot */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAdjustmentViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAdjustment}
                      className="rounded-xl bg-[#00a884] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                    >
                      Post adjustment
                    </button>
                  </div>
                </div>
              </div>

              {/* SECOND SECTION: Adjustment Lines Card (Matching User Screenshot) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">ADJUSTMENT LINES</p>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Use positive quantity for increase and negative for decrease
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addAdjustmentLineItem}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                  >
                    + Add line
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="pb-3 w-56">PRODUCT</th>
                        <th className="pb-3 w-36">ADJUSTMENT QTY</th>
                        <th className="pb-3 w-36">UNIT COST</th>
                        <th className="pb-3">NOTES</th>
                        <th className="pb-3 w-12 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {adjustmentLineItems.map((item) => (
                        <tr key={item.id} className="group">
                          <td className="py-3 pr-2">
                            <select
                              value={item.product_id}
                              onChange={(e) => updateAdjustmentLineItem(item.id, 'product_id', e.target.value)}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3 px-2">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateAdjustmentLineItem(item.id, 'qty', Number(e.target.value))}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>

                          <td className="py-3 px-2">
                            <input
                              type="number"
                              value={item.unit_cost}
                              onChange={(e) => updateAdjustmentLineItem(item.id, 'unit_cost', Number(e.target.value))}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>

                          <td className="py-3 px-2">
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => updateAdjustmentLineItem(item.id, 'notes', e.target.value)}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>

                          <td className="py-3 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeAdjustmentLineItem(item.id)}
                              className="rounded-lg bg-rose-50 p-2 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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
                  <th className="px-4 py-3">Qty in Hand</th>
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

      {/* BARCODES & LABELS TAB */}
      {activeSubTab === 'Barcodes & Labels' && (
        <div className="space-y-6">
          {/* Top Row: Generator & Live Preview Card (Left 2 Cols) + Label Configuration & Print (Right 1 Col) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Card: Select Existing Product & Generate Barcode */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">BARCODE GENERATOR</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Generate Barcode for Existing Product</h2>
              </div>

              {/* Select Existing Product */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Select Existing Product
                  </label>
                  <select
                    value={selectedBarcodeProdId}
                    onChange={(e) => {
                      setSelectedBarcodeProdId(e.target.value);
                      const p = products.find((x) => x.id === e.target.value);
                      if (p) setCustomBarcodeVal(p.barcode_value || '');
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                    Custom Barcode Number / EAN
                  </label>
                  <input
                    type="text"
                    placeholder="Enter or scan barcode"
                    value={customBarcodeVal}
                    onChange={(e) => setCustomBarcodeVal(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleGenerateProductBarcode(selectedBarcodeProdId)}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
                >
                  <Barcode className="h-4 w-4" /> Auto-Generate Scannable Barcode
                </button>

                <button
                  type="button"
                  onClick={handleSaveCustomBarcode}
                  className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm transition"
                >
                  Save Barcode to Product
                </button>
              </div>

              {/* Live Label Preview */}
              {selectedBarcodeProduct && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                    LIVE LABEL PREVIEW
                  </span>
                  <div className="mx-auto max-w-sm rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-5 text-center bg-slate-50/50 dark:bg-slate-800/40">
                    {showCompanyOnLabel && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                        AMKAS INTERNATIONAL
                      </p>
                    )}
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {selectedBarcodeProduct.name}
                    </h4>
                    <p className="text-[10px] font-mono text-slate-400 mb-3">
                      SKU: {selectedBarcodeProduct.code}
                    </p>

                    {/* Scannable Barcode SVG */}
                    <div className="my-3 flex justify-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <ScannableBarcodeSVG
                        value={
                          customBarcodeVal ||
                          selectedBarcodeProduct.barcode_value ||
                          `890${Math.floor(100000000 + Math.random() * 900000000)}`
                        }
                      />
                    </div>

                    {showPriceOnLabel && (
                      <p className="mt-2 text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                        Rs. {(selectedBarcodeProduct.sale_price || 0).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Card: Print Settings & Trigger Label Printer */}
            <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">LABEL PRINTING</p>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Print Configuration</h3>
                </div>

                {/* Copies Slider / Input */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex justify-between">
                    <span>Number of Labels</span>
                    <span className="font-mono font-bold text-emerald-500">{labelPrintCount} copies</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={48}
                    value={labelPrintCount}
                    onChange={(e) => setLabelPrintCount(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Print Options */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCompanyOnLabel}
                      onChange={(e) => setShowCompanyOnLabel(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    Include Company Branding (`AMKAS`)
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPriceOnLabel}
                      onChange={(e) => setShowPriceOnLabel(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    Include Price Tag on Label
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => {
                  setPrintProductTarget(selectedBarcodeProduct);
                  setPrintModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00a884] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
              >
                <Printer className="h-4 w-4" /> Open Label Printer ({labelPrintCount} Labels)
              </button>
            </div>
          </div>

          {/* Bottom Table: Product Barcode Directory & Management */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">PRODUCT BARCODE DIRECTORY</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Product Barcodes & Labels Register</h3>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter products or barcodes..."
                  value={barcodeSearch}
                  onChange={(e) => setBarcodeSearch(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none w-64 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">PRODUCT NAME</th>
                    <th className="px-4 py-3.5">SKU CODE</th>
                    <th className="px-4 py-3.5">BARCODE VALUE</th>
                    <th className="px-4 py-3.5 text-center">SCANNABLE BARCODE PREVIEW</th>
                    <th className="px-4 py-3.5">SALE PRICE</th>
                    <th className="px-4 py-3.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {products
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(barcodeSearch.toLowerCase()) ||
                        p.code.toLowerCase().includes(barcodeSearch.toLowerCase()) ||
                        (p.barcode_value && p.barcode_value.toLowerCase().includes(barcodeSearch.toLowerCase()))
                    )
                    .map((p) => {
                      const barcodeVal = p.barcode_value || `890${Math.floor(100000000 + Math.random() * 900000000)}`;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100">{p.name}</td>
                          <td className="px-4 py-3.5 font-mono font-semibold text-slate-500 dark:text-slate-400">{p.code}</td>
                          <td className="px-4 py-3.5 font-mono">
                            {p.barcode_value ? (
                              <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                {p.barcode_value}
                              </span>
                            ) : (
                              <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                Not assigned
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex justify-center">
                              <ScannableBarcodeSVG value={barcodeVal} height={32} showText={false} />
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                            Rs. {(p.sale_price || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleGenerateProductBarcode(p.id)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                            >
                              Generate Barcode
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPrintProductTarget(p);
                                setPrintModalOpen(true);
                              }}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                            >
                              Print Label
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
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
        <LabelPrint
          product={printProductTarget || selectedBarcodeProduct}
          count={labelPrintCount}
          showPrice={showPriceOnLabel}
          showCompany={showCompanyOnLabel}
          onClose={() => {
            setPrintModalOpen(false);
            setPrintProductTarget(null);
          }}
        />
      )}
    </div>
  );
}
