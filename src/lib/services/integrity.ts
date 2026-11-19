import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, TABLES } from '@/lib/supabase';

export interface IntegrityIssueItem {
  queue_id?: string;
  entity_type: string;
  entity_id?: string;
  record_no?: string;
  doc_no?: string;
  document_status?: string | null;
  status?: string;
  cnt?: number;
  document_type?: string;
  next_number?: number;
  max_used?: number;
  missing_no?: string;
}

export interface IntegrityCheckReport {
  checked_at: string;
  healthy: boolean;
  approved_not_posted: IntegrityIssueItem[];
  pending_without_queue: IntegrityIssueItem[];
  orphan_queue_rows: IntegrityIssueItem[];
  duplicate_numbers: IntegrityIssueItem[];
  sequence_drift: IntegrityIssueItem[];
  number_gaps: IntegrityIssueItem[];
}

function parseSuffix(val: string | null | undefined, prefix: string): number {
  if (!val) return 0;
  const re = new RegExp(`^${prefix}-?(\\d+)$`, 'i');
  const m = String(val).trim().match(re);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return !isNaN(n) && n > 0 && n < 10_000_000 ? n : 0;
}

export async function runDatabaseIntegrityCheck(): Promise<IntegrityCheckReport> {
  // 1. Try server-side check_integrity() RPC first
  const { data: rpcReport, error: rpcErr } = await supabase.rpc('check_integrity');
  if (!rpcErr && rpcReport && typeof rpcReport === 'object') {
    const r = rpcReport as Record<string, unknown>;
    return {
      checked_at: String(r.checked_at || new Date().toISOString()),
      healthy: Boolean(r.healthy),
      approved_not_posted: Array.isArray(r.approved_not_posted) ? (r.approved_not_posted as IntegrityIssueItem[]) : [],
      pending_without_queue: Array.isArray(r.pending_without_queue) ? (r.pending_without_queue as IntegrityIssueItem[]) : [],
      orphan_queue_rows: Array.isArray(r.orphan_queue_rows) ? (r.orphan_queue_rows as IntegrityIssueItem[]) : [],
      duplicate_numbers: Array.isArray(r.duplicate_numbers) ? (r.duplicate_numbers as IntegrityIssueItem[]) : [],
      sequence_drift: Array.isArray(r.sequence_drift) ? (r.sequence_drift as IntegrityIssueItem[]) : [],
      number_gaps: Array.isArray(r.number_gaps) ? (r.number_gaps as IntegrityIssueItem[]) : [],
    };
  }

  // 2. Direct live database queries fallback
  const [
    { data: aqRows },
    { data: siRows },
    { data: piRows },
    { data: vbRows },
    { data: srRows },
    { data: prRows },
    { data: crRows },
    { data: vpRows },
    { data: dsRows },
  ] = await Promise.all([
    supabase.from(TABLES.approvalQueue).select('*'),
    supabase.from(TABLES.salesInvoices).select('id,invoice_no,status'),
    supabase.from(TABLES.purchaseInvoices).select('id,invoice_no,grn_no,status'),
    supabase.from(TABLES.vendorBills).select('id,bill_no,status'),
    supabase.from(TABLES.salesReturns).select('id,return_no,status'),
    supabase.from(TABLES.purchaseReturns).select('id,return_no,status'),
    supabase.from(TABLES.customerReceipts).select('id,receipt_no,status'),
    supabase.from(TABLES.vendorPayments).select('id,payment_no,status'),
    supabase.from(TABLES.documentSequences).select('*'),
  ]);

  const aq = (aqRows || []) as Array<Record<string, any>>;
  const si = (siRows || []) as Array<Record<string, any>>;
  const pi = (piRows || []) as Array<Record<string, any>>;
  const vb = (vbRows || []) as Array<Record<string, any>>;
  const sr = (srRows || []) as Array<Record<string, any>>;
  const pr = (prRows || []) as Array<Record<string, any>>;
  const cr = (crRows || []) as Array<Record<string, any>>;
  const vp = (vpRows || []) as Array<Record<string, any>>;
  const ds = (dsRows || []) as Array<Record<string, any>>;

  const approvedNotPosted: IntegrityIssueItem[] = [];
  const orphanQueueRows: IntegrityIssueItem[] = [];

  for (const q of aq) {
    const et = String(q.entity_type || '').toLowerCase();
    const targetId = q.entity_id || q.record_id;
    const recNo = q.record_no || q.voucher_no;
    let doc: Record<string, any> | undefined;

    if (et === 'sales_invoice') {
      doc = si.find((x) => x.id === targetId);
    } else if (et === 'purchase_invoice') {
      doc = pi.find((x) => x.id === targetId);
    } else if (et === 'vendor_bill') {
      doc = vb.find((x) => x.id === targetId);
    } else if (et === 'sales_return') {
      doc = sr.find((x) => x.id === targetId);
    } else if (et === 'purchase_return') {
      doc = pr.find((x) => x.id === targetId);
    } else if (et === 'customer_receipt' || et === 'payment_receipt') {
      doc = cr.find((x) => x.id === targetId);
    } else if (et === 'vendor_payment' || et === 'payment_voucher') {
      doc = vp.find((x) => x.id === targetId);
    }

    if (!doc) {
      orphanQueueRows.push({
        queue_id: q.id,
        entity_type: q.entity_type,
        entity_id: targetId,
        record_no: recNo,
        status: q.status,
      });
    } else if (q.status === 'APPROVED' && doc.status !== 'POSTED') {
      approvedNotPosted.push({
        queue_id: q.id,
        entity_type: q.entity_type,
        entity_id: doc.id,
        record_no: recNo,
        document_status: doc.status,
      });
    }
  }

  const pendingWithoutQueue: IntegrityIssueItem[] = [];
  for (const inv of si) {
    if (inv.status === 'PENDING_APPROVAL') {
      const hasQ = aq.some(
        (q) =>
          q.entity_type === 'sales_invoice' &&
          (q.entity_id === inv.id || q.record_id === inv.id)
      );
      if (!hasQ) {
        pendingWithoutQueue.push({
          entity_type: 'sales_invoice',
          entity_id: inv.id,
          record_no: inv.invoice_no,
        });
      }
    }
  }
  for (const p of pi) {
    if (p.status === 'PENDING_APPROVAL') {
      const hasQ = aq.some(
        (q) =>
          q.entity_type === 'purchase_invoice' &&
          (q.entity_id === p.id || q.record_id === p.id)
      );
      if (!hasQ) {
        pendingWithoutQueue.push({
          entity_type: 'purchase_invoice',
          entity_id: p.id,
          record_no: p.grn_no || p.invoice_no,
        });
      }
    }
  }

  // Duplicate numbers check
  const duplicateNumbers: IntegrityIssueItem[] = [];
  const siCounts = new Map<string, number>();
  for (const inv of si) {
    if (inv.invoice_no) siCounts.set(inv.invoice_no, (siCounts.get(inv.invoice_no) || 0) + 1);
  }
  for (const [docNo, cnt] of siCounts.entries()) {
    if (cnt > 1) duplicateNumbers.push({ entity_type: 'sales_invoice', doc_no: docNo, cnt });
  }

  const piCounts = new Map<string, number>();
  for (const p of pi) {
    const no = p.grn_no || p.invoice_no;
    if (no) piCounts.set(no, (piCounts.get(no) || 0) + 1);
  }
  for (const [docNo, cnt] of piCounts.entries()) {
    if (cnt > 1) duplicateNumbers.push({ entity_type: 'purchase_invoice', doc_no: docNo, cnt });
  }

  // Sequence drift check
  const sequenceDrift: IntegrityIssueItem[] = [];
  const maxSl = Math.max(0, ...si.map((x) => parseSuffix(x.invoice_no, 'SL')));
  const maxPi = Math.max(
    0,
    ...pi.flatMap((x) => [parseSuffix(x.invoice_no, 'PI'), parseSuffix(x.grn_no, 'PI')])
  );

  const slSeq = ds.find((d) => d.document_type === 'SL');
  if (!slSeq || Number(slSeq.next_number || 0) <= maxSl) {
    sequenceDrift.push({
      entity_type: 'document_sequence',
      document_type: 'SL',
      next_number: Number(slSeq?.next_number || 0),
      max_used: maxSl,
    });
  }

  const piSeq = ds.find((d) => d.document_type === 'PI');
  if (!piSeq || Number(piSeq.next_number || 0) <= maxPi) {
    sequenceDrift.push({
      entity_type: 'document_sequence',
      document_type: 'PI',
      next_number: Number(piSeq?.next_number || 0),
      max_used: maxPi,
    });
  }

  // Number gaps (informational)
  const numberGaps: IntegrityIssueItem[] = [];
  const slSet = new Set(si.map((x) => parseSuffix(x.invoice_no, 'SL')).filter((n) => n > 0));
  for (let n = 1; n <= maxSl; n++) {
    if (!slSet.has(n)) {
      numberGaps.push({
        entity_type: 'sales_invoice',
        document_type: 'SL',
        missing_no: `SL-${String(n).padStart(2, '0')}`,
      });
    }
  }
  const piSet = new Set(
    pi
      .map((x) => Math.max(parseSuffix(x.invoice_no, 'PI'), parseSuffix(x.grn_no, 'PI')))
      .filter((n) => n > 0)
  );
  for (let n = 1; n <= maxPi; n++) {
    if (!piSet.has(n)) {
      numberGaps.push({
        entity_type: 'purchase_invoice',
        document_type: 'PI',
        missing_no: `PI-${String(n).padStart(2, '0')}`,
      });
    }
  }

  const healthy =
    approvedNotPosted.length === 0 &&
    pendingWithoutQueue.length === 0 &&
    orphanQueueRows.length === 0 &&
    duplicateNumbers.length === 0 &&
    sequenceDrift.length === 0;

  return {
    checked_at: new Date().toISOString(),
    healthy,
    approved_not_posted: approvedNotPosted,
    pending_without_queue: pendingWithoutQueue,
    orphan_queue_rows: orphanQueueRows,
    duplicate_numbers: duplicateNumbers,
    sequence_drift: sequenceDrift,
    number_gaps: numberGaps,
  };
}

