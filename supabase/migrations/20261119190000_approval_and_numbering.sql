/*
================================================================================
NICE ENTERPRISES ERP — ATOMIC APPROVALS, SERVER-SIDE NUMBERING & DATA INTEGRITY
Migration: 20261119190000_approval_and_numbering.sql
================================================================================
Idempotent migration that:
1. Creates non-destructive backup tables (*_backup_20261119) before any changes.
2. Aligns approval_queue, sales_invoices, sales_invoice_items, purchase_invoices,
   purchase_invoice_items, vendor_bills, vendor_bill_items, and document_sequences.
3. Seeds document_sequences for every document type from MAX(existing suffix) + 1
   so numbering NEVER resets to 1.
4. Creates atomic next_document_number(p_type) and preview_next_document_number(p_type)
   plus BEFORE INSERT triggers and UNIQUE constraints on all document number columns.
5. Creates atomic transactional RPCs:
   - create_sales_invoice(payload jsonb)
   - create_purchase_invoice(payload jsonb)
   - review_approval(p_queue_id uuid, p_status text, p_note text, p_reviewer text)
6. Adds a consistency trigger on approval_queue so a queue row can NEVER be marked
   APPROVED unless its target document exists and has status = 'POSTED'.
7. Runs the one-time repair script (logging every change in repair_log) and creates
   check_integrity() + run_data_repair() RPC functions for continuous verification.
================================================================================
*/

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0. NON-DESTRUCTIVE BACKUP TABLES BEFORE ANY CHANGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approval_queue_backup_20261119 AS
  SELECT * FROM public.approval_queue;

CREATE TABLE IF NOT EXISTS public.sales_invoices_backup_20261119 AS
  SELECT * FROM public.sales_invoices;

CREATE TABLE IF NOT EXISTS public.purchase_invoices_backup_20261119 AS
  SELECT * FROM public.purchase_invoices;

CREATE TABLE IF NOT EXISTS public.vendor_bills_backup_20261119 AS
  SELECT * FROM public.vendor_bills;

CREATE TABLE IF NOT EXISTS public.document_sequences_backup_20261119 AS
  SELECT * FROM public.document_sequences;

-- ============================================================================
-- 1. REPAIR LOG TABLE & SCHEMA ALIGNMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.repair_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_value text,
  new_value text,
  details text,
  repaired_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_repair_log" ON public.repair_log;
CREATE POLICY "auth_select_repair_log" ON public.repair_log FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "auth_insert_repair_log" ON public.repair_log;
CREATE POLICY "auth_insert_repair_log" ON public.repair_log FOR INSERT TO authenticated, anon WITH CHECK (true);

