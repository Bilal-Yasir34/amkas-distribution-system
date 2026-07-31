import { useState, useEffect } from 'react';
import { Search, FileText, Package, Users, Truck, Sparkles, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useDataStore } from '@/lib/dataStore';
import { useAuth } from '@/lib/auth';
import { ROLE_MODULES, type ModuleKey } from '@/lib/rbac';
import { useSalesInvoices, useProducts, useCustomers, useVendors } from '@/lib/queries';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type FilterCategory = 'all' | 'invoices' | 'products' | 'customers' | 'vendors';

export function GlobalSearchModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FilterCategory>('all');
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const { profile } = useAuth();
  const { rolePermissions } = useDataStore();

  const role = profile?.role ?? 'super_admin';
  const allowed = rolePermissions[role] || ROLE_MODULES[role] || ROLE_MODULES.super_admin;

  const { data: invoices = [] } = useSalesInvoices();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: vendors = [] } = useVendors();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredInvoices = (category === 'all' || category === 'invoices') && q && allowed.includes('sales')
    ? invoices.filter((i) => i.invoice_no.toLowerCase().includes(q) || ((i as any).customer_name && (i as any).customer_name.toLowerCase().includes(q)))
    : [];

  const filteredProducts = (category === 'all' || category === 'products') && q && allowed.includes('products')
    ? products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)))
    : [];

  const filteredCustomers = (category === 'all' || category === 'customers') && q && allowed.includes('customers')
    ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (c.city && c.city.toLowerCase().includes(q)))
    : [];

  const filteredVendors = (category === 'all' || category === 'vendors') && q && allowed.includes('vendors')
    ? vendors.filter((v) => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q) || (v.city && v.city.toLowerCase().includes(q)))
    : [];

  const totalResults = filteredInvoices.length + filteredProducts.length + filteredCustomers.length + filteredVendors.length;

  const handleSelectModule = (mod: ModuleKey) => {
    setActiveModule(mod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 p-4 pt-16 lg:pt-24 backdrop-blur-md animate-in fade-in duration-200">
      {/* Ambient background light blurs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[30rem] w-[35rem] rounded-full bg-amber-500/10 blur-[150px]" />
        <div className="absolute top-1/3 left-1/3 h-[25rem] w-[25rem] rounded-full bg-indigo-500/10 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-amber-500/30 bg-[#13111c]/95 shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl ring-1 ring-white/10 space-y-0">
        
        {/* Search Header Input Area */}
        <div className="relative flex items-center border-b border-slate-800/80 px-6 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner mr-3.5 shrink-0">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Search invoices, products, customers, vendors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-base font-medium text-white placeholder-slate-500 outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="mr-2 rounded-xl bg-slate-800/80 p-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:border-amber-500/40 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/60 bg-slate-950/40 px-6 py-2.5 no-scrollbar">
          {[
            { id: 'all', label: 'All Results' },
            { id: 'invoices', label: 'Invoices', allowedKey: 'sales' },
            { id: 'products', label: 'Products', allowedKey: 'products' },
            { id: 'customers', label: 'Customers', allowedKey: 'customers' },
            { id: 'vendors', label: 'Vendors', allowedKey: 'vendors' },
          ].map((cat) => {
            if (cat.allowedKey && !allowed.includes(cat.allowedKey as ModuleKey)) return null;
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as FilterCategory)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                  active
                    ? 'bg-gradient-to-r from-amber-500/30 to-amber-500/10 text-amber-400 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Results Area */}
        <div className="max-h-[26rem] min-h-[14rem] overflow-y-auto p-6 space-y-6">
          {!q && (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-lg">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200 font-heading">Enterprise Universal Search</h4>
                <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                  Type a keyword, invoice number, or product code to search across all operational records.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quick Filters:</span>
                {allowed.includes('sales') && (
                  <button
                    onClick={() => { setCategory('invoices'); setQuery('INV'); }}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-amber-400 hover:border-amber-500/40 transition"
                  >
                    Invoices
                  </button>
                )}
                {allowed.includes('products') && (
                  <button
                    onClick={() => setCategory('products')}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-cyan-400 hover:border-cyan-500/40 transition"
                  >
                    Products
                  </button>
                )}
                {allowed.includes('customers') && (
                  <button
                    onClick={() => setCategory('customers')}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-emerald-400 hover:border-emerald-500/40 transition"
                  >
                    Customers
                  </button>
                )}
              </div>
            </div>
          )}

          {q && totalResults === 0 && (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-bold text-slate-300">No matching records found</p>
              <p className="text-xs text-slate-500">No entries matched &quot;{query}&quot; in your allowed modules.</p>
            </div>
          )}

          {/* Invoices Results */}
          {filteredInvoices.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-amber-400 px-1">
                <span>Invoices ({filteredInvoices.length})</span>
                <span className="text-slate-500 text-[10px]">Sales Module</span>
              </div>
              <div className="grid gap-2">
                {filteredInvoices.slice(0, 5).map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => handleSelectModule('sales')}
                    className="group flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 text-left transition-all duration-200 hover:border-amber-500/40 hover:bg-amber-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white font-mono group-hover:text-amber-300 transition">
                          {inv.invoice_no}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400">
                          Customer: <span className="text-slate-200">{(inv as any).customer_name || 'N/A'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-mono text-amber-400">
                        Rs. {inv.total_amount?.toLocaleString() ?? 0}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-amber-300 font-semibold">
                        Open Invoice <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products Results */}
          {filteredProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-cyan-400 px-1">
                <span>Products ({filteredProducts.length})</span>
                <span className="text-slate-500 text-[10px]">Inventory & Products</span>
              </div>
              <div className="grid gap-2">
                {filteredProducts.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectModule('products')}
                    className="group flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 text-left transition-all duration-200 hover:border-cyan-500/40 hover:bg-cyan-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                          {p.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          Code: {p.code} • Category: {p.category || 'General'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-mono text-cyan-400">
                        Rs. {p.sale_price?.toLocaleString() ?? 0}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-cyan-300 font-semibold">
                        View Product <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customers Results */}
          {filteredCustomers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 px-1">
                <span>Customers ({filteredCustomers.length})</span>
                <span className="text-slate-500 text-[10px]">Customer Directory</span>
              </div>
              <div className="grid gap-2">
                {filteredCustomers.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectModule('customers')}
                    className="group flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 text-left transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                          {c.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          Code: {c.code} {c.city ? `• ${c.city}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-emerald-300 font-semibold">
                        Manage Directory <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vendors Results */}
          {filteredVendors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-purple-400 px-1">
                <span>Vendors ({filteredVendors.length})</span>
                <span className="text-slate-500 text-[10px]">Vendor Management</span>
              </div>
              <div className="grid gap-2">
                {filteredVendors.slice(0, 5).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleSelectModule('vendors')}
                    className="group flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 text-left transition-all duration-200 hover:border-purple-500/40 hover:bg-purple-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                          {v.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          Code: {v.code} {v.city ? `• ${v.city}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-purple-300 font-semibold">
                        View Directory <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/60 px-6 py-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">Esc</kbd> Close
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">
                <CornerDownLeft className="h-2.5 w-2.5 inline" />
              </kbd> Select Module
            </span>
          </div>
          <div className="text-amber-500/80 font-bold">
            AMKAS Intelligent Search
          </div>
        </div>

      </div>
    </div>
  );
}

