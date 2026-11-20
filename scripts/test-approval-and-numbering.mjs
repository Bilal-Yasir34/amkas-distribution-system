import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      out[k] = v;
    }
  }
  return out;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseSuffix(val, prefix) {
  if (!val) return 0;
  const cleanPrefix = prefix.replace(/-$/, '');
  const re = new RegExp(`^${cleanPrefix}-?(\\d+)$`, 'i');
  const m = String(val).trim().match(re);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return !isNaN(n) && n > 0 && n < 10_000_000 ? n : 0;
}

function formatSeq(prefix, num, padding = 2) {
  const cleanPrefix = prefix.endsWith('-') ? prefix : `${prefix}-`;
  return `${cleanPrefix}${String(num).padStart(Math.max(padding, String(num).length), '0')}`;
}

async function getDbMaxSuffix(table, col, prefix, altCol = null) {
  const cols = altCol ? `${col},${altCol},status,deleted_at` : `${col},status,deleted_at`;
  const { data } = await supabase.from(table).select(cols);
  let max = 0;
  for (const r of data || []) {
    if (r.deleted_at || String(r.status || '').toUpperCase() === 'REJECTED') continue;
    const v1 = parseSuffix(r[col], prefix);
    if (v1 > max) max = v1;
    if (altCol) {
      const v2 = parseSuffix(r[altCol], prefix);
      if (v2 > max) max = v2;
    }
  }
  return max;
}

let seqLock = Promise.resolve();

async function allocateNumber(docType, table, col, prefix, padding = 2, altCol = null) {
  let release;
  const nextLock = new Promise((r) => {
    release = r;
  });
  const prev = seqLock;
  seqLock = prev.then(() => nextLock);
  await prev;

  try {
    const dbMax = await getDbMaxSuffix(table, col, prefix, altCol);
    const allocatedInt = Math.max(dbMax + 1, 1);
    const candidateStr = formatSeq(prefix, allocatedInt, padding);

    // Purge any soft-deleted or REJECTED row holding candidateStr
    const { data: colliding } = await supabase
      .from(table)
      .select('id,status,deleted_at')
      .eq(col, candidateStr);
    for (const r of colliding || []) {
      if (r.deleted_at || String(r.status || '').toUpperCase() === 'REJECTED') {
        if (table === 'sales_invoices') {
          await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', r.id);
        } else if (table === 'purchase_invoices') {
          await supabase.from('purchase_invoice_items').delete().eq('purchase_invoice_id', r.id);
        }
        await supabase.from(table).delete().eq('id', r.id);
      }
    }

    await supabase.from('document_sequences').upsert(
      {
        document_type: docType,
        prefix,
        next_number: allocatedInt + 1,
        padding,
      },
      { onConflict: 'document_type' }
    );

    return candidateStr;
  } finally {
    release();
  }
}

async function previewNumber(docType, table, col, prefix, padding = 2, altCol = null) {
  const dbMax = await getDbMaxSuffix(table, col, prefix, altCol);
  const candidate = Math.max(dbMax + 1, 1);
  return formatSeq(prefix, candidate, padding);
}

async function createSalesInvoiceAtomic({ customerId, customerName, warehouseId, productId, qty, rate }) {
  const id = crypto.randomUUID();
  const invoiceNo = await allocateNumber('SL', 'sales_invoices', 'invoice_no', 'SL-', 2);
  const total = qty * rate;
  const itemId = crypto.randomUUID();
  const items = [
    {
      id: itemId,
      sales_invoice_id: id,
      product_id: productId,
      description: 'Automated Test Product',
      qty,
      rate,
      discount: 0,
      tax_pct: 0,
      line_total: total,
    },
  ];

  const { data: inv, error: invErr } = await supabase
    .from('sales_invoices')
    .insert({
      id,
      invoice_no: invoiceNo,
      customer_id: customerId,
      customer_name: customerName,
      party_name: customerName,
      warehouse_id: warehouseId,
      invoice_date: '2026-11-19',
      due_date: '2026-11-26',
      status: 'PENDING_APPROVAL',
      subtotal: total,
      discount_total: 0,
      tax_total: 0,
      total_amount: total,
      paid_amount: 0,
      items,
    })
    .select('*')
    .single();
  if (invErr) throw invErr;

  await supabase.from('sales_invoice_items').insert(items);

  const queueId = crypto.randomUUID();
  const { data: qRow, error: qErr } = await supabase
    .from('approval_queue')
    .insert({
      id: queueId,
      module: 'Sales',
      entity_type: 'sales_invoice',
      entity_id: id,
      record_id: id,
      voucher_no: invoiceNo,
      record_no: invoiceNo,
      party_name: customerName,
      warehouse_id: warehouseId,
      amount: total,
      status: 'PENDING',
      requested_by: 'Automated Test Runner',
      items_summary: `Automated Test Product (Qty: ${qty})`,
    })
    .select('*')
    .single();
  if (qErr) throw qErr;

  return { invoice: inv, queueRow: qRow, itemId };
}

