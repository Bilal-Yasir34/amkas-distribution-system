import { useState, useMemo } from 'react';
import { Plus, Package, Search, X, Edit, Trash2, Power, Download, Tag, Layers, Check, Sparkles, Palette } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { downloadCSV, nextDocNumber } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import type { Product } from '@/lib/types';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { getAllArticles, getProductsForArticle, getArticleForProduct } from '@/lib/articleUtils';

interface LocalProductItem {
  id: string;
  name: string;
}

export function Products() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const {
    products,
    categories,
    productArticles,
    universalArticles,
    addProduct,
    updateProduct,
    deleteProduct,
    addProductArticle,
    addUniversalArticle,
  } = useDataStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticleName, setEditingArticleName] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Article (Major Head) Filter
  const [articleFilter, setArticleFilter] = useState('all');

  // Form State: Article is Major Head
  const [articleName, setArticleName] = useState('');
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

  // Products / Subcategories under this Article
  const [localProducts, setLocalProducts] = useState<LocalProductItem[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [showProductInput, setShowProductInput] = useState(false);

  // Dynamically collect all unique articles universally registered across the store
  const allArticles = useMemo(() => {
    return getAllArticles(universalArticles, products, productArticles);
  }, [universalArticles, products, productArticles]);

  // Group products by their Article
  const articleGroups = useMemo(() => {
    const groups: Record<string, Product[]> = {};

    // First ensure all articles exist as keys
    allArticles.forEach((art) => {
      groups[art] = [];
    });

    products.forEach((p) => {
      const art = p.article_name || getArticleForProduct(p.id, products, productArticles) || 'Unassigned';
      if (!groups[art]) {
        groups[art] = [];
      }
      groups[art].push(p);
    });

    return groups;
  }, [allArticles, products, productArticles]);

  const openCreate = () => {
    setEditingArticleName(null);
    setArticleName('');
    const autoCode = nextDocNumber('ART', products.map((p) => p.code), 4);
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
    setLocalProducts([]);
    setNewProductName('');
    setShowProductInput(false);
    setModalOpen(true);
  };

  const openEdit = (artName: string) => {
    setEditingArticleName(artName);
    setArticleName(artName);

    const prodsUnderArt = getProductsForArticle(artName, products, productArticles);
    const firstP = prodsUnderArt[0];

    if (firstP) {
      setSku(firstP.code);
      setBarcode(firstP.barcode_value || firstP.code);
      setCategory(firstP.category || 'Uncategorized');
      setUnit(firstP.unit || 'pcs');
      setDescription(firstP.description || '');
      setPurchasePrice(String(firstP.purchase_price || 0));
      setOpeningCost(String(firstP.opening_average_cost || 0));
      setSalePrice(String(firstP.sale_price || 0));
      setTaxRate(String(firstP.tax_pct || 0));
      setReorderLevel(String(firstP.reorder_level || 0));
      setStockQuantity(String(firstP.stock_quantity ?? firstP.opening_balance ?? 0));
      setTrackBatches(firstP.track_batches);
      setTrackSerials(firstP.track_serials);
      setIsActive(firstP.is_active);
    } else {
      const autoCode = nextDocNumber('ART', products.map((p) => p.code), 4);
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
    }

    setLocalProducts(
      prodsUnderArt.map((p) => ({
        id: p.id,
        name: p.name,
      }))
    );
    setNewProductName('');
    setShowProductInput(false);
    setModalOpen(true);
  };

  const handleAddLocalProduct = () => {
    const trimmed = newProductName.trim();
    if (!trimmed) {
      toast.error('Product / Subcategory name cannot be empty');
      return;
    }
    if (localProducts.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('This product / subcategory is already added under this article');
      return;
    }

    setLocalProducts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: trimmed,
      },
    ]);
    setNewProductName('');
  };

  const handleRemoveLocalProduct = (id: string) => {
    setLocalProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSave = () => {
    const trimmedArt = articleName.trim();
    if (!trimmedArt) {
      toast.error('Article name is required');
      return;
    }

    // Register single Article universally
    addUniversalArticle(trimmedArt);

    // Products to create or link under this article
    const productsToPersist =
      localProducts.length > 0
        ? localProducts
        : [{ id: crypto.randomUUID(), name: trimmedArt }];

    if (editingArticleName) {
      // Find existing products under previous article name
      const existingProds = getProductsForArticle(editingArticleName, products, productArticles);

      // Update existing or add new
      productsToPersist.forEach((pItem, idx) => {
        const existing = existingProds.find((ep) => ep.id === pItem.id || ep.name.toLowerCase() === pItem.name.toLowerCase());
        const prodCode = existing?.code || `${sku}-${idx + 1}`;

        if (existing) {
          updateProduct(existing.id, {
            name: pItem.name.trim(),
            article_name: trimmedArt,
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
            barcode_value: barcode || prodCode,
            is_active: isActive,
          });

          const hasArtRecord = productArticles.some(
            (pa) => pa.product_id === existing.id && pa.name.toLowerCase() === trimmedArt.toLowerCase()
          );
          if (!hasArtRecord) {
            addProductArticle({ product_id: existing.id, name: trimmedArt, colours: [] });
          }
        } else {
          const newId = crypto.randomUUID();
          addProduct({
            id: newId,
            code: prodCode,
            name: pItem.name.trim(),
            article_name: trimmedArt,
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
            barcode_value: barcode || prodCode,
            description,
            is_active: isActive,
          });
          addProductArticle({ product_id: newId, name: trimmedArt, colours: [] });
        }
      });

      toast.success(`Article "${trimmedArt}" updated successfully!`);
    } else {
      // Add new products under the Article
      productsToPersist.forEach((pItem, idx) => {
        const newId = crypto.randomUUID();
        const prodCode = productsToPersist.length === 1 ? sku : `${sku}-${idx + 1}`;

        addProduct({
          id: newId,
          code: prodCode,
          name: pItem.name.trim(),
          article_name: trimmedArt,
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
          barcode_value: barcode || prodCode,
          description,
          is_active: isActive,
        });

        addProductArticle({ product_id: newId, name: trimmedArt, colours: [] });
      });

      toast.success(`Article "${trimmedArt}" created with ${productsToPersist.length} product(s)!`);
    }

    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteProduct(deleteTarget.id);
      toast.success(`Item deleted`);
      setDeleteTarget(null);
    }
  };

  const toggleArticleStatus = (artName: string, currentActive: boolean) => {
    const prods = getProductsForArticle(artName, products, productArticles);
    prods.forEach((p) => {
      updateProduct(p.id, { is_active: !currentActive });
    });
    toast.success(`Article "${artName}" is now ${!currentActive ? 'Active' : 'Inactive'}`);
  };

  // Filter articles based on search & filter
  const displayedArticles = useMemo(() => {
    return allArticles.filter((art) => {
      if (articleFilter !== 'all' && art.toLowerCase() !== articleFilter.toLowerCase()) {
        return false;
      }
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const prods = getProductsForArticle(art, products, productArticles);
      const matchesArtName = art.toLowerCase().includes(q);
      const matchesProdName = prods.some(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      );

      return matchesArtName || matchesProdName;
    });
  }, [allArticles, articleFilter, search, products, productArticles]);

  const handleExportCSV = () => {
    downloadCSV('articles_catalog', products as unknown as Record<string, unknown>[]);
    toast.success('Catalog exported to CSV');
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Articles & Products</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Articles are major heads; products are subcategory options under each article.
        </p>
      </div>

      <div className="space-y-4">
        {/* ACTION BAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CATALOG MANAGEMENT</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Articles Catalog</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search articles & products..."
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
              onClick={() => openCreate()}
              className="flex items-center gap-1.5 btn-primary text-xs"
            >
              <Plus className="h-4 w-4" /> Add Article
            </button>
          </div>
        </div>

        {/* ARTICLE FILTER PILLS */}
        {allArticles.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Layers className="h-3 w-3 text-amber-500" /> Article:
            </span>
            <button
              onClick={() => setArticleFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition shrink-0 ${
                articleFilter === 'all'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              All Articles ({allArticles.length})
            </button>
            {allArticles.map((art) => {
              const count = getProductsForArticle(art, products, productArticles).length;
              return (
                <button
                  key={art}
                  onClick={() => setArticleFilter(art)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition shrink-0 ${
                    articleFilter === art
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  <span>{art}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      articleFilter === art
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ARTICLES TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Article (Major Head)</th>
                <th className="px-4 py-3">Products / Subcategories</th>
                <th className="px-4 py-3">Code / SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Purchase Price</th>
                <th className="px-4 py-3">Sale Price</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedArticles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No articles found. Click "+ Add Article" to create your first article head.
                  </td>
                </tr>
              ) : (
                displayedArticles.map((artName) => {
                  const prodsUnderArt = getProductsForArticle(artName, products, productArticles);
                  const firstP = prodsUnderArt[0];
                  const isArtActive = prodsUnderArt.some((p) => p.is_active);

                  return (
                    <tr key={artName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{artName}</span>
                        </div>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {prodsUnderArt.length} product option{prodsUnderArt.length !== 1 ? 's' : ''}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {prodsUnderArt.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {prodsUnderArt.map((p) => (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                <Package className="h-2.5 w-2.5 text-amber-500" />
                                {p.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono font-medium text-slate-500">
                        {firstP?.code || '—'}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {firstP?.category || 'Uncategorized'}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        Rs. {(firstP?.opening_average_cost || firstP?.purchase_price || 0).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        Rs. {(firstP?.sale_price || 0).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        {firstP?.track_batches && firstP?.track_serials
                          ? 'Batches & Serials'
                          : firstP?.track_batches
                          ? 'Batches'
                          : firstP?.track_serials
                          ? 'Serials'
                          : '—'}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isArtActive
                              ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isArtActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => toggleArticleStatus(artName, isArtActive)}
                              className={`flex items-center gap-1 text-xs font-bold transition px-2 py-1 rounded-lg border ${
                                isArtActive
                                  ? 'border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
                                  : 'border-amber-500/30 bg-amber-500/10/50 text-amber-500 hover:bg-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {isArtActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => openEdit(artName)}
                              className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            {firstP && (
                              <button
                                onClick={() => setDeleteTarget({ id: firstP.id, name: artName })}
                                className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            )}
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

      {/* ARTICLE & PRODUCTS MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">ARTICLE CATALOG</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingArticleName ? 'Edit Article' : 'New Article'}
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
              {/* ARTICLE NAME (MAJOR HEAD) - SINGLE NAME FIELD */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400">
                  Article Name (Major Head) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={articleName}
                  onChange={(e) => setArticleName(e.target.value)}
                  placeholder="e.g. ART-001 / Oxford Fabric / Royal Series"
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              {/* PRODUCTS & VARIATIONS UNDER THIS ARTICLE SECTION */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Products & Subcategories in this Article
                    </span>
                    {localProducts.length > 0 && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                        {localProducts.length} product{localProducts.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProductInput(!showProductInput)}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 transition"
                  >
                    <Plus className="h-3 w-3" /> Add Product
                  </button>
                </div>

                {/* Add Product Input */}
                {showProductInput && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddLocalProduct();
                      }}
                      placeholder="e.g. Royal Blue / 50W / Size 42 / Cotton Fabric"
                      autoFocus
                      className="flex-1 rounded-lg border border-amber-300 bg-white p-2 text-xs text-slate-800 dark:border-amber-600/50 dark:bg-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500/40"
                    />
                    <button
                      type="button"
                      onClick={handleAddLocalProduct}
                      className="rounded-lg bg-amber-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-amber-600 transition"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductInput(false);
                        setNewProductName('');
                      }}
                      className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Product Tags / Cards */}
                {localProducts.length === 0 && !showProductInput ? (
                  <p className="text-[11px] text-slate-400 italic">
                    No products added yet. Click "+ Add Product" to add subcategories / options under this article (or a standard product will be created automatically).
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {localProducts.map((p) => (
                      <div
                        key={p.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
                      >
                        <Package className="h-3 w-3 text-amber-500" />
                        <span>{p.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLocalProduct(p.id)}
                          className="rounded p-0.5 text-amber-500 hover:bg-amber-200/60 dark:hover:bg-amber-800/60 transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SKU & Barcode */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">SKU / Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Auto-generated"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Barcode value"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Category & Unit */}
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

              {/* Purchase & Opening Cost */}
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

              {/* Sale price & Tax */}
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

              {/* Stock & Reorder */}
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

              {/* Tracking */}
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

              {/* Status */}
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
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary text-xs px-5"
              >
                {editingArticleName ? 'Update Article' : 'Save Article'}
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
        itemType="article"
      />
    </div>
  );
}
