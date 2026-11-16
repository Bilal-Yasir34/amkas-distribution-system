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
    const year = String(date.getFullYear()).slice(-2);
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

/**
 * Formats a date string or Date object into full DD/MM/YYYY format for editable inputs.
 */
export function formatDateFull(date: string | Date | number | null | undefined): string {
  if (!date && date !== 0) return '';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed || trimmed === '—' || trimmed === '-') return '';
    const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      let year = dmyMatch[3];
      if (year.length === 2) {
        const yNum = parseInt(year, 10);
        year = String(yNum > 50 ? 1900 + yNum : 2000 + yNum);
      }
      return `${day}/${month}/${year}`;
    }
  }
  const d = date instanceof Date ? date : new Date(date as any);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());
    return `${day}/${month}/${year}`;
  }
  return '';
}

/**
 * Intelligently parses user-typed date inputs (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DDMMYYYY, etc.)
 * into canonical ISO format (YYYY-MM-DD).
 */
export function parseInputDateToISO(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 2. Day-Month-Year format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (or with 2-digit year)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    let y = parseInt(dmyMatch[3], 10);
    if (y < 100) {
      y = y > 50 ? 1900 + y : 2000 + y;
    }
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 3. Compact digits: DDMMYYYY (8 digits)
  if (/^\d{8}$/.test(trimmed)) {
    const d = parseInt(trimmed.slice(0, 2), 10);
    const m = parseInt(trimmed.slice(2, 4), 10);
    const y = parseInt(trimmed.slice(4, 8), 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 4. Compact digits: DDMMYY (6 digits)
  if (/^\d{6}$/.test(trimmed)) {
    const d = parseInt(trimmed.slice(0, 2), 10);
    const m = parseInt(trimmed.slice(2, 4), 10);
    let y = parseInt(trimmed.slice(4, 6), 10);
    y = y > 50 ? 1900 + y : 2000 + y;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

export function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through if crypto.randomUUID fails in insecure context
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Deterministic legacy ID -> UUID mapper matching SQL `legacy_id_to_uuid(text)`
 * for known seed/legacy IDs, and deterministic 128-bit hash for any other non-UUID string.
 */
const KNOWN_LEGACY_UUIDS: Record<string, string> = {
  org1: 'f4f3c861-86c7-c522-5715-2d5d4e2a022b',
  b1: '29534955-fd26-a169-ca7d-4dc6d88161a9',
  w1: '7c8995a9-f658-9254-7b8e-3c73915a16a6',
  d1: 'e01c881c-7e4b-d347-c6b7-598c448e3727',
  u1: '977b8878-f3d5-8c04-e416-3056262a9d6a',
  ba1: '4d20275e-2023-2c7b-3996-a03f03923e8f',
  ba2: '37a6771a-78e6-7183-64b7-36e989e898a3',
  fy1: '8a0f6b24-1b21-81a0-d114-563a02b7b1f0',
  fy2: 'a83c595b-2c4d-0d19-2031-1c98a30062e9',
  'at-1': '1c7d857b-9275-7b38-75c7-8d688469682a',
  'at-2': '22b3e302-f763-8884-06d9-5b6172284898',
  'at-3': '3f8d6822-2b35-4895-9e85-53177201a111',
  'at-4': '4e9a7833-3c46-4906-af96-64288312b222',
  'at-5': '5d916562-1486-9831-9317-89726815338f',
  coa1: 'c0a00001-0000-4000-8000-000000000001',
  coa2: 'c0a00002-0000-4000-8000-000000000002',
  coa3: 'c0a00003-0000-4000-8000-000000000003',
  coa4: 'c0a00004-0000-4000-8000-000000000004',
  coa5: 'c0a00005-0000-4000-8000-000000000005',
  coa6: 'c0a00006-0000-4000-8000-000000000006',
  coa7: 'c0a00007-0000-4000-8000-000000000007',
  coa8: 'c0a00008-0000-4000-8000-000000000008',
  coa9: 'c0a00009-0000-4000-8000-000000000009',
  coa10: 'c0a00010-0000-4000-8000-000000000010',
};

export function ensureUUID(id?: string | null): string {
  if (!id || typeof id !== 'string' || !id.trim()) return safeUUID();
  const clean = id.trim();
  if (UUID_REGEX.test(clean)) return clean.toLowerCase();
  if (KNOWN_LEGACY_UUIDS[clean]) return KNOWN_LEGACY_UUIDS[clean];
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  let h3 = 0x9e3779b9 ^ clean.length;
  let h4 = 0x85ebca6b ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const hex = (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0')
  ).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
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

export function formatUserRequester(
  profile: { full_name?: string; email?: string; role?: string } | null | undefined,
  fallbackRole: string = 'User'
) {
  if (!profile) {
    const role = fallbackRole;
    return {
      name: '',
      role: role,
      displayName: role,
      formatted: role,
    };
  }

  const rawRole = (profile.role || fallbackRole || 'user').trim();
  const isAdmin = rawRole.toLowerCase().includes('admin');
  const roleName = isAdmin ? 'Admin' : rawRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const rawName = (profile.full_name || '').trim();
  const isGenericAdminName = rawName.toLowerCase() === 'super admin' || rawName.toLowerCase() === 'admin' || rawName.toLowerCase() === 'super_admin';

  let finalName = '';
  if (rawName && !isGenericAdminName) {
    finalName = rawName;
  } else if (!isAdmin && profile.email) {
    finalName = profile.email.split('@')[0];
  }

  if (!finalName) {
    return {
      name: '',
      role: roleName,
      displayName: roleName,
      formatted: roleName,
    };
  }

  return {
    name: finalName,
    role: roleName,
    displayName: `${finalName} (${roleName})`,
    formatted: `${finalName} (${roleName})`,
  };
}

export function amountToWords(amount: number): string {
  const num = Math.floor(Math.abs(Number(amount) || 0));
  if (num === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
    } else if (n > 0) {
      str += a[n] + ' ';
    }
    return str;
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  if (crore > 0) words += convertGroup(crore) + 'Crore ';
  if (lakh > 0) words += convertGroup(lakh) + 'Lakh ';
  if (thousand > 0) words += convertGroup(thousand) + 'Thousand ';
  if (remainder > 0) words += convertGroup(remainder);

  return `${words.trim()} Rupees Only`;
}


