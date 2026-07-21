/*
# AMKAS ERP — Posting Function & Seed Data

1. New Functions
- post_sales_invoice(p_invoice_id): atomic posting of an unposted sales invoice.
  - Marks invoice POSTED.
  - Debits RECEIVABLE_CONTROL, credits SALE_REVENUE in account_ledger.
  - Writes stock_ledger qty_out entries for each line item.
  - Inserts an approval_queue entry for audit.
  - Updates customer opening balance by the invoice total (as receivable).
  - Raises exception if invoice not found or already posted.
  SECURITY DEFINER so it can run with elevated privileges for atomic writes.

2. Seed Data
- One organization (AMKAS International) + one branch.
- Chart of accounts: Assets (Cash, Bank, Accounts Receivable, Inventory Asset),
  Liabilities (Accounts Payable), Equity (Owner Capital), Income (Sales Revenue,
  Sales Returns), Expense (Cost of Goods Sold, Commission Expense, Inventory Adjustment).
- Control account mappings for all required transaction types.
- 2 warehouses, 4 customers, 3 vendors, 6 products.
- 2 sample unposted sales invoices with line items for immediate testing.

3. Security
- No RLS changes (function runs as SECURITY DEFINER; tables already have anon policies).
*/

-- Ensure control mappings exist before function references them
INSERT INTO control_account_mappings (transaction_type, account_id, description) VALUES
  ('SALE_REVENUE', (SELECT id FROM chart_of_accounts WHERE code = '4000'), 'Sales income account')
ON CONFLICT (transaction_type) DO NOTHING;
INSERT INTO control_account_mappings (transaction_type, account_id, description) VALUES
  ('RECEIVABLE_CONTROL', (SELECT id FROM chart_of_accounts WHERE code = '1200'), 'Accounts Receivable control')
ON CONFLICT (transaction_type) DO NOTHING;
INSERT INTO control_account_mappings (transaction_type, account_id, description) VALUES
  ('CASH_ACCOUNT', (SELECT id FROM chart_of_accounts WHERE code = '1010'), 'Cash in hand')
ON CONFLICT (transaction_type) DO NOTHING;

CREATE OR REPLACE FUNCTION post_sales_invoice(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec RECORD;
  v_ar_account uuid;
  v_sales_account uuid;
  v_inv_account uuid;
  v_cogs_account uuid;
  v_line RECORD;
  v_total numeric;
BEGIN
  SELECT account_id INTO v_ar_account FROM control_account_mappings WHERE transaction_type = 'RECEIVABLE_CONTROL';
  SELECT account_id INTO v_sales_account FROM control_account_mappings WHERE transaction_type = 'SALE_REVENUE';

  IF v_ar_account IS NULL OR v_sales_account IS NULL THEN
    RAISE EXCEPTION 'Control account mappings missing (RECEIVABLE_CONTROL or SALE_REVENUE)';
  END IF;

  SELECT * INTO v_rec FROM sales_invoices WHERE id = p_invoice_id AND status = 'UNPOSTED';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found or already posted';
  END IF;

  v_total := COALESCE(v_rec.total_amount, 0);

  UPDATE sales_invoices SET status = 'POSTED' WHERE id = p_invoice_id;

  INSERT INTO account_ledger (account_id, voucher_no, voucher_type, transaction_date, description, debit, credit, party_id, party_type)
  VALUES
    (v_ar_account, v_rec.invoice_no, 'SALE_INVOICE', v_rec.invoice_date, 'Sales Invoice Posting — ' || v_rec.invoice_no, v_total, 0, v_rec.customer_id, 'CUSTOMER'),
    (v_sales_account, v_rec.invoice_no, 'SALE_INVOICE', v_rec.invoice_date, 'Sales Revenue — ' || v_rec.invoice_no, 0, v_total, v_rec.customer_id, 'CUSTOMER');

  INSERT INTO stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, qty_out, unit_cost)
  SELECT sii.product_id, v_rec.warehouse_id, v_rec.invoice_no, 'SALE_INVOICE', sii.qty, sii.rate
  FROM sales_invoice_items sii
  WHERE sii.sales_invoice_id = p_invoice_id;

  INSERT INTO approval_queue (entity_type, entity_id, voucher_no, amount, requested_by, status)
  VALUES ('SALE_INVOICE', p_invoice_id, v_rec.invoice_no, v_total, COALESCE(v_rec.created_by,'system'), 'PENDING')
  ON CONFLICT DO NOTHING;

  UPDATE customers
  SET opening_balance = COALESCE(opening_balance,0) + v_total
  WHERE id = v_rec.customer_id;
