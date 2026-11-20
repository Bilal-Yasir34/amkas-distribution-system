import { supabase, TABLES } from '@/lib/supabase';

export interface DocumentSequenceConfig {
  documentType: string;
  prefix: string;
  padding: number;
  table: string;
  column: string;
  altColumn?: string;
}

export const DOC_SEQUENCE_CONFIGS: Record<string, DocumentSequenceConfig> = {
  SL: { documentType: 'SL', prefix: 'SL-', padding: 2, table: TABLES.salesInvoices, column: 'invoice_no' },
  PI: { documentType: 'PI', prefix: 'PI-', padding: 2, table: TABLES.purchaseInvoices, column: 'invoice_no', altColumn: 'grn_no' },
  VB: { documentType: 'VB', prefix: 'VB-', padding: 2, table: TABLES.vendorBills, column: 'bill_no' },
  MQ: { documentType: 'MQ', prefix: 'MQ-', padding: 5, table: TABLES.quotations, column: 'quotation_no' },
  MSO: { documentType: 'MSO', prefix: 'MSO-', padding: 5, table: TABLES.salesOrders, column: 'order_no' },
  MCN: { documentType: 'MCN', prefix: 'MCN-', padding: 5, table: TABLES.creditNotes, column: 'credit_note_no' },
  DN: { documentType: 'DN', prefix: 'DN-', padding: 2, table: TABLES.debitNotes, column: 'debit_note_no' },
  CR: { documentType: 'CR', prefix: 'CR-', padding: 5, table: TABLES.customerReceipts, column: 'receipt_no' },
  CP: { documentType: 'CP', prefix: 'CP-', padding: 5, table: TABLES.vendorPayments, column: 'payment_no' },
  PAY: { documentType: 'PAY', prefix: 'PAY-', padding: 2, table: TABLES.vendorPayments, column: 'payment_no' },
  VP: { documentType: 'VP', prefix: 'VP-', padding: 4, table: TABLES.vendorPayments, column: 'payment_no' },
  SR: { documentType: 'SR', prefix: 'SR-', padding: 2, table: TABLES.salesReturns, column: 'return_no' },
  PRT: { documentType: 'PRT', prefix: 'PRT-', padding: 2, table: TABLES.purchaseReturns, column: 'return_no' },
  PR: { documentType: 'PR', prefix: 'PR-', padding: 2, table: TABLES.purchaseRequests, column: 'request_no' },
  PO: { documentType: 'PO', prefix: 'PO-', padding: 2, table: TABLES.purchaseOrders, column: 'po_no' },
  JV: { documentType: 'JV', prefix: 'JV-', padding: 5, table: TABLES.journalEntries, column: 'entry_no' },
  MST: { documentType: 'MST', prefix: 'MST-', padding: 5, table: TABLES.stockTransfers, column: 'transfer_no' },
  MSA: { documentType: 'MSA', prefix: 'MSA-', padding: 5, table: TABLES.stockAdjustments, column: 'adjustment_no' },
  ART: { documentType: 'ART', prefix: 'ART-', padding: 4, table: TABLES.products, column: 'code' },
  CUST: { documentType: 'CUST', prefix: 'CUST-', padding: 2, table: TABLES.customers, column: 'code' },
  SUP: { documentType: 'SUP', prefix: 'SUP-', padding: 5, table: TABLES.vendors, column: 'code' },
  CAT: { documentType: 'CAT', prefix: 'CAT-', padding: 2, table: TABLES.categories, column: 'code' },
  WH: { documentType: 'WH', prefix: 'WH-', padding: 2, table: TABLES.warehouses, column: 'code' },
  AT: { documentType: 'AT', prefix: 'AT-', padding: 3, table: TABLES.accountTypes, column: 'code' },
  EMP: { documentType: 'EMP', prefix: 'EMP-', padding: 3, table: TABLES.userProfiles, column: 'employee_code' },
};

function extractSuffixFromDocNo(docNo: string | null | undefined, prefix: string): number {
  if (!docNo) return 0;
  const cleanPrefix = prefix.replace(/-$/, '');
  const re = new RegExp(`^${cleanPrefix}-?(\\d+)$`, 'i');
  const m = String(docNo).trim().match(re);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return !isNaN(n) && n > 0 && n < 10_000_000 ? n : 0;
}

function formatSeqNumber(prefix: string, num: number, padding: number): string {
  const cleanPrefix = prefix.endsWith('-') || prefix === 'ORG' ? prefix : `${prefix}-`;
  return `${cleanPrefix}${String(num).padStart(Math.max(padding, String(num).length), '0')}`;
}

