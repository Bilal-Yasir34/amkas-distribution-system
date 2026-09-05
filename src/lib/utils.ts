export function formatCurrency(amount: number, currency = 'PKR'): string {
  const value = Number(amount || 0);
  return `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatNumber(amount: number): string {
  return Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatDate(date: string | Date | number | null | undefined): string {
  if (!date && date !== 0) return '—';

  if (typeof date === 'number') {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  if (date instanceof Date) {
    if (isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed || trimmed === '—' || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined') return '—';

    // Matches YYYY-MM-DD or YYYY/MM/DD (with optional time / ISO timestamp)
    const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1].slice(-2);
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    // Matches DD-MM-YYYY or DD-MM-YY or DD/MM/YYYY or DD/MM/YY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3].slice(-2);
      return `${day}/${month}/${year}`;
    }

    // Fallback Date parser
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    }

    return trimmed;
  }

  return '—';
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through if crypto.randomUUID fails in insecure context
    }
  }
  return 'id-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
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

export const STANDARD_UNITS = [
  { value: 'pcs', label: 'pcs (Pieces)' },
  { value: 'box', label: 'box (Box / Carton)' },
  { value: 'pack', label: 'pack (Pack / Packet)' },
  { value: 'kg', label: 'kg (Kilogram)' },
  { value: 'g', label: 'g (Gram)' },
  { value: 'ltr', label: 'ltr (Liter)' },
  { value: 'ml', label: 'ml (Milliliter)' },
  { value: 'm', label: 'm (Meter)' },
  { value: 'ft', label: 'ft (Feet)' },
  { value: 'doz', label: 'doz (Dozen)' },
  { value: 'set', label: 'set (Set)' },
  { value: 'unit', label: 'unit (Unit)' },
  { value: 'bag', label: 'bag (Bag)' },
  { value: 'roll', label: 'roll (Roll)' },
  { value: 'pair', label: 'pair (Pair)' },
  { value: 'ctn', label: 'ctn (Carton)' },
];

export const UNIT_CONVERSION_SCALES: Record<string, number> = {
  kg: 1.0,
  kgs: 1.0,
  kilogram: 1.0,
  g: 0.001,
  gram: 0.001,
  m: 0.6666666667,
  meter: 0.6666666667,
  meters: 0.6666666667,
  ft: 0.2032,
  feet: 0.2032,
  ltr: 1.0,
  liter: 1.0,
  liters: 1.0,
  ml: 0.001,
  milliliter: 0.001,
  pcs: 1.0,
  piece: 1.0,
  pieces: 1.0,
  unit: 1.0,
  doz: 12.0,
  dozen: 12.0,
  pair: 2.0,
  pack: 5.0,
  packet: 5.0,
  box: 10.0,
  bag: 10.0,
  roll: 10.0,
  ctn: 24.0,
  carton: 24.0,
};

export function convertUnitRate(baseRate: number, baseUnit: string = 'pcs', targetUnit: string = 'pcs'): number {
  if (!baseRate || isNaN(baseRate)) return 0;
  if (!baseUnit || !targetUnit || baseUnit.toLowerCase().trim() === targetUnit.toLowerCase().trim()) {
    return baseRate;
  }

  const bKey = baseUnit.toLowerCase().trim();
  const tKey = targetUnit.toLowerCase().trim();

  const bScale = UNIT_CONVERSION_SCALES[bKey];
  const tScale = UNIT_CONVERSION_SCALES[tKey];

  if (bScale !== undefined && tScale !== undefined) {
    const factor = tScale / bScale;
    const newRate = baseRate * factor;
    return Number(newRate.toFixed(5));
  }

  return baseRate;
}

export function computeLineTotal(qty: number, rate: number, discount: number, taxPct: number): number {
  const gross = (qty || 0) * (rate || 0);
  const afterDiscount = gross - (discount || 0);
  const tax = afterDiscount * ((taxPct || 0) / 100);
  return afterDiscount + tax;
}

export function nextDocNumber(prefix: string, existing: string[], padLength: number = 2): string {
  let max = 0;
  for (const no of existing) {
    if (!no) continue;
    const m = no.match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(padLength, '0')}`;
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