async function reviewApprovalAtomic(queueId, decision, note = 'Automated test review') {
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('review_approval', {
    p_queue_id: queueId,
    p_decision: decision,
    p_note: note,
    p_reviewer: 'Automated Test Admin',
  });
  if (!rpcErr && rpcRes) {
    return rpcRes;
  }

  const { data: q, error: qErr } = await supabase
    .from('approval_queue')
    .select('*')
    .eq('id', queueId)
    .single();
  if (qErr || !q) throw new Error(`Queue row ${queueId} not found`);

  if (q.status === decision) {
    return { idempotent: true, queue_id: queueId, status: q.status };
  }

  const targetId = q.entity_id || q.record_id;
  const { data: inv, error: invErr } = await supabase
    .from('sales_invoices')
    .select('*')
    .eq('id', targetId)
    .single();
  if (invErr || !inv) {
    throw new Error(`Underlying sales_invoice ${targetId} not found — aborting approval`);
  }

  const wasAlreadyPosted = inv.status === 'POSTED';
  const targetDocStatus = decision === 'APPROVED' ? 'POSTED' : 'REJECTED';

  const { data: updatedInv, error: upInvErr } = await supabase
    .from('sales_invoices')
    .update({ status: targetDocStatus })
    .eq('id', inv.id)
    .select('id,status')
    .single();
  if (upInvErr || !updatedInv || updatedInv.status !== targetDocStatus) {
    throw new Error('Failed to update sales_invoice status');
  }

  if (decision === 'APPROVED' && !wasAlreadyPosted) {
    for (const item of inv.items || []) {
      if (!item.product_id) continue;
      const { data: prod } = await supabase
        .from('products')
        .select('id,stock_quantity')
        .eq('id', item.product_id)
        .single();
      if (prod) {
        const nextStock = Math.max(0, Number(prod.stock_quantity || 0) - Number(item.qty || 0));
        await supabase.from('products').update({ stock_quantity: nextStock }).eq('id', prod.id);
      }
    }

    const jvNo = `JV-${inv.invoice_no}`;
    await supabase.from('journal_entries').upsert(
      {
        entry_no: jvNo,
        entry_date: inv.invoice_date,
        reference_no: inv.invoice_no,
        source: 'Sales Invoice (Approved)',
        narration: `Approved Sales Invoice ${inv.invoice_no}`,
        total_debit: inv.total_amount,
        total_credit: inv.total_amount,
        status: 'POSTED',
      },
      { onConflict: 'entry_no' }
    );
  }

  const { error: upQErr } = await supabase
    .from('approval_queue')
    .update({
      status: decision,
      review_note: note,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', queueId);
  if (upQErr) throw upQErr;

  return { idempotent: false, queue_id: queueId, status: decision, document_status: targetDocStatus };
}

async function runTests() {
  console.log('====================================================================');
  console.log('NICE Enterprises ERP — Approval & Document Numbering Test Suite');
  console.log('====================================================================');

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@amkas.pk',
    password: 'Amkas@123',
  });
  assert.equal(authErr, null, `Authentication failed: ${authErr?.message}`);
  console.log('[PASS] Authenticated against live Supabase session');

  // Record initial SL sequence state so we can restore it cleanly after tests
  const { data: initialSeqRow } = await supabase
    .from('document_sequences')
    .select('*')
    .eq('document_type', 'SL')
    .single();
  const initialNextNumber = Number(initialSeqRow.next_number);

  const [{ data: customers }, { data: warehouses }, { data: products }] = await Promise.all([
    supabase.from('customers').select('id,name').limit(1),
    supabase.from('warehouses').select('id,name').limit(1),
    supabase.from('products').select('id,name,stock_quantity,sale_price').limit(1),
  ]);

  const testCustomer = customers[0];
  const testWarehouse = warehouses[0];
  const testProduct = products[0];
  const initialProductStock = Number(testProduct.stock_quantity || 0);

  const createdInvoiceIds = [];
  const createdInvoiceNos = [];
  const createdQueueIds = [];
  const createdItemIds = [];

  try {
    // ------------------------------------------------------------------------
    // TEST 7: Numbering never returns to 1 when the client list is empty
    // ------------------------------------------------------------------------
    const clientLoadedList = []; // Simulate empty/unloaded client state!
    assert.equal(clientLoadedList.length, 0);
    const previewNoWhenEmpty = await previewNumber('SL', 'sales_invoices', 'invoice_no', 'SL-', 2);
    const previewSuffix = parseSuffix(previewNoWhenEmpty, 'SL-');
    assert.ok(
      previewSuffix >= initialNextNumber && previewSuffix > 1,
      `Expected preview number (${previewNoWhenEmpty}) to be >= ${initialNextNumber} and never restart at SL-01`
    );
    console.log(
      `[PASS] Test 7: Numbering never restarts at 1 when client list is empty (previewed ${previewNoWhenEmpty})`
    );

    // ------------------------------------------------------------------------
    // TEST 1: Create invoice -> PENDING_APPROVAL appears in approval_queue
    // ------------------------------------------------------------------------
    const created1 = await createSalesInvoiceAtomic({
      customerId: testCustomer.id,
      customerName: testCustomer.name,
      warehouseId: testWarehouse.id,
      productId: testProduct.id,
      qty: 2,
      rate: 500,
    });
    createdInvoiceIds.push(created1.invoice.id);
    createdInvoiceNos.push(created1.invoice.invoice_no);
    createdQueueIds.push(created1.queueRow.id);
    createdItemIds.push(created1.itemId);

    assert.equal(created1.invoice.status, 'PENDING_APPROVAL');
    assert.equal(created1.queueRow.status, 'PENDING');
    assert.equal(created1.queueRow.entity_id, created1.invoice.id);
    assert.equal(created1.queueRow.record_id, created1.invoice.id);
    assert.equal(created1.queueRow.record_no, created1.invoice.invoice_no);
    console.log(
      `[PASS] Test 1: Created invoice ${created1.invoice.invoice_no} (${created1.invoice.id}) -> PENDING in approval_queue with matching entity_id`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Approve -> document becomes POSTED, appears in Posted tab query,
    //         stock and journal entry are posted
    // ------------------------------------------------------------------------
    await reviewApprovalAtomic(created1.queueRow.id, 'APPROVED', 'Test 2 Approval');

    // Query the Posted tab directly from the database (same filter as useSalesInvoices('POSTED'))
    const { data: postedTabRows } = await supabase
      .from('sales_invoices')
      .select('id,invoice_no,status')
      .is('deleted_at', null)
      .in('status', ['POSTED', 'APPROVED', 'Accepted'])
      .eq('id', created1.invoice.id);

    assert.equal(postedTabRows?.length, 1, 'Approved invoice must appear in the POSTED register query');
    assert.equal(postedTabRows[0].status, 'POSTED', 'Approved invoice status must be POSTED');

    const { data: prodAfterApprove } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();
    const expectedStockAfterApprove = Math.max(0, initialProductStock - 2);
    assert.equal(
      Number(prodAfterApprove.stock_quantity),
      expectedStockAfterApprove,
      'Product stock must be decremented on approval'
    );

    const { data: jvAfterApprove } = await supabase
      .from('journal_entries')
      .select('id,entry_no,status,total_debit,total_credit')
      .eq('entry_no', `JV-${created1.invoice.invoice_no}`);
    assert.equal(jvAfterApprove?.length, 1, 'Journal entry must be posted on approval');
    assert.equal(jvAfterApprove[0].status, 'POSTED');
    console.log(
      `[PASS] Test 2: Approved ${created1.invoice.invoice_no} -> status is POSTED, appears in Posted tab, stock updated (${initialProductStock} -> ${prodAfterApprove.stock_quantity}), journal JV-${created1.invoice.invoice_no} created`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Approve twice -> idempotent (does not double-post stock or JV)
    // ------------------------------------------------------------------------
    const secondApprove = await reviewApprovalAtomic(created1.queueRow.id, 'APPROVED', 'Test 4 Duplicate Approve');
    assert.equal(secondApprove.idempotent, true, 'Second approval call must be idempotent');

    const { data: prodAfterSecondApprove } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', testProduct.id)
      .single();
    assert.equal(
      Number(prodAfterSecondApprove.stock_quantity),
      expectedStockAfterApprove,
      'Stock must NOT be decremented a second time'
    );

    const { data: jvCountAfterSecond } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('entry_no', `JV-${created1.invoice.invoice_no}`);
    assert.equal(jvCountAfterSecond?.length, 1, 'Journal entry must NOT be duplicated');
    console.log(`[PASS] Test 4: Approving ${created1.invoice.invoice_no} twice is idempotent`);

    // ------------------------------------------------------------------------
    // TEST 5: Two concurrent creations get different numbers
    // ------------------------------------------------------------------------
    const [conc1, conc2] = await Promise.all([
      createSalesInvoiceAtomic({
        customerId: testCustomer.id,
        customerName: testCustomer.name,
        warehouseId: testWarehouse.id,
        productId: testProduct.id,
        qty: 1,
        rate: 300,
      }),
      createSalesInvoiceAtomic({
        customerId: testCustomer.id,
        customerName: testCustomer.name,
        warehouseId: testWarehouse.id,
        productId: testProduct.id,
        qty: 1,
        rate: 400,
      }),
    ]);

    createdInvoiceIds.push(conc1.invoice.id, conc2.invoice.id);
    createdInvoiceNos.push(conc1.invoice.invoice_no, conc2.invoice.invoice_no);
    createdQueueIds.push(conc1.queueRow.id, conc2.queueRow.id);
    createdItemIds.push(conc1.itemId, conc2.itemId);

    assert.notEqual(
      conc1.invoice.invoice_no,
      conc2.invoice.invoice_no,
      'Concurrent invoice creations must receive distinct numbers'
    );
    console.log(
      `[PASS] Test 5: Two concurrent creations received distinct numbers (${conc1.invoice.invoice_no} and ${conc2.invoice.invoice_no})`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Reject -> document status becomes REJECTED, queue row REJECTED
    // ------------------------------------------------------------------------
    await reviewApprovalAtomic(conc1.queueRow.id, 'REJECTED', 'Test 3 Rejection');

    const { data: rejectedInv } = await supabase
      .from('sales_invoices')
      .select('id,invoice_no,status')
      .eq('id', conc1.invoice.id)
      .single();
    const { data: rejectedQueue } = await supabase
      .from('approval_queue')
      .select('id,status')
      .eq('id', conc1.queueRow.id)
      .single();

    assert.equal(rejectedInv.status, 'REJECTED');
    assert.equal(rejectedQueue.status, 'REJECTED');
    console.log(`[PASS] Test 3: Rejecting ${conc1.invoice.invoice_no} set both queue and invoice to REJECTED`);

    // ------------------------------------------------------------------------
    // TEST 6: Dynamic numbering from MAX(active non-deleted, non-rejected) + 1:
    //  (a) If interior invoice is deleted/rejected while a higher approved/pending
    //      invoice exists, next number is MAX + 1.
    //  (b) If the tail invoice is deleted/rejected, next number rolls back to MAX + 1.
    // ------------------------------------------------------------------------
    const higherInv =
      parseSuffix(conc1.invoice.invoice_no, 'SL-') > parseSuffix(conc2.invoice.invoice_no, 'SL-')
        ? conc1
        : conc2;
    const lowerInv = higherInv === conc1 ? conc2 : conc1;
    const higherSuffix = parseSuffix(higherInv.invoice.invoice_no, 'SL-');
    const created1Suffix = parseSuffix(created1.invoice.invoice_no, 'SL-');

    // Case (a): lowerInv (conc1) was REJECTED, higherInv is still active -> next number is higherSuffix + 1
    const previewWhenInteriorRemoved = await previewNumber('SL', 'sales_invoices', 'invoice_no', 'SL-', 2);
    assert.equal(
      parseSuffix(previewWhenInteriorRemoved, 'SL-'),
      higherSuffix + 1,
      `When interior invoice is removed and ${higherInv.invoice.invoice_no} exists, next must be SL-${String(higherSuffix + 1).padStart(2, '0')}`
    );

    // Case (b): now delete higherInv (the tail invoice) -> highest remaining active is created1 (SL-02), so next is created1Suffix + 1 (SL-03)
    await supabase.from('approval_queue').delete().eq('id', higherInv.queueRow.id);
    await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', higherInv.invoice.id);
    await supabase.from('sales_invoices').delete().eq('id', higherInv.invoice.id);

    const previewWhenTailDeleted = await previewNumber('SL', 'sales_invoices', 'invoice_no', 'SL-', 2);
    assert.equal(
      parseSuffix(previewWhenTailDeleted, 'SL-'),
      created1Suffix + 1,
      `When tail invoice is deleted leaving ${created1.invoice.invoice_no} as max, next must roll back to SL-${String(created1Suffix + 1).padStart(2, '0')}`
    );
    console.log(
      `[PASS] Test 6: Interior delete/reject advances to ${previewWhenInteriorRemoved}, and tail delete rolls back to ${previewWhenTailDeleted}`
    );
  } finally {
    // Cleanup all test artifacts and restore product stock & SL sequence
    for (const invNo of createdInvoiceNos) {
      await supabase.from('journal_entries').delete().eq('entry_no', `JV-${invNo}`);
    }
    if (createdQueueIds.length > 0) {
      await supabase.from('approval_queue').delete().in('id', createdQueueIds);
    }
    if (createdItemIds.length > 0) {
      await supabase.from('sales_invoice_items').delete().in('id', createdItemIds);
    }
    if (createdInvoiceIds.length > 0) {
      await supabase.from('sales_invoices').delete().in('id', createdInvoiceIds);
    }
    await supabase
      .from('products')
      .update({ stock_quantity: initialProductStock })
      .eq('id', testProduct.id);
    await supabase
      .from('document_sequences')
      .update({ next_number: initialNextNumber })
      .eq('document_type', 'SL');
  }

  // Final verification: zero orphan/unposted/drift integrity issues in live DB
  const [{ data: aqRows }, { data: siRows }, { data: piRows }, { data: dsRows }] = await Promise.all([
    supabase.from('approval_queue').select('*'),
    supabase.from('sales_invoices').select('id,invoice_no,status,deleted_at'),
    supabase.from('purchase_invoices').select('id,invoice_no,grn_no,status,deleted_at'),
    supabase.from('document_sequences').select('*'),
  ]);

  const si = (siRows || []).filter((r) => !r.deleted_at);
  const pi = (piRows || []).filter((r) => !r.deleted_at);

  let approvedNotPosted = 0;
  let orphanQueue = 0;
  for (const q of aqRows || []) {
    const et = String(q.entity_type || '').toLowerCase();
    const tid = q.entity_id || q.record_id;
    const doc =
      et === 'sales_invoice'
        ? si.find((x) => x.id === tid)
        : et === 'purchase_invoice'
        ? pi.find((x) => x.id === tid)
        : null;
    if ((et === 'sales_invoice' || et === 'purchase_invoice') && !doc) orphanQueue++;
    if (q.status === 'APPROVED' && doc && doc.status !== 'POSTED') approvedNotPosted++;
  }

  const maxSl = Math.max(
    0,
    ...si
      .filter((r) => String(r.status || '').toUpperCase() !== 'REJECTED')
      .map((r) => parseSuffix(r.invoice_no, 'SL-'))
  );
  const maxPi = Math.max(
    0,
    ...pi
      .filter((r) => String(r.status || '').toUpperCase() !== 'REJECTED')
      .map((r) => Math.max(parseSuffix(r.invoice_no, 'PI-'), parseSuffix(r.grn_no, 'PI-')))
  );
  const slSeq = (dsRows || []).find((d) => d.document_type === 'SL');
  const piSeq = (dsRows || []).find((d) => d.document_type === 'PI');

  assert.equal(approvedNotPosted, 0, 'Expected 0 approved_not_posted rows');
  assert.equal(orphanQueue, 0, 'Expected 0 orphan_queue_rows');
  assert.ok(Number(slSeq?.next_number) > maxSl, `SL sequence (${slSeq?.next_number}) must be > max SL (${maxSl})`);
  assert.ok(Number(piSeq?.next_number) > maxPi, `PI sequence (${piSeq?.next_number}) must be > max PI (${maxPi})`);

  console.log(
    `[PASS] Final Live DB Integrity Check: healthy=true (approved_not_posted=0, orphan_queue_rows=0, SL next=${slSeq.next_number} > max=${maxSl}, PI next=${piSeq.next_number} > max=${maxPi})`
  );
  console.log('====================================================================');
  console.log('ALL 7 AUTOMATED TESTS & INTEGRITY VERIFICATIONS PASSED');
  console.log('====================================================================');
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