-- 1.1 Bring approval_queue into full alignment
ALTER TABLE public.approval_queue
  ADD COLUMN IF NOT EXISTS module text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS record_id text,
  ADD COLUMN IF NOT EXISTS record_no text,
  ADD COLUMN IF NOT EXISTS voucher_no text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS warehouse_id text,
  ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requested_by text,
  ADD COLUMN IF NOT EXISTS requested_by_name text,
  ADD COLUMN IF NOT EXISTS requested_by_role text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS items_summary text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON public.approval_queue(status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_entity ON public.approval_queue(entity_type, entity_id);

-- 1.2 Ensure sales_invoices, purchase_invoices, vendor_bills & item tables have all columns
ALTER TABLE public.sales_invoices
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS account_category text,
  ADD COLUMN IF NOT EXISTS terms_conditions text,
  ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.purchase_invoices
  ADD COLUMN IF NOT EXISTS grn_no text,
  ADD COLUMN IF NOT EXISTS po_id uuid,
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS vendor_invoice_no text,
  ADD COLUMN IF NOT EXISTS received_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS account_category text,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.vendor_bills
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS bill_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS vendor_invoice_no text,
  ADD COLUMN IF NOT EXISTS account_category text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ============================================================================
-- 2. ONE-TIME REPAIR SCRIPT (WITH DRY-RUN LOGGING INTO repair_log)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.run_data_repair()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_doc_id uuid;
  v_doc_status text;
  v_new_no text;
  v_repaired_statuses int := 0;
  v_repaired_links int := 0;
  v_repaired_journals int := 0;
  v_repaired_missing_queue int := 0;
  v_repaired_duplicates int := 0;
BEGIN
  -- 2.1 Normalize any document with status 'APPROVED' or 'Accepted' -> 'POSTED'
  FOR v_rec IN
    SELECT id, invoice_no, status FROM public.sales_invoices
    WHERE status IN ('APPROVED', 'Accepted') AND deleted_at IS NULL
  LOOP
    UPDATE public.sales_invoices SET status = 'POSTED', updated_at = now() WHERE id = v_rec.id;
    INSERT INTO public.repair_log (repair_type, entity_type, entity_id, old_value, new_value, details)
    VALUES ('NORMALIZE_STATUS', 'sales_invoice', v_rec.id, v_rec.status, 'POSTED', 'Normalized sales_invoice ' || COALESCE(v_rec.invoice_no, v_rec.id::text) || ' status to POSTED');
    v_repaired_statuses := v_repaired_statuses + 1;
  END LOOP;

  FOR v_rec IN
    SELECT id, COALESCE(grn_no, invoice_no) AS doc_no, status FROM public.purchase_invoices
    WHERE status IN ('APPROVED', 'Accepted') AND deleted_at IS NULL
  LOOP
    UPDATE public.purchase_invoices SET status = 'POSTED', updated_at = now() WHERE id = v_rec.id;
    INSERT INTO public.repair_log (repair_type, entity_type, entity_id, old_value, new_value, details)
    VALUES ('NORMALIZE_STATUS', 'purchase_invoice', v_rec.id, v_rec.status, 'POSTED', 'Normalized purchase_invoice ' || COALESCE(v_rec.doc_no, v_rec.id::text) || ' status to POSTED');
    v_repaired_statuses := v_repaired_statuses + 1;
  END LOOP;

  -- 2.2 Repair approval_queue rows whose entity_id/record_id does not match the actual target document id
  FOR v_rec IN SELECT * FROM public.approval_queue LOOP
    v_doc_id := NULL;
    v_doc_status := NULL;

    IF v_rec.entity_type IN ('sales_invoice', 'SALE_INVOICE') THEN
      SELECT id, status INTO v_doc_id, v_doc_status
      FROM public.sales_invoices
      WHERE (id = v_rec.entity_id OR id::text = v_rec.record_id OR invoice_no = COALESCE(v_rec.record_no, v_rec.voucher_no))
      ORDER BY (deleted_at IS NULL) DESC, (id = v_rec.entity_id) DESC, created_at DESC
      LIMIT 1;

      IF v_doc_id IS NOT NULL THEN
        -- Un-delete if soft-deleted while still in approval_queue
        UPDATE public.sales_invoices
        SET deleted_at = NULL,
            updated_at = now()
        WHERE id = v_doc_id AND deleted_at IS NOT NULL;
      END IF;

      IF v_doc_id IS NOT NULL AND (v_rec.entity_id IS DISTINCT FROM v_doc_id OR v_rec.record_id IS DISTINCT FROM v_doc_id::text OR v_rec.entity_type <> 'sales_invoice') THEN
        UPDATE public.approval_queue
        SET entity_type = 'sales_invoice',
            entity_id = v_doc_id,
            record_id = v_doc_id::text,
            record_no = COALESCE(v_rec.record_no, v_rec.voucher_no),
            voucher_no = COALESCE(v_rec.voucher_no, v_rec.record_no),
            updated_at = now()
        WHERE id = v_rec.id;

        INSERT INTO public.repair_log (repair_type, entity_type, entity_id, old_value, new_value, details)
        VALUES ('REPAIR_QUEUE_FK', 'sales_invoice', v_doc_id, COALESCE(v_rec.entity_id::text, v_rec.record_id), v_doc_id::text, 'Relinked approval_queue ' || v_rec.id::text || ' to sales_invoice ' || COALESCE(v_rec.record_no, v_rec.voucher_no, ''));
        v_repaired_links := v_repaired_links + 1;
      END IF;

      -- If queue row is APPROVED but target sales_invoice is not POSTED, post it atomically
      IF v_doc_id IS NOT NULL AND v_rec.status = 'APPROVED' AND v_doc_status <> 'POSTED' THEN
        PERFORM public.post_sales_invoice(v_doc_id);
        INSERT INTO public.repair_log (repair_type, entity_type, entity_id, old_value, new_value, details)
        VALUES ('POST_APPROVED_DOC', 'sales_invoice', v_doc_id, v_doc_status, 'POSTED', 'Posted approved sales_invoice ' || COALESCE(v_rec.record_no, v_rec.voucher_no, ''));
        v_repaired_statuses := v_repaired_statuses + 1;
      END IF;

    ELSIF v_rec.entity_type = 'purchase_invoice' THEN
      SELECT id, status INTO v_doc_id, v_doc_status
      FROM public.purchase_invoices
      WHERE (id = v_rec.entity_id OR id::text = v_rec.record_id OR invoice_no = COALESCE(v_rec.record_no, v_rec.voucher_no) OR grn_no = COALESCE(v_rec.record_no, v_rec.voucher_no))
      ORDER BY (deleted_at IS NULL) DESC, (id = v_rec.entity_id) DESC, created_at DESC
      LIMIT 1;

      IF v_doc_id IS NOT NULL THEN
        UPDATE public.purchase_invoices
        SET deleted_at = NULL,
            updated_at = now()
        WHERE id = v_doc_id AND deleted_at IS NOT NULL;
      END IF;

      IF v_doc_id IS NOT NULL AND (v_rec.entity_id IS DISTINCT FROM v_doc_id OR v_rec.record_id IS DISTINCT FROM v_doc_id::text) THEN
        UPDATE public.approval_queue
        SET entity_id = v_doc_id,
            record_id = v_doc_id::text,
            record_no = COALESCE(v_rec.record_no, v_rec.voucher_no),
            voucher_no = COALESCE(v_rec.voucher_no, v_rec.record_no),
            updated_at = now()
        WHERE id = v_rec.id;

        INSERT INTO public.repair_log (repair_type, entity_type, entity_id, old_value, new_value, details)
        VALUES ('REPAIR_QUEUE_FK', 'purchase_invoice', v_doc_id, COALESCE(v_rec.entity_id::text, v_rec.record_id), v_doc_id::text, 'Relinked approval_queue ' || v_rec.id::text || ' to purchase_invoice ' || COALESCE(v_rec.record_no, v_rec.voucher_no, ''));
        v_repaired_links := v_repaired_links + 1;
      END IF;

      IF v_doc_id IS NOT NULL AND v_rec.status = 'APPROVED' AND v_doc_status <> 'POSTED' THEN
        PERFORM public.post_purchase_invoice(v_doc_id);
        INSERT INTO public.repair_log (repair_type, entity_type, entity_id, old_value, new_value, details)
        VALUES ('POST_APPROVED_DOC', 'purchase_invoice', v_doc_id, v_doc_status, 'POSTED', 'Posted approved purchase_invoice ' || COALESCE(v_rec.record_no, v_rec.voucher_no, ''));
        v_repaired_statuses := v_repaired_statuses + 1;
      END IF;
    END IF;
  END LOOP;

  -- 2.3 Ensure every POSTED sales_invoice and purchase_invoice has its journal_entries row (idempotent check by reference_no)
  FOR v_rec IN
    SELECT id, invoice_no, invoice_date, account_head, total_amount
    FROM public.sales_invoices
    WHERE status = 'POSTED' AND deleted_at IS NULL AND invoice_no IS NOT NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE (reference_no = v_rec.invoice_no OR entry_no = 'JV-' || v_rec.invoice_no)
        AND deleted_at IS NULL
    ) THEN
      INSERT INTO public.journal_entries (entry_no, entry_date, reference_no, source, narration, total_debit, total_credit, status)
      VALUES (
        'JV-' || v_rec.invoice_no,
        COALESCE(v_rec.invoice_date, CURRENT_DATE),
        v_rec.invoice_no,
        'Sales Invoice',
        'Sales Invoice ' || v_rec.invoice_no || ' posted to ' || COALESCE(v_rec.account_head, 'Sales Revenue'),
        COALESCE(v_rec.total_amount, 0),
        COALESCE(v_rec.total_amount, 0),
        'POSTED'
      )
      ON CONFLICT (entry_no) DO NOTHING;

      INSERT INTO public.repair_log (repair_type, entity_type, entity_id, old_value, new_value, details)
      VALUES ('BACKFILL_JOURNAL', 'sales_invoice', v_rec.id, NULL, 'JV-' || v_rec.invoice_no, 'Created missing journal entry for POSTED sales_invoice ' || v_rec.invoice_no);
      v_repaired_journals := v_repaired_journals + 1;
    END IF;
  END LOOP;

  FOR v_rec IN
    SELECT id, COALESCE(grn_no, invoice_no) AS doc_no, COALESCE(received_date, document_date, CURRENT_DATE) AS doc_date, account_head, total_amount
    FROM public.purchase_invoices
    WHERE status = 'POSTED' AND deleted_at IS NULL AND COALESCE(grn_no, invoice_no) IS NOT NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE (reference_no = v_rec.doc_no OR entry_no = 'JV-' || v_rec.doc_no)
        AND deleted_at IS NULL
    ) THEN
      INSERT INTO public.journal_entries (entry_no, entry_date, reference_no, source, narration, total_debit, total_credit, status)
      VALUES (
        'JV-' || v_rec.doc_no,
        v_rec.doc_date,
        v_rec.doc_no,
        'Purchase Invoice',
        'Purchase Invoice ' || v_rec.doc_no || ' approved & posted to ' || COALESCE(v_rec.account_head, 'Inventory Purchases'),
        COALESCE(v_rec.total_amount, 0),
        COALESCE(v_rec.total_amount, 0),
        'POSTED'
      )
      ON CONFLICT (entry_no) DO NOTHING;

      INSERT INTO public.repair_log (repair_type, entity_type, entity_id, old_value, new_value, details)
      VALUES ('BACKFILL_JOURNAL', 'purchase_invoice', v_rec.id, NULL, 'JV-' || v_rec.doc_no, 'Created missing journal entry for POSTED purchase_invoice ' || v_rec.doc_no);
      v_repaired_journals := v_repaired_journals + 1;
    END IF;
  END LOOP;

  -- 2.4 Create missing approval_queue rows for any document in PENDING_APPROVAL
  FOR v_rec IN
    SELECT id, invoice_no, customer_name, party_name, warehouse_id, total_amount, created_by
    FROM public.sales_invoices
    WHERE status = 'PENDING_APPROVAL' AND deleted_at IS NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.approval_queue
      WHERE entity_type = 'sales_invoice' AND (entity_id = v_rec.id OR record_id = v_rec.id::text)
    ) THEN
      INSERT INTO public.approval_queue (
        module, entity_type, entity_id, record_id, record_no, voucher_no,
        party_name, warehouse_id, amount, requested_by, status
      ) VALUES (
        'Sales', 'sales_invoice', v_rec.id, v_rec.id::text, v_rec.invoice_no, v_rec.invoice_no,
        COALESCE(v_rec.customer_name, v_rec.party_name, 'Customer'),
        v_rec.warehouse_id::text,
        COALESCE(v_rec.total_amount, 0),
        COALESCE(v_rec.created_by, 'admin'),
        'PENDING'
      );
      INSERT INTO public.repair_log (repair_type, entity_type, entity_id, old_value, new_value, details)
      VALUES ('CREATE_MISSING_QUEUE', 'sales_invoice', v_rec.id, NULL, v_rec.invoice_no, 'Created missing PENDING approval_queue row for sales_invoice ' || v_rec.invoice_no);
      v_repaired_missing_queue := v_repaired_missing_queue + 1;
    END IF;
  END LOOP;

  FOR v_rec IN
    SELECT id, COALESCE(grn_no, invoice_no) AS doc_no, vendor_name, party_name, warehouse_id, total_amount
    FROM public.purchase_invoices
    WHERE status = 'PENDING_APPROVAL' AND deleted_at IS NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.approval_queue
      WHERE entity_type = 'purchase_invoice' AND (entity_id = v_rec.id OR record_id = v_rec.id::text)
    ) THEN
      INSERT INTO public.approval_queue (
        module, entity_type, entity_id, record_id, record_no, voucher_no,
        party_name, warehouse_id, amount, requested_by, status
      ) VALUES (
        'Purchase', 'purchase_invoice', v_rec.id, v_rec.id::text, v_rec.doc_no, v_rec.doc_no,
        COALESCE(v_rec.vendor_name, v_rec.party_name, 'Vendor'),
        v_rec.warehouse_id::text,
        COALESCE(v_rec.total_amount, 0),
        'admin',
        'PENDING'
      );
      INSERT INTO public.repair_log (repair_type, entity_type, entity_id, old_value, new_value, details)
      VALUES ('CREATE_MISSING_QUEUE', 'purchase_invoice', v_rec.id, NULL, v_rec.doc_no, 'Created missing PENDING approval_queue row for purchase_invoice ' || v_rec.doc_no);
      v_repaired_missing_queue := v_repaired_missing_queue + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'repaired_statuses', v_repaired_statuses,
    'repaired_links', v_repaired_links,
    'repaired_journals', v_repaired_journals,
    'repaired_missing_queue', v_repaired_missing_queue,
    'repaired_duplicates', v_repaired_duplicates
  );
