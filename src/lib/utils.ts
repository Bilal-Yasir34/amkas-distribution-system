export function formatCurrency(amount: number, currency = 'PKR'): string {
  const value = Number(amount || 0);
  return `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatNumber(amount: number): string {
  return Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function computeLineTotal(qty: number, rate: number, discount: number, taxPct: number): number {
  const gross = (qty || 0) * (rate || 0);
  const afterDiscount = gross - (discount || 0);
  const tax = afterDiscount * ((taxPct || 0) / 100);
  return afterDiscount + tax;
}

export function nextDocNumber(prefix: string, existing: string[]): string {
  let max = 0;
  for (const no of existing) {
    const m = no.match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(5, '0')}`;
}

export function getCustomerName(id: string | null | undefined, customers: { id: string; name: string; is_active?: boolean }[]): string {
  if (!id) return '[Deleted Customer]';
  const c = customers.find((x) => x.id === id);
  if (!c) return '[Deleted Customer]';
  return c.is_active === false ? `${c.name} (Deactivated)` : c.name;
}

export function getVendorName(id: string | null | undefined, vendors: { id: string; name: string; is_active?: boolean }[]): string {
  if (!id) return '[Deleted Vendor]';
  const v = vendors.find((x) => x.id === id);
  if (!v) return '[Deleted Vendor]';
  return v.is_active === false ? `${v.name} (Deactivated)` : v.name;
}

export function getProductName(id: string | null | undefined, products: { id: string; name: string; is_active?: boolean }[], fallbackDesc?: string | null): string {
  if (!id) return fallbackDesc || '[Deleted Product]';
  const p = products.find((x) => x.id === id);
  if (!p) return fallbackDesc || '[Deleted Product]';
  return p.is_active === false ? `${p.name} (Deactivated)` : p.name;
}

export function getWarehouseName(id: string | null | undefined, warehouses: { id: string; name: string; is_active?: boolean }[]): string {
  if (!id) return 'Unassigned';
  const w = warehouses.find((x) => x.id === id);
  if (!w) return '[Deleted Warehouse]';
  return w.is_active === false ? `${w.name} (Deactivated)` : w.name;
}

export function getBranchName(id: string | null | undefined, branches: { id: string; name: string; is_active?: boolean }[]): string {
  if (!id) return 'Head Office';
  const b = branches.find((x) => x.id === id);
  if (!b) return '[Deleted Branch]';
  return b.is_active === false ? `${b.name} (Deactivated)` : b.name;
}

