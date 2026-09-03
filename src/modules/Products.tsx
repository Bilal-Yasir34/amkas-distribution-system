import { useState, useEffect } from 'react';
import { Plus, Package, Search, X, Edit, Trash2, Power, Download, Palette, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { downloadCSV, nextDocNumber } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import type { Product, ProductArticle } from '@/lib/types';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

interface LocalArticle {
  id: string;
  name: string;
  colours: string[];
  isNew?: boolean;
}

export function Products() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const {
    products,
    categories,
    productArticles,
    addProduct,
    updateProduct,
    deleteProduct,
    addProductArticle,
    updateProductArticle,
    deleteProductArticle,
  } = useDataStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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
  const [stockQuantity, setStockQuantity] = useState('0');
  const [trackBatches, setTrackBatches] = useState(false);
  const [trackSerials, setTrackSerials] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Article & Colour State
  const [localArticles, setLocalArticles] = useState<LocalArticle[]>([]);
  const [newArticleName, setNewArticleName] = useState('');
  const [showArticleInput, setShowArticleInput] = useState(false);
  const [colourInputs, setColourInputs] = useState<Record<string, string>>({});
  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({});

  const openCreate = () => {
    setEditingId(null);
    setName('');
    const autoCode = nextDocNumber('SKU', products.map((p) => p.code), 5);
    setSku(autoCode);
    setBarcode(autoCode);
    setCategory('Uncategorized');
    setUnit('pcs');
    setDescription('');
    setPurchasePrice('0');
    setOpeningCost('0');
    setSalePrice('0');
    setTaxRate('0');
    setReorderLevel('0');
    setStockQuantity('0');
    setTrackBatches(false);
    setTrackSerials(false);
    setIsActive(true);
    setLocalArticles([]);
    setNewArticleName('');
    setShowArticleInput(false);
    setColourInputs({});
    setExpandedArticles({});
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
    setStockQuantity(String(p.stock_quantity ?? p.opening_balance ?? 0));
    setTrackBatches(p.track_batches);
    setTrackSerials(p.track_serials);
    setIsActive(p.is_active);

    // Load existing articles from store
    const existingArticles = productArticles.filter((a) => a.product_id === p.id);
    setLocalArticles(existingArticles.map((a) => ({ id: a.id, name: a.name, colours: [...a.colours] })));
    setNewArticleName('');
    setShowArticleInput(false);
    setColourInputs({});
    const expanded: Record<string, boolean> = {};
    existingArticles.forEach((a) => { expanded[a.id] = true; });
    setExpandedArticles(expanded);
    setModalOpen(true);
  };

  const handleAddArticle = () => {
    const trimmed = newArticleName.trim();
    if (!trimmed) return toast.error('Article name is required');
    if (localArticles.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error('This article name already exists');
    }
    const newId = crypto.randomUUID();
    setLocalArticles((prev) => [...prev, { id: newId, name: trimmed, colours: [], isNew: true }]);
    setExpandedArticles((prev) => ({ ...prev, [newId]: true }));
    setNewArticleName('');
    setShowArticleInput(false);
  };

  const handleRemoveArticle = (articleId: string) => {
    setLocalArticles((prev) => prev.filter((a) => a.id !== articleId));
  };

  const handleAddColour = (articleId: string) => {
    const colourName = (colourInputs[articleId] || '').trim();
    if (!colourName) return toast.error('Colour name is required');

    setLocalArticles((prev) =>
      prev.map((a) => {
        if (a.id === articleId) {
          if (a.colours.some((c) => c.toLowerCase() === colourName.toLowerCase())) {
            toast.error('This colour already exists for this article');
            return a;
          }
          return { ...a, colours: [...a.colours, colourName] };
        }
        return a;
      })
    );
    setColourInputs((prev) => ({ ...prev, [articleId]: '' }));
  };

  const handleRemoveColour = (articleId: string, colourIndex: number) => {
    setLocalArticles((prev) =>
      prev.map((a) => {
        if (a.id === articleId) {
          return { ...a, colours: a.colours.filter((_, i) => i !== colourIndex) };
        }
        return a;
      })
    );
  };

  const toggleArticleExpand = (articleId: string) => {
    setExpandedArticles((prev) => ({ ...prev, [articleId]: !prev[articleId] }));
  };

  const handleSave = () => {
    if (!name.trim()) return toast.error('Product name is required');

    const code = sku.trim() || `SKU-${String(products.length + 1).padStart(5, '0')}`;

    // Build article_name summary for backward compat
    const articleSummary = localArticles.length > 0
      ? localArticles.map((a) => a.name).join(', ')
      : null;

    if (editingId) {
      updateProduct(editingId, {
        code,
        name,
        article_name: articleSummary,
        category,
        unit,
        description,
        purchase_price: Number(purchasePrice) || 0,
        opening_average_cost: Number(openingCost) || 0,
        sale_price: Number(salePrice) || 0,
        tax_pct: Number(taxRate) || 0,
        reorder_level: Number(reorderLevel) || 0,
        stock_quantity: Number(stockQuantity) || 0,
        opening_balance: Number(stockQuantity) || 0,
        track_batches: trackBatches,
        track_serials: trackSerials,
        barcode_value: barcode || code,
        is_active: isActive,
      });

      // Sync articles: delete removed, update existing, add new
      const existingArticleIds = productArticles
        .filter((a) => a.product_id === editingId)
        .map((a) => a.id);
      const currentLocalIds = localArticles.map((a) => a.id);

      // Delete removed articles
      existingArticleIds.forEach((existId) => {
        if (!currentLocalIds.includes(existId)) {
          deleteProductArticle(existId);
        }
      });

      // Add new or update existing
      localArticles.forEach((la) => {
        if (la.isNew || !existingArticleIds.includes(la.id)) {
          addProductArticle({ product_id: editingId, name: la.name, colours: la.colours });
        } else {
          updateProductArticle(la.id, { name: la.name, colours: la.colours });
        }
      });

      toast.success(`Product ${name} updated`);
    } else {
      const newProductId = crypto.randomUUID();
      addProduct({
        code,
        name,
        article_name: articleSummary,
        category,
        unit,
        length: 0,
        width: 0,
        purchase_price: Number(purchasePrice) || 0,
        opening_average_cost: Number(openingCost) || 0,
        sale_price: Number(salePrice) || 0,
        tax_pct: Number(taxRate) || 0,
        reorder_level: Number(reorderLevel) || 0,
        stock_quantity: Number(stockQuantity) || 0,
        opening_balance: Number(stockQuantity) || 0,
        track_batches: trackBatches,
        track_serials: trackSerials,
        barcode_value: barcode || code,
        description,
        is_active: isActive,
      });

      // Find the product that was just added (it's the newest one with matching code)
      // Since addProduct prepends, we need to use the store after set — but the product ID
      // is generated inside the store. So we add articles after finding the product.
      // We'll use a setTimeout to get the updated state after Zustand updates.
      setTimeout(() => {
        const store = useDataStore.getState();
        const newProd = store.products.find((p) => p.code === code && p.name === name);
        if (newProd) {
          localArticles.forEach((la) => {
            store.addProductArticle({ product_id: newProd.id, name: la.name, colours: la.colours });
          });
        }
      }, 0);

      toast.success(`Product ${name} added`);
    }
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteProduct(deleteTarget.id);
      toast.success(`Product ${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    }
  };

  const toggleStatus = (p: Product) => {
    updateProduct(p.id, { is_active: !p.is_active });
    toast.success(`${p.name} is now ${!p.is_active ? 'Active' : 'Inactive'}`);
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.article_name && p.article_name.toLowerCase().includes(search.toLowerCase())) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    downloadCSV('products_catalog', products as unknown as Record<string, unknown>[]);
    toast.success('Product catalog exported to CSV');
  };

  const getArticleCount = (productId: string) => {
    return productArticles.filter((a) => a.product_id === productId).length;
  };

  const getArticleSummary = (productId: string) => {
    const arts = productArticles.filter((a) => a.product_id === productId);
    return arts;
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Products</h1>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PRODUCT CATALOG</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Products & services</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none sm:w-56"
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
              className="flex items-center gap-1.5 btn-primary"
            >
              <Plus className="h-4 w-4" /> Add product
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Articles & Colours</th>
                <th className="px-4 py-3">SKU</th>
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
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const articles = getArticleSummary(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {p.name}
                        <span className="block text-[10px] text-slate-400">{p.unit || 'pcs'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {articles.length > 0 ? (
                          <div className="space-y-1">
                            {articles.map((art) => (
                              <div key={art.id}>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <Tag className="h-2.5 w-2.5 mr-1" />
                                  {art.name}
                                </span>
                                {art.colours.length > 0 && (
                                  <div className="flex flex-wrap gap-0.5 mt-0.5 ml-3">
                                    {art.colours.map((c, ci) => (
                                      <span key={ci} className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                                        <Palette className="h-2 w-2 mr-0.5" />
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
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
                            p.is_active ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {p.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => toggleStatus(p)}
                              className={`flex items-center gap-1 text-xs font-bold transition px-2 py-1 rounded-lg border ${
                                p.is_active
                                  ? 'border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
                                  : 'border-amber-500/30 bg-amber-500/10/50 text-amber-500 hover:bg-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {p.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => openEdit(p)}
                              className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                              className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">PRODUCT CATALOG</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingId ? 'Edit product' : 'New product'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Product name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 50W Solar Panel / Cotton Fabric"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              {/* ARTICLES & COLOURS SECTION */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Articles & Colour Variations
                    </span>
                    {localArticles.length > 0 && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                        {localArticles.length} article{localArticles.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowArticleInput(!showArticleInput)}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 transition"
                  >
                    <Plus className="h-3 w-3" /> Add Article
                  </button>
                </div>

                {/* Add Article Input */}
                {showArticleInput && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                    <input
                      type="text"
                      value={newArticleName}
                      onChange={(e) => setNewArticleName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddArticle(); }}
                      placeholder="e.g. ART-10 / Premium Oxford"
                      autoFocus
                      className="flex-1 rounded-lg border border-amber-300 bg-white p-2 text-xs text-slate-800 dark:border-amber-600/50 dark:bg-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500/40"
                    />
                    <button
                      type="button"
                      onClick={handleAddArticle}
                      className="rounded-lg bg-amber-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-amber-600 transition"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowArticleInput(false); setNewArticleName(''); }}
                      className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Article Cards */}
                {localArticles.length === 0 && !showArticleInput && (
                  <p className="text-[11px] text-slate-400 italic">No articles added yet. Click "+ Add Article" to get started.</p>
                )}

                <div className="space-y-2">
                  {localArticles.map((article) => (
                    <div
                      key={article.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden transition-all"
                    >
                      {/* Article Header */}
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 dark:bg-slate-800/80">
                        <button
                          type="button"
                          onClick={() => toggleArticleExpand(article.id)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          {expandedArticles[article.id] ? (
                            <ChevronUp className="h-3 w-3 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                          )}
                          <Tag className="h-3 w-3 text-amber-500" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{article.name}</span>
                          <span className="text-[10px] text-slate-400">
                            ({article.colours.length} colour{article.colours.length !== 1 ? 's' : ''})
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveArticle(article.id)}
                          className="rounded p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Remove article"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Expanded Colour Section */}
                      {expandedArticles[article.id] && (
                        <div className="px-3 py-2.5 space-y-2 border-t border-slate-100 dark:border-slate-700/50">
                          {/* Colour Tags */}
                          {article.colours.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {article.colours.map((colour, ci) => (
                                <span
                                  key={ci}
                                  className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 transition hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                >
                                  <Palette className="h-2.5 w-2.5" />
                                  {colour}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveColour(article.id, ci)}
                                    className="ml-0.5 opacity-50 group-hover:opacity-100 hover:text-rose-500 transition"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Add Colour Input */}
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Palette className="absolute left-2 top-2 h-3 w-3 text-violet-400" />
                              <input
                                type="text"
                                value={colourInputs[article.id] || ''}
                                onChange={(e) => setColourInputs((prev) => ({ ...prev, [article.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddColour(article.id); }}
                                placeholder="Add colour e.g. CLR-1, Red, Navy..."
                                className="w-full rounded-md border border-violet-200 bg-white pl-7 pr-2 py-1.5 text-[11px] text-slate-800 dark:border-violet-800/50 dark:bg-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-violet-400/40"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddColour(article.id)}
                              className="rounded-md bg-violet-500/15 border border-violet-500/20 px-2.5 py-1.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-500/25 transition"
                            >
                              + Colour
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">SKU (Auto-Generated)</label>
                <input
                  type="text"
                  value={sku}
                  readOnly
                  disabled
                  placeholder="Auto-generated SKU"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 p-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 cursor-not-allowed outline-none"
                />
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
                  <label className="text-[11px] font-semibold text-slate-400">Unit of Measurement</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="box">box (Box / Carton)</option>
                    <option value="pack">pack (Pack / Packet)</option>
                    <option value="kg">kg (Kilogram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="ltr">ltr (Liter)</option>
                    <option value="ml">ml (Milliliter)</option>
                    <option value="m">m (Meter)</option>
                    <option value="ft">ft (Feet)</option>
                    <option value="doz">doz (Dozen)</option>
                    <option value="set">set (Set)</option>
                    <option value="unit">unit (Unit)</option>
                    <option value="bag">bag (Bag)</option>
                    <option value="roll">roll (Roll)</option>
                    <option value="pair">pair (Pair)</option>
                    <option value="ctn">ctn (Carton)</option>
                  </select>
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Opening / Initial Stock ({unit})</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder={`e.g. 100 ${unit}`}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Reorder level ({unit})</label>
                  <input
                    type="number"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Track inventory by batch</span>
                  <input
                    type="checkbox"
                    checked={trackBatches}
                    onChange={(e) => setTrackBatches(e.target.checked)}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Track individual serial numbers</span>
                  <input
                    type="checkbox"
                    checked={trackSerials}
                    onChange={(e) => setTrackSerials(e.target.checked)}
                    className="h-4 w-4 rounded accent-amber-500"
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

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary text-xs px-5"
              >
                {editingId ? 'Update product' : 'Save product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.name}
        itemType="product"
      />
    </div>
  );
}