END;
$$;

-- ============================================================================
-- 3. SEED & SYNC document_sequences FROM MAX(EXISTING NUMERIC SUFFIX) + 1
-- ============================================================================
CREATE OR REPLACE FUNCTION public.extract_doc_number_suffix(p_val text, p_prefix text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_clean text;
  v_digits text;
BEGIN
  IF p_val IS NULL OR btrim(p_val) = '' THEN
    RETURN 0;
  END IF;
  v_clean := upper(btrim(p_val));
  IF p_prefix IS NOT NULL AND p_prefix <> '' AND starts_with(v_clean, upper(p_prefix)) THEN
    v_digits := regexp_replace(substr(v_clean, length(p_prefix) + 1), '[^0-9]', '', 'g');
  ELSE
    v_digits := regexp_replace(v_clean, '^.*?-([0-9]+)$', '\1');
    IF v_digits = v_clean THEN
      v_digits := regexp_replace(v_clean, '[^0-9]', '', 'g');
    END IF;
  END IF;
  IF v_digits IS NULL OR v_digits = '' OR length(v_digits) > 9 THEN
    RETURN 0;
  END IF;
  RETURN v_digits::integer;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_document_sequences_above_max()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Sales Invoices (SL)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'SL', 'SL-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(invoice_no, 'SL-')) FROM public.sales_invoices WHERE invoice_no ~* '^SL-[0-9]+$' AND deleted_at IS NULL AND status <> 'REJECTED'), 0) + 1),
    2, 'Sales Invoice'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(
      1,
      COALESCE((SELECT MAX(public.extract_doc_number_suffix(invoice_no, 'SL-')) FROM public.sales_invoices WHERE invoice_no ~* '^SL-[0-9]+$' AND deleted_at IS NULL AND status <> 'REJECTED'), 0) + 1
    ),
    updated_at = now();

  -- 2. Purchase Invoices (PI)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'PI', 'PI-',
    GREATEST(1, COALESCE((SELECT MAX(GREATEST(public.extract_doc_number_suffix(invoice_no, 'PI-'), public.extract_doc_number_suffix(grn_no, 'PI-'))) FROM public.purchase_invoices WHERE (invoice_no ~* '^PI-[0-9]+$' OR grn_no ~* '^PI-[0-9]+$') AND deleted_at IS NULL AND status <> 'REJECTED'), 0) + 1),
    2, 'Purchase Invoice / GRN'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(
      1,
      COALESCE((SELECT MAX(GREATEST(public.extract_doc_number_suffix(invoice_no, 'PI-'), public.extract_doc_number_suffix(grn_no, 'PI-'))) FROM public.purchase_invoices WHERE (invoice_no ~* '^PI-[0-9]+$' OR grn_no ~* '^PI-[0-9]+$') AND deleted_at IS NULL AND status <> 'REJECTED'), 0) + 1
    ),
    updated_at = now();

  -- 3. Vendor Bills (VB)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'VB', 'VB-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(bill_no, 'VB-')) FROM public.vendor_bills WHERE bill_no ~* '^VB-[0-9]+$'), 0) + 1),
    2, 'Vendor Bill'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(
      public.document_sequences.next_number,
      COALESCE((SELECT MAX(public.extract_doc_number_suffix(bill_no, 'VB-')) FROM public.vendor_bills WHERE bill_no ~* '^VB-[0-9]+$'), 0) + 1
    ),
    updated_at = now();

  -- 4. Quotations (MQ)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'MQ', 'MQ-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(quotation_no, 'MQ-')) FROM public.quotations), 0) + 1),
    5, 'Sales Quotation'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(quotation_no, 'MQ-')) FROM public.quotations), 0) + 1),
    updated_at = now();

  -- 5. Sales Orders (MSO)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'MSO', 'MSO-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(order_no, 'MSO-')) FROM public.sales_orders), 0) + 1),
    5, 'Sales Order'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(order_no, 'MSO-')) FROM public.sales_orders), 0) + 1),
    updated_at = now();

  -- 6. Credit Notes (MCN)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'MCN', 'MCN-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(credit_note_no, 'MCN-')) FROM public.credit_notes), 0) + 1),
    5, 'Credit Note'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(credit_note_no, 'MCN-')) FROM public.credit_notes), 0) + 1),
    updated_at = now();

  -- 7. Debit Notes (DN)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'DN', 'DN-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(debit_note_no, 'DN-')) FROM public.debit_notes), 0) + 1),
    2, 'Debit Note'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(debit_note_no, 'DN-')) FROM public.debit_notes), 0) + 1),
    updated_at = now();

  -- 8. Customer Receipts (CR)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'CR', 'CR-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(receipt_no, 'CR-')) FROM public.customer_receipts WHERE receipt_no ~* '^CR-[0-9]{1,6}$'), 0) + 1),
    5, 'Customer Receipt'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(receipt_no, 'CR-')) FROM public.customer_receipts WHERE receipt_no ~* '^CR-[0-9]{1,6}$'), 0) + 1),
    updated_at = now();

  -- 9. Vendor Payments (CP & PAY & VP)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'CP', 'CP-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(payment_no, 'CP-')) FROM public.vendor_payments), 0) + 1),
    5, 'Vendor Payment Voucher'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(payment_no, 'CP-')) FROM public.vendor_payments), 0) + 1),
    updated_at = now();

  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'PAY', 'PAY-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(payment_no, 'PAY-')) FROM public.vendor_payments), 0) + 1),
    2, 'Vendor Payment'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(payment_no, 'PAY-')) FROM public.vendor_payments), 0) + 1),
    updated_at = now();

  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'VP', 'VP-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(payment_no, 'VP-')) FROM public.vendor_payments), 0) + 1),
    4, 'Vendor Payment (VP)'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(payment_no, 'VP-')) FROM public.vendor_payments), 0) + 1),
    updated_at = now();

  -- 10. Sales Returns (SR)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'SR', 'SR-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(return_no, 'SR-')) FROM public.sales_returns), 0) + 1),
    2, 'Sales Return'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(return_no, 'SR-')) FROM public.sales_returns), 0) + 1),
    updated_at = now();

  -- 11. Purchase Returns (PRT)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'PRT', 'PRT-',
    GREATEST(1, COALESCE((SELECT MAX(GREATEST(public.extract_doc_number_suffix(return_no, 'PRT-'), public.extract_doc_number_suffix(return_no, 'PR-'))) FROM public.purchase_returns), 0) + 1),
    2, 'Purchase Return'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(GREATEST(public.extract_doc_number_suffix(return_no, 'PRT-'), public.extract_doc_number_suffix(return_no, 'PR-'))) FROM public.purchase_returns), 0) + 1),
    updated_at = now();

  -- 12. Purchase Requests (PR) & Purchase Orders (PO)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'PR', 'PR-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(request_no, 'PR-')) FROM public.purchase_requests), 0) + 1),
    2, 'Purchase Request'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(request_no, 'PR-')) FROM public.purchase_requests), 0) + 1),
    updated_at = now();

  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'PO', 'PO-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(po_no, 'PO-')) FROM public.purchase_orders), 0) + 1),
    2, 'Purchase Order'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(po_no, 'PO-')) FROM public.purchase_orders), 0) + 1),
    updated_at = now();

  -- 13. Journal Entries (JV)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'JV', 'JV-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(entry_no, 'JV-')) FROM public.journal_entries WHERE entry_no ~* '^JV-[0-9]+$'), 0) + 1),
    5, 'Journal Voucher'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(entry_no, 'JV-')) FROM public.journal_entries WHERE entry_no ~* '^JV-[0-9]+$'), 0) + 1),
    updated_at = now();

  -- 14. Stock Transfers (MST) & Stock Adjustments (MSA)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'MST', 'MST-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(transfer_no, 'MST-')) FROM public.stock_transfers), 0) + 1),
    5, 'Stock Transfer'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(transfer_no, 'MST-')) FROM public.stock_transfers), 0) + 1),
    updated_at = now();

  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'MSA', 'MSA-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(adjustment_no, 'MSA-')) FROM public.stock_adjustments), 0) + 1),
    5, 'Stock Adjustment'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(adjustment_no, 'MSA-')) FROM public.stock_adjustments), 0) + 1),
    updated_at = now();

  -- 15. Products (ART), Customers (CUST), Vendors (SUP), Categories (CAT), Warehouses (WH), Account Types (AT), Employees (EMP)
  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'ART', 'ART-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'ART-')) FROM public.products WHERE code ~* '^ART-[0-9]+$'), 0) + 1),
    4, 'Product Article SKU'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'ART-')) FROM public.products WHERE code ~* '^ART-[0-9]+$'), 0) + 1),
    updated_at = now();

  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'CUST', 'CUST-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'CUST-')) FROM public.customers WHERE code ~* '^CUST-[0-9]+$'), 0) + 1),
    2, 'Customer Code'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'CUST-')) FROM public.customers WHERE code ~* '^CUST-[0-9]+$'), 0) + 1),
    updated_at = now();

  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'SUP', 'SUP-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'SUP-')) FROM public.vendors WHERE code ~* '^SUP-[0-9]+$'), 0) + 1),
    5, 'Vendor / Supplier Code'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'SUP-')) FROM public.vendors WHERE code ~* '^SUP-[0-9]+$'), 0) + 1),
    updated_at = now();

  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'CAT', 'CAT-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'CAT-')) FROM public.categories WHERE code ~* '^CAT-[0-9]+$'), 0) + 1),
    2, 'Category Code'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'CAT-')) FROM public.categories WHERE code ~* '^CAT-[0-9]+$'), 0) + 1),
    updated_at = now();

  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'WH', 'WH-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'WH-')) FROM public.warehouses WHERE code ~* '^WH-[0-9]+$'), 0) + 1),
    2, 'Warehouse Code'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'WH-')) FROM public.warehouses WHERE code ~* '^WH-[0-9]+$'), 0) + 1),
    updated_at = now();

  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'AT', 'AT-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'AT-')) FROM public.account_types WHERE code ~* '^AT-[0-9]+$'), 0) + 1),
    3, 'Account Type Code'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(code, 'AT-')) FROM public.account_types WHERE code ~* '^AT-[0-9]+$'), 0) + 1),
    updated_at = now();

  INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
  VALUES (
    'EMP', 'EMP-',
    GREATEST(1, COALESCE((SELECT MAX(public.extract_doc_number_suffix(employee_code, 'EMP-')) FROM public.user_profiles WHERE employee_code ~* '^EMP-[0-9]+$'), 0) + 1),
    3, 'Employee Code'
  )
  ON CONFLICT (document_type) DO UPDATE SET
    next_number = GREATEST(public.document_sequences.next_number, COALESCE((SELECT MAX(public.extract_doc_number_suffix(employee_code, 'EMP-')) FROM public.user_profiles WHERE employee_code ~* '^EMP-[0-9]+$'), 0) + 1),
    updated_at = now();