END;
$$;

-- Seed: organization
INSERT INTO organizations (name, legal_name, currency, address, phone, email, tax_id)
SELECT 'AMKAS International', 'AMKAS International (Pvt) Ltd', 'PKR',
       'Plot 14, Industrial Estate, Karachi', '+92-21-111-222-333',
       'info@amkasintl.com', 'NTN-4400000-1'
WHERE NOT EXISTS (SELECT 1 FROM organizations);

-- Seed: branch
INSERT INTO branches (org_id, name, code, address)
SELECT (SELECT id FROM organizations LIMIT 1), 'Head Office', 'HO', 'Karachi'
WHERE NOT EXISTS (SELECT 1 FROM branches);

-- Seed: chart of accounts
INSERT INTO chart_of_accounts (code, name, account_type, account_category, is_control_account)
VALUES
  ('1000','Current Assets','Asset','ASSETS',true),
  ('1010','Cash in Hand','Asset','ASSETS',false),
  ('1020','Bank Accounts','Asset','ASSETS',false),
  ('1200','Accounts Receivable','Asset','ASSETS',true),
  ('1300','Inventory Asset','Asset','ASSETS',true),
  ('2000','Current Liabilities','Liability','LIABILITIES',true),
  ('2100','Accounts Payable','Liability','LIABILITIES',true),
  ('3000','Equity','Equity','EQUITY',true),
  ('3100','Owner Capital','Equity','EQUITY',false),
  ('4000','Sales Revenue','Income','INCOME',false),
  ('4100','Sales Returns','Income','INCOME',false),
  ('5000','Cost of Goods Sold','Expense','EXPENSES',false),
  ('5100','Commission Expense','Expense','EXPENSES',false),
  ('5200','Inventory Adjustment','Expense','EXPENSES',false)
ON CONFLICT (code) DO NOTHING;

-- Seed: warehouses
INSERT INTO warehouses (code, name, branch_id, address)
SELECT 'WH01','Main Warehouse', (SELECT id FROM branches LIMIT 1), 'Karachi Site A'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code='WH01');
INSERT INTO warehouses (code, name, branch_id, address)
SELECT 'WH02','Secondary Store', (SELECT id FROM branches LIMIT 1), 'Karachi Site B'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code='WH02');

-- Seed: customers
INSERT INTO customers (code, name, contact_person, phone, email, address, city, credit_limit, opening_balance, tax_id)
VALUES
  ('C001','Al-Riaz Traders','Riaz Ahmed','0300-1234567','riz@alriaz.com','Main Bazaar','Karachi',500000,0,'NTN-1001'),
  ('C002','Mega Mart','Sara Khan','0321-9876543','sales@megamart.pk','Clifton','Karachi',1000000,25000,'NTN-1002'),
  ('C003','Zafar Brothers','Zafar Iqbal','0333-5551122','info@zafar.com','Anarkali','Lahore',750000,0,'NTN-1003'),
  ('C004','City Textiles','Imran Sheikh','0345-7778899','orders@citytex.pk','Saddar','Rawalpindi',300000,12000,'NTN-1004')
ON CONFLICT (code) DO NOTHING;

-- Seed: vendors
INSERT INTO vendors (code, name, contact_person, phone, email, address, city, credit_limit, opening_balance, tax_id)
VALUES
  ('V001','Faisal Fabrics','Faisal Ali','0301-2223333','faisal@faisalfab.com','Faisalabad','Faisalabad',2000000,0,'NTN-2001'),
  ('V002','Karachi Textile Mills','Aamir Rana','0302-4445555','aamir@ktm.com','SITE','Karachi',1500000,80000,'NTN-2002'),
  ('V003','Lahore Yarn Suppliers','Bilal Cheema','0303-6667777','bilal@lys.pk','Liberty','Lahore',1200000,0,'NTN-2003')
