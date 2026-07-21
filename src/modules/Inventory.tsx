import { useMemo, useState } from 'react';
import { Download, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useProducts, useStockLedger, useWarehouses } from '@/lib/queries';
import { downloadCSV, formatNumber } from '@/lib/utils';

export function Inventory() {
  const { data: products = [] } = useProducts();
  const { data: stock = [] } = useStockLedger();
  const { data: warehouses = [] } = useWarehouses();
  const [search, setSearch] = useState('');
  const [whFilter, setWhFilter] = useState('ALL');

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id.slice(0, 8);
  const productCode = (id: string) => products.find((p) => p.id === id)?.code ?? '';
  const whName = (id: string | null) => warehouses.find((w) => w.id === id)?.code ?? '—';

  const rows = useMemo(() => {
    const filtered = stock.filter((s) => {
      if (whFilter !== 'ALL' && s.warehouse_id !== whFilter) return false;
      if (search) {
        const name = productName(s.product_id).toLowerCase();
        const code = productCode(s.product_id).toLowerCase();
        return name.includes(search.toLowerCase()) || code.includes(search.toLowerCase());
      }
      return true;
    });
    return filtered;
  }, [stock, search, whFilter, products]);

  // running balance per product
  const running: Record<string, number> = {};
  rows.forEach((s) => {
    running[s.product_id] = (running[s.product_id] || 0) + Number(s.qty_in || 0) - Number(s.qty_out || 0);
  });

  function exportCSV() {
    downloadCSV('stock_ledger.csv', rows.map((s) => ({
      Date: s.created_at?.slice(0, 10) ?? '',
      Voucher: s.voucher_no ?? '', Type: s.voucher_type ?? '',
      Product: productCode(s.product_id), Warehouse: whName(s.warehouse_id),
      QtyIn: s.qty_in, QtyOut: s.qty_out, UnitCost: s.unit_cost,
    })));
  }

  return (
    <div>
      <PageHeader
        title="Inventory & Stock Ledger"
        subtitle="Real-time stock movements with running balances and weighted-average valuation"
        searchValue={search}
        onSearch={setSearch}
        actions={
          <>
            <select className="input !w-auto" value={whFilter} onChange={(e) => setWhFilter(e.target.value)}>
              <option value="ALL">All Warehouses</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
            <button onClick={exportCSV} className="btn-outline"><Download className="h-4 w-4" /> Export</button>
          </>
        }
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-700/40 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Voucher</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 text-right font-medium">Qty In</th>
                <th className="px-4 py-3 text-right font-medium">Qty Out</th>
                <th className="px-4 py-3 text-right font-medium">Unit Cost</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="table-row">
                  <td className="px-4 py-2.5 text-slate-500">{s.created_at?.slice(0, 10) ?? '—'}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{s.voucher_no ?? '—'}</td>
                  <td className="px-4 py-2.5"><span className="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{s.voucher_type ?? '—'}</span></td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{productCode(s.product_id)} — {productName(s.product_id)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{whName(s.warehouse_id)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400">{s.qty_in ? `+${formatNumber(s.qty_in)}` : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-rose-600 dark:text-rose-400">{s.qty_out ? `-${formatNumber(s.qty_out)}` : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{Number(s.unit_cost).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700 dark:text-slate-200">{formatNumber(running[s.product_id] || 0)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No stock movements.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
