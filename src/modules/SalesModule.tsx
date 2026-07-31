import { useState } from 'react';
import {
  Plus,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  Printer,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  X,
  Trash2,
  Edit,
  ArrowRight,
  Building,
  Layers,
} from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { todayISO } from '@/lib/utils';
import { InvoicePrint } from '@/components/InvoicePrint';
import type { SalesInvoice, Customer, Quotation, SalesOrder, QuotationItem, SalesOrderItem, CreditNote, CreditNoteItem, CustomerReceipt } from '@/lib/types';

export function SalesModule() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const {
    customers = [],
    vendors = [],
    products = [],
    categories = [],
    warehouses = [],
    invoices = [],
    quotations = [],
    salesOrders = [],
    creditNotes = [],
    customerReceipts = [],
    commissions = [],
    organizations = [],
    branches = [],
    bankAccounts = [],
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addQuotation,
    deleteQuotation,
    updateQuotation,
    addSalesOrder,
    deleteSalesOrder,
    updateSalesOrder,
    addCreditNote,
    updateCreditNote,
    deleteCreditNote,
    addCustomerReceipt,
    updateCustomerReceipt,
    deleteCustomerReceipt,
    addCommission,
    updateCommission,
    deleteCommission,
  } = useDataStore();

  const [commFromDate, setCommFromDate] = useState('2026-07-01');
  const [commToDate, setCommToDate] = useState('2026-07-22');

  const [activeSubTab, setActiveSubTab] = useState<
    'Overview' | 'Quotations' | 'Sales Orders' | 'Invoices' | 'Credit Notes' | 'Receipts' | 'Pipeline' | 'Commissions'
  >('Overview');

  // Modals state
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [genericModalOpen, setGenericModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printInvoice, setPrintInvoice] = useState<SalesInvoice | null>(null);

  // Generic Form State
  const [genericCustId, setGenericCustId] = useState('');
  const [genericAmount, setGenericAmount] = useState('1000');
  const [genericNotes, setGenericNotes] = useState('');

  // Rich Sales Document Modal State (Quotations & Sales Orders)
  const [salesDocModalOpen, setSalesDocModalOpen] = useState(false);
  const [salesDocType, setSalesDocType] = useState<'Quotation' | 'Sales Order'>('Quotation');
  const [salesDocEditingId, setSalesDocEditingId] = useState<string | null>(null);
  const [salesDocCustomerId, setSalesDocCustomerId] = useState('');
  const [salesDocDate, setSalesDocDate] = useState(todayISO());
  const [salesDocValidUntil, setSalesDocValidUntil] = useState(todayISO());
  const [salesDocSalesperson, setSalesDocSalesperson] = useState('admin');
  const [salesDocCurrency, setSalesDocCurrency] = useState('PKR');
  const [salesDocExchangeRate, setSalesDocExchangeRate] = useState(1);
  const [salesDocStatus, setSalesDocStatus] = useState('Draft');
  const [salesDocOrgId, setSalesDocOrgId] = useState('');
  const [salesDocBranchId, setSalesDocBranchId] = useState('');
  const [salesDocNotes, setSalesDocNotes] = useState('');

  const [salesDocLineItems, setSalesDocLineItems] = useState<
    { id: string; product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  // Invoice Form State (matching screenshots)
  const [invoiceViewMode, setInvoiceViewMode] = useState<'list' | 'form'>('form');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const [invCustomerId, setInvCustomerId] = useState('');
  const [invDocDate, setInvDocDate] = useState('2026-07-22');
  const [invDueDate, setInvDueDate] = useState('2026-07-29');
  const [invSalesperson, setInvSalesperson] = useState('Unassigned');
  const [invCurrency, setInvCurrency] = useState('PKR');
  const [invExchangeRate, setInvExchangeRate] = useState(1);
  const [invWarehouseId, setInvWarehouseId] = useState('');
  const [invGatePassNo, setInvGatePassNo] = useState('');
  const [invAccountCategory, setInvAccountCategory] = useState('All account categories');
  const [invAccountHead, setInvAccountHead] = useState('Default Sales Revenue');
  const [invCommissionRate, setInvCommissionRate] = useState(0);
  const [invNotes, setInvNotes] = useState('');
  const [invTermsConditions, setInvTermsConditions] = useState('');

  const [invLineItems, setInvLineItems] = useState<
    { id: string; product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  const openCreateInvoiceForm = () => {
    setEditingInvoiceId(null);
    setInvCustomerId(customers[0]?.id || '');
    setInvDocDate(todayISO());
    setInvDueDate(todayISO());
    setInvSalesperson('Unassigned');
    setInvCurrency('PKR');
    setInvExchangeRate(1);
    setInvWarehouseId(warehouses[0]?.id || 'w1');
    setInvGatePassNo('');
    setInvAccountCategory('All account categories');
    setInvAccountHead('Default Sales Revenue');
    setInvCommissionRate(0);
    setInvNotes('');
    setInvTermsConditions('');
    setInvLineItems([
      { id: crypto.randomUUID(), product_id: products[0]?.id || '', description: products[0]?.name || '', qty: 1, rate: products[0]?.sale_price || 0, discount: 0, tax_pct: products[0]?.tax_pct || 0 },
    ]);
    setInvoiceViewMode('form');
  };

  const openEditInvoiceForm = (inv: SalesInvoice) => {
    setEditingInvoiceId(inv.id);
    setInvCustomerId(inv.customer_id || customers[0]?.id || '');
    setInvDocDate(inv.invoice_date || todayISO());
    setInvDueDate(inv.due_date || todayISO());
    setInvSalesperson(inv.salesperson || 'Unassigned');
    setInvCurrency(inv.currency || 'PKR');
    setInvExchangeRate(inv.exchange_rate || 1);
    setInvWarehouseId(inv.warehouse_id || warehouses[0]?.id || 'w1');
    setInvGatePassNo(inv.gate_pass_no || '');
    setInvAccountCategory(inv.account_category || 'All account categories');
    setInvAccountHead(inv.account_head || 'Default Sales Revenue');
    setInvCommissionRate(inv.commission_rate || 0);
    setInvNotes(inv.notes || '');
    setInvTermsConditions(inv.terms_conditions || '');

    if (inv.items && inv.items.length > 0) {
      setInvLineItems(
        inv.items.map((i) => ({
          id: i.id || crypto.randomUUID(),
          product_id: i.product_id || '',
          description: i.description || '',
          qty: i.qty || 1,
          rate: i.rate || 0,
          discount: i.discount || 0,
          tax_pct: i.tax_pct || 0,
        }))
      );
    } else {
      setInvLineItems([
        { id: crypto.randomUUID(), product_id: '', description: '', qty: 1, rate: inv.subtotal || inv.total_amount || 0, discount: inv.discount_total || 0, tax_pct: 0 },
      ]);
    }
    setInvoiceViewMode('form');
  };

  const addInvLineItem = () => {
    setInvLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 },
    ]);
  };

  const updateInvLineItem = (id: string, patch: Partial<(typeof invLineItems)[0]>) => {
    setInvLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...patch };
          if (patch.product_id) {
            const p = products.find((x) => x.id === patch.product_id);
            if (p) {
              updated.description = p.description || p.name;
              updated.rate = p.sale_price;
              updated.tax_pct = p.tax_pct || 0;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeInvLineItem = (id: string) => {
    if (invLineItems.length > 1) {
      setInvLineItems((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const calcInvoiceTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    invLineItems.forEach((l) => {
      const gross = (l.qty || 0) * (l.rate || 0);
      const disc = l.discount || 0;
      const taxable = gross - disc;
      const tax = taxable * ((l.tax_pct || 0) / 100);
      subtotal += gross;
      discountTotal += disc;
      taxTotal += tax;
    });
    const grandTotal = subtotal - discountTotal + taxTotal;
    return { subtotal, discountTotal, taxTotal, grandTotal };
  };

  const handleSaveSalesInvoiceRecord = (status: 'POSTED' | 'UNPOSTED') => {
    if (!invCustomerId) return toast.error('Please select a customer');

    const totals = calcInvoiceTotals();
    const formattedItems = invLineItems.map((item) => {
      const gross = (item.qty || 0) * (item.rate || 0);
      const lineTotal = (gross - (item.discount || 0)) * (1 + (item.tax_pct || 0) / 100);
      return {
        id: item.id,
        sales_invoice_id: editingInvoiceId || '',
        product_id: item.product_id,
        description: item.description,
        qty: item.qty,
        length: 0,
        width: 0,
        rate: item.rate,
        discount: item.discount,
        tax_pct: item.tax_pct,
        line_total: lineTotal,
      };
    });

    if (editingInvoiceId) {
      updateInvoice(editingInvoiceId, {
        customer_id: invCustomerId,
        warehouse_id: invWarehouseId || warehouses[0]?.id || 'w1',
        invoice_date: invDocDate,
        due_date: invDueDate,
        salesperson: invSalesperson,
        currency: invCurrency,
        exchange_rate: invExchangeRate,
        payment_terms: 'Net 30',
        account_head: invAccountHead,
        account_category: invAccountCategory,
        gate_pass_no: invGatePassNo,
        status,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: invNotes,
        terms_conditions: invTermsConditions,
        commission_rate: invCommissionRate,
        items: formattedItems,
      });
      toast.success(`Invoice updated (${status})`);
    } else {
      const invoiceNo = `MS-${String(invoices.length + 1).padStart(5, '0')}`;
      addInvoice({
        invoice_no: invoiceNo,
        customer_id: invCustomerId,
        warehouse_id: invWarehouseId || warehouses[0]?.id || 'w1',
        invoice_date: invDocDate,
        due_date: invDueDate,
        salesperson: invSalesperson,
        currency: invCurrency,
        exchange_rate: invExchangeRate,
        payment_terms: 'Net 30',
        account_head: invAccountHead,
        account_category: invAccountCategory,
        gate_pass_no: invGatePassNo,
        status,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        paid_amount: 0,
        notes: invNotes,
        terms_conditions: invTermsConditions,
        commission_rate: invCommissionRate,
        items: formattedItems,
        created_by: 'admin',
        created_at: new Date().toISOString(),
      });
      toast.success(`Invoice ${invoiceNo} ${status.toLowerCase()}`);
    }

    setInvoiceViewMode('list');
  };

  // Credit Note Form State (matching screenshots)
  const [creditNoteViewMode, setCreditNoteViewMode] = useState<'list' | 'form'>('form');
  const [editingCreditNoteId, setEditingCreditNoteId] = useState<string | null>(null);

  const [cnCustomerId, setCnCustomerId] = useState('');
  const [cnDocDate, setCnDocDate] = useState('2026-07-22');
  const [cnDueDate, setCnDueDate] = useState('2026-07-29');
  const [cnSalesperson, setCnSalesperson] = useState('Unassigned');
  const [cnCurrency, setCnCurrency] = useState('PKR');
  const [cnExchangeRate, setCnExchangeRate] = useState(1);
  const [cnWarehouseId, setCnWarehouseId] = useState('');
  const [cnNotes, setCnNotes] = useState('');
  const [cnTermsConditions, setCnTermsConditions] = useState('');

  const [cnLineItems, setCnLineItems] = useState<
    { id: string; product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  const openCreateCreditNoteForm = () => {
    setEditingCreditNoteId(null);
    setCnCustomerId(customers[0]?.id || '');
    setCnDocDate(todayISO());
    setCnDueDate(todayISO());
    setCnSalesperson('Unassigned');
    setCnCurrency('PKR');
    setCnExchangeRate(1);
    setCnWarehouseId(warehouses[0]?.id || 'w1');
    setCnNotes('');
    setCnTermsConditions('');
    setCnLineItems([
      { id: crypto.randomUUID(), product_id: products[0]?.id || '', description: products[0]?.name || '', qty: 1, rate: products[0]?.sale_price || 0, discount: 0, tax_pct: products[0]?.tax_pct || 0 },
    ]);
    setCreditNoteViewMode('form');
  };

  const openEditCreditNoteForm = (cn: CreditNote) => {
    setEditingCreditNoteId(cn.id);
    setCnCustomerId(cn.customer_id || customers[0]?.id || '');
    setCnDocDate(cn.document_date || cn.note_date || todayISO());
    setCnDueDate(cn.due_date || todayISO());
    setCnSalesperson(cn.salesperson || 'Unassigned');
    setCnCurrency(cn.currency || 'PKR');
    setCnExchangeRate(cn.exchange_rate || 1);
    setCnWarehouseId(cn.warehouse_id || warehouses[0]?.id || 'w1');
    setCnNotes(cn.notes || '');
    setCnTermsConditions(cn.terms_conditions || '');

    if (cn.items && cn.items.length > 0) {
      setCnLineItems(
        cn.items.map((i: CreditNoteItem) => ({
          id: i.id || crypto.randomUUID(),
          product_id: i.product_id || '',
          description: i.description || '',
          qty: i.qty || 1,
          rate: i.rate || 0,
          discount: i.discount || 0,
          tax_pct: i.tax_pct || 0,
        }))
      );
    } else {
      setCnLineItems([
        { id: crypto.randomUUID(), product_id: '', description: '', qty: 1, rate: cn.subtotal || cn.total_amount || 0, discount: cn.discount_total || 0, tax_pct: 0 },
      ]);
    }
    setCreditNoteViewMode('form');
  };

  const addCnLineItem = () => {
    setCnLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 },
    ]);
  };

  const updateCnLineItem = (id: string, patch: Partial<(typeof cnLineItems)[0]>) => {
    setCnLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...patch };
          if (patch.product_id) {
            const p = products.find((x) => x.id === patch.product_id);
            if (p) {
              updated.description = p.description || p.name;
              updated.rate = p.sale_price;
              updated.tax_pct = p.tax_pct || 0;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeCnLineItem = (id: string) => {
    if (cnLineItems.length > 1) {
      setCnLineItems((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const calcCreditNoteTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    cnLineItems.forEach((l) => {
      const gross = (l.qty || 0) * (l.rate || 0);
      const disc = l.discount || 0;
      const taxable = gross - disc;
      const tax = taxable * ((l.tax_pct || 0) / 100);
      subtotal += gross;
      discountTotal += disc;
      taxTotal += tax;
    });
    const grandTotal = subtotal - discountTotal + taxTotal;
    return { subtotal, discountTotal, taxTotal, grandTotal };
  };

  const handleSaveCreditNoteRecord = (status: 'POSTED' | 'UNPOSTED') => {
    if (!cnCustomerId) return toast.error('Please select a customer');

    const totals = calcCreditNoteTotals();
    const formattedItems = cnLineItems.map((item) => {
      const gross = (item.qty || 0) * (item.rate || 0);
      const lineTotal = (gross - (item.discount || 0)) * (1 + (item.tax_pct || 0) / 100);
      return {
        id: item.id,
        credit_note_id: editingCreditNoteId || '',
        product_id: item.product_id,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        discount: item.discount,
        tax_pct: item.tax_pct,
        line_total: lineTotal,
      };
    });

    if (editingCreditNoteId) {
      updateCreditNote(editingCreditNoteId, {
        customer_id: cnCustomerId,
        warehouse_id: cnWarehouseId || warehouses[0]?.id || 'w1',
        note_date: cnDocDate,
        document_date: cnDocDate,
        due_date: cnDueDate,
        salesperson: cnSalesperson,
        currency: cnCurrency,
        exchange_rate: cnExchangeRate,
        status,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: cnNotes,
        terms_conditions: cnTermsConditions,
        items: formattedItems,
      });
      toast.success(`Credit Note updated (${status})`);
    } else {
      const cnNo = `MCN-${String((creditNotes || []).length + 1).padStart(5, '0')}`;
      addCreditNote({
        credit_note_no: cnNo,
        customer_id: cnCustomerId,
        warehouse_id: cnWarehouseId || warehouses[0]?.id || 'w1',
        sales_invoice_id: null,
        note_date: cnDocDate,
        document_date: cnDocDate,
        due_date: cnDueDate,
        salesperson: cnSalesperson,
        currency: cnCurrency,
        exchange_rate: cnExchangeRate,
        status,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: cnNotes,
        terms_conditions: cnTermsConditions,
        items: formattedItems,
        created_at: new Date().toISOString(),
      });
      toast.success(`Credit Note ${cnNo} ${status.toLowerCase()}`);
    }

    setCreditNoteViewMode('list');
  };

  // Customer Receipt Form State (matching screenshot)
  const [receiptViewMode, setReceiptViewMode] = useState<'list' | 'form'>('form');
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);

  const [receiptCustomerId, setReceiptCustomerId] = useState('');
  const [receiptDate, setReceiptDate] = useState('2026-07-22');
  const [receiptDepositTo, setReceiptDepositTo] = useState('Cash in Hand');
  const [receiptAmount, setReceiptAmount] = useState<number | ''>('');
  const [receiptAccountCategory, setReceiptAccountCategory] = useState('Auto select based on selected party');
  const [receiptCurrency, setReceiptCurrency] = useState('PKR');
  const [receiptExchangeRate, setReceiptExchangeRate] = useState(1);
  const [receiptRefNo, setReceiptRefNo] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');

  const openCreateReceiptForm = () => {
    setEditingReceiptId(null);
    setReceiptCustomerId(customers[0]?.id || '');
    setReceiptDate(todayISO());
    setReceiptDepositTo(bankAccounts[0]?.account_name || 'Cash in Hand');
    setReceiptAmount('');
    setReceiptAccountCategory('Auto select based on selected party');
    setReceiptCurrency('PKR');
    setReceiptExchangeRate(1);
    setReceiptRefNo('');
    setReceiptNotes('');
    setReceiptViewMode('form');
  };

  const openEditReceiptForm = (r: CustomerReceipt) => {
    setEditingReceiptId(r.id);
    setReceiptCustomerId(r.customer_id || customers[0]?.id || '');
    setReceiptDate(r.receipt_date || todayISO());
    setReceiptDepositTo(r.deposit_to || bankAccounts[0]?.account_name || 'Cash in Hand');
    setReceiptAmount(r.amount || 0);
    setReceiptAccountCategory('Auto select based on selected party');
    setReceiptCurrency(r.currency || 'PKR');
    setReceiptExchangeRate(1);
    setReceiptRefNo(r.reference_no || '');
    setReceiptNotes(r.notes || '');
    setReceiptViewMode('form');
  };

  const handlePostReceipt = () => {
    if (!receiptCustomerId) return toast.error('Please select a customer');
    if (!receiptAmount || Number(receiptAmount) <= 0) return toast.error('Please enter a valid amount');

    const depositAcc = bankAccounts.find(
      (b) => b.account_name === receiptDepositTo || b.id === receiptDepositTo
    );
    const depositAccId = depositAcc?.id || bankAccounts[0]?.id || 'ba1';

    const amt = Number(receiptAmount);

    if (editingReceiptId) {
      updateCustomerReceipt(editingReceiptId, {
        customer_id: receiptCustomerId,
        receipt_date: receiptDate,
        deposit_to: receiptDepositTo,
        deposit_account_id: depositAccId,
        amount: amt,
        reference_no: receiptRefNo,
        currency: receiptCurrency,
      });
      toast.success('Customer Receipt updated');
    } else {
      const receiptNo = `MCR-${String((customerReceipts || []).length + 1).padStart(5, '0')}`;

      // Smart allocation to oldest outstanding invoices
      let remaining = amt;
      const custInvoices = invoices
        .filter((i) => i.customer_id === receiptCustomerId && (i.status as string) !== 'CANCELLED')
        .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());

      custInvoices.forEach((inv) => {
        if (remaining <= 0) return;
        const due = (inv.total_amount || 0) - (inv.paid_amount || 0);
        if (due > 0) {
          const alloc = Math.min(remaining, due);
          const newPaid = (inv.paid_amount || 0) + alloc;
          remaining -= alloc;
          updateInvoice(inv.id, {
            paid_amount: newPaid,
            status: newPaid >= (inv.total_amount || 0) ? 'POSTED' : inv.status,
          });
        }
      });

      addCustomerReceipt({
        receipt_no: receiptNo,
        customer_id: receiptCustomerId,
        sales_invoice_id: custInvoices[0]?.id || null,
        receipt_date: receiptDate,
        payment_method: receiptDepositTo.includes('Cash') ? 'Cash' : 'Bank Transfer',
        deposit_account_id: depositAccId,
        deposit_to: receiptDepositTo,
        amount: amt,
        reference_no: receiptRefNo || null,
        currency: receiptCurrency,
        status: 'POSTED',
        notes: receiptNotes || null,
        created_at: new Date().toISOString(),
      });

      toast.success(`Customer Receipt ${receiptNo} posted successfully!`);
    }

    setReceiptViewMode('list');
  };

  // Open Create Quotation Form
  const openCreateQuotation = () => {
    setSalesDocType('Quotation');
    setSalesDocEditingId(null);
    setSalesDocCustomerId(customers[0]?.id || '');
    setSalesDocDate(todayISO());
    setSalesDocValidUntil(todayISO());
    setSalesDocSalesperson('admin');
    setSalesDocCurrency('PKR');
    setSalesDocExchangeRate(1);
    setSalesDocStatus('Draft');
    setSalesDocOrgId(organizations[0]?.id || 'org1');
    setSalesDocBranchId(branches[0]?.id || 'b1');
    setSalesDocNotes('');
    setSalesDocLineItems([
      {
        id: crypto.randomUUID(),
        product_id: products[0]?.id || '',
        description: products[0]?.name || '',
        qty: 1,
        rate: products[0]?.sale_price || 0,
        discount: 0,
        tax_pct: products[0]?.tax_pct || 0,
      },
    ]);
    setSalesDocModalOpen(true);
  };

  // Open Edit Quotation Form
  const openEditQuotation = (q: Quotation) => {
    setSalesDocType('Quotation');
    setSalesDocEditingId(q.id);
    setSalesDocCustomerId(q.customer_id || customers[0]?.id || '');
    setSalesDocDate(q.document_date || q.quotation_date || todayISO());
    setSalesDocValidUntil(q.valid_until || todayISO());
    setSalesDocSalesperson(q.salesperson || 'admin');
    setSalesDocCurrency(q.currency || 'PKR');
    setSalesDocExchangeRate(q.exchange_rate || 1);
    setSalesDocStatus(q.status || 'Draft');
    setSalesDocOrgId(q.org_id || organizations[0]?.id || 'org1');
    setSalesDocBranchId(q.branch_id || branches[0]?.id || 'b1');
    setSalesDocNotes(q.notes || '');

    if (q.items && q.items.length > 0) {
      setSalesDocLineItems(
        q.items.map((i) => ({
          id: i.id || crypto.randomUUID(),
          product_id: i.product_id || '',
          description: i.description || '',
          qty: i.qty || 1,
          rate: i.rate || 0,
          discount: i.discount || 0,
          tax_pct: i.tax_pct || 0,
        }))
      );
    } else {
      setSalesDocLineItems([
        {
          id: crypto.randomUUID(),
          product_id: products[0]?.id || '',
          description: products[0]?.name || 'Standard Quotation Line',
          qty: 1,
          rate: q.subtotal || q.total_amount || 0,
          discount: q.discount_total || 0,
          tax_pct: 0,
        },
      ]);
    }
    setSalesDocModalOpen(true);
  };

  // Open Create Sales Order Form
  const openCreateSalesOrder = () => {
    setSalesDocType('Sales Order');
    setSalesDocEditingId(null);
    setSalesDocCustomerId(customers[0]?.id || '');
    setSalesDocDate(todayISO());
    setSalesDocValidUntil(todayISO());
    setSalesDocSalesperson('admin');
    setSalesDocCurrency('PKR');
    setSalesDocExchangeRate(1);
    setSalesDocStatus('Draft');
    setSalesDocOrgId(organizations[0]?.id || 'org1');
    setSalesDocBranchId(branches[0]?.id || 'b1');
    setSalesDocNotes('');
    setSalesDocLineItems([
      {
        id: crypto.randomUUID(),
        product_id: products[0]?.id || '',
        description: products[0]?.name || '',
        qty: 1,
        rate: products[0]?.sale_price || 0,
        discount: 0,
        tax_pct: products[0]?.tax_pct || 0,
      },
    ]);
    setSalesDocModalOpen(true);
  };

  // Open Edit Sales Order Form
  const openEditSalesOrder = (so: SalesOrder) => {
    setSalesDocType('Sales Order');
    setSalesDocEditingId(so.id);
    setSalesDocCustomerId(so.customer_id || customers[0]?.id || '');
    setSalesDocDate(so.document_date || so.order_date || todayISO());
    setSalesDocValidUntil(so.delivery_date || todayISO());
    setSalesDocSalesperson(so.salesperson || 'admin');
    setSalesDocCurrency(so.currency || 'PKR');
    setSalesDocExchangeRate(so.exchange_rate || 1);
    setSalesDocStatus(so.status || 'Draft');
    setSalesDocOrgId(so.org_id || organizations[0]?.id || 'org1');
    setSalesDocBranchId(so.branch_id || branches[0]?.id || 'b1');
    setSalesDocNotes(so.notes || '');

    if (so.items && so.items.length > 0) {
      setSalesDocLineItems(
        so.items.map((i) => ({
          id: i.id || crypto.randomUUID(),
          product_id: i.product_id || '',
          description: i.description || '',
          qty: i.qty || 1,
          rate: i.rate || 0,
          discount: i.discount || 0,
          tax_pct: i.tax_pct || 0,
        }))
      );
    } else {
      setSalesDocLineItems([
        {
          id: crypto.randomUUID(),
          product_id: products[0]?.id || '',
          description: products[0]?.name || 'Standard Order Line',
          qty: 1,
          rate: so.subtotal || so.total_amount || 0,
          discount: so.discount_total || 0,
          tax_pct: 0,
        },
      ]);
    }
    setSalesDocModalOpen(true);
  };

  const openGenericModal = () => {
    setGenericCustId(customers[0]?.id || '');
    setGenericAmount('1000');
    setGenericNotes('');
    setGenericModalOpen(true);
  };

  // Line Item Management for Sales Document Modal
  const addSalesDocLine = () => {
    setSalesDocLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 },
    ]);
  };

  const updateSalesDocLine = (id: string, patch: Partial<(typeof salesDocLineItems)[0]>) => {
    setSalesDocLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...patch };
          if (patch.product_id) {
            const p = products.find((x) => x.id === patch.product_id);
            if (p) {
              updated.description = p.description || p.name;
              updated.rate = p.sale_price;
              updated.tax_pct = p.tax_pct || 0;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeSalesDocLine = (id: string) => {
    if (salesDocLineItems.length > 1) {
      setSalesDocLineItems((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const calcDocTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    salesDocLineItems.forEach((l) => {
      const gross = (l.qty || 0) * (l.rate || 0);
      const disc = l.discount || 0;
      const taxable = gross - disc;
      const tax = taxable * ((l.tax_pct || 0) / 100);
      subtotal += gross;
      discountTotal += disc;
      taxTotal += tax;
    });
    const grandTotal = subtotal - discountTotal + taxTotal;
    return { subtotal, discountTotal, taxTotal, grandTotal };
  };

  const handleSaveSalesDoc = () => {
    if (!salesDocCustomerId) return toast.error('Please select a customer');

    const totals = calcDocTotals();
    const formattedItems = salesDocLineItems.map((item) => {
      const gross = (item.qty || 0) * (item.rate || 0);
      const lineTotal = (gross - (item.discount || 0)) * (1 + (item.tax_pct || 0) / 100);
      return {
        id: item.id,
        product_id: item.product_id,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        discount: item.discount,
        tax_pct: item.tax_pct,
        line_total: lineTotal,
      };
    });

    if (salesDocType === 'Quotation') {
      if (salesDocEditingId) {
        updateQuotation(salesDocEditingId, {
          customer_id: salesDocCustomerId,
          quotation_date: salesDocDate,
          document_date: salesDocDate,
          valid_until: salesDocValidUntil,
          salesperson: salesDocSalesperson,
          currency: salesDocCurrency,
          exchange_rate: salesDocExchangeRate,
          status: salesDocStatus as any,
          subtotal: totals.subtotal,
          discount_total: totals.discountTotal,
          tax_total: totals.taxTotal,
          total_amount: totals.grandTotal,
          notes: salesDocNotes,
          org_id: salesDocOrgId,
          branch_id: salesDocBranchId,
          items: formattedItems,
        });
        toast.success(`Quotation updated successfully!`);
      } else {
        const qNo = `MQ-${String(quotations.length + 1).padStart(5, '0')}`;
        addQuotation({
          quotation_no: qNo,
          customer_id: salesDocCustomerId,
          quotation_date: salesDocDate,
          document_date: salesDocDate,
          valid_until: salesDocValidUntil,
          salesperson: salesDocSalesperson,
          currency: salesDocCurrency,
          exchange_rate: salesDocExchangeRate,
          status: salesDocStatus as any,
          subtotal: totals.subtotal,
          discount_total: totals.discountTotal,
          tax_total: totals.taxTotal,
          total_amount: totals.grandTotal,
          notes: salesDocNotes,
          org_id: salesDocOrgId,
          branch_id: salesDocBranchId,
          items: formattedItems,
          created_at: new Date().toISOString(),
        });
        toast.success(`Quotation ${qNo} created successfully!`);
      }
    } else {
      if (salesDocEditingId) {
        updateSalesOrder(salesDocEditingId, {
          customer_id: salesDocCustomerId,
          order_date: salesDocDate,
          document_date: salesDocDate,
          delivery_date: salesDocValidUntil,
          salesperson: salesDocSalesperson,
          currency: salesDocCurrency,
          exchange_rate: salesDocExchangeRate,
          status: salesDocStatus as any,
          subtotal: totals.subtotal,
          discount_total: totals.discountTotal,
          tax_total: totals.taxTotal,
          total_amount: totals.grandTotal,
          notes: salesDocNotes,
          org_id: salesDocOrgId,
          branch_id: salesDocBranchId,
          items: formattedItems,
        });
        toast.success(`Sales Order updated successfully!`);
      } else {
        const soNo = `MSO-${String(salesOrders.length + 1).padStart(5, '0')}`;
        addSalesOrder({
          order_no: soNo,
          customer_id: salesDocCustomerId,
          warehouse_id: warehouses[0]?.id || 'w1',
          order_date: salesDocDate,
          document_date: salesDocDate,
          delivery_date: salesDocValidUntil,
          salesperson: salesDocSalesperson,
          currency: salesDocCurrency,
          exchange_rate: salesDocExchangeRate,
          status: salesDocStatus as any,
          subtotal: totals.subtotal,
          discount_total: totals.discountTotal,
          tax_total: totals.taxTotal,
          total_amount: totals.grandTotal,
          notes: salesDocNotes,
          org_id: salesDocOrgId,
          branch_id: salesDocBranchId,
          items: formattedItems,
          created_at: new Date().toISOString(),
        });
        toast.success(`Sales Order ${soNo} created successfully!`);
      }
    }

    setSalesDocModalOpen(false);
  };

  const handleSaveGenericRecord = () => {
    const cust = customers.find((c) => c.id === genericCustId);
    const amountVal = Number(genericAmount) || 1000;

    if (activeSubTab === 'Credit Notes') {
      const cnNo = `MCN-${String(creditNotes.length + 1).padStart(5, '0')}`;
      addCreditNote({
        credit_note_no: cnNo,
        sales_invoice_id: null,
        customer_id: genericCustId,
        note_date: todayISO(),
        reason: genericNotes || 'Sales Return',
        status: 'POSTED',
        total_amount: amountVal,
        created_at: new Date().toISOString(),
      });
      toast.success(`Credit Note ${cnNo} created and added to Credit Notes register!`);
    } else if (activeSubTab === 'Receipts') {
      const rNo = `CR-${String(customerReceipts.length + 1).padStart(5, '0')}`;
      addCustomerReceipt({
        receipt_no: rNo,
        customer_id: genericCustId,
        receipt_date: todayISO(),
        payment_method: 'Cash',
        deposit_account_id: 'Cash in Hand',
        amount: amountVal,
        reference_no: null,
        notes: genericNotes,
        status: 'POSTED',
        created_at: new Date().toISOString(),
      });
      toast.success(`Receipt ${rNo} created and added to Receipts register!`);
    }

    setGenericModalOpen(false);
  };

  const totalInvoicedSum = invoices.reduce((acc, i) => acc + (i.total_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sales Management</h1>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto no-scrollbar whitespace-nowrap">
        {[
          'Overview',
          'Quotations',
          'Sales Orders',
          'Invoices',
          'Credit Notes',
          'Receipts',
          'Pipeline',
          'Commissions',
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab as any)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
              activeSubTab === tab
                ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeSubTab === 'Overview' && (
        <div className="space-y-5">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL INVOICED</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                Rs. {totalInvoicedSum.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">QUOTATIONS</p>
              <p className="mt-1 text-2xl font-extrabold text-amber-500">{quotations.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES ORDERS</p>
              <p className="mt-1 text-2xl font-extrabold text-purple-400">{salesOrders.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CREDIT NOTES</p>
              <p className="mt-1 text-2xl font-extrabold text-rose-500">{creditNotes.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* INVOICES TAB */}
      {activeSubTab === 'Invoices' && (
        <div className="space-y-6">
          {invoiceViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES WORKFLOW</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Invoice register</h2>
                </div>
                <button
                  onClick={openCreateInvoiceForm}
                  className="flex items-center gap-2 btn-primary shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New invoice
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">Number</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No invoices recorded yet. Click New Invoice to create one.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => {
                        const cust = customers.find((c) => c.id === inv.customer_id);
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{inv.invoice_no}</td>
                            <td className="px-4 py-3 text-slate-400">{inv.invoice_date}</td>
                            <td className="px-4 py-3 font-medium text-slate-200">{cust?.name || 'Customer'}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                              {inv.currency || 'Rs.'} {inv.total_amount?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${inv.status === 'POSTED' ? 'bg-amber-500/15 text-amber-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isAdmin && (
                                  <button onClick={() => openEditInvoiceForm(inv)} className="p-1 text-slate-400 hover:text-amber-400" title="Edit Invoice">
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button onClick={() => setPrintInvoice(inv)} className="p-1 text-slate-400 hover:text-white" title="Print Invoice">
                                  <Printer className="h-3.5 w-3.5" />
                                </button>
                                {isAdmin && (
                                  <button onClick={() => { deleteInvoice(inv.id); toast.success('Invoice deleted'); }} className="text-xs text-rose-500 hover:underline">
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* NEW SALES INVOICE FORM (Matching Screenshots 1 & 2) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setInvoiceViewMode('list')}
                  className="text-xs font-semibold text-amber-500 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Invoice Register
                </button>
              </div>

              {/* TOP SECTION: Main Card (Left) & Workflow Card (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Card (Left - 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingInvoiceId ? 'Edit Sales Invoice' : 'New Sales Invoice'}
                  </h2>

                  {/* Row 1: Customer, Document Date, Due Date */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Customer</label>
                      <select
                        value={invCustomerId}
                        onChange={(e) => setInvCustomerId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="">Select customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Document date</label>
                      <input
                        type="date"
                        value={invDocDate}
                        onChange={(e) => setInvDocDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Due date</label>
                      <input
                        type="date"
                        value={invDueDate}
                        onChange={(e) => setInvDueDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Salesperson, Currency, Exchange rate */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Salesperson</label>
                      <select
                        value={invSalesperson}
                        onChange={(e) => setInvSalesperson(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="Unassigned">Unassigned</option>
                        <option value="admin">Admin</option>
                        <option value="Sales Rep 1">Sales Rep 1</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Currency</label>
                      <select
                        value={invCurrency}
                        onChange={(e) => setInvCurrency(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="PKR">PKR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="AED">AED</option>
                        <option value="SAR">SAR</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Exchange rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={invExchangeRate}
                        onChange={(e) => setInvExchangeRate(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Row 3: Warehouse (Full Width) */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Warehouse</label>
                    <select
                      value={invWarehouseId}
                      onChange={(e) => setInvWarehouseId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.code || 'MAIN'} · {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 4: Gate pass number, Account category, Account head */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Gate pass number</label>
                      <input
                        type="text"
                        value={invGatePassNo}
                        onChange={(e) => setInvGatePassNo(e.target.value)}
                        placeholder="Manual gate pass no."
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account category</label>
                      <select
                        value={invAccountCategory}
                        onChange={(e) => setInvAccountCategory(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="All account categories">All account categories</option>
                        <option value="Revenue">Revenue</option>
                        <option value="Income">Income</option>
                        <option value="Sales">Sales</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account head</label>
                      <select
                        value={invAccountHead}
                        onChange={(e) => setInvAccountHead(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="Default Sales Revenue">Default Sales Revenue</option>
                        <option value="Sales Revenue">Sales Revenue</option>
                        <option value="Other Income">Other Income</option>
                      </select>
                      <p className="mt-1 text-[10px] text-slate-400 leading-tight">
                        Choose the account category first, then select the account head.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workflow Card (Right - 1 Column) */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Workflow</h3>

                    {/* Mint Green Notice Box */}
                    <div className="rounded-xl bg-amber-500/10 p-4 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs leading-relaxed border border-amber-500/20 dark:border-amber-500/20">
                      Posting this document updates customer balances, the general ledger and inventory immediately.
                    </div>

                    {/* Commission rate % */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Commission rate %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={invCommissionRate}
                        onChange={(e) => setInvCommissionRate(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Key-Value Details */}
                    <div className="space-y-2.5 pt-2 text-xs">
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Organization</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">AMKAS INTERNATIONAL</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Branch</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">All branches</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Number</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {editingInvoiceId ? 'MS-' + editingInvoiceId.slice(0, 5) : 'Assigned on save'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setInvoiceViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSalesInvoiceRecord('POSTED')}
                      className="btn-primary"
                    >
                      Save & Post
                    </button>
                  </div>
                </div>
              </div>

              {/* MIDDLE SECTION: Line Items Card (Full Width) */}
              <div className="card p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 font-heading">LINE ITEMS</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Products and services</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addInvLineItem}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                  >
                    + Add line
                  </button>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-4 py-3 min-w-[200px]">PRODUCT</th>
                        <th className="px-4 py-3 min-w-[220px]">DESCRIPTION</th>
                        <th className="px-4 py-3 w-36 text-center">QTY</th>
                        <th className="px-4 py-3 w-28">RATE</th>
                        <th className="px-4 py-3 w-28">DISCOUNT</th>
                        <th className="px-4 py-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/30">
                      {invLineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          {/* Product */}
                          <td className="p-3">
                            <select
                              value={item.product_id}
                              onChange={(e) => updateInvLineItem(item.id, { product_id: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Description */}
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateInvLineItem(item.id, { description: e.target.value })}
                              placeholder="Optional description"
                              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                            />
                          </td>

                          {/* Qty with - / + buttons */}
                          <td className="p-3">
                            <div className="flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                              <button
                                type="button"
                                onClick={() => updateInvLineItem(item.id, { qty: Math.max(1, (item.qty || 1) - 1) })}
                                className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => updateInvLineItem(item.id, { qty: Number(e.target.value) })}
                                className="w-12 text-center text-xs font-mono font-medium text-slate-800 dark:text-slate-100 bg-transparent outline-none border-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateInvLineItem(item.id, { qty: (item.qty || 0) + 1 })}
                                className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Rate */}
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateInvLineItem(item.id, { rate: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                            />
                          </td>

                          {/* Discount */}
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateInvLineItem(item.id, { discount: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                            />
                          </td>

                          {/* Delete */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeInvLineItem(item.id)}
                              className="text-slate-400 hover:text-rose-500 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Summary Grid (SUBTOTAL, DISCOUNT, TAX, GRAND TOTAL) */}
                {(() => {
                  const t = calcInvoiceTotals();
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-center divide-x divide-slate-200 dark:divide-slate-800">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SUBTOTAL</p>
                        <p className="mt-1 text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                          Rs. {t.subtotal.toFixed(2)}
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DISCOUNT</p>
                        <p className="mt-1 text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                          Rs. {t.discountTotal.toFixed(2)}
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TAX</p>
                        <p className="mt-1 text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                          Rs. {t.taxTotal.toFixed(2)}
                        </p>
                      </div>

                      {/* Grand Total Box */}
                      <div className="grand-total-box">
                        <p className="grand-total-label">GRAND TOTAL</p>
                        <p className="grand-total-value">
                          Rs. {t.grandTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* BOTTOM SECTION: Notes & Terms & Conditions Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Notes</label>
                    <textarea
                      rows={4}
                      value={invNotes}
                      onChange={(e) => setInvNotes(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Terms & conditions</label>
                    <textarea
                      rows={4}
                      value={invTermsConditions}
                      onChange={(e) => setInvTermsConditions(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QUOTATIONS TAB */}
      {activeSubTab === 'Quotations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Quotations register</h2>
            </div>
            <button
              onClick={openCreateQuotation}
              className="flex items-center gap-2 btn-primary shadow-sm"
            >
              <Plus className="h-4 w-4" /> New quotation
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Quotation No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Salesperson</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No quotations recorded yet. Click New Quotation to create one.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => {
                    const cust = customers.find((c) => c.id === q.customer_id);
                    const curr = q.currency || 'PKR';
                    return (
                      <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{q.quotation_no}</td>
                        <td className="px-4 py-3 text-slate-400">{q.document_date || q.quotation_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{cust?.name || 'Customer'}</td>
                        <td className="px-4 py-3 text-slate-400">{q.salesperson || 'admin'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                          {curr} {q.total_amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            (q.status as string) === 'Accepted' || q.status === 'CONFIRMED' || q.status === 'APPROVED'
                              ? 'bg-amber-500/15 text-amber-500'
                              : (q.status as string) === 'Sent'
                              ? 'bg-purple-500/10 text-purple-300'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditQuotation(q)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition"
                              title="Edit Quotation"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            {!q.converted_to_order && (
                              <button
                                onClick={() => {
                                  const orderNo = `MSO-${String(salesOrders.length + 1).padStart(5, '0')}`;
                                  addSalesOrder({
                                    order_no: orderNo,
                                    customer_id: q.customer_id,
                                    order_date: todayISO(),
                                    document_date: q.document_date || todayISO(),
                                    delivery_date: q.valid_until,
                                    salesperson: q.salesperson,
                                    currency: q.currency || 'PKR',
                                    exchange_rate: q.exchange_rate || 1,
                                    status: 'CONFIRMED',
                                    subtotal: q.subtotal,
                                    discount_total: q.discount_total || 0,
                                    tax_total: q.tax_total,
                                    total_amount: q.total_amount,
                                    notes: q.notes,
                                    quotation_id: q.id,
                                    org_id: q.org_id,
                                    branch_id: q.branch_id,
                                    items: q.items || [],
                                    converted_to_invoice: false,
                                    created_at: new Date().toISOString(),
                                  });
                                  updateQuotation(q.id, { converted_to_order: true, status: 'APPROVED' });
                                  toast.success(`Quotation converted → Sales Order ${orderNo}`);
                                  setActiveSubTab('Sales Orders');
                                }}
                                className="flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 hover:bg-purple-500/20"
                              >
                                <ArrowRight className="h-3 w-3" /> To Order
                              </button>
                            )}
                            {q.converted_to_order && (
                              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">Converted</span>
                            )}
                            <button onClick={() => { deleteQuotation(q.id); toast.success('Quotation deleted'); }} className="text-xs text-rose-500 hover:underline">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SALES ORDERS TAB */}
      {activeSubTab === 'Sales Orders' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES WORKFLOW</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Sales orders register</h2>
            </div>
            <button
              onClick={openCreateSalesOrder}
              className="flex items-center gap-2 btn-primary shadow-sm"
            >
              <Plus className="h-4 w-4" /> New sales order
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Order No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Salesperson</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {salesOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No sales orders recorded yet. Click New Sales Order to create one.
                    </td>
                  </tr>
                ) : (
                  salesOrders.map((so) => {
                    const cust = customers.find((c) => c.id === so.customer_id);
                    const curr = so.currency || 'PKR';
                    return (
                      <tr key={so.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{so.order_no}</td>
                        <td className="px-4 py-3 text-slate-400">{so.document_date || so.order_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{cust?.name || 'Customer'}</td>
                        <td className="px-4 py-3 text-slate-400">{so.salesperson || 'admin'}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                          {curr} {so.total_amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            (so.status as string) === 'Completed' || so.status === 'CONFIRMED' || so.status === 'COMPLETED'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-purple-500/10 text-purple-300'
                          }`}>
                            {so.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditSalesOrder(so)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition"
                              title="Edit Sales Order"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            {!so.converted_to_invoice && (
                              <button
                                onClick={() => {
                                  const invNo = `MS-${String(invoices.length + 1).padStart(5, '0')}`;
                                  addInvoice({
                                    invoice_no: invNo,
                                    customer_id: so.customer_id,
                                    warehouse_id: so.warehouse_id || warehouses[0]?.id || null,
                                    invoice_date: todayISO(),
                                    due_date: todayISO(),
                                    salesperson: so.salesperson,
                                    currency: so.currency || 'PKR',
                                    exchange_rate: so.exchange_rate || 1,
                                    payment_terms: 'Net 30',
                                    account_head: 'Sales Revenue',
                                    gate_pass_no: null,
                                    status: 'UNPOSTED',
                                    subtotal: so.subtotal || so.total_amount,
                                    discount_total: so.discount_total || 0,
                                    tax_total: so.tax_total || 0,
                                    total_amount: so.total_amount,
                                    paid_amount: 0,
                                    notes: so.notes,
                                    created_by: 'admin',
                                    created_at: new Date().toISOString(),
                                  });
                                  updateSalesOrder(so.id, { converted_to_invoice: true, status: 'COMPLETED' });
                                  toast.success(`Sales Order converted → Invoice ${invNo}`);
                                  setActiveSubTab('Invoices');
                                }}
                                className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500 hover:bg-amber-500/20"
                              >
                                <ArrowRight className="h-3 w-3" /> To Invoice
                              </button>
                            )}
                            {so.converted_to_invoice && (
                              <span className="rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">Invoiced</span>
                            )}
                            <button onClick={() => { deleteSalesOrder(so.id); toast.success('Sales Order deleted'); }} className="text-xs text-rose-500 hover:underline">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREDIT NOTES TAB */}
      {activeSubTab === 'Credit Notes' && (
        <div className="space-y-6">
          {creditNoteViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES WORKFLOW</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Credit notes register</h2>
                </div>
                <button
                  onClick={openCreateCreditNoteForm}
                  className="flex items-center gap-2 btn-primary shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New credit note
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">Credit Note No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(creditNotes || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No credit notes recorded yet. Click New Credit Note to create one.
                        </td>
                      </tr>
                    ) : (
                      (creditNotes || []).map((cn) => {
                        const cust = customers.find((c) => c.id === cn.customer_id);
                        return (
                          <tr key={cn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{cn.credit_note_no}</td>
                            <td className="px-4 py-3 text-slate-400">{cn.document_date || cn.note_date}</td>
                            <td className="px-4 py-3 font-medium text-slate-200">{cust?.name || 'Customer'}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-100">
                              {cn.currency || 'Rs.'} {cn.total_amount?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${cn.status === 'POSTED' ? 'bg-amber-500/15 text-amber-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {cn.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditCreditNoteForm(cn)}
                                  className="p-1 text-slate-400 hover:text-amber-400 transition"
                                  title="Edit Credit Note"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    deleteCreditNote(cn.id);
                                    toast.success('Credit Note deleted');
                                  }}
                                  className="text-xs text-rose-500 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* NEW CREDIT NOTE FORM (Matching User Screenshots 1 & 2) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCreditNoteViewMode('list')}
                  className="text-xs font-semibold text-amber-500 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Credit Notes Register
                </button>
              </div>

              {/* TOP SECTION: Main Card (Left) & Workflow Card (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Card (Left - 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingCreditNoteId ? 'Edit Credit Note' : 'New Credit Note'}
                  </h2>

                  {/* Row 1: Customer, Document Date, Due Date */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Customer</label>
                      <select
                        value={cnCustomerId}
                        onChange={(e) => setCnCustomerId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="">Select customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Document date</label>
                      <input
                        type="date"
                        value={cnDocDate}
                        onChange={(e) => setCnDocDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Due date</label>
                      <input
                        type="date"
                        value={cnDueDate}
                        onChange={(e) => setCnDueDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Salesperson, Currency, Exchange rate */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Salesperson</label>
                      <select
                        value={cnSalesperson}
                        onChange={(e) => setCnSalesperson(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="Unassigned">Unassigned</option>
                        <option value="admin">Admin</option>
                        <option value="Sales Rep 1">Sales Rep 1</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Currency</label>
                      <select
                        value={cnCurrency}
                        onChange={(e) => setCnCurrency(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="PKR">PKR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="AED">AED</option>
                        <option value="SAR">SAR</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Exchange rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cnExchangeRate}
                        onChange={(e) => setCnExchangeRate(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Row 3: Warehouse (Full Width) */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Warehouse</label>
                    <select
                      value={cnWarehouseId}
                      onChange={(e) => setCnWarehouseId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.code || 'MAIN'} · {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Workflow Card (Right - 1 Column) */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Workflow</h3>

                    {/* Mint Green Notice Box */}
                    <div className="rounded-xl bg-amber-500/10 p-4 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs leading-relaxed border border-amber-500/20 dark:border-amber-500/20">
                      Posting this document updates customer balances, the general ledger and inventory immediately.
                    </div>

                    {/* Key-Value Details */}
                    <div className="space-y-2.5 pt-2 text-xs">
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Organization</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">AMKAS INTERNATIONAL</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Branch</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">All branches</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Number</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {editingCreditNoteId ? 'MCN-' + editingCreditNoteId.slice(0, 5) : 'Assigned on save'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCreditNoteViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCreditNoteRecord('POSTED')}
                      className="btn-primary"
                    >
                      Save & Post
                    </button>
                  </div>
                </div>
              </div>

              {/* MIDDLE SECTION: Line Items Card (Full Width) */}
              <div className="card p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 font-heading">LINE ITEMS</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Products and services</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addCnLineItem}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                  >
                    + Add line
                  </button>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/80">
                      <tr>
                        <th className="px-4 py-3 min-w-[200px]">PRODUCT</th>
                        <th className="px-4 py-3 min-w-[220px]">DESCRIPTION</th>
                        <th className="px-4 py-3 w-36 text-center">QTY</th>
                        <th className="px-4 py-3 w-28">RATE</th>
                        <th className="px-4 py-3 w-28">DISCOUNT</th>
                        <th className="px-4 py-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/30">
                      {cnLineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          {/* Product */}
                          <td className="p-3">
                            <select
                              value={item.product_id}
                              onChange={(e) => updateCnLineItem(item.id, { product_id: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Description */}
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateCnLineItem(item.id, { description: e.target.value })}
                              placeholder="Optional description"
                              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                            />
                          </td>

                          {/* Qty with - / + buttons */}
                          <td className="p-3">
                            <div className="flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                              <button
                                type="button"
                                onClick={() => updateCnLineItem(item.id, { qty: Math.max(1, (item.qty || 1) - 1) })}
                                className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => updateCnLineItem(item.id, { qty: Number(e.target.value) })}
                                className="w-12 text-center text-xs font-mono font-medium text-slate-800 dark:text-slate-100 bg-transparent outline-none border-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateCnLineItem(item.id, { qty: (item.qty || 0) + 1 })}
                                className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Rate */}
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateCnLineItem(item.id, { rate: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                            />
                          </td>

                          {/* Discount */}
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateCnLineItem(item.id, { discount: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                            />
                          </td>

                          {/* Delete */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeCnLineItem(item.id)}
                              className="text-slate-400 hover:text-rose-500 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Summary Grid (SUBTOTAL, DISCOUNT, TAX, GRAND TOTAL) */}
                {(() => {
                  const t = calcCreditNoteTotals();
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-center divide-x divide-slate-200 dark:divide-slate-800">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SUBTOTAL</p>
                        <p className="mt-1 text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                          Rs. {t.subtotal.toFixed(2)}
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DISCOUNT</p>
                        <p className="mt-1 text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                          Rs. {t.discountTotal.toFixed(2)}
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TAX</p>
                        <p className="mt-1 text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                          Rs. {t.taxTotal.toFixed(2)}
                        </p>
                      </div>

                      {/* Grand Total Box */}
                      <div className="grand-total-box">
                        <p className="grand-total-label">GRAND TOTAL</p>
                        <p className="grand-total-value">
                          Rs. {t.grandTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* BOTTOM SECTION: Notes & Terms & Conditions Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Notes</label>
                    <textarea
                      rows={4}
                      value={cnNotes}
                      onChange={(e) => setCnNotes(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Terms & conditions</label>
                    <textarea
                      rows={4}
                      value={cnTermsConditions}
                      onChange={(e) => setCnTermsConditions(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECEIPTS TAB */}
      {activeSubTab === 'Receipts' && (
        <div className="space-y-6">
          {receiptViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES WORKFLOW</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Receipts register</h2>
                </div>
                <button
                  onClick={openCreateReceiptForm}
                  className="flex items-center gap-2 btn-primary shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New receipt
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">Receipt No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Deposit To</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(customerReceipts || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No customer receipts recorded yet. Click New Receipt to record one.
                        </td>
                      </tr>
                    ) : (
                      (customerReceipts || []).map((r) => {
                        const cust = customers.find((c) => c.id === r.customer_id);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{r.receipt_no}</td>
                            <td className="px-4 py-3 text-slate-400">{r.receipt_date}</td>
                            <td className="px-4 py-3 font-medium text-slate-200">{cust?.name || 'Customer'}</td>
                            <td className="px-4 py-3 text-slate-300">{r.deposit_to || r.payment_method}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-amber-400">
                              {r.currency || 'Rs.'} {r.amount?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditReceiptForm(r)}
                                  className="p-1 text-slate-400 hover:text-amber-400 transition"
                                  title="Edit Receipt"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    deleteCustomerReceipt(r.id);
                                    toast.success('Receipt deleted');
                                  }}
                                  className="text-xs text-rose-500 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* RECEIVE PAYMENT FORM (Matching User Screenshot) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setReceiptViewMode('list')}
                  className="text-xs font-semibold text-amber-500 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Receipts Register
                </button>
              </div>

              {/* Title Outside Card */}
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Receive Payment</h1>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Card (Left - 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {editingReceiptId ? 'Edit Payment Receipt' : 'Receive Payment'}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      Use one receipt screen for customers, vendors or direct account heads.
                    </p>
                  </div>

                  {/* Row 1: Received from & Date */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Received from</label>
                      <select
                        value={receiptCustomerId}
                        onChange={(e) => setReceiptCustomerId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="">Select customer, vendor or account</option>
                        <optgroup label="Customers">
                          {customers.filter((c) => c.is_active).map((c) => (
                            <option key={`c-${c.id}`} value={c.id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Vendors">
                          {vendors.filter((v) => v.is_active).map((v) => (
                            <option key={`v-${v.id}`} value={`v-${v.id}`}>
                              {v.name} ({v.code})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Direct Account Heads">
                          <option value="acc-ar">Accounts Receivable</option>
                          <option value="acc-advance">Customer Advances</option>
                          <option value="acc-other">Other Income / Revenue</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Date</label>
                      <input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Deposit to & Amount */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Deposit to</label>
                      <select
                        value={receiptDepositTo || bankAccounts[0]?.account_name || ''}
                        onChange={(e) => setReceiptDepositTo(e.target.value)}
                        className="input"
                      >
                        {bankAccounts.length === 0 ? (
                          <option value="">No bank accounts added in system</option>
                        ) : (
                          bankAccounts.map((b) => (
                            <option key={b.id} value={b.account_name}>
                              {b.account_name} ({b.bank_name})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Amount</label>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={receiptAmount}
                        onChange={(e) => setReceiptAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Row 3: Account head / category & Currency */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account head / category</label>
                      <select
                        value={receiptAccountCategory}
                        onChange={(e) => setReceiptAccountCategory(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="Auto select based on selected party">Auto select based on selected party</option>
                        <option value="Accounts Receivable">Accounts Receivable</option>
                        <option value="Customer Advances">Customer Advances</option>
                        <option value="Accounts Payable">Accounts Payable</option>
                        <option value="Other Income">Other Income</option>
                        <option value="Sales Revenue">Sales Revenue</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Currency</label>
                      <select
                        value={receiptCurrency}
                        onChange={(e) => setReceiptCurrency(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="PKR">PKR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="AED">AED</option>
                        <option value="SAR">SAR</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Exchange rate & Reference number */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Exchange rate</label>
                      <input
                        type="number"
                        value={receiptExchangeRate}
                        onChange={(e) => setReceiptExchangeRate(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Reference number</label>
                      <input
                        type="text"
                        placeholder="Reference number"
                        value={receiptRefNo}
                        onChange={(e) => setReceiptRefNo(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Row 5: Notes Textarea */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes</label>
                    <textarea
                      rows={5}
                      placeholder="Payment notes or remarks"
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Right Card: Posting rules (1 Column) matching screenshot */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Posting rules</h3>

                    {/* Light Emerald Notice Box matching screenshot */}
                    <div className="rounded-xl bg-amber-500/10 p-4 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs leading-relaxed border border-amber-500/20 dark:border-amber-500/20">
                      Customer receipts auto-allocate to outstanding invoices. Vendor/account receipts post directly through the journal with CR numbering.
                    </div>
                  </div>

                  {/* Action Buttons at Bottom Right matching screenshot */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setReceiptViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePostReceipt}
                      className="btn-primary"
                    >
                      Post receipt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PIPELINE TAB */}
      {activeSubTab === 'Pipeline' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SALES PIPELINE</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Deal & Order Pipeline</h2>
            </div>
            <button
              onClick={() => {
                setActiveSubTab('Quotations');
                openCreateQuotation();
              }}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-500/100 transition"
            >
              <Plus className="h-4 w-4" /> New quotation
            </button>
          </div>

          {/* Pipeline Stage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Stage 1: Quotations */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">1. QUOTATIONS</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                  {quotations.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">Pending customer approval</p>
              <div className="space-y-2 pt-2">
                {quotations.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No open quotations</p>
                ) : (
                  quotations.slice(0, 4).map((q) => (
                    <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <p className="text-xs font-bold text-amber-500">{q.quotation_no}</p>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{q.salesperson || 'Salesperson'}</p>
                      <p className="mt-1 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                        Rs. {(q.total_amount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stage 2: Sales Orders */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-500">2. SALES ORDERS</span>
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-500">
                  {salesOrders.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">Confirmed orders</p>
              <div className="space-y-2 pt-2">
                {salesOrders.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No active sales orders</p>
                ) : (
                  salesOrders.slice(0, 4).map((so) => (
                    <div key={so.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <p className="text-xs font-bold text-sky-500">{so.order_no}</p>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{so.salesperson || 'Salesperson'}</p>
                      <p className="mt-1 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                        Rs. {(so.total_amount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stage 3: Invoices */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-500">3. INVOICES</span>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-500">
                  {invoices.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">Billed to customer</p>
              <div className="space-y-2 pt-2">
                {invoices.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No invoices</p>
                ) : (
                  invoices.slice(0, 4).map((inv) => (
                    <div key={inv.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <p className="text-xs font-bold text-purple-500">{inv.invoice_no}</p>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{inv.salesperson || 'Salesperson'}</p>
                      <p className="mt-1 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                        Rs. {(inv.total_amount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stage 4: Closed / Receipts */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">4. RECEIPTS</span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                  {customerReceipts.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">Payments collected</p>
              <div className="space-y-2 pt-2">
                {customerReceipts.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No receipts</p>
                ) : (
                  customerReceipts.slice(0, 4).map((cr) => (
                    <div key={cr.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <p className="text-xs font-bold text-amber-500">{cr.receipt_no}</p>
                      <p className="mt-1 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                        Rs. {(cr.amount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMMISSIONS TAB (Matching User Screenshot) */}
      {activeSubTab === 'Commissions' && (
        <div className="space-y-6">
          {/* Top Filter Bar matching Screenshot */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">From</label>
                <input
                  type="date"
                  value={commFromDate}
                  onChange={(e) => setCommFromDate(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">To</label>
                <input
                  type="date"
                  value={commToDate}
                  onChange={(e) => setCommToDate(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-end self-end">
                <button
                  type="button"
                  onClick={() => toast.success('Commission filters applied')}
                  className="btn-primary"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end">
              <button
                type="button"
                onClick={() => toast.info('Exporting to Excel…')}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={() => toast.info('Exporting to CSV…')}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
              >
                CSV
              </button>
            </div>
          </div>

          {/* 4 Metric Cards Row matching Screenshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: ACCRUED */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ACCRUED</p>
              <p className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                Rs. {commissions.filter(c => c.status === 'ACCRUED').reduce((a, b) => a + (b.commission_amount || 0), 0).toFixed(2)}
              </p>
            </div>

            {/* Card 2: APPROVED */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">APPROVED</p>
              <p className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                Rs. {commissions.filter(c => c.status === 'APPROVED').reduce((a, b) => a + (b.commission_amount || 0), 0).toFixed(2)}
              </p>
            </div>

            {/* Card 3: PAID */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-amber-500">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">PAID</p>
              <p className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                Rs. {commissions.filter(c => c.status === 'PAID').reduce((a, b) => a + (b.commission_amount || 0), 0).toFixed(2)}
              </p>
            </div>

            {/* Card 4: SALESPEOPLE */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 border-l-4 border-l-purple-500">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">SALESPEOPLE</p>
              <p className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {new Set([...commissions.map(c => c.salesperson), ...invoices.map(i => i.salesperson).filter(Boolean)]).size}
              </p>
            </div>
          </div>

          {/* Main Card: Commission Register */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">SALES PERFORMANCE</p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Commission register</h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">DATE</th>
                    <th className="px-4 py-3">INVOICE</th>
                    <th className="px-4 py-3">CUSTOMER</th>
                    <th className="px-4 py-3">SALESPERSON</th>
                    <th className="px-4 py-3">RATE</th>
                    <th className="px-4 py-3">COMMISSION</th>
                    <th className="px-4 py-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        {/* Exact empty state design from screenshot */}
                        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-bold text-xl">
                          %
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No commission entries</p>
                        <p className="mt-1 text-xs text-slate-400">Add a commission rate while posting a sales invoice.</p>
                      </td>
                    </tr>
                  ) : (
                    commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-400">{c.created_at?.slice(0, 10) || todayISO()}</td>
                        <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{c.invoice_no}</td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{c.customer_name}</td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{c.salesperson}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{c.rate_pct}%</td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-500">
                          Rs. {c.commission_amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            c.status === 'PAID' ? 'bg-amber-500/15 text-amber-500' :
                            c.status === 'APPROVED' ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GENERIC SALES MODAL */}
      {genericModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                New {activeSubTab.slice(0, -1)}
              </h3>
              <button onClick={() => setGenericModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Customer</label>
                <select
                  value={genericCustId}
                  onChange={(e) => setGenericCustId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Amount (PKR)</label>
                <input
                  type="number"
                  value={genericAmount}
                  onChange={(e) => setGenericAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={genericNotes}
                  onChange={(e) => setGenericNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setGenericModalOpen(false)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-400">Cancel</button>
              <button onClick={handleSaveGenericRecord} className="btn-primary">Save Record</button>
            </div>
          </div>
        </div>
      )}



      {/* RICH SALES DOCUMENT MODAL (Quotations & Sales Orders) */}
      {salesDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md overflow-y-auto">
          <div className="my-6 w-full max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#151c2c] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {salesDocEditingId ? `Edit ${salesDocType}` : `New ${salesDocType}`}
                  </h3>
                  <p className="text-xs text-slate-400">Complete header details, line items, and workflow information</p>
                </div>
              </div>
              <button
                onClick={() => setSalesDocModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Main Form Area (Left 3 Columns) */}
                <div className="lg:col-span-3 space-y-6">
                  
                  {/* Header Fields Grid */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/30">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Header Details
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      
                      {/* Customer */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">Select Customer *</label>
                        <select
                          value={salesDocCustomerId}
                          onChange={(e) => setSalesDocCustomerId(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">-- Select Customer --</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Document Date */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">Document Date *</label>
                        <input
                          type="date"
                          value={salesDocDate}
                          onChange={(e) => setSalesDocDate(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      {/* Valid Until / Delivery Date */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">
                          {salesDocType === 'Quotation' ? 'Valid Until (date)' : 'Delivery Date'}
                        </label>
                        <input
                          type="date"
                          value={salesDocValidUntil}
                          onChange={(e) => setSalesDocValidUntil(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      {/* Salesperson */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">Salesperson</label>
                        <input
                          type="text"
                          value={salesDocSalesperson}
                          onChange={(e) => setSalesDocSalesperson(e.target.value)}
                          placeholder="Salesperson name..."
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      {/* Currency */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">Currency</label>
                        <select
                          value={salesDocCurrency}
                          onChange={(e) => setSalesDocCurrency(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="PKR">PKR - Pakistani Rupee</option>
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="AED">AED - UAE Dirham</option>
                          <option value="SAR">SAR - Saudi Riyal</option>
                        </select>
                      </div>

                      {/* Exchange Rate */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">Exchange Rate</label>
                        <input
                          type="number"
                          step="0.01"
                          value={salesDocExchangeRate}
                          onChange={(e) => setSalesDocExchangeRate(Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Items Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Line Items
                      </h4>
                      <button
                        type="button"
                        onClick={addSalesDocLine}
                        className="flex items-center gap-1 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-500 hover:bg-amber-500/20 transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> + Add Line Item
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/80">
                          <tr>
                            <th className="px-3 py-2.5 min-w-[170px]">Select Product</th>
                            <th className="px-3 py-2.5 min-w-[180px]">Description</th>
                            <th className="px-3 py-2.5 w-20">Qty</th>
                            <th className="px-3 py-2.5 w-24">Rate</th>
                            <th className="px-3 py-2.5 w-24">Discount</th>
                            <th className="px-3 py-2.5 w-20">Tax %</th>
                            <th className="px-3 py-2.5 w-28 text-right">Total</th>
                            <th className="px-3 py-2.5 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/40">
                          {salesDocLineItems.map((item) => {
                            const gross = (item.qty || 0) * (item.rate || 0);
                            const disc = item.discount || 0;
                            const lineTotal = (gross - disc) * (1 + (item.tax_pct || 0) / 100);

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                {/* Select Product */}
                                <td className="p-2">
                                  <select
                                    value={item.product_id}
                                    onChange={(e) => updateSalesDocLine(item.id, { product_id: e.target.value })}
                                    className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                                  >
                                    <option value="">Select product...</option>
                                    {products.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* Description */}
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => updateSalesDocLine(item.id, { description: e.target.value })}
                                    placeholder="Product description"
                                    className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                                  />
                                </td>

                                {/* Qty */}
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={(e) => updateSalesDocLine(item.id, { qty: Number(e.target.value) })}
                                    className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none font-mono"
                                  />
                                </td>

                                {/* Rate */}
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={item.rate}
                                    onChange={(e) => updateSalesDocLine(item.id, { rate: Number(e.target.value) })}
                                    className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none font-mono"
                                  />
                                </td>

                                {/* Discount */}
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={item.discount}
                                    onChange={(e) => updateSalesDocLine(item.id, { discount: Number(e.target.value) })}
                                    className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none font-mono"
                                  />
                                </td>

                                {/* Tax % */}
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={item.tax_pct}
                                    onChange={(e) => updateSalesDocLine(item.id, { tax_pct: Number(e.target.value) })}
                                    className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none font-mono"
                                  />
                                </td>

                                {/* Total */}
                                <td className="p-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">
                                  {salesDocCurrency} {lineTotal.toFixed(2)}
                                </td>

                                {/* Delete button */}
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeSalesDocLine(item.id)}
                                    className="text-slate-400 hover:text-rose-500 transition"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Summary */}
                    {(() => {
                      const t = calcDocTotals();
                      return (
                        <div className="mt-4 flex justify-end">
                          <div className="w-72 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1.5 dark:border-slate-800 dark:bg-slate-900/40 text-xs">
                            <div className="flex justify-between text-slate-400">
                              <span>Subtotal:</span>
                              <span className="font-mono">{salesDocCurrency} {t.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Discount Total:</span>
                              <span className="font-mono">- {salesDocCurrency} {t.discountTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Tax Total:</span>
                              <span className="font-mono">+ {salesDocCurrency} {t.taxTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100 text-sm">
                              <span>Grand Total:</span>
                              <span className="font-mono text-amber-500">{salesDocCurrency} {t.grandTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Workflow Section (Right Sidebar - 1 Column) */}
                <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6 dark:border-slate-800 flex flex-col justify-between space-y-6">
                  
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" /> Workflow & Organization
                    </h4>

                    {/* Status Options */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Status</label>
                      <select
                        value={salesDocStatus}
                        onChange={(e) => setSalesDocStatus(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        {salesDocType === 'Quotation' ? (
                          <>
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Accepted">Accepted</option>
                            <option value="CANCELLED">Cancelled</option>
                          </>
                        ) : (
                          <>
                            <option value="Draft">Draft</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Completed">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Organization Name */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Building className="h-3 w-3" /> Organization
                      </label>
                      <select
                        value={salesDocOrgId}
                        onChange={(e) => setSalesDocOrgId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                      >
                        {organizations && organizations.length > 0 ? (
                          organizations.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))
                        ) : (
                          <option value="org1">AMKAS INTERNATIONAL</option>
                        )}
                      </select>
                    </div>

                    {/* Branch Name */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Branch Name</label>
                      <select
                        value={salesDocBranchId}
                        onChange={(e) => setSalesDocBranchId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                      >
                        {branches && branches.length > 0 ? (
                          branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code || 'Main'})
                            </option>
                          ))
                        ) : (
                          <option value="b1">Head Office Branch</option>
                        )}
                      </select>
                    </div>

                    {/* Remarks / Notes */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Notes / Remarks</label>
                      <textarea
                        rows={3}
                        value={salesDocNotes}
                        onChange={(e) => setSalesDocNotes(e.target.value)}
                        placeholder="Enter internal notes or terms..."
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none"
                      />
                    </div>
                  </div>

                  {/* Workflow Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleSaveSalesDoc}
                      className="w-full flex justify-center items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition"
                    >
                      <CheckCircle className="h-4 w-4" /> Save & Continue
                    </button>

                    <button
                      type="button"
                      onClick={() => setSalesDocModalOpen(false)}
                      className="w-full flex justify-center items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {printInvoice && (
        <InvoicePrint invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
      )}
    </div>
  );
}
