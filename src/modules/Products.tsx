import { useState } from 'react';
import { Plus, Package, Search, X, Edit, Trash2, Power, Download } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { downloadCSV } from '@/lib/utils';
import type { Product } from '@/lib/types';

export function Products() {
  const toast = useToast();
  const { products, categories, addProduct, updateProduct, deleteProduct } = useDataStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [unit, setUnit] = useState('pcs');
  const [description, setDescription] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [openingCost, setOpeningCost] = useState('0');
  const [salePrice, setSalePrice] = useState('0');
  const [taxRate, setTaxRate] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [trackBatches, setTrackBatches] = useState(false);
  const [trackSerials, setTrackSerials] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setSku('');
    setBarcode('');
    setCategory('Uncategorized');
    setUnit('pcs');
    setDescription('');
    setPurchasePrice('0');
    setOpeningCost('0');
    setSalePrice('0');
    setTaxRate('0');
    setReorderLevel('0');
    setTrackBatches(false);
    setTrackSerials(false);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setSku(p.code);
    setBarcode(p.barcode_value || p.code);
    setCategory(p.category || 'Uncategorized');
    setUnit(p.unit || 'pcs');
    setDescription(p.description || '');
    setPurchasePrice(String(p.purchase_price || 0));
    setOpeningCost(String(p.opening_average_cost || 0));
    setSalePrice(String(p.sale_price || 0));
    setTaxRate(String(p.tax_pct || 0));
    setReorderLevel(String(p.reorder_level || 0));
    setTrackBatches(p.track_batches);
    setTrackSerials(p.track_serials);
    setIsActive(p.is_active);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error('Product name is required');

    const code = sku.trim() || `SKU-${String(products.length + 1).padStart(5, '0')}`;

    if (editingId) {
      updateProduct(editingId, {
        code,
        name,
        category,
        unit,
        description,
        purchase_price: Number(purchasePrice) || 0,
        opening_average_cost: Number(openingCost) || 0,
        sale_price: Number(salePrice) || 0,
        tax_pct: Number(taxRate) || 0,
        reorder_level: Number(reorderLevel) || 0,
        track_batches: trackBatches,
        track_serials: trackSerials,
        barcode_value: barcode || code,
        is_active: isActive,
      });
      toast.success(`Product ${name} updated`);
    } else {
      addProduct({
        code,
        name,
        category,
        unit,
        length: 0,
        width: 0,
        purchase_price: Number(purchasePrice) || 0,
        opening_average_cost: Number(openingCost) || 0,
        sale_price: Number(salePrice) || 0,
        tax_pct: Number(taxRate) || 0,
        reorder_level: Number(reorderLevel) || 0,
        track_batches: trackBatches,
        track_serials: trackSerials,
        barcode_value: barcode || code,
        description,
        is_active: isActive,
      });
      toast.success(`Product ${name} added`);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, prodName: string) => {
    if (confirm(`Are you sure you want to delete ${prodName}?`)) {
      deleteProduct(id);
      toast.success(`Product ${prodName} deleted`);
    }
  };

  const toggleStatus = (p: Product) => {
    updateProduct(p.id, { is_active: !p.is_active });
    toast.success(`${p.name} is now ${!p.is_active ? 'Active' : 'Inactive'}`);
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    downloadCSV('products_catalog', products);
    toast.success('Product catalog exported to CSV');
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Products</h1>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PRODUCT CATALOG</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Products & services</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none w-48"
              />
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Add product
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU / Barcode</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Average Cost</th>
                <th className="px-4 py-3">Sale Price</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {p.name}
                      <span className="block text-[10px] text-slate-400">{p.unit || 'pcs'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{p.code}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.category || 'Uncategorized'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      Rs. {(p.opening_average_cost || p.purchase_price || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      Rs. {(p.sale_price || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {p.track_batches && p.track_serials
                        ? 'Batches & Serials'
                        : p.track_batches
                        ? 'Batches'
                        : p.track_serials
                        ? 'Serials'
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          p.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {p.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStatus(p)}
                          className={`flex items-center gap-1 text-xs font-bold transition px-2 py-1 rounded-lg border ${
                            p.is_active
                              ? 'border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'border-emerald-200 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PRODUCT CATALOG</p>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit product' : 'New product'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Product name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. SKU-00001"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Barcode / QR value</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Auto or code"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="Uncategorized">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Purchase price</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Opening average cost</label>
                  <input
                    type="number"
                    value={openingCost}
                    onChange={(e) => setOpeningCost(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Sale price</label>
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Tax rate %</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Reorder level</label>
                <input
                  type="number"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Track inventory by batch</span>
                  <input
                    type="checkbox"
                    checked={trackBatches}
                    onChange={(e) => setTrackBatches(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Track individual serial numbers</span>
                  <input
                    type="checkbox"
                    checked={trackSerials}
                    onChange={(e) => setTrackSerials(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Status</span>
                <select
                  value={isActive ? 'Active' : 'Inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'Active')}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                {editingId ? 'Update product' : 'Save product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