ON CONFLICT (code) DO NOTHING;

-- Seed: products
INSERT INTO products (code, name, category, unit, length, width, purchase_price, sale_price, reorder_level, track_batches, track_serials)
VALUES
  ('P001','Cotton Fabric Roll','Textile','MTR',50,1.5,450,650,100,true,false),
  ('P002','Polyester Yarn','Textile','KG',0,0,180,260,200,false,false),
  ('P003','Denim Jeans','Garments','PCS',0,0,1200,1800,50,true,true),
  ('P004','Silk Scarf','Accessories','PCS',0,0,350,525,80,false,false),
  ('P005','Wool Sweater','Garments','PCS',0,0,950,1450,40,true,true),
  ('P006','Linen Bed Sheet','Home Textile','MTR',2.5,2,780,1150,60,true,false)
ON CONFLICT (code) DO NOTHING;

-- Seed: opening stock
INSERT INTO stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, qty_in, unit_cost, balance_after)
SELECT p.id, w.id, 'OPENING', 'OPENING', 500, p.purchase_price, 500
FROM products p, warehouses w
WHERE w.code='WH01' AND NOT EXISTS (SELECT 1 FROM stock_ledger sl WHERE sl.product_id=p.id AND sl.warehouse_id=w.id AND sl.voucher_type='OPENING');

INSERT INTO stock_ledger (product_id, warehouse_id, voucher_no, voucher_type, qty_in, unit_cost, balance_after)
SELECT p.id, w.id, 'OPENING', 'OPENING', 200, p.purchase_price, 200
FROM products p, warehouses w
WHERE w.code='WH02' AND NOT EXISTS (SELECT 1 FROM stock_ledger sl WHERE sl.product_id=p.id AND sl.warehouse_id=w.id AND sl.voucher_type='OPENING');

-- Seed: sample unposted invoices for testing the post workflow
DO $$
DECLARE
  v_wh uuid := (SELECT id FROM warehouses WHERE code='WH01');
  v_c1 uuid := (SELECT id FROM customers WHERE code='C001');
  v_c2 uuid := (SELECT id FROM customers WHERE code='C002');
  v_p1 uuid := (SELECT id FROM products WHERE code='P001');
  v_p2 uuid := (SELECT id FROM products WHERE code='P003');
  v_p3 uuid := (SELECT id FROM products WHERE code='P006');
  v_inv1 uuid;
  v_inv2 uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sales_invoices WHERE invoice_no='MS-00001') THEN
    v_inv1 := gen_random_uuid();
    INSERT INTO sales_invoices (id, invoice_no, customer_id, warehouse_id, invoice_date, salesperson, currency, payment_terms, gate_pass_no, status, subtotal, discount_total, tax_total, total_amount, created_by)
    VALUES (v_inv1,'MS-00001',v_c1,v_wh,CURRENT_DATE,'Imran (Salesman)','PKR','Net 30','GP-001','UNPOSTED',13000,0,0,13000,'seed');
    INSERT INTO sales_invoice_items (sales_invoice_id, product_id, description, qty, rate, line_total)
    VALUES (v_inv1,v_p1,'Cotton Fabric Roll',10,650,6500),(v_inv1,v_p3,'Linen Bed Sheet',5,1300,6500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM sales_invoices WHERE invoice_no='MS-00002') THEN
    v_inv2 := gen_random_uuid();
    INSERT INTO sales_invoices (id, invoice_no, customer_id, warehouse_id, invoice_date, salesperson, currency, payment_terms, gate_pass_no, status, subtotal, discount_total, tax_total, total_amount, created_by)
    VALUES (v_inv2,'MS-00002',v_c2,v_wh,CURRENT_DATE,'Sara (Salesman)','PKR','Net 15','GP-002','UNPOSTED',3600,100,0,3500,'seed');
    INSERT INTO sales_invoice_items (sales_invoice_id, product_id, description, qty, rate, discount, line_total)
    VALUES (v_inv2,v_p2,'Denim Jeans',2,1800,100,3500);
  END IF;
END $$;