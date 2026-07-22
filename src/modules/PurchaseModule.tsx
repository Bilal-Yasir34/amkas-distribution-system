import { useState } from 'react';
import { Plus, ShoppingCart, DollarSign, FileText, CheckCircle, Clock, X, Trash2, Edit } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { todayISO } from '@/lib/utils';
import type { VendorBill, Vendor } from '@/lib/types';

export function PurchaseModule() {
  const toast = useToast();
  const {
    vendors = [],
    products = [],
    warehouses = [],
    vendorBills = [],
    purchaseRequests = [],
    purchaseOrders = [],
    purchaseInvoices = [],
    debitNotes = [],
    vendorPayments = [],
    addVendorBill,
    updateVendorBill,
    deleteVendorBill,
    addPurchaseRequest,
    updatePurchaseRequest,
    deletePurchaseRequest,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    addPurchaseInvoice,
    updatePurchaseInvoice,
    deletePurchaseInvoice,
    addDebitNote,
    updateDebitNote,
    deleteDebitNote,
    addVendorPayment,
    updateVendorPayment,
    deleteVendorPayment,
  } = useDataStore();

  const [activeSubTab, setActiveSubTab] = useState<
    'Overview' | 'Requests' | 'Purchase Orders' | 'Purchase Invoices' | 'Vendor Bills' | 'Debit Notes' | 'Payments'
  >('Vendor Bills');

  const [newBillOpen, setNewBillOpen] = useState(false);
  const [genericModalOpen, setGenericModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Generic Form State
  const [genericVendorId, setGenericVendorId] = useState('');
  const [genericAmount, setGenericAmount] = useState('1000');
  const [genericNotes, setGenericNotes] = useState('');

  // Bill Form state
  const [vendorId, setVendorId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [billDate, setBillDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState([
    { id: '1', product_id: '', description: '', qty: 1, rate: 0, tax_pct: 0 },
  ]);

  const openCreateBill = () => {
    setEditingId(null);
    setVendorId(vendors[0]?.id || '');
    setWarehouseId(warehouses[0]?.id || '');
    setBillDate(todayISO());
    setDueDate(todayISO());
    setVendorInvoiceNo('');
    setNotes('');
    setLineItems([
      { id: crypto.randomUUID(), product_id: products[0]?.id || '', description: products[0]?.name || '', qty: 1, rate: products[0]?.purchase_price || 0, tax_pct: 0 },
    ]);
    setNewBillOpen(true);
  };

  const openGenericModal = () => {
    setGenericVendorId(vendors[0]?.id || '');
    setGenericAmount('1000');
    setGenericNotes('');
    setGenericModalOpen(true);
  };

  // Purchase Request Form State (matching screenshot)
  const [prViewMode, setPrViewMode] = useState<'list' | 'form'>('list');
  const [editingPRId, setEditingPRId] = useState<string | null>(null);

  const [prDocDate, setPrDocDate] = useState('2026-07-22');
  const [prRequiredDate, setPrRequiredDate] = useState('2026-07-29');
  const [prStatus, setPrStatus] = useState<'Draft' | 'Submitted' | 'Approved' | 'Rejected'>('Draft');

  const [prLineItems, setPrLineItems] = useState<
    { id: string; product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  const openCreatePRForm = () => {
    setEditingPRId(null);
    setPrDocDate(todayISO());
    setPrRequiredDate(todayISO());
    setPrStatus('Draft');
    setPrLineItems([
      {
        id: crypto.randomUUID(),
        product_id: products[0]?.id || '',
        description: products[0]?.name || '',
        qty: 1,
        rate: products[0]?.purchase_price || products[0]?.cost_price || 0,
        discount: 0,
        tax_pct: products[0]?.tax_pct || 0,
      },
    ]);
    setPrViewMode('form');
  };

  const openEditPRForm = (pr: any) => {
    setEditingPRId(pr.id);
    setPrDocDate(pr.request_date || pr.document_date || todayISO());
    setPrRequiredDate(pr.required_date || todayISO());
    setPrStatus(pr.status || 'Draft');

    if (pr.items && pr.items.length > 0) {
      setPrLineItems(
        pr.items.map((i: any) => ({
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
      setPrLineItems([
        {
          id: crypto.randomUUID(),
          product_id: products[0]?.id || '',
          description: products[0]?.name || '',
          qty: 1,
          rate: pr.total_amount || 0,
          discount: 0,
          tax_pct: 0,
        },
      ]);
    }

    setPrViewMode('form');
  };

  const addPRLineItem = () => {
    const defaultProd = products[0];
    setPrLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: defaultProd?.id || '',
        description: defaultProd?.name || '',
        qty: 1,
        rate: defaultProd?.purchase_price || defaultProd?.cost_price || 0,
        discount: 0,
        tax_pct: defaultProd?.tax_pct || 0,
      },
    ]);
  };

  const updatePRLineItem = (
    id: string,
    patch: Partial<{ product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }>
  ) => {
    setPrLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...patch };
          if (patch.product_id) {
            const p = products.find((x) => x.id === patch.product_id);
            if (p) {
              updated.description = p.name;
              updated.rate = p.purchase_price || p.cost_price || p.sale_price || 0;
              updated.tax_pct = p.tax_pct || 0;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removePRLineItem = (id: string) => {
    if (prLineItems.length > 1) {
      setPrLineItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const calcPRTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    prLineItems.forEach((l) => {
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

  const handleSavePRRecord = () => {
    const totals = calcPRTotals();

    if (editingPRId) {
      updatePurchaseRequest(editingPRId, {
        request_date: prDocDate,
        document_date: prDocDate,
        required_date: prRequiredDate,
        status: prStatus as any,
        total_amount: totals.grandTotal,
      });
      toast.success('Purchase Request updated successfully');
    } else {
      const prNo = `PR-${String((purchaseRequests || []).length + 1).padStart(5, '0')}`;
      addPurchaseRequest({
        request_no: prNo,
        department_id: 'd1',
        request_date: prDocDate,
        document_date: prDocDate,
        required_date: prRequiredDate,
        requested_by: 'admin',
        status: prStatus as any,
        total_amount: totals.grandTotal,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Request ${prNo} saved successfully!`);
    }

    setPrViewMode('list');
  };

  // Purchase Order Form State (matching screenshot)
  const [poViewMode, setPoViewMode] = useState<'list' | 'form'>('list');
  const [editingPOId, setEditingPOId] = useState<string | null>(null);

  const [poVendorId, setPoVendorId] = useState('');
  const [poDocDate, setPoDocDate] = useState('2026-07-22');
  const [poExpectedDate, setPoExpectedDate] = useState('2026-07-29');
  const [poCurrency, setPoCurrency] = useState('PKR');
  const [poExchangeRate, setPoExchangeRate] = useState(1);
  const [poSupplierRef, setPoSupplierRef] = useState('');
  const [poStatus, setPoStatus] = useState<'Draft' | 'Submitted' | 'Approved' | 'Cancelled'>('Draft');
  const [poNotes, setPoNotes] = useState('');

  const [poLineItems, setPoLineItems] = useState<
    { id: string; product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  const openCreatePOForm = () => {
    setEditingPOId(null);
    setPoVendorId(vendors[0]?.id || '');
    setPoDocDate(todayISO());
    setPoExpectedDate(todayISO());
    setPoCurrency('PKR');
    setPoExchangeRate(1);
    setPoSupplierRef('');
    setPoStatus('Draft');
    setPoNotes('');
    setPoLineItems([
      {
        id: crypto.randomUUID(),
        product_id: products[0]?.id || '',
        description: products[0]?.name || '',
        qty: 1,
        rate: products[0]?.purchase_price || products[0]?.cost_price || 0,
        discount: 0,
        tax_pct: products[0]?.tax_pct || 0,
      },
    ]);
    setPoViewMode('form');
  };

  const openEditPOForm = (po: any) => {
    setEditingPOId(po.id);
    setPoVendorId(po.vendor_id || vendors[0]?.id || '');
    setPoDocDate(po.po_date || po.document_date || todayISO());
    setPoExpectedDate(po.expected_date || po.expected_delivery || todayISO());
    setPoCurrency(po.currency || 'PKR');
    setPoExchangeRate(po.exchange_rate || 1);
    setPoSupplierRef(po.supplier_ref || '');
    setPoStatus(po.status || 'Draft');
    setPoNotes(po.notes || '');

    if (po.items && po.items.length > 0) {
      setPoLineItems(
        po.items.map((i: any) => ({
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
      setPoLineItems([
        {
          id: crypto.randomUUID(),
          product_id: products[0]?.id || '',
          description: products[0]?.name || '',
          qty: 1,
          rate: po.total_amount || 0,
          discount: 0,
          tax_pct: 0,
        },
      ]);
    }

    setPoViewMode('form');
  };

  const addPOLineItem = () => {
    const defaultProd = products[0];
    setPoLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: defaultProd?.id || '',
        description: defaultProd?.name || '',
        qty: 1,
        rate: defaultProd?.purchase_price || defaultProd?.cost_price || 0,
        discount: 0,
        tax_pct: defaultProd?.tax_pct || 0,
      },
    ]);
  };

  const updatePOLineItem = (
    id: string,
    patch: Partial<{ product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }>
  ) => {
    setPoLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...patch };
          if (patch.product_id) {
            const p = products.find((x) => x.id === patch.product_id);
            if (p) {
              updated.description = p.name;
              updated.rate = p.purchase_price || p.cost_price || p.sale_price || 0;
              updated.tax_pct = p.tax_pct || 0;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removePOLineItem = (id: string) => {
    if (poLineItems.length > 1) {
      setPoLineItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const calcPOTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    poLineItems.forEach((l) => {
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

  const handleSavePORecord = () => {
    if (!poVendorId) return toast.error('Please select a vendor');
    const totals = calcPOTotals();

    const formattedItems = poLineItems.map((item) => {
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

    if (editingPOId) {
      updatePurchaseOrder(editingPOId, {
        vendor_id: poVendorId,
        po_date: poDocDate,
        document_date: poDocDate,
        expected_date: poExpectedDate,
        expected_delivery: poExpectedDate,
        currency: poCurrency,
        exchange_rate: poExchangeRate,
        supplier_ref: poSupplierRef,
        status: poStatus as any,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: poNotes,
      });
      toast.success('Purchase Order updated successfully');
    } else {
      const poNo = `PO-${String((purchaseOrders || []).length + 1).padStart(5, '0')}`;
      addPurchaseOrder({
        po_no: poNo,
        vendor_id: poVendorId,
        warehouse_id: warehouses[0]?.id || 'w1',
        po_date: poDocDate,
        document_date: poDocDate,
        expected_date: poExpectedDate,
        expected_delivery: poExpectedDate,
        currency: poCurrency,
        exchange_rate: poExchangeRate,
        supplier_ref: poSupplierRef,
        status: poStatus as any,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: poNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Order ${poNo} created successfully!`);
    }

    setPoViewMode('list');
  };

  // Purchase Invoice Form State (matching screenshots)
  const [piViewMode, setPiViewMode] = useState<'list' | 'form'>('list');
  const [editingPIId, setEditingPIId] = useState<string | null>(null);

  const [piVendorId, setPiVendorId] = useState('');
  const [piDocDate, setPiDocDate] = useState('2026-07-22');
  const [piDueDate, setPiDueDate] = useState('2026-07-29');
  const [piWarehouseId, setPiWarehouseId] = useState('');
  const [piGatePassNo, setPiGatePassNo] = useState('');
  const [piAccountCategory, setPiAccountCategory] = useState('All account categories');
  const [piAccountHead, setPiAccountHead] = useState('Default Inventory / Purchase Account');
  const [piNotes, setPiNotes] = useState('');

  const [piLineItems, setPiLineItems] = useState<
    { id: string; product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  const openCreatePIForm = () => {
    setEditingPIId(null);
    setPiVendorId(vendors[0]?.id || '');
    setPiDocDate(todayISO());
    setPiDueDate(todayISO());
    setPiWarehouseId(warehouses[0]?.id || 'w1');
    setPiGatePassNo('');
    setPiAccountCategory('All account categories');
    setPiAccountHead('Default Inventory / Purchase Account');
    setPiNotes('');
    setPiLineItems([
      {
        id: crypto.randomUUID(),
        product_id: products[0]?.id || '',
        description: products[0]?.name || '',
        qty: 1,
        rate: products[0]?.purchase_price || products[0]?.cost_price || 0,
        discount: 0,
        tax_pct: products[0]?.tax_pct || 0,
      },
    ]);
    setPiViewMode('form');
  };

  const openEditPIForm = (pi: any) => {
    setEditingPIId(pi.id);
    setPiVendorId(pi.vendor_id || vendors[0]?.id || '');
    setPiDocDate(pi.received_date || pi.document_date || todayISO());
    setPiDueDate(pi.due_date || todayISO());
    setPiWarehouseId(pi.warehouse_id || warehouses[0]?.id || 'w1');
    setPiGatePassNo(pi.gate_pass_no || '');
    setPiAccountCategory(pi.account_category || 'All account categories');
    setPiAccountHead(pi.account_head || 'Default Inventory / Purchase Account');
    setPiNotes(pi.notes || '');

    if (pi.items && pi.items.length > 0) {
      setPiLineItems(
        pi.items.map((i: any) => ({
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
      setPiLineItems([
        {
          id: crypto.randomUUID(),
          product_id: products[0]?.id || '',
          description: products[0]?.name || '',
          qty: 1,
          rate: pi.total_amount || 0,
          discount: 0,
          tax_pct: 0,
        },
      ]);
    }

    setPiViewMode('form');
  };

  const addPILineItem = () => {
    const defaultProd = products[0];
    setPiLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: defaultProd?.id || '',
        description: defaultProd?.name || '',
        qty: 1,
        rate: defaultProd?.purchase_price || defaultProd?.cost_price || 0,
        discount: 0,
        tax_pct: defaultProd?.tax_pct || 0,
      },
    ]);
  };

  const updatePILineItem = (
    id: string,
    patch: Partial<{ product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }>
  ) => {
    setPiLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...patch };
          if (patch.product_id) {
            const p = products.find((x) => x.id === patch.product_id);
            if (p) {
              updated.description = p.name;
              updated.rate = p.purchase_price || p.cost_price || p.sale_price || 0;
              updated.tax_pct = p.tax_pct || 0;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removePILineItem = (id: string) => {
    if (piLineItems.length > 1) {
      setPiLineItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const calcPITotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    piLineItems.forEach((l) => {
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

  const handleSavePIRecord = () => {
    if (!piVendorId) return toast.error('Please select a vendor');
    const totals = calcPITotals();

    const formattedItems = piLineItems.map((item) => {
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

    if (editingPIId) {
      updatePurchaseInvoice(editingPIId, {
        vendor_id: piVendorId,
        warehouse_id: piWarehouseId,
        received_date: piDocDate,
        document_date: piDocDate,
        due_date: piDueDate,
        gate_pass_no: piGatePassNo,
        account_category: piAccountCategory,
        account_head: piAccountHead,
        status: 'POSTED',
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: piNotes,
      });
      toast.success('Purchase Invoice updated and posted successfully');
    } else {
      const piNo = `PI-${String((purchaseInvoices || []).length + 1).padStart(5, '0')}`;
      addPurchaseInvoice({
        grn_no: piNo,
        invoice_no: piNo,
        po_id: null,
        vendor_id: piVendorId,
        warehouse_id: piWarehouseId,
        received_date: piDocDate,
        document_date: piDocDate,
        due_date: piDueDate,
        gate_pass_no: piGatePassNo,
        account_category: piAccountCategory,
        account_head: piAccountHead,
        status: 'POSTED',
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: piNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Invoice ${piNo} saved and posted! Inventory updated.`);
    }

    setPiViewMode('list');
  };

  // Vendor Bill Form State (matching screenshots)
  const [vbViewMode, setVbViewMode] = useState<'list' | 'form'>('list');
  const [editingVBId, setEditingVBId] = useState<string | null>(null);

  const [vbVendorId, setVbVendorId] = useState('');
  const [vbDocDate, setVbDocDate] = useState('2026-07-22');
  const [vbDueDate, setVbDueDate] = useState('2026-07-29');
  const [vbWarehouseId, setVbWarehouseId] = useState('');
  const [vbGatePassNo, setVbGatePassNo] = useState('');
  const [vbAccountCategory, setVbAccountCategory] = useState('All account categories');
  const [vbAccountHead, setVbAccountHead] = useState('Default Inventory / Purchase Account');
  const [vbCurrency, setVbCurrency] = useState('PKR');
  const [vbExchangeRate, setVbExchangeRate] = useState(1);
  const [vbSupplierRef, setVbSupplierRef] = useState('');
  const [vbNotes, setVbNotes] = useState('');

  const [vbLineItems, setVbLineItems] = useState<
    { id: string; product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  const openCreateVBForm = () => {
    setEditingVBId(null);
    setVbVendorId(vendors[0]?.id || '');
    setVbDocDate(todayISO());
    setVbDueDate(todayISO());
    setVbWarehouseId(warehouses[0]?.id || 'w1');
    setVbGatePassNo('');
    setVbAccountCategory('All account categories');
    setVbAccountHead('Default Inventory / Purchase Account');
    setVbCurrency('PKR');
    setVbExchangeRate(1);
    setVbSupplierRef('');
    setVbNotes('');
    setVbLineItems([
      {
        id: crypto.randomUUID(),
        product_id: products[0]?.id || '',
        description: products[0]?.name || '',
        qty: 1,
        rate: products[0]?.purchase_price || products[0]?.cost_price || 0,
        discount: 0,
        tax_pct: products[0]?.tax_pct || 0,
      },
    ]);
    setVbViewMode('form');
  };

  const openEditVBForm = (vb: any) => {
    setEditingVBId(vb.id);
    setVbVendorId(vb.vendor_id || vendors[0]?.id || '');
    setVbDocDate(vb.bill_date || vb.document_date || todayISO());
    setVbDueDate(vb.due_date || todayISO());
    setVbWarehouseId(vb.warehouse_id || warehouses[0]?.id || 'w1');
    setVbGatePassNo(vb.gate_pass_no || '');
    setVbAccountCategory(vb.account_category || 'All account categories');
    setVbAccountHead(vb.account_head || 'Default Inventory / Purchase Account');
    setVbCurrency(vb.currency || 'PKR');
    setVbExchangeRate(vb.exchange_rate || 1);
    setVbSupplierRef(vb.vendor_invoice_no || vb.supplier_ref || '');
    setVbNotes(vb.notes || '');

    if (vb.items && vb.items.length > 0) {
      setVbLineItems(
        vb.items.map((i: any) => ({
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
      setVbLineItems([
        {
          id: crypto.randomUUID(),
          product_id: products[0]?.id || '',
          description: products[0]?.name || '',
          qty: 1,
          rate: vb.total_amount || 0,
          discount: 0,
          tax_pct: 0,
        },
      ]);
    }

    setVbViewMode('form');
  };

  const addVBLineItem = () => {
    const defaultProd = products[0];
    setVbLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: defaultProd?.id || '',
        description: defaultProd?.name || '',
        qty: 1,
        rate: defaultProd?.purchase_price || defaultProd?.cost_price || 0,
        discount: 0,
        tax_pct: defaultProd?.tax_pct || 0,
      },
    ]);
  };

  const updateVBLineItem = (
    id: string,
    patch: Partial<{ product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }>
  ) => {
    setVbLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...patch };
          if (patch.product_id) {
            const p = products.find((x) => x.id === patch.product_id);
            if (p) {
              updated.description = p.name;
              updated.rate = p.purchase_price || p.cost_price || p.sale_price || 0;
              updated.tax_pct = p.tax_pct || 0;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeVBLineItem = (id: string) => {
    if (vbLineItems.length > 1) {
      setVbLineItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const calcVBTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    vbLineItems.forEach((l) => {
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

  const handleSaveVBRecord = () => {
    if (!vbVendorId) return toast.error('Please select a vendor');
    const totals = calcVBTotals();

    const formattedItems = vbLineItems.map((item) => {
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

    if (editingVBId) {
      updateVendorBill(editingVBId, {
        vendor_id: vbVendorId,
        warehouse_id: vbWarehouseId,
        bill_date: vbDocDate,
        due_date: vbDueDate,
        gate_pass_no: vbGatePassNo,
        account_category: vbAccountCategory,
        account_head: vbAccountHead,
        currency: vbCurrency,
        exchange_rate: vbExchangeRate,
        vendor_invoice_no: vbSupplierRef,
        status: 'POSTED',
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: vbNotes,
      });
      toast.success('Vendor Bill updated and posted successfully');
    } else {
      const billNo = `MP-${String((vendorBills || []).length + 1).padStart(5, '0')}`;
      addVendorBill({
        bill_no: billNo,
        vendor_id: vbVendorId,
        warehouse_id: vbWarehouseId,
        bill_date: vbDocDate,
        due_date: vbDueDate,
        gate_pass_no: vbGatePassNo,
        account_category: vbAccountCategory,
        account_head: vbAccountHead,
        currency: vbCurrency,
        exchange_rate: vbExchangeRate,
        vendor_invoice_no: vbSupplierRef || billNo,
        payment_terms: 'Net 30',
        status: 'POSTED',
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: vbNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Vendor Bill ${billNo} saved and posted! Stock and ledger updated.`);
    }

    setVbViewMode('list');
  };

  // Debit Note / Purchase Return Form State (matching screenshots)
  const [dnViewMode, setDnViewMode] = useState<'list' | 'form'>('list');
  const [editingDNId, setEditingDNId] = useState<string | null>(null);

  const [dnVendorId, setDnVendorId] = useState('');
  const [dnDocDate, setDnDocDate] = useState('2026-07-22');
  const [dnDueDate, setDnDueDate] = useState('2026-07-29');
  const [dnWarehouseId, setDnWarehouseId] = useState('');
  const [dnPurposeReason, setDnPurposeReason] = useState('');

  const [dnLineItems, setDnLineItems] = useState<
    { id: string; product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  const openCreateDNForm = () => {
    setEditingDNId(null);
    setDnVendorId(vendors[0]?.id || '');
    setDnDocDate(todayISO());
    setDnDueDate(todayISO());
    setDnWarehouseId(warehouses[0]?.id || 'w1');
    setDnPurposeReason('');
    setDnLineItems([
      {
        id: crypto.randomUUID(),
        product_id: products[0]?.id || '',
        description: products[0]?.name || '',
        qty: 1,
        rate: products[0]?.purchase_price || products[0]?.cost_price || 0,
        discount: 0,
        tax_pct: products[0]?.tax_pct || 0,
      },
    ]);
    setDnViewMode('form');
  };

  const openEditDNForm = (dn: any) => {
    setEditingDNId(dn.id);
    setDnVendorId(dn.vendor_id || vendors[0]?.id || '');
    setDnDocDate(dn.note_date || dn.document_date || todayISO());
    setDnDueDate(dn.due_date || todayISO());
    setDnWarehouseId(dn.warehouse_id || warehouses[0]?.id || 'w1');
    setDnPurposeReason(dn.reason || dn.purpose_reason || '');

    if (dn.items && dn.items.length > 0) {
      setDnLineItems(
        dn.items.map((i: any) => ({
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
      setDnLineItems([
        {
          id: crypto.randomUUID(),
          product_id: products[0]?.id || '',
          description: products[0]?.name || '',
          qty: 1,
          rate: dn.total_amount || 0,
          discount: 0,
          tax_pct: 0,
        },
      ]);
    }

    setDnViewMode('form');
  };

  const addDNLineItem = () => {
    const defaultProd = products[0];
    setDnLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: defaultProd?.id || '',
        description: defaultProd?.name || '',
        qty: 1,
        rate: defaultProd?.purchase_price || defaultProd?.cost_price || 0,
        discount: 0,
        tax_pct: defaultProd?.tax_pct || 0,
      },
    ]);
  };

  const updateDNLineItem = (
    id: string,
    patch: Partial<{ product_id: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }>
  ) => {
    setDnLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...patch };
          if (patch.product_id) {
            const p = products.find((x) => x.id === patch.product_id);
            if (p) {
              updated.description = p.name;
              updated.rate = p.purchase_price || p.cost_price || p.sale_price || 0;
              updated.tax_pct = p.tax_pct || 0;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeDNLineItem = (id: string) => {
    if (dnLineItems.length > 1) {
      setDnLineItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const calcDNTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    dnLineItems.forEach((l) => {
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

  const handleSaveDNRecord = () => {
    if (!dnVendorId) return toast.error('Please select a vendor');
    const totals = calcDNTotals();

    const formattedItems = dnLineItems.map((item) => {
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

    if (editingDNId) {
      updateDebitNote(editingDNId, {
        vendor_id: dnVendorId,
        note_date: dnDocDate,
        due_date: dnDueDate,
        reason: dnPurposeReason || 'Purchase Return',
        status: 'POSTED',
        total_amount: totals.grandTotal,
      });
      toast.success('Debit Note updated and posted successfully');
    } else {
      const dnNo = `MDN-${String((debitNotes || []).length + 1).padStart(5, '0')}`;
      addDebitNote({
        debit_note_no: dnNo,
        vendor_bill_id: null,
        vendor_id: dnVendorId,
        note_date: dnDocDate,
        due_date: dnDueDate,
        reason: dnPurposeReason || 'Purchase Return',
        status: 'POSTED',
        total_amount: totals.grandTotal,
        created_at: new Date().toISOString(),
      });
      toast.success(`Debit Note / Purchase Return ${dnNo} saved and posted!`);
    }

    setDnViewMode('list');
  };

  // Pay Vendor / Vendor Payment Form State (matching screenshot)
  const [vpViewMode, setVpViewMode] = useState<'list' | 'form'>('list');
  const [editingVPId, setEditingVPId] = useState<string | null>(null);

  const [vpVendorId, setVpVendorId] = useState('');
  const [vpPaymentDate, setVpPaymentDate] = useState('2026-07-22');
  const [vpPayFrom, setVpPayFrom] = useState('Cash in Hand');
  const [vpAmount, setVpAmount] = useState<string | number>('');
  const [vpAccountCategory, setVpAccountCategory] = useState('Auto select based on selected party');
  const [vpCurrency, setVpCurrency] = useState('PKR');
  const [vpExchangeRate, setVpExchangeRate] = useState(1);
  const [vpRefNumber, setVpRefNumber] = useState('');
  const [vpNotes, setVpNotes] = useState('');

  const openCreateVPForm = () => {
    setEditingVPId(null);
    setVpVendorId(vendors[0]?.id || '');
    setVpPaymentDate(todayISO());
    setVpPayFrom('Cash in Hand');
    setVpAmount('');
    setVpAccountCategory('Auto select based on selected party');
    setVpCurrency('PKR');
    setVpExchangeRate(1);
    setVpRefNumber('');
    setVpNotes('');
    setVpViewMode('form');
  };

  const openEditVPForm = (vp: any) => {
    setEditingVPId(vp.id);
    setVpVendorId(vp.vendor_id || vendors[0]?.id || '');
    setVpPaymentDate(vp.payment_date || todayISO());
    setVpPayFrom(vp.payment_method || 'Cash in Hand');
    setVpAmount(vp.amount || '');
    setVpAccountCategory('Auto select based on selected party');
    setVpCurrency(vp.currency || 'PKR');
    setVpExchangeRate(1);
    setVpRefNumber(vp.reference_no || vp.ref_no || '');
    setVpNotes(vp.notes || '');
    setVpViewMode('form');
  };

  const handleSaveVPRecord = () => {
    if (!vpVendorId) return toast.error('Please select a vendor');
    const amountVal = Number(vpAmount);
    if (!amountVal || amountVal <= 0) return toast.error('Please enter a valid payment amount');

    if (editingVPId) {
      updateVendorPayment(editingVPId, {
        vendor_id: vpVendorId,
        payment_date: vpPaymentDate,
        payment_method: vpPayFrom,
        amount: amountVal,
        reference_no: vpRefNumber,
        currency: vpCurrency,
        notes: vpNotes,
      });
      toast.success('Vendor Payment updated successfully');
    } else {
      const paymentNo = `PAY-${String((vendorPayments || []).length + 1).padStart(5, '0')}`;
      addVendorPayment({
        payment_no: paymentNo,
        vendor_bill_id: null,
        vendor_id: vpVendorId,
        payment_date: vpPaymentDate,
        payment_method: vpPayFrom,
        amount: amountVal,
        reference_no: vpRefNumber || paymentNo,
        currency: vpCurrency,
        notes: vpNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Payment ${paymentNo} posted! Vendor balance updated.`);
    }

    setVpViewMode('list');
  };

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), product_id: '', description: '', qty: 1, rate: 0, tax_pct: 0 },
    ]);
  };

  const updateLine = (id: string, patch: Partial<(typeof lineItems)[0]>) => {
    setLineItems((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const updated = { ...l, ...patch };
          if (patch.product_id) {
            const p = products.find((x) => x.id === patch.product_id);
            if (p) {
              updated.description = p.name;
              updated.rate = p.purchase_price;
            }
          }
          return updated;
        }
        return l;
      })
    );
  };

  const removeLine = (id: string) => {
    if (lineItems.length > 1) setLineItems((prev) => prev.filter((l) => l.id !== id));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    lineItems.forEach((l) => {
      const gross = l.qty * l.rate;
      subtotal += gross;
      taxTotal += gross * (l.tax_pct / 100);
    });
    return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
  };

  const totals = calculateTotals();

  const handleSaveBill = (status: 'UNPOSTED' | 'POSTED') => {
    if (!vendorId) return toast.error('Please select a vendor');

    if (editingId) {
      updateVendorBill(editingId, {
        vendor_id: vendorId,
        warehouse_id: warehouseId,
        bill_date: billDate,
        due_date: dueDate,
        vendor_invoice_no: vendorInvoiceNo,
        status,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes,
      });
      toast.success(`Vendor Bill updated (${status})`);
    } else {
      const billNo = `MP-${String(vendorBills.length + 1).padStart(5, '0')}`;
      addVendorBill({
        bill_no: billNo,
        vendor_id: vendorId,
        warehouse_id: warehouseId,
        bill_date: billDate,
        due_date: dueDate,
        vendor_invoice_no: vendorInvoiceNo || billNo,
        currency: 'PKR',
        exchange_rate: 1,
        payment_terms: 'Net 30',
        account_head: 'Default Procurement Payable',
        status,
        subtotal: totals.subtotal,
        discount_total: 0,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        paid_amount: 0,
        notes,
        created_by: 'admin',
        created_at: new Date().toISOString(),
      });
      toast.success(`Vendor Bill ${billNo} saved and ${status.toLowerCase()}`);
    }
    setNewBillOpen(false);
  };

  const handleSaveGenericRecord = () => {
    const amountVal = Number(genericAmount) || 1000;

    if (activeSubTab === 'Requests') {
      const prNo = `MPR-${String(purchaseRequests.length + 1).padStart(5, '0')}`;
      addPurchaseRequest({
        request_no: prNo,
        department_id: 'd1',
        request_date: todayISO(),
        required_date: todayISO(),
        requested_by: 'admin',
        status: 'PENDING',
        notes: genericNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Request ${prNo} created and added to Requests register!`);
    } else if (activeSubTab === 'Purchase Orders') {
      const poNo = `MPO-${String(purchaseOrders.length + 1).padStart(5, '0')}`;
      addPurchaseOrder({
        po_no: poNo,
        vendor_id: genericVendorId,
        warehouse_id: warehouses[0]?.id || 'w1',
        po_date: todayISO(),
        expected_delivery: todayISO(),
        currency: 'PKR',
        status: 'POSTED',
        subtotal: amountVal,
        tax_total: 0,
        total_amount: amountVal,
        notes: genericNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Order ${poNo} created and added to Purchase Orders register!`);
    } else if (activeSubTab === 'Purchase Invoices') {
      const piNo = `PI-${String(purchaseInvoices.length + 1).padStart(5, '0')}`;
      addPurchaseInvoice({
        grn_no: piNo,
        po_id: null,
        vendor_id: genericVendorId,
        warehouse_id: warehouses[0]?.id || 'w1',
        received_date: todayISO(),
        status: 'POSTED',
        notes: genericNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Invoice ${piNo} created and added to Purchase Invoices register!`);
    } else if (activeSubTab === 'Debit Notes') {
      const dnNo = `MDN-${String(debitNotes.length + 1).padStart(5, '0')}`;
      addDebitNote({
        debit_note_no: dnNo,
        vendor_bill_id: null,
        vendor_id: genericVendorId,
        note_date: todayISO(),
        reason: genericNotes || 'Purchase Return',
        status: 'POSTED',
        total_amount: amountVal,
        created_at: new Date().toISOString(),
      });
      toast.success(`Debit Note ${dnNo} created and added to Debit Notes register!`);
    } else if (activeSubTab === 'Payments') {
      const vpNo = `CP-${String(vendorPayments.length + 1).padStart(5, '0')}`;
      addVendorPayment({
        payment_no: vpNo,
        vendor_id: genericVendorId,
        payment_date: todayISO(),
        payment_method: 'Cash',
        paid_from_account_id: 'Cash in Hand',
        amount: amountVal,
        notes: genericNotes,
        status: 'POSTED',
        created_at: new Date().toISOString(),
      });
      toast.success(`Vendor Payment ${vpNo} created and added to Payments register!`);
    }

    setGenericModalOpen(false);
  };

  const totalProcuredSum = vendorBills.reduce((acc, b) => acc + (b.total_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Purchase Management</h1>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {['Overview', 'Requests', 'Purchase Orders', 'Purchase Invoices', 'Vendor Bills', 'Debit Notes', 'Payments'].map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab as any)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
                activeSubTab === tab
                  ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* OVERVIEW */}
      {activeSubTab === 'Overview' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL PROCURED</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                Rs. {totalProcuredSum.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PURCHASE ORDERS</p>
              <p className="mt-1 text-2xl font-extrabold text-amber-500">{purchaseOrders.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">VENDOR BILLS</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-500">{vendorBills.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DEBIT NOTES</p>
              <p className="mt-1 text-2xl font-extrabold text-rose-500">{debitNotes.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR BILLS TAB */}
      {activeSubTab === 'Vendor Bills' && (
        <div className="space-y-6">
          {vbViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Vendor bills register</h2>
                </div>
                <button
                  onClick={openCreateVBForm}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New vendor bill
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">Bill Number</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Warehouse</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(vendorBills || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No vendor bills recorded yet. Click New Vendor Bill to create one.
                        </td>
                      </tr>
                    ) : (
                      (vendorBills || []).map((b) => {
                        const vend = vendors.find((v) => v.id === b.vendor_id);
                        const wh = warehouses.find((w) => w.id === b.warehouse_id);
                        return (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{b.bill_no}</td>
                            <td className="px-4 py-3 text-slate-400">{b.bill_date || b.document_date}</td>
                            <td className="px-4 py-3 font-medium text-slate-200">{vend?.name || 'Vendor'}</td>
                            <td className="px-4 py-3 text-slate-400">{wh?.name || 'Main Warehouse'}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                              Rs. {(b.total_amount || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                  b.status === 'POSTED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                }`}
                              >
                                {b.status || 'POSTED'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditVBForm(b)}
                                  className="p-1 text-slate-400 hover:text-emerald-400 transition"
                                  title="Edit Vendor Bill"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    deleteVendorBill(b.id);
                                    toast.success('Vendor bill deleted');
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
            /* NEW VENDOR BILL FORM (Matching User Screenshots) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setVbViewMode('list')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Vendor Bills Register
                </button>
              </div>

              {/* TOP SECTION: Main Header Card (Left) & Procurement Workflow (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Header Card (Left - 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingVBId ? 'Edit Vendor Bill' : 'New Vendor Bill'}
                  </h2>

                  {/* Row 1: Vendor, Document date, Due date */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Vendor</label>
                      <select
                        value={vbVendorId}
                        onChange={(e) => setVbVendorId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="">Select vendor</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Document date</label>
                      <input
                        type="date"
                        value={vbDocDate}
                        onChange={(e) => setVbDocDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Due date</label>
                      <input
                        type="date"
                        value={vbDueDate}
                        onChange={(e) => setVbDueDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Warehouse (Full Width) */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Warehouse</label>
                    <select
                      value={vbWarehouseId}
                      onChange={(e) => setVbWarehouseId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.code ? `${w.code} · ` : ''}{w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 3: Gate pass number, Account category, Account head */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Gate pass number</label>
                      <input
                        type="text"
                        placeholder="Manual gate pass no."
                        value={vbGatePassNo}
                        onChange={(e) => setVbGatePassNo(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account category</label>
                      <select
                        value={vbAccountCategory}
                        onChange={(e) => setVbAccountCategory(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="All account categories">All account categories</option>
                        <option value="Current Assets">Current Assets</option>
                        <option value="Inventory Accounts">Inventory Accounts</option>
                        <option value="Direct Expenses">Direct Expenses</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account head</label>
                      <select
                        value={vbAccountHead}
                        onChange={(e) => setVbAccountHead(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="Default Inventory / Purchase Account">Default Inventory / Purchase Account</option>
                        <option value="Inventory - Main Stock">Inventory - Main Stock</option>
                        <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                        <option value="Raw Material Purchases">Raw Material Purchases</option>
                      </select>
                      <p className="text-[11px] font-semibold text-slate-400 mt-1 leading-tight">
                        Choose the account category first, then select the account head.
                      </p>
                    </div>
                  </div>

                  {/* Row 4: Currency, Exchange rate, Supplier invoice/reference */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Currency</label>
                      <select
                        value={vbCurrency}
                        onChange={(e) => setVbCurrency(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
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
                        value={vbExchangeRate}
                        onChange={(e) => setVbExchangeRate(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Supplier invoice/reference</label>
                      <input
                        type="text"
                        placeholder="Supplier invoice/reference"
                        value={vbSupplierRef}
                        onChange={(e) => setVbSupplierRef(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Procurement Workflow Card (Right - 1 Column) matching screenshot */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Procurement workflow</h3>

                    {/* Light Emerald Notice Box from screenshot */}
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 border border-emerald-200 dark:border-emerald-800/40 text-xs font-medium text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Posting updates stock, payables and the general ledger.
                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Number</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {editingVBId ? 'Assigned' : 'Assigned on save'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Financial year</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Auto selected</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons at Bottom Right matching screenshot */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setVbViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveVBRecord}
                      className="rounded-xl bg-[#00a884] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                    >
                      Save & Post
                    </button>
                  </div>
                </div>
              </div>

              {/* LINE ITEMS CARD (Matching Screenshots) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">LINE ITEMS</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Products and services</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addVBLineItem}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-sm"
                  >
                    + Add line
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 w-56">PRODUCT</th>
                        <th className="px-4 py-3">DESCRIPTION</th>
                        <th className="px-4 py-3 w-36 text-center">QTY</th>
                        <th className="px-4 py-3 w-28">RATE</th>
                        <th className="px-4 py-3 w-24">DISCOUNT</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {vbLineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="px-4 py-3">
                            <select
                              value={item.product_id}
                              onChange={(e) => updateVBLineItem(item.id, { product_id: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Optional description"
                              value={item.description}
                              onChange={(e) => updateVBLineItem(item.id, { description: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updateVBLineItem(item.id, { qty: Math.max(1, (item.qty || 1) - 1) })}
                                className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateVBLineItem(item.id, { qty: Math.max(1, Number(e.target.value)) })}
                                className="w-12 text-center text-xs font-bold text-slate-800 dark:text-slate-100 outline-none border-none bg-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => updateVBLineItem(item.id, { qty: (item.qty || 1) + 1 })}
                                className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateVBLineItem(item.id, { rate: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateVBLineItem(item.id, { discount: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeVBLineItem(item.id)}
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

                {/* Bottom Summary Grid (SUBTOTAL, DISCOUNT, TAX, GRAND TOTAL) matching Screenshots */}
                {(() => {
                  const t = calcVBTotals();
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

                      {/* Dark Navy Container for GRAND TOTAL matching Screenshots */}
                      <div className="p-3.5 bg-[#0b1329] text-white">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GRAND TOTAL</p>
                        <p className="mt-1 text-base font-extrabold font-mono text-white">
                          Rs. {t.grandTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Notes Bottom Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes</label>
                <textarea
                  rows={4}
                  value={vbNotes}
                  onChange={(e) => setVbNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* PURCHASE REQUESTS TAB */}
      {activeSubTab === 'Requests' && (
        <div className="space-y-6">
          {prViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Purchase requests register</h2>
                </div>
                <button
                  onClick={openCreatePRForm}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New request
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">Request No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Required Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(purchaseRequests || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No purchase requests recorded yet. Click New Request to create one.
                        </td>
                      </tr>
                    ) : (
                      (purchaseRequests || []).map((pr) => (
                        <tr key={pr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{pr.request_no}</td>
                          <td className="px-4 py-3 text-slate-400">{pr.request_date || pr.document_date}</td>
                          <td className="px-4 py-3 text-slate-300">{pr.required_date || '-'}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                            Rs. {(pr.total_amount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                              {pr.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditPRForm(pr)}
                                className="p-1 text-slate-400 hover:text-emerald-400 transition"
                                title="Edit Request"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  deletePurchaseRequest(pr.id);
                                  toast.success('Request deleted');
                                }}
                                className="text-xs text-rose-500 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* NEW PURCHASE REQUEST FORM (Matching User Screenshot) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setPrViewMode('list')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Purchase Requests Register
                </button>
              </div>

              {/* TOP SECTION: Main Header Card (Left) & Procurement Workflow (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Header Card (Left - 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingPRId ? 'Edit Purchase Request' : 'New Purchase Request'}
                  </h2>

                  {/* Document Date & Required Date Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Document date</label>
                      <input
                        type="date"
                        value={prDocDate}
                        onChange={(e) => setPrDocDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Required date</label>
                      <input
                        type="date"
                        value={prRequiredDate}
                        onChange={(e) => setPrRequiredDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Procurement Workflow Card (Right - 1 Column) */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Procurement workflow</h3>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Status</label>
                      <select
                        value={prStatus}
                        onChange={(e) => setPrStatus(e.target.value as any)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Number</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {editingPRId ? 'Assigned' : 'Assigned on save'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Financial year</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Auto selected</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons at Bottom Right matching screenshot */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPrViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePRRecord}
                      className="rounded-xl bg-[#00a884] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                    >
                      Save & Continue
                    </button>
                  </div>
                </div>
              </div>

              {/* LINE ITEMS CARD (Matching Screenshot) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">LINE ITEMS</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Products and services</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addPRLineItem}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-sm"
                  >
                    + Add line
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 w-56">PRODUCT</th>
                        <th className="px-4 py-3">DESCRIPTION</th>
                        <th className="px-4 py-3 w-36 text-center">QTY</th>
                        <th className="px-4 py-3 w-28">RATE</th>
                        <th className="px-4 py-3 w-24">DISCOUNT</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {prLineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="px-4 py-3">
                            <select
                              value={item.product_id}
                              onChange={(e) => updatePRLineItem(item.id, { product_id: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Optional description"
                              value={item.description}
                              onChange={(e) => updatePRLineItem(item.id, { description: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updatePRLineItem(item.id, { qty: Math.max(1, (item.qty || 1) - 1) })}
                                className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updatePRLineItem(item.id, { qty: Math.max(1, Number(e.target.value)) })}
                                className="w-12 text-center text-xs font-bold text-slate-800 dark:text-slate-100 outline-none border-none bg-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => updatePRLineItem(item.id, { qty: (item.qty || 1) + 1 })}
                                className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updatePRLineItem(item.id, { rate: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updatePRLineItem(item.id, { discount: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removePRLineItem(item.id)}
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

                {/* Bottom Summary Grid (SUBTOTAL, DISCOUNT, TAX, GRAND TOTAL) matching Screenshot */}
                {(() => {
                  const t = calcPRTotals();
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

                      {/* Dark Navy Container for GRAND TOTAL matching Screenshot */}
                      <div className="p-3.5 bg-[#0b1329] text-white">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GRAND TOTAL</p>
                        <p className="mt-1 text-base font-extrabold font-mono text-white">
                          Rs. {t.grandTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PURCHASE ORDERS TAB */}
      {activeSubTab === 'Purchase Orders' && (
        <div className="space-y-6">
          {poViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Purchase orders register</h2>
                </div>
                <button
                  onClick={openCreatePOForm}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New purchase order
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">PO Number</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Expected Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(purchaseOrders || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No purchase orders recorded yet. Click New Purchase Order to create one.
                        </td>
                      </tr>
                    ) : (
                      (purchaseOrders || []).map((po) => {
                        const vend = vendors.find((v) => v.id === po.vendor_id);
                        return (
                          <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{po.po_no}</td>
                            <td className="px-4 py-3 text-slate-400">{po.po_date || po.document_date}</td>
                            <td className="px-4 py-3 font-medium text-slate-200">{vend?.name || 'Vendor'}</td>
                            <td className="px-4 py-3 text-slate-400">{po.expected_date || po.expected_delivery || '-'}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                              {po.currency || 'Rs.'} {po.total_amount?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                                {po.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditPOForm(po)}
                                  className="p-1 text-slate-400 hover:text-emerald-400 transition"
                                  title="Edit Purchase Order"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    deletePurchaseOrder(po.id);
                                    toast.success('Purchase Order deleted');
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
            /* NEW PURCHASE ORDER FORM (Matching User Screenshot) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setPoViewMode('list')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Purchase Orders Register
                </button>
              </div>

              {/* TOP SECTION: Main Header Card (Left) & Procurement Workflow (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Header Card (Left - 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingPOId ? 'Edit Purchase Order' : 'New Purchase Order'}
                  </h2>

                  {/* Row 1: Vendor, Document date, Expected date */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Vendor</label>
                      <select
                        value={poVendorId}
                        onChange={(e) => setPoVendorId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="">Select vendor</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Document date</label>
                      <input
                        type="date"
                        value={poDocDate}
                        onChange={(e) => setPoDocDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Expected date</label>
                      <input
                        type="date"
                        value={poExpectedDate}
                        onChange={(e) => setPoExpectedDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Currency, Exchange rate, Supplier invoice/reference */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Currency</label>
                      <select
                        value={poCurrency}
                        onChange={(e) => setPoCurrency(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
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
                        value={poExchangeRate}
                        onChange={(e) => setPoExchangeRate(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Supplier invoice/reference</label>
                      <input
                        type="text"
                        placeholder="Supplier invoice/reference"
                        value={poSupplierRef}
                        onChange={(e) => setPoSupplierRef(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Procurement Workflow Card (Right - 1 Column) */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Procurement workflow</h3>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Status</label>
                      <select
                        value={poStatus}
                        onChange={(e) => setPoStatus(e.target.value as any)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Approved">Approved</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Number</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {editingPOId ? 'Assigned' : 'Assigned on save'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Financial year</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Auto selected</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons at Bottom Right matching screenshot */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPoViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePORecord}
                      className="rounded-xl bg-[#00a884] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                    >
                      Save & Continue
                    </button>
                  </div>
                </div>
              </div>

              {/* LINE ITEMS CARD (Matching Screenshot) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">LINE ITEMS</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Products and services</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addPOLineItem}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-sm"
                  >
                    + Add line
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 w-56">PRODUCT</th>
                        <th className="px-4 py-3">DESCRIPTION</th>
                        <th className="px-4 py-3 w-36 text-center">QTY</th>
                        <th className="px-4 py-3 w-28">RATE</th>
                        <th className="px-4 py-3 w-24">DISCOUNT</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {poLineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="px-4 py-3">
                            <select
                              value={item.product_id}
                              onChange={(e) => updatePOLineItem(item.id, { product_id: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Optional description"
                              value={item.description}
                              onChange={(e) => updatePOLineItem(item.id, { description: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updatePOLineItem(item.id, { qty: Math.max(1, (item.qty || 1) - 1) })}
                                className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updatePOLineItem(item.id, { qty: Math.max(1, Number(e.target.value)) })}
                                className="w-12 text-center text-xs font-bold text-slate-800 dark:text-slate-100 outline-none border-none bg-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => updatePOLineItem(item.id, { qty: (item.qty || 1) + 1 })}
                                className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updatePOLineItem(item.id, { rate: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updatePOLineItem(item.id, { discount: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removePOLineItem(item.id)}
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

                {/* Bottom Summary Grid (SUBTOTAL, DISCOUNT, TAX, GRAND TOTAL) matching Screenshot */}
                {(() => {
                  const t = calcPOTotals();
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

                      {/* Dark Navy Container for GRAND TOTAL matching Screenshot */}
                      <div className="p-3.5 bg-[#0b1329] text-white">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GRAND TOTAL</p>
                        <p className="mt-1 text-base font-extrabold font-mono text-white">
                          Rs. {t.grandTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Notes Bottom Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes</label>
                <textarea
                  rows={4}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* PURCHASE INVOICES TAB */}
      {activeSubTab === 'Purchase Invoices' && (
        <div className="space-y-6">
          {piViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Purchase invoices register</h2>
                </div>
                <button
                  onClick={openCreatePIForm}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New purchase invoice
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">GRN / Invoice No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Warehouse</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(purchaseInvoices || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No purchase invoices recorded yet. Click New Purchase Invoice to create one.
                        </td>
                      </tr>
                    ) : (
                      (purchaseInvoices || []).map((pi) => {
                        const vend = vendors.find((v) => v.id === pi.vendor_id);
                        const wh = warehouses.find((w) => w.id === pi.warehouse_id);
                        return (
                          <tr key={pi.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{pi.grn_no || pi.invoice_no}</td>
                            <td className="px-4 py-3 text-slate-400">{pi.received_date || pi.document_date}</td>
                            <td className="px-4 py-3 font-medium text-slate-200">{vend?.name || 'Vendor'}</td>
                            <td className="px-4 py-3 text-slate-400">{wh?.name || 'Main Warehouse'}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                              Rs. {(pi.total_amount || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                                {pi.status || 'POSTED'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditPIForm(pi)}
                                  className="p-1 text-slate-400 hover:text-emerald-400 transition"
                                  title="Edit Purchase Invoice"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    deletePurchaseInvoice(pi.id);
                                    toast.success('Purchase Invoice deleted');
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
            /* NEW PURCHASE INVOICE FORM (Matching User Screenshots) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setPiViewMode('list')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Purchase Invoices Register
                </button>
              </div>

              {/* TOP SECTION: Main Header Card (Left) & Procurement Workflow (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Header Card (Left - 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingPIId ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}
                  </h2>

                  {/* Row 1: Vendor, Document date, Due date */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Vendor</label>
                      <select
                        value={piVendorId}
                        onChange={(e) => setPiVendorId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="">Select vendor</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Document date</label>
                      <input
                        type="date"
                        value={piDocDate}
                        onChange={(e) => setPiDocDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Due date</label>
                      <input
                        type="date"
                        value={piDueDate}
                        onChange={(e) => setPiDueDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Warehouse (Full Width) */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Warehouse</label>
                    <select
                      value={piWarehouseId}
                      onChange={(e) => setPiWarehouseId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.code ? `${w.code} · ` : ''}{w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 3: Gate pass number, Account category, Account head */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Gate pass number</label>
                      <input
                        type="text"
                        placeholder="Manual gate pass no."
                        value={piGatePassNo}
                        onChange={(e) => setPiGatePassNo(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account category</label>
                      <select
                        value={piAccountCategory}
                        onChange={(e) => setPiAccountCategory(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="All account categories">All account categories</option>
                        <option value="Current Assets">Current Assets</option>
                        <option value="Inventory Accounts">Inventory Accounts</option>
                        <option value="Direct Expenses">Direct Expenses</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account head</label>
                      <select
                        value={piAccountHead}
                        onChange={(e) => setPiAccountHead(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="Default Inventory / Purchase Account">Default Inventory / Purchase Account</option>
                        <option value="Inventory - Main Stock">Inventory - Main Stock</option>
                        <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                        <option value="Raw Material Purchases">Raw Material Purchases</option>
                      </select>
                      <p className="text-[11px] font-semibold text-slate-400 mt-1 leading-tight">
                        Choose the account category first, then select the account head.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Procurement Workflow Card (Right - 1 Column) matching screenshot */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Procurement workflow</h3>

                    {/* Green Notice Box from screenshot */}
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 border border-emerald-200 dark:border-emerald-800/40 text-xs font-medium text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Posting a purchase invoice receives stock. Use vendor bill only if you need a separate accounting liability workflow.
                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Number</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {editingPIId ? 'Assigned' : 'Assigned on save'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Financial year</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Auto selected</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons at Bottom Right matching screenshot */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPiViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePIRecord}
                      className="rounded-xl bg-[#00a884] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                    >
                      Save & Post
                    </button>
                  </div>
                </div>
              </div>

              {/* LINE ITEMS CARD (Matching Screenshots) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">LINE ITEMS</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Products and services</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addPILineItem}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-sm"
                  >
                    + Add line
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 w-56">PRODUCT</th>
                        <th className="px-4 py-3">DESCRIPTION</th>
                        <th className="px-4 py-3 w-36 text-center">QTY</th>
                        <th className="px-4 py-3 w-28">RATE</th>
                        <th className="px-4 py-3 w-24">DISCOUNT</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {piLineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="px-4 py-3">
                            <select
                              value={item.product_id}
                              onChange={(e) => updatePILineItem(item.id, { product_id: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Optional description"
                              value={item.description}
                              onChange={(e) => updatePILineItem(item.id, { description: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updatePILineItem(item.id, { qty: Math.max(1, (item.qty || 1) - 1) })}
                                className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updatePILineItem(item.id, { qty: Math.max(1, Number(e.target.value)) })}
                                className="w-12 text-center text-xs font-bold text-slate-800 dark:text-slate-100 outline-none border-none bg-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => updatePILineItem(item.id, { qty: (item.qty || 1) + 1 })}
                                className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updatePILineItem(item.id, { rate: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updatePILineItem(item.id, { discount: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removePILineItem(item.id)}
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

                {/* Bottom Summary Grid (SUBTOTAL, DISCOUNT, TAX, GRAND TOTAL) matching Screenshot */}
                {(() => {
                  const t = calcPITotals();
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

                      {/* Dark Navy Container for GRAND TOTAL matching Screenshot */}
                      <div className="p-3.5 bg-[#0b1329] text-white">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GRAND TOTAL</p>
                        <p className="mt-1 text-base font-extrabold font-mono text-white">
                          Rs. {t.grandTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Notes Bottom Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes</label>
                <textarea
                  rows={4}
                  value={piNotes}
                  onChange={(e) => setPiNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* DEBIT NOTES TAB (New Purchase Return) */}
      {activeSubTab === 'Debit Notes' && (
        <div className="space-y-6">
          {dnViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Debit notes / Purchase returns register</h2>
                </div>
                <button
                  onClick={openCreateDNForm}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New debit note
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">Debit Note No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Purpose / Reason</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(debitNotes || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No debit notes recorded yet. Click New Debit Note to create one.
                        </td>
                      </tr>
                    ) : (
                      (debitNotes || []).map((dn) => {
                        const vend = vendors.find((v) => v.id === dn.vendor_id);
                        return (
                          <tr key={dn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{dn.debit_note_no}</td>
                            <td className="px-4 py-3 text-slate-400">{dn.note_date || dn.document_date}</td>
                            <td className="px-4 py-3 font-medium text-slate-200">{vend?.name || 'Vendor'}</td>
                            <td className="px-4 py-3 text-slate-400">{dn.reason || dn.purpose_reason || 'Purchase Return'}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-rose-400">
                              Rs. {(dn.total_amount || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
                                {dn.status || 'POSTED'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditDNForm(dn)}
                                  className="p-1 text-slate-400 hover:text-emerald-400 transition"
                                  title="Edit Debit Note"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    deleteDebitNote(dn.id);
                                    toast.success('Debit Note deleted');
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
            /* NEW PURCHASE RETURN FORM (Matching User Screenshots) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setDnViewMode('list')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Debit Notes Register
                </button>
              </div>

              {/* TOP SECTION: Main Header Card (Left) & Procurement Workflow (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Header Card (Left - 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingDNId ? 'Edit Purchase Return' : 'New Purchase Return'}
                  </h2>

                  {/* Row 1: Vendor, Document date, Due date */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Vendor</label>
                      <select
                        value={dnVendorId}
                        onChange={(e) => setDnVendorId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="">Select vendor</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Document date</label>
                      <input
                        type="date"
                        value={dnDocDate}
                        onChange={(e) => setDnDocDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Due date</label>
                      <input
                        type="date"
                        value={dnDueDate}
                        onChange={(e) => setDnDueDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Warehouse (Full Width) */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Warehouse</label>
                    <select
                      value={dnWarehouseId}
                      onChange={(e) => setDnWarehouseId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.code ? `${w.code} · ` : ''}{w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Procurement Workflow Card (Right - 1 Column) matching screenshot */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Procurement workflow</h3>

                    {/* Light Emerald Notice Box from screenshot */}
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 border border-emerald-200 dark:border-emerald-800/40 text-xs font-medium text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Posting updates stock, payables and the general ledger.
                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Number</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {editingDNId ? 'Assigned' : 'Assigned on save'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Financial year</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Auto selected</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons at Bottom Right matching screenshot */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDnViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDNRecord}
                      className="rounded-xl bg-[#00a884] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                    >
                      Save & Post
                    </button>
                  </div>
                </div>
              </div>

              {/* LINE ITEMS CARD (Matching Screenshots) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">LINE ITEMS</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Products and services</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addDNLineItem}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-sm"
                  >
                    + Add line
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 w-56">PRODUCT</th>
                        <th className="px-4 py-3">DESCRIPTION</th>
                        <th className="px-4 py-3 w-36 text-center">QTY</th>
                        <th className="px-4 py-3 w-28">RATE</th>
                        <th className="px-4 py-3 w-24">DISCOUNT</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dnLineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="px-4 py-3">
                            <select
                              value={item.product_id}
                              onChange={(e) => updateDNLineItem(item.id, { product_id: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Optional description"
                              value={item.description}
                              onChange={(e) => updateDNLineItem(item.id, { description: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updateDNLineItem(item.id, { qty: Math.max(1, (item.qty || 1) - 1) })}
                                className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateDNLineItem(item.id, { qty: Math.max(1, Number(e.target.value)) })}
                                className="w-12 text-center text-xs font-bold text-slate-800 dark:text-slate-100 outline-none border-none bg-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => updateDNLineItem(item.id, { qty: (item.qty || 1) + 1 })}
                                className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateDNLineItem(item.id, { rate: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateDNLineItem(item.id, { discount: Number(e.target.value) })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeDNLineItem(item.id)}
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

                {/* Bottom Summary Grid (SUBTOTAL, DISCOUNT, TAX, GRAND TOTAL) matching Screenshots */}
                {(() => {
                  const t = calcDNTotals();
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

                      {/* Dark Navy Container for GRAND TOTAL matching Screenshots */}
                      <div className="p-3.5 bg-[#0b1329] text-white">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GRAND TOTAL</p>
                        <p className="mt-1 text-base font-extrabold font-mono text-white">
                          Rs. {t.grandTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Purpose / Reason Bottom Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Purpose / Reason</label>
                <textarea
                  rows={4}
                  value={dnPurposeReason}
                  onChange={(e) => setDnPurposeReason(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAYMENTS TAB (Pay Vendor Form) */}
      {activeSubTab === 'Payments' && (
        <div className="space-y-6">
          {vpViewMode === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Vendor payments register</h2>
                </div>
                <button
                  onClick={openCreateVPForm}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New payment
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">Payment No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Pay From</th>
                      <th className="px-4 py-3">Reference No</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(vendorPayments || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No vendor payments recorded yet. Click New Payment to create one.
                        </td>
                      </tr>
                    ) : (
                      (vendorPayments || []).map((vp) => {
                        const vend = vendors.find((v) => v.id === vp.vendor_id);
                        return (
                          <tr key={vp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-emerald-500 font-mono">{vp.payment_no}</td>
                            <td className="px-4 py-3 text-slate-400">{vp.payment_date}</td>
                            <td className="px-4 py-3 font-medium text-slate-200">{vend?.name || 'Vendor'}</td>
                            <td className="px-4 py-3 text-slate-300">{vp.payment_method || 'Cash in Hand'}</td>
                            <td className="px-4 py-3 font-mono text-slate-400">{vp.reference_no || '-'}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                              Rs. {(vp.amount || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditVPForm(vp)}
                                  className="p-1 text-slate-400 hover:text-emerald-400 transition"
                                  title="Edit Payment"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    deleteVendorPayment(vp.id);
                                    toast.success('Payment deleted');
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
            /* PAY PAYMENT FORM (Matching User Screenshot) */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setVpViewMode('list')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  ← Back to Vendor Payments Register
                </button>
              </div>

              {/* Title Outside Card matching screenshot */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">AMKAS INTERNATIONAL</p>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Pay Payment</h1>
              </div>

              {/* TOP SECTION: Main Header Card (Left) & Posting Rules Card (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Header Card (Left - 2 Columns) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {editingVPId ? 'Edit Payment' : 'Pay Payment'}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      Use one payment screen for vendors, customers or direct account heads.
                    </p>
                  </div>

                  {/* Row 1: Paid to & Date */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Paid to</label>
                      <select
                        value={vpVendorId}
                        onChange={(e) => setVpVendorId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="">Select customer, vendor or account</option>
                        <optgroup label="Vendors">
                          {vendors.map((v) => (
                            <option key={`v-${v.id}`} value={v.id}>
                              {v.name} ({v.code})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Customers">
                          {customers.map((c) => (
                            <option key={`c-${c.id}`} value={`c-${c.id}`}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Direct Account Heads">
                          <option value="acc-ap">Accounts Payable</option>
                          <option value="acc-advance">Vendor Advances</option>
                          <option value="acc-direct-exp">Direct Expenses</option>
                          <option value="acc-op-exp">Operating Expenses</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Date</label>
                      <input
                        type="date"
                        value={vpPaymentDate}
                        onChange={(e) => setVpPaymentDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Pay from & Amount */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pay from</label>
                      <select
                        value={vpPayFrom}
                        onChange={(e) => setVpPayFrom(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="Cash in Hand">Cash in Hand</option>
                        <option value="HBL Main Account">HBL Main Account</option>
                        <option value="Meezan Operations Account">Meezan Operations Account</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Petty Cash">Petty Cash</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Amount</label>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={vpAmount}
                        onChange={(e) => setVpAmount(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Row 3: Account head / category & Currency */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account head / category</label>
                      <select
                        value={vpAccountCategory}
                        onChange={(e) => setVpAccountCategory(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="Auto select based on selected party">Auto select based on selected party</option>
                        <option value="Accounts Payable">Accounts Payable</option>
                        <option value="Vendor Advances">Vendor Advances</option>
                        <option value="Accounts Receivable">Accounts Receivable</option>
                        <option value="Direct Expenses">Direct Expenses</option>
                        <option value="Operating Expenses">Operating Expenses</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Currency</label>
                      <select
                        value={vpCurrency}
                        onChange={(e) => setVpCurrency(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
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
                        value={vpExchangeRate}
                        onChange={(e) => setVpExchangeRate(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Reference number</label>
                      <input
                        type="text"
                        placeholder="Reference number"
                        value={vpRefNumber}
                        onChange={(e) => setVpRefNumber(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Row 5: Notes (Full Width) */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes</label>
                    <textarea
                      rows={5}
                      placeholder="Notes"
                      value={vpNotes}
                      onChange={(e) => setVpNotes(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Posting rules Card (Right - 1 Column) matching screenshot */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Posting rules</h3>

                    {/* Light Emerald Notice Box from screenshot */}
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 border border-emerald-200 dark:border-emerald-800/40 text-xs font-medium text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Vendor payments auto-allocate to outstanding bills. Customer/account payments post directly through the journal with CP numbering.
                    </div>
                  </div>

                  {/* Action Buttons at Bottom Right matching screenshot */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setVpViewMode('list')}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveVPRecord}
                      className="rounded-xl bg-[#00a884] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#008f70] transition"
                    >
                      Post payment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GENERIC PURCHASE MODAL */}
      {genericModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
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
                <label className="text-[11px] font-semibold text-slate-400">Vendor</label>
                <select
                  value={genericVendorId}
                  onChange={(e) => setGenericVendorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
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
              <button onClick={handleSaveGenericRecord} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Save Record</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW VENDOR BILL MODAL */}
      {newBillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Vendor Bill' : 'New Vendor Bill'}
              </h3>
              <button onClick={() => setNewBillOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Vendor</label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Bill date</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">LINE ITEMS</p>
                <button
                  onClick={addLine}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:underline"
                >
                  + Add line
                </button>
              </div>
              <div className="space-y-2">
                {lineItems.map((line) => (
                  <div key={line.id} className="flex items-center gap-2">
                    <select
                      value={line.product_id}
                      onChange={(e) => updateLine(line.id, { product_id: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="">Select item / SKU</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={line.qty}
                      onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Rate"
                      value={line.rate}
                      onChange={(e) => updateLine(line.id, { rate: Number(e.target.value) })}
                      className="w-24 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                    />
                    <span className="w-28 text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Rs. {(line.qty * line.rate).toFixed(2)}
                    </span>
                    <button onClick={() => removeLine(line.id)} className="text-slate-400 hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-1 text-right text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">Rs. {totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 text-sm border-t pt-1">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-500">Rs. {totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setNewBillOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveBill('UNPOSTED')}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSaveBill('POSTED')}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Save & Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