export async function executeDatabaseRepair(): Promise<void> {
  // 1. Try server RPCs first
  const { error: rpcErr } = await supabase.rpc('run_data_repair');
  await supabase.rpc('sync_document_sequences_above_max');
  if (!rpcErr) return;

  // 2. Fallback direct repair
  const report = await runDatabaseIntegrityCheck();

  for (const item of report.approved_not_posted) {
    if (item.entity_type === 'sales_invoice' && item.entity_id) {
      await supabase
        .from(TABLES.salesInvoices)
        .update({ status: 'POSTED' })
        .eq('id', item.entity_id);
    } else if (item.entity_type === 'purchase_invoice' && item.entity_id) {
      await supabase
        .from(TABLES.purchaseInvoices)
        .update({ status: 'POSTED' })
        .eq('id', item.entity_id);
    }
  }

  for (const item of report.orphan_queue_rows) {
    if (!item.queue_id || !item.record_no) continue;
    if (item.entity_type === 'sales_invoice') {
      const { data: doc } = await supabase
        .from(TABLES.salesInvoices)
        .select('id,status')
        .eq('invoice_no', item.record_no)
        .maybeSingle();
      if (doc?.id) {
        await supabase
          .from(TABLES.approvalQueue)
          .update({ entity_id: doc.id, record_id: doc.id })
          .eq('id', item.queue_id);
        if (item.status === 'APPROVED' && doc.status !== 'POSTED') {
          await supabase
            .from(TABLES.salesInvoices)
            .update({ status: 'POSTED' })
            .eq('id', doc.id);
        }
      }
    } else if (item.entity_type === 'purchase_invoice') {
      const { data: doc } = await supabase
        .from(TABLES.purchaseInvoices)
        .select('id,status')
        .or(`invoice_no.eq.${item.record_no},grn_no.eq.${item.record_no}`)
        .maybeSingle();
      if (doc?.id) {
        await supabase
          .from(TABLES.approvalQueue)
          .update({ entity_id: doc.id, record_id: doc.id })
          .eq('id', item.queue_id);
        if (item.status === 'APPROVED' && doc.status !== 'POSTED') {
          await supabase
            .from(TABLES.purchaseInvoices)
            .update({ status: 'POSTED' })
            .eq('id', doc.id);
        }
      }
    }
  }

  for (const drift of report.sequence_drift) {
    if (!drift.document_type) continue;
    const nextNum = (drift.max_used || 0) + 1;
    await supabase.from(TABLES.documentSequences).upsert(
      {
        document_type: drift.document_type,
        prefix: `${drift.document_type}-`,
        next_number: nextNum,
        padding: 2,
      },
      { onConflict: 'document_type' }
    );
  }
}

export function useDataIntegrity(enabled: boolean = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['system_integrity_check'],
    enabled,
    refetchInterval: 60_000,
    queryFn: runDatabaseIntegrityCheck,
  });

  const repairMutation = useMutation({
    mutationFn: executeDatabaseRepair,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  return {
    report: query.data,
    isLoading: query.isLoading,
    refetchIntegrity: query.refetch,
    runRepair: () => repairMutation.mutateAsync(),
    isRepairing: repairMutation.isPending,
  };
}