/**
 * Computes the current maximum suffix directly from the database table
 * (never from a client array) so numbering never restarts at 1 even if
 * local state or cache is empty.
 *
 * For SL (Sales Invoices) and PI (Purchase Invoices), numbers continue
 * strictly from the highest active non-deleted, non-rejected invoice
 * (`MAX(approved or pending suffix) + 1`). If the latest tail invoice
 * (e.g. SL-02 when SL-01..SL-02 exist) is deleted or rejected, the next
 * invoice reuses SL-02; if an interior invoice (e.g. SL-02 when SL-01..SL-05
 * exist) is deleted, MAX is 5 so the next invoice is SL-06.
 */
async function getDatabaseMaxSuffix(cfg: DocumentSequenceConfig): Promise<number> {
  const selectCols = cfg.altColumn
    ? `${cfg.column},${cfg.altColumn},status`
    : `${cfg.column},status`;

  const isApprovalGatedDoc = cfg.documentType === 'SL' || cfg.documentType === 'PI';

  let query = supabase.from(cfg.table).select(selectCols).is('deleted_at', null);
  if (isApprovalGatedDoc) {
    query = query.neq('status', 'REJECTED');
  }

  const { data: activeData, error: activeErr } = await query;

  let rows: Record<string, unknown>[] = [];
  if (!activeErr && Array.isArray(activeData)) {
    rows = activeData as unknown as Record<string, unknown>[];
  } else {
    const fallbackCols = cfg.altColumn ? `${cfg.column},${cfg.altColumn}` : cfg.column;
    const { data, error } = await supabase.from(cfg.table).select(fallbackCols);
    if (!error && Array.isArray(data)) {
      rows = data as unknown as Record<string, unknown>[];
    }
  }

  let max = 0;
  for (const row of rows) {
    if (isApprovalGatedDoc && String(row.status || '').toUpperCase() === 'REJECTED') {
      continue;
    }
    const v1 = extractSuffixFromDocNo(row[cfg.column] as string | undefined, cfg.prefix);
    if (v1 > max) max = v1;
    if (cfg.altColumn) {
      const v2 = extractSuffixFromDocNo(row[cfg.altColumn] as string | undefined, cfg.prefix);
      if (v2 > max) max = v2;
    }
  }
  return max;
}

/**
 * Preview the next document number from the database without incrementing the counter.
 * Used when opening "New Invoice" / "New Purchase" forms.
 */
export async function previewNextDocumentNumber(docType: string): Promise<string> {
  const key = docType.trim().toUpperCase();
  const cfg = DOC_SEQUENCE_CONFIGS[key] || {
    documentType: key,
    prefix: `${key}-`,
    padding: 2,
    table: TABLES.salesInvoices,
    column: 'invoice_no',
  };

  const isDynamicMaxDoc = key === 'SL' || key === 'PI';

  // For SL and PI, always compute dynamically from MAX(active non-deleted, non-rejected) + 1
  // so deleting or rejecting the tail invoice rolls the next number back to MAX + 1.
  if (isDynamicMaxDoc) {
    const dbMax = await getDatabaseMaxSuffix(cfg);
    const nextNum = Math.max(dbMax + 1, 1);
    await supabase.from(TABLES.documentSequences).upsert(
      {
        document_type: key,
        prefix: cfg.prefix,
        next_number: nextNum,
        padding: cfg.padding,
        description: cfg.documentType,
      },
      { onConflict: 'document_type' }
    );
    return formatSeqNumber(cfg.prefix, nextNum, cfg.padding);
  }

  // 1. Try server RPC first for other document types
  const { data: rpcPreview, error: rpcErr } = await supabase.rpc(
    'preview_next_document_number',
    { p_type: key }
  );
  if (!rpcErr && typeof rpcPreview === 'string' && rpcPreview.trim()) {
    return rpcPreview.trim();
  }

  // 2. Fallback: query document_sequences + actual DB table max
  const [{ data: seqRow }, dbMax] = await Promise.all([
    supabase
      .from(TABLES.documentSequences)
      .select('*')
      .eq('document_type', key)
      .maybeSingle(),
    getDatabaseMaxSuffix(cfg),
  ]);

  const seqNext = Number(seqRow?.next_number || 1);
  const effectiveNext = Math.max(seqNext, dbMax + 1, 1);
  const prefix = (seqRow?.prefix as string) || cfg.prefix;
  const padding = Number(seqRow?.padding ?? cfg.padding);

  return formatSeqNumber(prefix, effectiveNext, padding);
}

/**
 * Atomically allocates the next unique document number from the database.
 * Increments `document_sequences.next_number` and verifies uniqueness against the database table.
 */
