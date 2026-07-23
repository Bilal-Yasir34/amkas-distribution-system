import { useState, useEffect } from 'react';
import { Search, FileText, Package, Users, Truck, Building2, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useDataStore } from '@/lib/dataStore';
import { useAuth } from '@/lib/auth';
import { ROLE_MODULES } from '@/lib/rbac';
import { useSalesInvoices, useProducts, useCustomers, useVendors } from '@/lib/queries';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
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

  const filteredInvoices = q && allowed.includes('sales') ? invoices.filter((i) => i.invoice_no.toLowerCase().includes(q)) : [];
  const filteredProducts = q && allowed.includes('products') ? products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) : [];
  const filteredCustomers = q && allowed.includes('customers') ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) : [];
  const filteredVendors = q && allowed.includes('vendors') ? vendors.filter((v) => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q)) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-20 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-[#1e293b] shadow-2xl">
        <div className="flex items-center border-b border-slate-700 px-4 py-3">
          <Search className="mr-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions, accounts, products, customers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 outline-none"
            autoFocus
          />
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!q && (
            <p className="text-xs text-slate-400 text-center py-6">
              Type a keyword or number to search across invoices, products, customers, and vendors.
            </p>
          )}

          {filteredInvoices.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-2">Invoices</p>
              <div className="space-y-1">
                {filteredInvoices.slice(0, 4).map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => {
                      setActiveModule('sales');
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-400" />
                      <span>{inv.invoice_no}</span>
                    </div>
                    <span className="font-mono text-slate-400">Rs. {inv.total_amount?.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 mb-2">Products</p>
              <div className="space-y-1">
                {filteredProducts.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveModule('products');
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-cyan-400" />
                      <span>{p.name} ({p.code})</span>
                    </div>
                    <span className="font-mono text-slate-400">Rs. {p.sale_price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredCustomers.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-2">Customers</p>
              <div className="space-y-1">
                {filteredCustomers.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveModule('customers');
                      onClose();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                  >
                    <Users className="h-4 w-4 text-amber-400" />
                    <span>{c.name} ({c.code})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredVendors.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 mb-2">Vendors</p>
              <div className="space-y-1">
                {filteredVendors.slice(0, 4).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setActiveModule('vendors');
                      onClose();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                  >
                    <Truck className="h-4 w-4 text-purple-400" />
                    <span>{v.name} ({v.code})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