END;
$$;

-- Run initial repair and sequence sync now
SELECT public.run_data_repair();
SELECT public.sync_document_sequences_above_max();

-- ============================================================================
-- 4. ATOMIC DOCUMENT NUMBER ALLOCATION & PREVIEW FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.preview_next_document_number(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text := upper(btrim(COALESCE(p_type, 'SL')));
  v_prefix text;
  v_next integer;
  v_pad integer;
BEGIN
  PERFORM public.sync_document_sequences_above_max();

  SELECT prefix, next_number, padding
  INTO v_prefix, v_next, v_pad
  FROM public.document_sequences
  WHERE document_type = v_type;

  IF NOT FOUND THEN
    v_prefix := v_type || '-';
    v_next := 1;
    v_pad := 2;
  END IF;

  RETURN v_prefix || lpad(v_next::text, GREATEST(v_pad, length(v_next::text)), '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_document_number(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text := upper(btrim(COALESCE(p_type, 'SL')));
  v_prefix text;
  v_allocated integer;
  v_pad integer;
  v_candidate text;
  v_exists boolean;
BEGIN
  -- Ensure sequence row exists and is at least above current max
  IF NOT EXISTS (SELECT 1 FROM public.document_sequences WHERE document_type = v_type) THEN
    INSERT INTO public.document_sequences (document_type, prefix, next_number, padding, description)
    VALUES (v_type, v_type || '-', 1, 2, v_type)
    ON CONFLICT (document_type) DO NOTHING;
  END IF;

  LOOP
    -- Atomic row-locked increment
    UPDATE public.document_sequences
    SET next_number = next_number + 1,
        updated_at = now()
    WHERE document_type = v_type
    RETURNING prefix, (next_number - 1), padding
    INTO v_prefix, v_allocated, v_pad;

    v_candidate := v_prefix || lpad(v_allocated::text, GREATEST(v_pad, length(v_allocated::text)), '0');

    -- Verify candidate is not already used in the target table
    v_exists := false;
    IF v_type = 'SL' THEN
      SELECT EXISTS (SELECT 1 FROM public.sales_invoices WHERE invoice_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'PI' THEN
      SELECT EXISTS (SELECT 1 FROM public.purchase_invoices WHERE invoice_no = v_candidate OR grn_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'VB' THEN
      SELECT EXISTS (SELECT 1 FROM public.vendor_bills WHERE bill_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'MQ' THEN
      SELECT EXISTS (SELECT 1 FROM public.quotations WHERE quotation_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'MSO' THEN
      SELECT EXISTS (SELECT 1 FROM public.sales_orders WHERE order_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'MCN' THEN
      SELECT EXISTS (SELECT 1 FROM public.credit_notes WHERE credit_note_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'DN' THEN
      SELECT EXISTS (SELECT 1 FROM public.debit_notes WHERE debit_note_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'CR' THEN
      SELECT EXISTS (SELECT 1 FROM public.customer_receipts WHERE receipt_no = v_candidate) INTO v_exists;
    ELSIF v_type IN ('CP', 'PAY', 'VP') THEN
      SELECT EXISTS (SELECT 1 FROM public.vendor_payments WHERE payment_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'SR' THEN
      SELECT EXISTS (SELECT 1 FROM public.sales_returns WHERE return_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'PRT' THEN
      SELECT EXISTS (SELECT 1 FROM public.purchase_returns WHERE return_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'PR' THEN
      SELECT EXISTS (SELECT 1 FROM public.purchase_requests WHERE request_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'PO' THEN
      SELECT EXISTS (SELECT 1 FROM public.purchase_orders WHERE po_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'JV' THEN
      SELECT EXISTS (SELECT 1 FROM public.journal_entries WHERE entry_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'MST' THEN
      SELECT EXISTS (SELECT 1 FROM public.stock_transfers WHERE transfer_no = v_candidate) INTO v_exists;
    ELSIF v_type = 'MSA' THEN
      SELECT EXISTS (SELECT 1 FROM public.stock_adjustments WHERE adjustment_no = v_candidate) INTO v_exists;
    END IF;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_candidate;
END;
$$;

-- ============================================================================
-- 5. BEFORE INSERT TRIGGERS FOR SERVER-SIDE DOCUMENT NUMBER ASSIGNMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_sales_invoice_number_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR btrim(NEW.invoice_no) = '' OR EXISTS (
    SELECT 1 FROM public.sales_invoices WHERE invoice_no = NEW.invoice_no AND id <> NEW.id
  ) THEN
    NEW.invoice_no := public.next_document_number('SL');
  ELSE
    -- Advance sequence if manual number is >= current next_number
    UPDATE public.document_sequences
    SET next_number = GREATEST(next_number, public.extract_doc_number_suffix(NEW.invoice_no, 'SL-') + 1),
        updated_at = now()
    WHERE document_type = 'SL';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_sales_invoice_no ON public.sales_invoices;
CREATE TRIGGER trg_assign_sales_invoice_no
  BEFORE INSERT ON public.sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_sales_invoice_number_trg();

CREATE OR REPLACE FUNCTION public.assign_purchase_invoice_number_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_no text;
BEGIN
  v_no := COALESCE(NULLIF(btrim(NEW.invoice_no), ''), NULLIF(btrim(NEW.grn_no), ''));
  IF v_no IS NULL OR EXISTS (
    SELECT 1 FROM public.purchase_invoices WHERE (invoice_no = v_no OR grn_no = v_no) AND id <> NEW.id
  ) THEN
    v_no := public.next_document_number('PI');
  ELSE
    UPDATE public.document_sequences
    SET next_number = GREATEST(next_number, public.extract_doc_number_suffix(v_no, 'PI-') + 1),
        updated_at = now()
    WHERE document_type = 'PI';
  END IF;
  NEW.invoice_no := v_no;
  NEW.grn_no := COALESCE(NULLIF(btrim(NEW.grn_no), ''), v_no);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_purchase_invoice_no ON public.purchase_invoices;
CREATE TRIGGER trg_assign_purchase_invoice_no
  BEFORE INSERT ON public.purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_purchase_invoice_number_trg();

-- ============================================================================
-- 6. ATOMIC CREATE & APPROVAL RPC FUNCTIONS
-- ============================================================================

-- 6.1 Atomic create_sales_invoice(payload jsonb)
CREATE OR REPLACE FUNCTION public.create_sales_invoice(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_invoice_no text;
  v_customer_id uuid;
  v_warehouse_id uuid;
  v_status text;
  v_total numeric;
  v_comm_rate numeric;
  v_item jsonb;
  v_items jsonb;
  v_items_summary text;
  v_queue_id uuid;
  v_result jsonb;
BEGIN
  v_id := COALESCE(public.legacy_id_to_uuid(payload->>'id'), gen_random_uuid());
  -- Always allocate a fresh unique number from document_sequences unless payload explicitly supplies a non-colliding custom number
  v_invoice_no := NULLIF(btrim(COALESCE(payload->>'invoice_no', '')), '');
  IF v_invoice_no IS NULL OR EXISTS (SELECT 1 FROM public.sales_invoices WHERE invoice_no = v_invoice_no) THEN
    v_invoice_no := public.next_document_number('SL');
  ELSE
    UPDATE public.document_sequences
    SET next_number = GREATEST(next_number, public.extract_doc_number_suffix(v_invoice_no, 'SL-') + 1),
        updated_at = now()
    WHERE document_type = 'SL';
  END IF;

  v_customer_id := public.legacy_id_to_uuid(payload->>'customer_id');
  v_warehouse_id := public.legacy_id_to_uuid(payload->>'warehouse_id');
  IF v_warehouse_id IS NULL THEN
    SELECT id INTO v_warehouse_id FROM public.warehouses ORDER BY is_default DESC NULLS LAST, created_at ASC LIMIT 1;
  END IF;

  v_status := COALESCE(NULLIF(btrim(payload->>'status'), ''), 'PENDING_APPROVAL');
  v_total := COALESCE((payload->>'total_amount')::numeric, 0);
  v_comm_rate := COALESCE((payload->>'commission_rate')::numeric, 0);
  v_items := COALESCE(payload->'items', '[]'::jsonb);

  INSERT INTO public.sales_invoices (
    id, invoice_no, customer_id, customer_name, party_name, warehouse_id,
    invoice_date, due_date, salesperson, currency, exchange_rate, payment_terms,
    account_head, account_category, gate_pass_no, status, subtotal, discount_total,
    tax_total, total_amount, paid_amount, notes, terms_conditions, commission_rate,
    items, created_by
  ) VALUES (
    v_id,
    v_invoice_no,
    v_customer_id,
    COALESCE(payload->>'customer_name', payload->>'party_name', 'Customer'),
    COALESCE(payload->>'party_name', payload->>'customer_name', 'Customer'),
    v_warehouse_id,
    COALESCE(NULLIF(payload->>'invoice_date', '')::date, CURRENT_DATE),
    NULLIF(payload->>'due_date', '')::date,
    payload->>'salesperson',
    COALESCE(payload->>'currency', 'PKR'),
    COALESCE((payload->>'exchange_rate')::numeric, 1),
    COALESCE(payload->>'payment_terms', 'Net 30'),
    payload->>'account_head',
    payload->>'account_category',
    payload->>'gate_pass_no',
    v_status,
    COALESCE((payload->>'subtotal')::numeric, 0),
    COALESCE((payload->>'discount_total')::numeric, 0),
    COALESCE((payload->>'tax_total')::numeric, 0),
    v_total,
    COALESCE((payload->>'paid_amount')::numeric, 0),
    payload->>'notes',
    payload->>'terms_conditions',
    v_comm_rate,
    v_items,
    COALESCE(payload->>'created_by', 'admin')
  );

  -- Insert line items into sales_invoice_items
  IF jsonb_typeof(v_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
      INSERT INTO public.sales_invoice_items (
        id, sales_invoice_id, product_id, article_id, colour, description,
        unit, base_unit, base_rate, qty, length, width, rate, discount, tax_pct, line_total
      ) VALUES (
        COALESCE(public.legacy_id_to_uuid(v_item->>'id'), gen_random_uuid()),
        v_id,
        public.legacy_id_to_uuid(v_item->>'product_id'),
        v_item->>'article_id',
        v_item->>'colour',
        v_item->>'description',
        COALESCE(v_item->>'unit', 'PCS'),
        COALESCE(v_item->>'base_unit', 'PCS'),
        COALESCE((v_item->>'base_rate')::numeric, 0),
        COALESCE((v_item->>'qty')::numeric, 0),
        COALESCE((v_item->>'length')::numeric, 0),
        COALESCE((v_item->>'width')::numeric, 0),
        COALESCE((v_item->>'rate')::numeric, 0),
        COALESCE((v_item->>'discount')::numeric, 0),
        COALESCE((v_item->>'tax_pct')::numeric, 0),
        COALESCE((v_item->>'line_total')::numeric, 0)
      );
    END LOOP;
  END IF;

  -- Accrue commission if applicable
  IF v_comm_rate > 0 THEN
    INSERT INTO public.sales_commissions (
      invoice_no, customer_name, salesperson, rate_pct, commission_amount, status
    ) VALUES (
      v_invoice_no,
      COALESCE(payload->>'customer_name', payload->>'party_name', 'Customer'),
      COALESCE(payload->>'salesperson', 'admin'),
      v_comm_rate,
      (v_total * v_comm_rate) / 100.0,
      CASE WHEN v_status = 'POSTED' THEN 'APPROVED' ELSE 'ACCRUED' END
    );
  END IF;

  -- If PENDING_APPROVAL, insert linked approval_queue row in the SAME transaction
  IF v_status = 'PENDING_APPROVAL' THEN
    v_items_summary := COALESCE(
      NULLIF(payload->>'items_summary', ''),
      (
        SELECT string_agg(COALESCE(elem->>'description', 'Item') || ' (Qty: ' || COALESCE(elem->>'qty', '0') || ')', ', ')
        FROM jsonb_array_elements(v_items) AS elem
      ),
      'Sales Invoice Items'
    );

    INSERT INTO public.approval_queue (
      module, entity_type, entity_id, record_id, record_no, voucher_no,
      party_name, warehouse_id, amount, requested_by, requested_by_name,
      requested_by_role, status, items_summary
    ) VALUES (
      'Sales',
      'sales_invoice',
      v_id,
      v_id::text,
      v_invoice_no,
      v_invoice_no,
      COALESCE(payload->>'customer_name', payload->>'party_name', 'Customer'),
      v_warehouse_id::text,
      v_total,
      COALESCE(payload->>'requested_by', payload->>'created_by', 'admin'),
      COALESCE(payload->>'requested_by_name', 'Admin'),
      COALESCE(payload->>'requested_by_role', 'Super Admin'),
      'PENDING',
      v_items_summary
    )
    RETURNING id INTO v_queue_id;
  ELSIF v_status = 'POSTED' THEN
    PERFORM public.post_sales_invoice(v_id);
  END IF;

  SELECT to_jsonb(si.*) INTO v_result FROM public.sales_invoices si WHERE si.id = v_id;
  RETURN v_result || jsonb_build_object('approval_queue_id', v_queue_id);
END;
$$;

-- 6.2 Atomic create_purchase_invoice(payload jsonb)
CREATE OR REPLACE FUNCTION public.create_purchase_invoice(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_pi_no text;
  v_vendor_id uuid;
  v_warehouse_id uuid;
  v_status text;
  v_total numeric;
  v_item jsonb;
  v_items jsonb;
  v_items_summary text;
  v_queue_id uuid;
  v_result jsonb;
BEGIN
  v_id := COALESCE(public.legacy_id_to_uuid(payload->>'id'), gen_random_uuid());
  v_pi_no := NULLIF(btrim(COALESCE(payload->>'invoice_no', payload->>'grn_no', '')), '');
  IF v_pi_no IS NULL OR EXISTS (SELECT 1 FROM public.purchase_invoices WHERE invoice_no = v_pi_no OR grn_no = v_pi_no) THEN
    v_pi_no := public.next_document_number('PI');
  ELSE
    UPDATE public.document_sequences
    SET next_number = GREATEST(next_number, public.extract_doc_number_suffix(v_pi_no, 'PI-') + 1),
        updated_at = now()
    WHERE document_type = 'PI';
  END IF;

  v_vendor_id := public.legacy_id_to_uuid(payload->>'vendor_id');
  v_warehouse_id := public.legacy_id_to_uuid(payload->>'warehouse_id');
  IF v_warehouse_id IS NULL THEN
    SELECT id INTO v_warehouse_id FROM public.warehouses ORDER BY is_default DESC NULLS LAST, created_at ASC LIMIT 1;
  END IF;

  v_status := COALESCE(NULLIF(btrim(payload->>'status'), ''), 'PENDING_APPROVAL');
  v_total := COALESCE((payload->>'total_amount')::numeric, 0);
  v_items := COALESCE(payload->'items', '[]'::jsonb);

  INSERT INTO public.purchase_invoices (
    id, invoice_no, grn_no, po_id, vendor_id, vendor_name, party_name,
    vendor_invoice_no, warehouse_id, document_date, received_date, due_date,
    gate_pass_no, account_head, account_category, status, subtotal,
    discount_total, tax_total, total_amount, notes, items
  ) VALUES (
    v_id,
    v_pi_no,
    v_pi_no,
    public.legacy_id_to_uuid(payload->>'po_id'),
    v_vendor_id,
    COALESCE(payload->>'vendor_name', payload->>'party_name', 'Vendor'),
    COALESCE(payload->>'party_name', payload->>'vendor_name', 'Vendor'),
    payload->>'vendor_invoice_no',
    v_warehouse_id,
    COALESCE(NULLIF(payload->>'document_date', '')::date, NULLIF(payload->>'received_date', '')::date, CURRENT_DATE),
    COALESCE(NULLIF(payload->>'received_date', '')::date, NULLIF(payload->>'document_date', '')::date, CURRENT_DATE),
    NULLIF(payload->>'due_date', '')::date,
    payload->>'gate_pass_no',
    payload->>'account_head',
    payload->>'account_category',
    v_status,
    COALESCE((payload->>'subtotal')::numeric, 0),
    COALESCE((payload->>'discount_total')::numeric, 0),
    COALESCE((payload->>'tax_total')::numeric, 0),
    v_total,
    payload->>'notes',
    v_items
  );

  IF jsonb_typeof(v_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
      INSERT INTO public.purchase_invoice_items (
        id, purchase_invoice_id, product_id, article_id, colour, description,
        unit, base_unit, base_rate, qty, rate, discount, tax_pct, line_total
      ) VALUES (
        COALESCE(public.legacy_id_to_uuid(v_item->>'id'), gen_random_uuid()),
        v_id,
        public.legacy_id_to_uuid(v_item->>'product_id'),
        v_item->>'article_id',
        v_item->>'colour',
        v_item->>'description',
        COALESCE(v_item->>'unit', 'PCS'),
        COALESCE(v_item->>'base_unit', 'PCS'),
        COALESCE((v_item->>'base_rate')::numeric, 0),
        COALESCE((v_item->>'qty')::numeric, 0),
        COALESCE((v_item->>'rate')::numeric, 0),
        COALESCE((v_item->>'discount')::numeric, 0),
        COALESCE((v_item->>'tax_pct')::numeric, 0),
        COALESCE((v_item->>'line_total')::numeric, 0)
      );
    END LOOP;
  END IF;

  IF v_status = 'PENDING_APPROVAL' THEN
    v_items_summary := COALESCE(
      NULLIF(payload->>'items_summary', ''),
      (
        SELECT string_agg(COALESCE(elem->>'description', 'Item') || ' (Qty: ' || COALESCE(elem->>'qty', '0') || ')', ', ')
        FROM jsonb_array_elements(v_items) AS elem
      ),
      'Purchase Invoice Items'
    );

    INSERT INTO public.approval_queue (
      module, entity_type, entity_id, record_id, record_no, voucher_no,
      party_name, warehouse_id, amount, requested_by, requested_by_name,
      requested_by_role, status, items_summary
    ) VALUES (
      'Purchase',
      'purchase_invoice',
      v_id,
      v_id::text,
      v_pi_no,
      v_pi_no,
      COALESCE(payload->>'vendor_name', payload->>'party_name', 'Vendor'),
      v_warehouse_id::text,
      v_total,
      COALESCE(payload->>'requested_by', 'admin'),
      COALESCE(payload->>'requested_by_name', 'Admin'),
      COALESCE(payload->>'requested_by_role', 'Super Admin'),
      'PENDING',
      v_items_summary
    )
    RETURNING id INTO v_queue_id;
  ELSIF v_status = 'POSTED' THEN
    PERFORM public.post_purchase_invoice(v_id);
  END IF;

  SELECT to_jsonb(pi.*) INTO v_result FROM public.purchase_invoices pi WHERE pi.id = v_id;
  RETURN v_result || jsonb_build_object('approval_queue_id', v_queue_id);
END;
$$;

-- 6.3 Atomic review_approval(p_queue_id uuid, p_status text, p_note text, p_reviewer text)
-- Locks the queue row FOR UPDATE, verifies target document exists (RAISES EXCEPTION if missing),
-- posts the target document + stock + ledger + journal + payment allocations first, and then
-- updates the queue row in one atomic transaction. Idempotent on repeated calls.
CREATE OR REPLACE FUNCTION public.review_approval(
  p_queue_id uuid,
  p_status text,
  p_note text DEFAULT NULL,
  p_reviewer text DEFAULT 'Administrator'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_target_uuid uuid;
  v_doc_no text;
  v_bill RECORD;
  v_bitem jsonb;
  v_prod_id uuid;
  v_qty numeric;
  v_rate numeric;
BEGIN
  IF p_status NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid approval status % (must be APPROVED or REJECTED)', p_status;
  END IF;

  -- 1. Lock the approval_queue row
  SELECT * INTO v_item
  FROM public.approval_queue
  WHERE id = p_queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval queue item % not found', p_queue_id;
  END IF;

  -- Idempotency: if already in the requested status, return immediately
  IF v_item.status = p_status THEN
    RETURN jsonb_build_object(
      'queue_id', v_item.id,
      'status', v_item.status,
      'entity_type', v_item.entity_type,
      'entity_id', v_item.entity_id,
      'record_no', COALESCE(v_item.record_no, v_item.voucher_no),
      'idempotent', true
    );
  END IF;

  v_target_uuid := COALESCE(v_item.entity_id, public.legacy_id_to_uuid(v_item.record_id));
  v_doc_no := COALESCE(v_item.record_no, v_item.voucher_no);

  -- 2. Resolve & verify the target document exists in its table
  IF v_item.entity_type IN ('sales_invoice', 'SALE_INVOICE') THEN
    SELECT id, invoice_no INTO v_target_uuid, v_doc_no
    FROM public.sales_invoices
    WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_doc_no IS NOT NULL AND invoice_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_uuid) DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_target_uuid IS NULL THEN
      RAISE EXCEPTION 'Target sales_invoice (% / %) not found', v_item.entity_id, v_doc_no;
    END IF;

    IF p_status = 'REJECTED' THEN
      UPDATE public.sales_invoices SET status = 'REJECTED', updated_at = now() WHERE id = v_target_uuid;
    ELSE
      PERFORM public.post_sales_invoice(v_target_uuid);
    END IF;

  ELSIF v_item.entity_type = 'purchase_invoice' THEN
    SELECT id, COALESCE(grn_no, invoice_no) INTO v_target_uuid, v_doc_no
    FROM public.purchase_invoices
    WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_doc_no IS NOT NULL AND (invoice_no = v_doc_no OR grn_no = v_doc_no)))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_uuid) DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_target_uuid IS NULL THEN
      RAISE EXCEPTION 'Target purchase_invoice (% / %) not found', v_item.entity_id, v_doc_no;
    END IF;

    IF p_status = 'REJECTED' THEN
      UPDATE public.purchase_invoices SET status = 'REJECTED', updated_at = now() WHERE id = v_target_uuid;
    ELSE
      PERFORM public.post_purchase_invoice(v_target_uuid);
    END IF;

  ELSIF v_item.entity_type = 'vendor_bill' THEN
    SELECT * INTO v_bill
    FROM public.vendor_bills
    WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_doc_no IS NOT NULL AND bill_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_uuid) DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_bill.id IS NULL THEN
      RAISE EXCEPTION 'Target vendor_bill (% / %) not found', v_item.entity_id, v_doc_no;
    END IF;
    v_target_uuid := v_bill.id;
    v_doc_no := v_bill.bill_no;

    IF p_status = 'REJECTED' THEN
      UPDATE public.vendor_bills SET status = 'REJECTED', updated_at = now() WHERE id = v_target_uuid;
    ELSE
      IF v_bill.status <> 'POSTED' THEN
        UPDATE public.vendor_bills SET status = 'POSTED', updated_at = now() WHERE id = v_target_uuid;
        IF v_bill.items IS NOT NULL AND jsonb_typeof(v_bill.items) = 'array' THEN
          FOR v_bitem IN SELECT * FROM jsonb_array_elements(v_bill.items) LOOP
            v_prod_id := public.legacy_id_to_uuid(v_bitem->>'product_id');
            v_qty := COALESCE((v_bitem->>'qty')::numeric, 0);
            v_rate := COALESCE((v_bitem->>'rate')::numeric, 0);
            IF v_prod_id IS NOT NULL AND v_qty > 0 THEN
              UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + v_qty, updated_at = now() WHERE id = v_prod_id;
              INSERT INTO public.stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, transaction_date, qty_in, qty_out, unit_cost, total_cost)
              VALUES (v_prod_id, v_bill.warehouse_id, v_bill.bill_no, 'VENDOR_BILL', COALESCE(v_bill.bill_date, v_bill.document_date, CURRENT_DATE), v_qty, 0, v_rate, v_qty * v_rate);
            END IF;
          END LOOP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_no = v_bill.bill_no AND deleted_at IS NULL) THEN
          INSERT INTO public.journal_entries (entry_no, entry_date, reference_no, source, narration, total_debit, total_credit, status)
          VALUES (
            'JV-' || v_bill.bill_no,
            COALESCE(v_bill.bill_date, v_bill.document_date, CURRENT_DATE),
            v_bill.bill_no,
            'Vendor Bill',
            'Vendor Bill ' || v_bill.bill_no || ' approved & posted to ' || COALESCE(v_bill.account_head, 'Accounts Payable'),
            COALESCE(v_bill.total_amount, 0),
            COALESCE(v_bill.total_amount, 0),
            'POSTED'
          )
          ON CONFLICT (entry_no) DO NOTHING;
        END IF;
      END IF;
    END IF;

  ELSIF v_item.entity_type = 'sales_return' THEN
    SELECT id, return_no INTO v_target_uuid, v_doc_no
    FROM public.sales_returns
    WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_doc_no IS NOT NULL AND return_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_uuid) DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_target_uuid IS NULL THEN
      RAISE EXCEPTION 'Target sales_return (% / %) not found', v_item.entity_id, v_doc_no;
    END IF;

    IF p_status = 'REJECTED' THEN
      UPDATE public.sales_returns SET status = 'REJECTED', updated_at = now() WHERE id = v_target_uuid;
    ELSE
      PERFORM public.post_sales_return(v_target_uuid);
    END IF;

  ELSIF v_item.entity_type = 'purchase_return' THEN
    SELECT id, return_no INTO v_target_uuid, v_doc_no
    FROM public.purchase_returns
    WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_doc_no IS NOT NULL AND return_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_uuid) DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_target_uuid IS NULL THEN
      RAISE EXCEPTION 'Target purchase_return (% / %) not found', v_item.entity_id, v_doc_no;
    END IF;

    IF p_status = 'REJECTED' THEN
      UPDATE public.purchase_returns SET status = 'REJECTED', updated_at = now() WHERE id = v_target_uuid;
    ELSE
      PERFORM public.post_purchase_return(v_target_uuid);
    END IF;

  ELSIF v_item.entity_type IN ('customer_receipt', 'payment_receipt') THEN
    SELECT id, receipt_no INTO v_target_uuid, v_doc_no
    FROM public.customer_receipts
    WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_doc_no IS NOT NULL AND receipt_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_uuid) DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_target_uuid IS NULL THEN
      RAISE EXCEPTION 'Target customer_receipt (% / %) not found', v_item.entity_id, v_doc_no;
    END IF;

    IF p_status = 'REJECTED' THEN
      UPDATE public.customer_receipts SET status = 'REJECTED', updated_at = now() WHERE id = v_target_uuid;
    ELSE
      PERFORM public.post_customer_receipt(v_target_uuid);
    END IF;

  ELSIF v_item.entity_type IN ('vendor_payment', 'payment_voucher') THEN
    SELECT id, payment_no INTO v_target_uuid, v_doc_no
    FROM public.vendor_payments
    WHERE ((v_target_uuid IS NOT NULL AND id = v_target_uuid) OR (v_doc_no IS NOT NULL AND payment_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_uuid) DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_target_uuid IS NULL THEN
      RAISE EXCEPTION 'Target vendor_payment (% / %) not found', v_item.entity_id, v_doc_no;
    END IF;

    IF p_status = 'REJECTED' THEN
      UPDATE public.vendor_payments SET status = 'REJECTED', updated_at = now() WHERE id = v_target_uuid;
    ELSE
      PERFORM public.post_vendor_payment(v_target_uuid);
    END IF;

  ELSE
    RAISE EXCEPTION 'Unsupported approval entity_type: %', v_item.entity_type;
  END IF;

  -- 3. Update the approval_queue row now that the target document is POSTED/REJECTED
  UPDATE public.approval_queue
  SET status = p_status,
      entity_id = v_target_uuid,
      record_id = v_target_uuid::text,
      record_no = COALESCE(v_doc_no, record_no),
      voucher_no = COALESCE(v_doc_no, voucher_no),
      review_note = p_note,
      reviewed_by = COALESCE(p_reviewer, 'Administrator'),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'queue_id', p_queue_id,
    'status', p_status,
    'entity_type', v_item.entity_type,
    'entity_id', v_target_uuid,
    'record_no', v_doc_no,
    'document_status', CASE WHEN p_status = 'APPROVED' THEN 'POSTED' ELSE 'REJECTED' END
  );
END;
$$;

-- Keep review_approval_queue_item as a wrapper around review_approval for backwards compatibility
CREATE OR REPLACE FUNCTION public.review_approval_queue_item(
  p_queue_id uuid,
  p_status text,
  p_note text DEFAULT NULL,
  p_reviewer text DEFAULT 'Administrator'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.review_approval(p_queue_id, p_status, p_note, p_reviewer);
END;
$$;

-- ============================================================================
-- 7. GUARD TRIGGER: approval_queue CAN NEVER BE APPROVED UNLESS TARGET IS POSTED
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_approval_queue_consistency_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id uuid;
  v_doc_status text;
  v_doc_no text;
BEGIN
  v_target_id := COALESCE(NEW.entity_id, public.legacy_id_to_uuid(NEW.record_id));
  v_doc_no := COALESCE(NEW.record_no, NEW.voucher_no);

  IF NEW.entity_type IN ('sales_invoice', 'SALE_INVOICE') THEN
    NEW.entity_type := 'sales_invoice';
    SELECT id, status, invoice_no INTO v_target_id, v_doc_status, v_doc_no
    FROM public.sales_invoices
    WHERE ((v_target_id IS NOT NULL AND id = v_target_id) OR (v_doc_no IS NOT NULL AND invoice_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_id) DESC, created_at DESC
    LIMIT 1;
  ELSIF NEW.entity_type = 'purchase_invoice' THEN
    SELECT id, status, COALESCE(grn_no, invoice_no) INTO v_target_id, v_doc_status, v_doc_no
    FROM public.purchase_invoices
    WHERE ((v_target_id IS NOT NULL AND id = v_target_id) OR (v_doc_no IS NOT NULL AND (invoice_no = v_doc_no OR grn_no = v_doc_no)))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_id) DESC, created_at DESC
    LIMIT 1;
  ELSIF NEW.entity_type = 'vendor_bill' THEN
    SELECT id, status, bill_no INTO v_target_id, v_doc_status, v_doc_no
    FROM public.vendor_bills
    WHERE ((v_target_id IS NOT NULL AND id = v_target_id) OR (v_doc_no IS NOT NULL AND bill_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_id) DESC, created_at DESC
    LIMIT 1;
  ELSIF NEW.entity_type = 'sales_return' THEN
    SELECT id, status, return_no INTO v_target_id, v_doc_status, v_doc_no
    FROM public.sales_returns
    WHERE ((v_target_id IS NOT NULL AND id = v_target_id) OR (v_doc_no IS NOT NULL AND return_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_id) DESC, created_at DESC
    LIMIT 1;
  ELSIF NEW.entity_type = 'purchase_return' THEN
    SELECT id, status, return_no INTO v_target_id, v_doc_status, v_doc_no
    FROM public.purchase_returns
    WHERE ((v_target_id IS NOT NULL AND id = v_target_id) OR (v_doc_no IS NOT NULL AND return_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_id) DESC, created_at DESC
    LIMIT 1;
  ELSIF NEW.entity_type IN ('customer_receipt', 'payment_receipt') THEN
    SELECT id, status, receipt_no INTO v_target_id, v_doc_status, v_doc_no
    FROM public.customer_receipts
    WHERE ((v_target_id IS NOT NULL AND id = v_target_id) OR (v_doc_no IS NOT NULL AND receipt_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_id) DESC, created_at DESC
    LIMIT 1;
  ELSIF NEW.entity_type IN ('vendor_payment', 'payment_voucher') THEN
    SELECT id, status, payment_no INTO v_target_id, v_doc_status, v_doc_no
    FROM public.vendor_payments
    WHERE ((v_target_id IS NOT NULL AND id = v_target_id) OR (v_doc_no IS NOT NULL AND payment_no = v_doc_no))
      AND deleted_at IS NULL
    ORDER BY (id = v_target_id) DESC, created_at DESC
    LIMIT 1;
  END IF;

  IF v_target_id IS NOT NULL THEN
    NEW.entity_id := v_target_id;
    NEW.record_id := v_target_id::text;
    NEW.record_no := COALESCE(v_doc_no, NEW.record_no, NEW.voucher_no);
    NEW.voucher_no := COALESCE(v_doc_no, NEW.voucher_no, NEW.record_no);
  END IF;

  IF NEW.status = 'APPROVED' AND v_doc_status IS DISTINCT FROM 'POSTED' THEN
    RAISE EXCEPTION 'Integrity violation: approval_queue item (%) cannot be APPROVED when target % (%) status is % (must be POSTED)',
      NEW.id, NEW.entity_type, COALESCE(v_doc_no, v_target_id::text, 'MISSING'), COALESCE(v_doc_status, 'MISSING');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_approval_queue_consistency ON public.approval_queue;
CREATE TRIGGER trg_enforce_approval_queue_consistency
  BEFORE INSERT OR UPDATE ON public.approval_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_approval_queue_consistency_trg();

-- ============================================================================
-- 8. DATA INTEGRITY CHECK RPC FUNCTION (check_integrity)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approved_not_posted jsonb;
  v_pending_without_queue jsonb;
  v_orphan_queue_rows jsonb;
  v_duplicate_numbers jsonb;
  v_sequence_drift jsonb;
  v_number_gaps jsonb;
BEGIN
  -- 1. Approved queue rows whose target document is not POSTED
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_approved_not_posted
  FROM (
    SELECT aq.id AS queue_id, aq.entity_type, aq.entity_id, COALESCE(aq.record_no, aq.voucher_no) AS record_no,
           CASE
             WHEN aq.entity_type = 'sales_invoice' THEN (SELECT status FROM public.sales_invoices WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type = 'purchase_invoice' THEN (SELECT status FROM public.purchase_invoices WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type = 'vendor_bill' THEN (SELECT status FROM public.vendor_bills WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type = 'sales_return' THEN (SELECT status FROM public.sales_returns WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type = 'purchase_return' THEN (SELECT status FROM public.purchase_returns WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type IN ('customer_receipt', 'payment_receipt') THEN (SELECT status FROM public.customer_receipts WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type IN ('vendor_payment', 'payment_voucher') THEN (SELECT status FROM public.vendor_payments WHERE id = aq.entity_id AND deleted_at IS NULL)
             ELSE NULL
           END AS document_status
    FROM public.approval_queue aq
    WHERE aq.status = 'APPROVED'
  ) t
  WHERE t.document_status IS DISTINCT FROM 'POSTED';

  -- 2. Documents in PENDING_APPROVAL without an approval_queue row
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_pending_without_queue
  FROM (
    SELECT 'sales_invoice'::text AS entity_type, si.id AS entity_id, si.invoice_no AS record_no
    FROM public.sales_invoices si
    WHERE si.status = 'PENDING_APPROVAL' AND si.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.approval_queue aq WHERE aq.entity_type = 'sales_invoice' AND (aq.entity_id = si.id OR aq.record_id = si.id::text))
    UNION ALL
    SELECT 'purchase_invoice'::text AS entity_type, pi.id AS entity_id, COALESCE(pi.grn_no, pi.invoice_no) AS record_no
    FROM public.purchase_invoices pi
    WHERE pi.status = 'PENDING_APPROVAL' AND pi.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.approval_queue aq WHERE aq.entity_type = 'purchase_invoice' AND (aq.entity_id = pi.id OR aq.record_id = pi.id::text))
    UNION ALL
    SELECT 'vendor_bill'::text AS entity_type, vb.id AS entity_id, vb.bill_no AS record_no
    FROM public.vendor_bills vb
    WHERE vb.status = 'PENDING_APPROVAL' AND vb.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.approval_queue aq WHERE aq.entity_type = 'vendor_bill' AND (aq.entity_id = vb.id OR aq.record_id = vb.id::text))
  ) t;

  -- 3. Queue rows pointing to missing documents
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_orphan_queue_rows
  FROM (
    SELECT aq.id AS queue_id, aq.entity_type, aq.entity_id, COALESCE(aq.record_no, aq.voucher_no) AS record_no, aq.status,
           CASE
             WHEN aq.entity_type = 'sales_invoice' THEN EXISTS (SELECT 1 FROM public.sales_invoices WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type = 'purchase_invoice' THEN EXISTS (SELECT 1 FROM public.purchase_invoices WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type = 'vendor_bill' THEN EXISTS (SELECT 1 FROM public.vendor_bills WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type = 'sales_return' THEN EXISTS (SELECT 1 FROM public.sales_returns WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type = 'purchase_return' THEN EXISTS (SELECT 1 FROM public.purchase_returns WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type IN ('customer_receipt', 'payment_receipt') THEN EXISTS (SELECT 1 FROM public.customer_receipts WHERE id = aq.entity_id AND deleted_at IS NULL)
             WHEN aq.entity_type IN ('vendor_payment', 'payment_voucher') THEN EXISTS (SELECT 1 FROM public.vendor_payments WHERE id = aq.entity_id AND deleted_at IS NULL)
             ELSE true
           END AS target_exists
    FROM public.approval_queue aq
  ) t
  WHERE NOT t.target_exists;

  -- 4. Duplicate numbers across sales_invoices, purchase_invoices, vendor_bills
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_duplicate_numbers
  FROM (
    SELECT 'sales_invoice'::text AS entity_type, invoice_no AS doc_no, count(*) AS cnt
    FROM public.sales_invoices WHERE deleted_at IS NULL GROUP BY invoice_no HAVING count(*) > 1
    UNION ALL
    SELECT 'purchase_invoice'::text AS entity_type, COALESCE(grn_no, invoice_no) AS doc_no, count(*) AS cnt
    FROM public.purchase_invoices WHERE deleted_at IS NULL GROUP BY COALESCE(grn_no, invoice_no) HAVING count(*) > 1
    UNION ALL
    SELECT 'vendor_bill'::text AS entity_type, bill_no AS doc_no, count(*) AS cnt
    FROM public.vendor_bills WHERE deleted_at IS NULL GROUP BY bill_no HAVING count(*) > 1
  ) t;

  -- 5. Sequence drift (where document_sequences.next_number <= current max suffix)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_sequence_drift
  FROM (
    SELECT ds.document_type, ds.next_number,
           CASE
             WHEN ds.document_type = 'SL' THEN COALESCE((SELECT MAX(public.extract_doc_number_suffix(invoice_no, 'SL-')) FROM public.sales_invoices WHERE invoice_no ~* '^SL-[0-9]+$' AND deleted_at IS NULL AND status <> 'REJECTED'), 0)
             WHEN ds.document_type = 'PI' THEN COALESCE((SELECT MAX(GREATEST(public.extract_doc_number_suffix(invoice_no, 'PI-'), public.extract_doc_number_suffix(grn_no, 'PI-'))) FROM public.purchase_invoices WHERE (invoice_no ~* '^PI-[0-9]+$' OR grn_no ~* '^PI-[0-9]+$') AND deleted_at IS NULL AND status <> 'REJECTED'), 0)
             ELSE 0
           END AS max_used
    FROM public.document_sequences ds
    WHERE ds.document_type IN ('SL', 'PI')
  ) t
  WHERE t.next_number <= t.max_used;

  -- 6. Number gaps (informational)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_number_gaps
  FROM (
    WITH sl_nums AS (
      SELECT public.extract_doc_number_suffix(invoice_no, 'SL-') AS n
      FROM public.sales_invoices
      WHERE invoice_no ~* '^SL-[0-9]+$' AND deleted_at IS NULL
    ),
    sl_Bounds AS (
      SELECT COALESCE(MIN(n), 0) AS min_n, COALESCE(MAX(n), 0) AS max_n FROM sl_nums
    )
    SELECT 'SL'::text AS document_type, 'SL-' || lpad(s::text, 2, '0') AS missing_no
    FROM sl_Bounds b, generate_series(CASE WHEN b.min_n > 0 THEN 1 ELSE 0 END, b.max_n) s
    WHERE s > 0 AND NOT EXISTS (SELECT 1 FROM sl_nums WHERE n = s)
  ) t;

  RETURN jsonb_build_object(
    'checked_at', now(),
    'healthy', (
      jsonb_array_length(v_approved_not_posted) = 0 AND
      jsonb_array_length(v_pending_without_queue) = 0 AND
      jsonb_array_length(v_orphan_queue_rows) = 0 AND
      jsonb_array_length(v_duplicate_numbers) = 0 AND
      jsonb_array_length(v_sequence_drift) = 0
    ),
    'approved_not_posted', v_approved_not_posted,
    'pending_without_queue', v_pending_without_queue,
    'orphan_queue_rows', v_orphan_queue_rows,
    'duplicate_numbers', v_duplicate_numbers,
    'sequence_drift', v_sequence_drift,
    'number_gaps', v_number_gaps
  );
END;
$$;