export async function allocateNextDocumentNumber(docType: string): Promise<string> {
  const key = docType.trim().toUpperCase();
  const cfg = DOC_SEQUENCE_CONFIGS[key] || {
    documentType: key,
    prefix: `${key}-`,
    padding: 2,
    table: TABLES.salesInvoices,
    column: 'invoice_no',
  };

  const isDynamicMaxDoc = key === 'SL' || key === 'PI';

  // For SL and PI, compute directly from MAX(active non-deleted, non-rejected) + 1
  // and purge any soft-deleted/rejected row holding the same candidate number so there is no UNIQUE collision.
  if (isDynamicMaxDoc) {
    const dbMax = await getDatabaseMaxSuffix(cfg);
    let candidateNum = Math.max(dbMax + 1, 1);

    for (let attempt = 0; attempt < 20; attempt++) {
      const candidateStr = formatSeqNumber(cfg.prefix, candidateNum, cfg.padding);

      // Remove any soft-deleted or REJECTED row occupying candidateStr so the number can be reused cleanly
      if (key === 'SL') {
        const { data: colliding } = await supabase
          .from(TABLES.salesInvoices)
          .select('id,status,deleted_at')
          .eq('invoice_no', candidateStr);
        let activeCollision = false;
        for (const r of colliding || []) {
          if (r.deleted_at || String(r.status || '').toUpperCase() === 'REJECTED') {
            await supabase.from(TABLES.salesInvoiceItems).delete().eq('sales_invoice_id', r.id);
            await supabase.from(TABLES.salesInvoices).delete().eq('id', r.id);
          } else {
            activeCollision = true;
          }
        }
        if (!activeCollision) {
          await supabase.from(TABLES.documentSequences).upsert(
            {
              document_type: key,
              prefix: cfg.prefix,
              next_number: candidateNum + 1,
              padding: cfg.padding,
              description: cfg.documentType,
            },
            { onConflict: 'document_type' }
          );
          return candidateStr;
        }
      } else if (key === 'PI') {
        const { data: colliding } = await supabase
          .from(TABLES.purchaseInvoices)
          .select('id,status,deleted_at')
          .or(`invoice_no.eq.${candidateStr},grn_no.eq.${candidateStr}`);
        let activeCollision = false;
        for (const r of colliding || []) {
          if (r.deleted_at || String(r.status || '').toUpperCase() === 'REJECTED') {
            await supabase.from(TABLES.purchaseInvoiceItems).delete().eq('purchase_invoice_id', r.id);
            await supabase.from(TABLES.purchaseInvoices).delete().eq('id', r.id);
          } else {
            activeCollision = true;
          }
        }
        if (!activeCollision) {
          await supabase.from(TABLES.documentSequences).upsert(
            {
              document_type: key,
              prefix: cfg.prefix,
              next_number: candidateNum + 1,
              padding: cfg.padding,
              description: cfg.documentType,
            },
            { onConflict: 'document_type' }
          );
          return candidateStr;
        }
      }

      candidateNum += 1;
    }

    return formatSeqNumber(cfg.prefix, candidateNum, cfg.padding);
  }

  // 1. Try atomic Postgres RPC first
  const { data: rpcAllocated, error: rpcErr } = await supabase.rpc('next_document_number', {
    p_type: key,
  });
  if (!rpcErr && typeof rpcAllocated === 'string' && rpcAllocated.trim()) {
    return rpcAllocated.trim();
  }

  // 2. Database-backed atomic sequence increment + collision check
  const dbMax = await getDatabaseMaxSuffix(cfg);
  const { data: seqRow } = await supabase
    .from(TABLES.documentSequences)
    .select('*')
    .eq('document_type', key)
    .maybeSingle();

  let candidateNum = Math.max(Number(seqRow?.next_number || 1), dbMax + 1, 1);
  const prefix = (seqRow?.prefix as string) || cfg.prefix;
  const padding = Number(seqRow?.padding ?? cfg.padding);

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidateStr = formatSeqNumber(prefix, candidateNum, padding);

    // Advance sequence in document_sequences table immediately
    await supabase.from(TABLES.documentSequences).upsert(
      {
        document_type: key,
        prefix,
        next_number: candidateNum + 1,
        padding,
        description: cfg.documentType,
      },
      { onConflict: 'document_type' }
    );

    // Verify candidateStr does not exist in target DB table
    const { data: existing } = await supabase
      .from(cfg.table)
      .select('id')
      .eq(cfg.column, candidateStr)
      .limit(1);

    if (!existing || existing.length === 0) {
      return candidateStr;
    }
    candidateNum += 1;
  }

  return formatSeqNumber(prefix, candidateNum, padding);
}
