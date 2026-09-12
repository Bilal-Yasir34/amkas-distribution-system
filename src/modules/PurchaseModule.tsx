import { useState, useMemo } from 'react';
import { Plus, ShoppingCart, DollarSign, FileText, CheckCircle, Clock, X, Trash2, Edit, Printer, Send } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { todayISO, safeUUID, nextDocNumber, formatDate, formatUserRequester } from '@/lib/utils';
import { DateInput } from '@/components/DateInput';
import type { VendorBill, Vendor, PurchaseInvoice } from '@/lib/types';
import { getAllArticles, getProductsForArticle, getArticleForProduct } from '@/lib/articleUtils';
import { PurchaseInvoicePrint } from '@/components/PurchaseInvoicePrint';

export function PurchaseModule() {
  const toast = useToast();
  const { isAdmin, profile } = useAuth();
  const {
    vendors = [],
    customers = [],
    products = [],
    productArticles = [],
    universalArticles = [],
    categories = [],
    warehouses = [],
    bankAccounts = [],
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
    addApprovalQueueItem,
    accountTypes = [],
  } = useDataStore();

  const allArticles = useMemo(
    () => getAllArticles(universalArticles, products, productArticles),
    [universalArticles, products, productArticles]
  );

  const availableVendors = useMemo(() => {
    const supplierCustomers = customers.filter(
      (c) => c.account_type?.toLowerCase() === 'supplier' || c.account_type?.toLowerCase() === 'vendor'
    );
    return [...vendors, ...supplierCustomers];
  }, [vendors, customers]);

  const availableCustomers = useMemo(() => {
    return customers.filter(
      (c) => c.account_type?.toLowerCase() === 'customer' || !c.account_type
    );
  }, [customers]);

  const [activeSubTab, setActiveSubTab] = useState<'Purchases' | 'Requests' | 'Purchase Orders' | 'Purchase Invoices' | 'Debit Notes' | 'Payments'>('Purchases');
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState<'ALL' | 'POSTED' | 'PENDING_APPROVAL'>('ALL');

  const [newBillOpen, setNewBillOpen] = useState(false);
  const [genericModalOpen, setGenericModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printInvoice, setPrintInvoice] = useState<PurchaseInvoice | null>(null);

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
    { id: '1', product_id: '', article_id: '', colour: '', description: '', qty: 1, rate: 0, tax_pct: 0 },
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
      { id: safeUUID(), product_id: products[0]?.id || '', article_id: '', colour: '', description: products[0]?.name || '', qty: 1, rate: products[0]?.purchase_price || 0, tax_pct: 0 },
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
        id: safeUUID(),
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
          id: i.id || safeUUID(),
          product_id: i.product_id || '',
          description: i.description || '',
          qty: i.qty ?? 1,
          rate: i.rate ?? 0,
          discount: i.discount ?? 0,
          tax_pct: i.tax_pct ?? 0,
        }))
      );
    } else {
      setPrLineItems([
        {
          id: safeUUID(),
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
        id: safeUUID(),
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
              updated.description = p.article_name ? `${p.name} (${p.article_name})` : p.name;
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

    const formattedItems = prLineItems.map((item) => {
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

    if (editingPRId) {
      updatePurchaseRequest(editingPRId, {
        request_date: prDocDate,
        document_date: prDocDate,
        required_date: prRequiredDate,
        status: prStatus as any,
        total_amount: totals.grandTotal,
        items: formattedItems,
      });
      toast.success('Purchase Request updated successfully');
    } else {
      const prNo = nextDocNumber('PR', (purchaseRequests || []).map((p) => p.request_no), 2);
      addPurchaseRequest({
        request_no: prNo,
        department_id: 'd1',
        request_date: prDocDate,
        document_date: prDocDate,
        required_date: prRequiredDate,
        requested_by: 'admin',
        status: prStatus as any,
        total_amount: totals.grandTotal,
        items: formattedItems,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Request ${prNo} saved successfully!`);
    }

    setEditingPRId(null);
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
        id: safeUUID(),
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
          id: i.id || safeUUID(),
          product_id: i.product_id || '',
          description: i.description || '',
          qty: i.qty ?? 1,
          rate: i.rate ?? 0,
          discount: i.discount ?? 0,
          tax_pct: i.tax_pct ?? 0,
        }))
      );
    } else {
      setPoLineItems([
        {
          id: safeUUID(),
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
        id: safeUUID(),
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
              updated.description = p.article_name ? `${p.name} (${p.article_name})` : p.name;
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
        items: formattedItems,
      });
      toast.success('Purchase Order updated successfully');
    } else {
      const poNo = poSupplierRef?.trim() || nextDocNumber('PO', (purchaseOrders || []).map((p) => p.po_no), 2);
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
        items: formattedItems,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Order ${poNo} created successfully!`);
    }

    setEditingPOId(null);
    setPoSupplierRef('');
    setPoViewMode('list');
  };

  // Purchase Invoice Form State (matching screenshots)
  const [piViewMode, setPiViewMode] = useState<'list' | 'form'>('list');
  const [editingPIId, setEditingPIId] = useState<string | null>(null);

  const [piPartyType, setPiPartyType] = useState<string>('Vendor');
  const [piVendorId, setPiVendorId] = useState('');

  const handlePIPartyTypeChange = (type: string) => {
    setPiPartyType(type);
    const all = [...customers, ...vendors];
    const unique = all.filter((item, idx, arr) => arr.findIndex(x => x.id === item.id) === idx);
    if (!type || type === 'ALL') {
      setPiVendorId(unique[0]?.id || '');
    } else {
      const filtered = unique.filter(c => c.account_type?.toLowerCase() === type.toLowerCase());
      setPiVendorId(filtered[0]?.id || unique[0]?.id || '');
    }
  };

  const [piDocDate, setPiDocDate] = useState('2026-07-22');
  const [piDueDate, setPiDueDate] = useState('2026-07-29');
  const [piWarehouseId, setPiWarehouseId] = useState('');
  const [piGatePassNo, setPiGatePassNo] = useState('');
  const [piAccountCategory, setPiAccountCategory] = useState('All account categories');
  const [piAccountHead, setPiAccountHead] = useState('Default Inventory / Purchase Account');
  const [piNotes, setPiNotes] = useState('');
  const [piReferenceNo, setPiReferenceNo] = useState('');
  const [piVendorInvoiceNo, setPiVendorInvoiceNo] = useState('');

  const [piLineItems, setPiLineItems] = useState<
    { id: string; product_id: string; article_id: string; colour: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }[]
  >([{ id: '1', product_id: '', article_id: '', colour: '', description: '', qty: 1, rate: 0, discount: 0, tax_pct: 0 }]);

  const openCreatePIForm = () => {
    setEditingPIId(null);
    setPiPartyType('ALL');
    setPiVendorId(availableVendors[0]?.id || vendors[0]?.id || customers[0]?.id || '');
    setPiDocDate(todayISO());
    setPiDueDate(todayISO());
    setPiWarehouseId(warehouses[0]?.id || 'w1');
    setPiGatePassNo('');
    setPiAccountCategory('All account categories');
    setPiAccountHead('Default Inventory / Purchase Account');
    setPiNotes('');
    setPiVendorInvoiceNo('');
    const autoRef = nextDocNumber('PI', (purchaseInvoices || []).map((p) => p.invoice_no || ''), 2);
    setPiReferenceNo(autoRef);
    const firstProd = products[0];
    const firstArt = firstProd ? getArticleForProduct(firstProd.id, products, productArticles) : '';
    setPiLineItems([
      {
        id: safeUUID(),
        product_id: firstProd?.id || '',
        article_id: firstArt || '',
        colour: '',
        description: firstProd?.name || '',
        qty: 1,
        rate: firstProd?.purchase_price || firstProd?.cost_price || 0,
        discount: 0,
        tax_pct: firstProd?.tax_pct || 0,
      },
    ]);
    setPiViewMode('form');
  };

  const openEditPIForm = (pi: any) => {
    setEditingPIId(pi.id);
    setPiReferenceNo(pi.invoice_no || pi.grn_no || '');
    setPiVendorInvoiceNo(pi.vendor_invoice_no || '');
    const party = customers.find((c) => c.id === pi.vendor_id) || vendors.find((v) => v.id === pi.vendor_id);
    let pType = 'ALL';
    if (party?.account_type) {
      const matchingType = accountTypes.find((at: any) => at.name.toLowerCase() === party?.account_type?.toLowerCase());
      if (matchingType) pType = matchingType.name;
    } else if (vendors.some((v) => v.id === pi.vendor_id)) {
      pType = 'Vendor';
    }
    setPiPartyType(pType);
    setPiVendorId(pi.vendor_id || '');
    setPiDocDate(pi.received_date || pi.document_date || todayISO());
    setPiDueDate(pi.due_date || todayISO());
    setPiWarehouseId(pi.warehouse_id || warehouses[0]?.id || 'w1');
    setPiGatePassNo(pi.gate_pass_no || '');
    setPiAccountCategory(pi.account_category || 'All account categories');
    setPiAccountHead(pi.account_head || 'Default Inventory / Purchase Account');
    setPiNotes(pi.notes || '');

    if (pi.items && pi.items.length > 0) {
      setPiLineItems(
        pi.items.map((i: any) => {
          const p = products.find((x) => x.id === i.product_id);
          const art = i.article_id || (p ? getArticleForProduct(p.id, products, productArticles) : '');
          return {
            id: i.id || safeUUID(),
            product_id: i.product_id || '',
            article_id: art || '',
            colour: i.colour || '',
            description: i.description || (p ? (art ? `[${art}] ${p.name}` : p.name) : ''),
            qty: i.qty ?? 1,
            rate: i.rate !== undefined ? i.rate : (p ? p.purchase_price || p.cost_price || p.sale_price : 0),
            discount: i.discount ?? 0,
            tax_pct: i.tax_pct ?? 0,
          };
        })
      );
    } else {
      const defaultProd = products[0];
      const defaultArt = defaultProd ? getArticleForProduct(defaultProd.id, products, productArticles) : '';
      setPiLineItems([
        {
          id: safeUUID(),
          product_id: defaultProd?.id || '',
          article_id: defaultArt || '',
          colour: '',
          description: defaultProd?.name || 'Standard Procurement Line',
          qty: 1,
          rate: pi.subtotal || pi.total_amount || (defaultProd ? defaultProd.purchase_price || defaultProd.cost_price || 0 : 0),
          discount: pi.discount_total || 0,
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
        id: safeUUID(),
        product_id: defaultProd?.id || '',
        article_id: '',
        colour: '',
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
    patch: Partial<{ product_id: string; article_id: string; colour: string; description: string; qty: number; rate: number; discount: number; tax_pct: number }>
  ) => {
    setPiLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...patch };
          const p = products.find((x) => x.id === (patch.product_id !== undefined ? patch.product_id : item.product_id));

          if (patch.article_id !== undefined && patch.product_id === undefined) {
            const newArt = patch.article_id;
            const validProds = getProductsForArticle(newArt, products, productArticles);
            const stillValid = validProds.some((vp) => vp.id === item.product_id);
            if (!stillValid) {
              updated.product_id = '';
              updated.description = newArt ? `[${newArt}]` : '';
              updated.rate = 0;
            }
          }

          if (patch.product_id) {
            if (p) {
              const currentArt = updated.article_id || getArticleForProduct(p.id, products, productArticles);
              updated.description = currentArt ? `[${currentArt}] ${p.name}` : (p.description || p.name);
              updated.rate = p.purchase_price || p.cost_price || p.sale_price || 0;
              updated.tax_pct = p.tax_pct || 0;
              if (!updated.article_id && currentArt) {
                updated.article_id = currentArt;
              }
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

  const handleSavePIRecord = (_status?: string) => {
    if (!piVendorId) return toast.error('Please select a vendor');
    const totals = calcPITotals();

    const partyObj =
      vendors.find((v) => v.id === piVendorId) ||
      customers.find((c) => c.id === piVendorId) ||
      availableVendors.find((v) => v.id === piVendorId);
    const resolvedVendorName = partyObj?.name || (piVendorId ? piVendorId : 'Vendor');
    const targetPIId = editingPIId || safeUUID();

    const formattedItems = piLineItems.map((item) => {
      const gross = (item.qty || 0) * (item.rate || 0);
      const lineTotal = (gross - (item.discount || 0)) * (1 + (item.tax_pct || 0) / 100);
      return {
        id: item.id || safeUUID(),
        purchase_invoice_id: targetPIId,
        product_id: item.product_id,
        article_id: item.article_id || '',
        colour: item.colour || '',
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        discount: item.discount,
        tax_pct: item.tax_pct,
        line_total: lineTotal,
      };
    });

    const finalStatus = 'PENDING_APPROVAL';
    const requester = formatUserRequester(profile, 'Procurement');

    if (editingPIId) {
      updatePurchaseInvoice(editingPIId, {
        vendor_id: piVendorId,
        vendor_name: resolvedVendorName,
        party_name: resolvedVendorName,
        warehouse_id: piWarehouseId,
        received_date: piDocDate,
        document_date: piDocDate,
        due_date: piDueDate,
        gate_pass_no: piGatePassNo,
        account_category: piAccountCategory,
        account_head: piAccountHead,
        vendor_invoice_no: piVendorInvoiceNo,
        status: finalStatus,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: piNotes,
        items: formattedItems,
      });
      addApprovalQueueItem({
        module: 'Purchase',
        entity_type: 'purchase_invoice',
        record_id: editingPIId,
        record_no: piReferenceNo || 'PI',
        requested_by: requester.formatted,
        requested_by_name: requester.name,
        requested_by_role: requester.role,
        amount: totals.grandTotal,
        status: 'PENDING',
        party_name: resolvedVendorName,
        warehouse_id: piWarehouseId || 'w1',
        items_summary: formattedItems.map((it) => `${it.description || 'Product'} (Qty: ${it.qty})`).join(', ') || `${formattedItems.length} items`,
      });
      toast.success('Purchase Invoice updated and submitted to Approval Center');
    } else {
      const piNo = piReferenceNo || nextDocNumber('PI', (purchaseInvoices || []).map((p) => p.invoice_no || ''), 2);
      addPurchaseInvoice({
        id: targetPIId,
        grn_no: piNo,
        invoice_no: piNo,
        po_id: null,
        vendor_id: piVendorId,
        vendor_name: resolvedVendorName,
        party_name: resolvedVendorName,
        warehouse_id: piWarehouseId,
        received_date: piDocDate,
        document_date: piDocDate,
        due_date: piDueDate,
        gate_pass_no: piGatePassNo,
        account_category: piAccountCategory,
        account_head: piAccountHead,
        vendor_invoice_no: piVendorInvoiceNo,
        status: finalStatus,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: piNotes,
        items: formattedItems,
        created_at: new Date().toISOString(),
      });
      addApprovalQueueItem({
        module: 'Purchase',
        entity_type: 'purchase_invoice',
        record_id: targetPIId,
        record_no: piNo,
        requested_by: requester.formatted,
        requested_by_name: requester.name,
        requested_by_role: requester.role,
        amount: totals.grandTotal,
        status: 'PENDING',
        party_name: resolvedVendorName,
        warehouse_id: piWarehouseId || 'w1',
        items_summary: formattedItems.map((it) => `${it.description || 'Product'} (Qty: ${it.qty})`).join(', ') || `${formattedItems.length} items`,
      });
      toast.success(`Purchase Invoice ${piNo} submitted to Approval Center!`);
    }

    setEditingPIId(null);
    setPiReferenceNo('');
    setPiVendorInvoiceNo('');
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
        id: safeUUID(),
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
          id: i.id || safeUUID(),
          product_id: i.product_id || '',
          description: i.description || '',
          qty: i.qty ?? 1,
          rate: i.rate ?? 0,
          discount: i.discount ?? 0,
          tax_pct: i.tax_pct ?? 0,
        }))
      );
    } else {
      setVbLineItems([
        {
          id: safeUUID(),
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
        id: safeUUID(),
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
              updated.description = p.article_name ? `${p.name} (${p.article_name})` : p.name;
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

    const finalStatus = 'PENDING_APPROVAL';
    const partyObj = availableVendors.find((v) => v.id === vbVendorId);

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
        status: finalStatus,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes: vbNotes,
        items: formattedItems,
      });
      addApprovalQueueItem({
        module: 'Purchase',
        entity_type: 'vendor_bill',
        record_id: editingVBId,
        record_no: vbSupplierRef || 'VB',
        requested_by: 'admin',
        amount: totals.grandTotal,
        status: 'PENDING',
        party_name: partyObj?.name || 'Vendor',
        warehouse_id: vbWarehouseId || 'w1',
        items_summary: formattedItems.map((it) => `${it.description || 'Product'} (Qty: ${it.qty})`).join(', ') || `${formattedItems.length} items`,
      });
      toast.success('Vendor Bill updated and submitted to Approval Center');
    } else {
      const billNo = vbSupplierRef?.trim() || nextDocNumber('VB', (vendorBills || []).map((v) => v.bill_no), 2);
      const billId = safeUUID();
      addVendorBill({
        id: billId,
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
        status: finalStatus,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        paid_amount: 0,
        notes: vbNotes,
        items: formattedItems,
        created_at: new Date().toISOString(),
      });
      addApprovalQueueItem({
        module: 'Purchase',
        entity_type: 'vendor_bill',
        record_id: billId,
        record_no: billNo,
        requested_by: 'admin',
        amount: totals.grandTotal,
        status: 'PENDING',
        party_name: partyObj?.name || 'Vendor',
        warehouse_id: vbWarehouseId || 'w1',
        items_summary: formattedItems.map((it) => `${it.description || 'Product'} (Qty: ${it.qty})`).join(', ') || `${formattedItems.length} items`,
      });
      toast.success(`Vendor Bill ${billNo} submitted to Approval Center!`);
    }

    setEditingVBId(null);
    setVbSupplierRef('');
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
        id: safeUUID(),
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
          id: i.id || safeUUID(),
          product_id: i.product_id || '',
          description: i.description || '',
          qty: i.qty ?? 1,
          rate: i.rate ?? 0,
          discount: i.discount ?? 0,
          tax_pct: i.tax_pct ?? 0,
        }))
      );
    } else {
      setDnLineItems([
        {
          id: safeUUID(),
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
        id: safeUUID(),
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
              updated.description = p.article_name ? `${p.name} (${p.article_name})` : p.name;
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

    const finalStatus = 'PENDING_APPROVAL';
    const partyObj = availableVendors.find((v) => v.id === dnVendorId);

    if (editingDNId) {
      updateDebitNote(editingDNId, {
        vendor_id: dnVendorId,
        note_date: dnDocDate,
        due_date: dnDueDate,
        reason: dnPurposeReason || 'Purchase Return',
        status: finalStatus,
        total_amount: totals.grandTotal,
        items: formattedItems,
      });
      addApprovalQueueItem({
        module: 'Purchase',
        entity_type: 'purchase_return',
        record_id: editingDNId,
        record_no: 'DN',
        requested_by: 'admin',
        amount: totals.grandTotal,
        status: 'PENDING',
        party_name: partyObj?.name || 'Vendor',
        warehouse_id: 'w1',
        items_summary: formattedItems.map((it) => `${it.description || 'Product'} (Qty: ${it.qty})`).join(', ') || `${formattedItems.length} items`,
      });
      toast.success('Debit Note / Purchase Return updated and submitted to Approval Center');
    } else {
      const dnNo = nextDocNumber('DN', (debitNotes || []).map((d) => d.debit_note_no), 2);
      const dnId = safeUUID();
      addDebitNote({
        id: dnId,
        debit_note_no: dnNo,
        vendor_bill_id: null,
        vendor_id: dnVendorId,
        note_date: dnDocDate,
        due_date: dnDueDate,
        reason: dnPurposeReason || 'Purchase Return',
        status: finalStatus,
        total_amount: totals.grandTotal,
        items: formattedItems,
        created_at: new Date().toISOString(),
      });
      addApprovalQueueItem({
        module: 'Purchase',
        entity_type: 'purchase_return',
        record_id: dnId,
        record_no: dnNo,
        requested_by: 'admin',
        amount: totals.grandTotal,
        status: 'PENDING',
        party_name: partyObj?.name || 'Vendor',
        warehouse_id: 'w1',
        items_summary: formattedItems.map((it) => `${it.description || 'Product'} (Qty: ${it.qty})`).join(', ') || `${formattedItems.length} items`,
      });
      toast.success(`Debit Note / Purchase Return ${dnNo} submitted to Approval Center!`);
    }

    setEditingDNId(null);
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
      const paymentNo = nextDocNumber('PAY', (vendorPayments || []).map((v) => v.payment_no), 2);
      addVendorPayment({
        payment_no: paymentNo,
        vendor_bill_id: null,
        vendor_id: vpVendorId,
        payment_date: vpPaymentDate,
        payment_method: vpPayFrom,
        paid_from_account_id: 'ba1',
        amount: amountVal,
        reference_no: vpRefNumber || paymentNo,
        currency: vpCurrency,
        status: 'POSTED',
        notes: vpNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Payment ${paymentNo} posted! Vendor balance updated.`);
    }

    setEditingVPId(null);
    setVpRefNumber('');
    setVpViewMode('list');
  };

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      { id: safeUUID(), product_id: '', article_id: '', colour: '', description: '', qty: 1, rate: 0, tax_pct: 0 },
    ]);
  };

  const updateLine = (id: string, patch: Partial<(typeof lineItems)[0]>) => {
    setLineItems((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const updated = { ...l, ...patch };
          const p = products.find((x) => x.id === (patch.product_id !== undefined ? patch.product_id : l.product_id));

          if (patch.article_id !== undefined && patch.product_id === undefined) {
            const newArt = patch.article_id;
            const validProds = getProductsForArticle(newArt, products, productArticles);
            const stillValid = validProds.some((vp) => vp.id === l.product_id);
            if (!stillValid) {
              updated.product_id = '';
              updated.description = newArt ? `[${newArt}]` : '';
              updated.rate = 0;
            }
          }

          if (patch.product_id) {
            if (p) {
              const currentArt = updated.article_id || getArticleForProduct(p.id, products, productArticles);
              updated.description = currentArt ? `[${currentArt}] ${p.name}` : (p.description || p.name);
              updated.rate = p.purchase_price || p.cost_price || p.sale_price || 0;
              if (!updated.article_id && currentArt) {
                updated.article_id = currentArt;
              }
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
    const finalStatus = status === 'UNPOSTED' ? 'UNPOSTED' : 'PENDING_APPROVAL';
    const partyObj = availableVendors.find((v) => v.id === vendorId);
    const requester = formatUserRequester(profile, 'Procurement');

    const formattedBillItems = lineItems.map((item) => {
      const gross = (item.qty || 0) * (item.rate || 0);
      const lineTotal = gross * (1 + (item.tax_pct || 0) / 100);
      return {
        id: item.id,
        product_id: item.product_id,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        discount: 0,
        tax_pct: item.tax_pct,
        line_total: lineTotal,
      };
    });

    if (editingId) {
      updateVendorBill(editingId, {
        vendor_id: vendorId,
        warehouse_id: warehouseId,
        bill_date: billDate,
        due_date: dueDate,
        vendor_invoice_no: vendorInvoiceNo,
        status: finalStatus,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        notes,
        items: formattedBillItems,
      });
      if (finalStatus === 'PENDING_APPROVAL') {
        addApprovalQueueItem({
          module: 'Purchase',
          entity_type: 'vendor_bill',
          record_id: editingId,
          record_no: vendorInvoiceNo || 'VB',
          requested_by: 'admin',
          amount: totals.grandTotal,
          status: 'PENDING',
          party_name: partyObj?.name || 'Vendor',
          warehouse_id: warehouseId || 'w1',
          items_summary: 'Vendor Bill items',
        });
        toast.success(`Vendor Bill updated and submitted to Approval Center`);
      } else {
        toast.success(`Vendor Bill updated (Draft)`);
      }
    } else {
      const billNo = vendorInvoiceNo?.trim() || nextDocNumber('VB', (vendorBills || []).map((v) => v.bill_no), 2);
      const billId = safeUUID();
      addVendorBill({
        id: billId,
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
        status: finalStatus,
        subtotal: totals.subtotal,
        discount_total: 0,
        tax_total: totals.taxTotal,
        total_amount: totals.grandTotal,
        paid_amount: 0,
        notes,
        items: formattedBillItems,
        created_by: 'admin',
        created_at: new Date().toISOString(),
      });
      if (finalStatus === 'PENDING_APPROVAL') {
        addApprovalQueueItem({
          module: 'Purchase',
          entity_type: 'vendor_bill',
          record_id: billId,
          record_no: billNo,
          requested_by: requester.formatted,
          requested_by_name: requester.name,
          requested_by_role: requester.role,
          amount: totals.grandTotal,
          status: 'PENDING',
          party_name: partyObj?.name || 'Vendor',
          warehouse_id: warehouseId || 'w1',
          items_summary: 'Vendor Bill items',
        });
        toast.success(`Vendor Bill ${billNo} submitted to Approval Center!`);
      } else {
        toast.success(`Vendor Bill ${billNo} saved as Draft`);
      }
    }
    setEditingId(null);
    setNewBillOpen(false);
  };

  const handleSaveGenericRecord = () => {
    const amountVal = Number(genericAmount) || 1000;
    const partyObj = availableVendors.find((v) => v.id === genericVendorId);
    const requester = formatUserRequester(profile, 'Procurement');

    if (activeSubTab === 'Requests') {
      const prNo = nextDocNumber('PR', (purchaseRequests || []).map((p) => p.request_no), 2);
      addPurchaseRequest({
        request_no: prNo,
        department_id: 'd1',
        request_date: todayISO(),
        required_date: todayISO(),
        requested_by: requester.formatted,
        status: 'PENDING',
        notes: genericNotes,
        created_at: new Date().toISOString(),
      });
      toast.success(`Purchase Request ${prNo} created and added to Requests register!`);
    } else if (activeSubTab === 'Purchase Orders') {
      const poNo = nextDocNumber('PO', (purchaseOrders || []).map((p) => p.po_no), 2);
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
      const piNo = nextDocNumber('PI', (purchaseInvoices || []).map((p) => p.invoice_no || ''), 2);
      const piId = safeUUID();
      addPurchaseInvoice({
        id: piId,
        grn_no: piNo,
        po_id: null,
        vendor_id: genericVendorId,
        warehouse_id: warehouses[0]?.id || 'w1',
        received_date: todayISO(),
        status: 'PENDING_APPROVAL',
        notes: genericNotes,
        created_at: new Date().toISOString(),
      });
      addApprovalQueueItem({
        module: 'Purchase',
        entity_type: 'purchase_invoice',
        record_id: piId,
        record_no: piNo,
        requested_by: requester.formatted,
        requested_by_name: requester.name,
        requested_by_role: requester.role,
        amount: amountVal,
        status: 'PENDING',
        party_name: partyObj?.name || 'Vendor',
        warehouse_id: warehouses[0]?.id || 'w1',
        items_summary: 'Purchase items',
      });
      toast.success(`Purchase Invoice ${piNo} created and submitted to Approval Center!`);
    } else if (activeSubTab === 'Debit Notes') {
      const dnNo = nextDocNumber('DN', (debitNotes || []).map((d) => d.debit_note_no), 2);
      const dnId = safeUUID();
      addDebitNote({
        id: dnId,
        debit_note_no: dnNo,
        vendor_bill_id: null,
        vendor_id: genericVendorId,
        note_date: todayISO(),
        reason: genericNotes || 'Purchase Return',
        status: 'PENDING_APPROVAL',
        total_amount: amountVal,
        created_at: new Date().toISOString(),
      });
      addApprovalQueueItem({
        module: 'Purchase',
        entity_type: 'purchase_return',
        record_id: dnId,
        record_no: dnNo,
        requested_by: requester.formatted,
        requested_by_name: requester.name,
        requested_by_role: requester.role,
        amount: amountVal,
        status: 'PENDING',
        party_name: partyObj?.name || 'Vendor',
        warehouse_id: warehouses[0]?.id || 'w1',
        items_summary: 'Purchase Return items',
      });
      toast.success(`Debit Note ${dnNo} created and submitted to Approval Center!`);
    } else if (activeSubTab === 'Payments') {
      const vpNo = `CP-${String(vendorPayments.length + 1).padStart(5, '0')}`;
      addVendorPayment({
        payment_no: vpNo,
        vendor_id: genericVendorId,
        payment_date: todayISO(),
        payment_method: 'Cash',
        paid_from_account_id: 'Cash in Hand',
        amount: amountVal,
        reference_no: null,
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Purchase Management</h1>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto no-scrollbar whitespace-nowrap">
        {['Purchases'].map((tab) => (
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

      {/* PURCHASES TAB */}
      {activeSubTab === 'Purchases' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROCUREMENT WORKFLOW</p>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Purchase register</h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800 text-xs">
                  <button
                    onClick={() => setPurchaseStatusFilter('ALL')}
                    className={`px-3 py-1 rounded-md font-semibold transition ${purchaseStatusFilter === 'ALL' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    All ({(purchaseInvoices || []).length})
                  </button>
                  <button
                    onClick={() => setPurchaseStatusFilter('POSTED')}
                    className={`px-3 py-1 rounded-md font-semibold transition ${purchaseStatusFilter === 'POSTED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    Accepted / Posted ({(purchaseInvoices || []).filter(p => p.status === 'POSTED').length})
                  </button>
                  <button
                    onClick={() => setPurchaseStatusFilter('PENDING_APPROVAL')}
                    className={`px-3 py-1 rounded-md font-semibold transition ${purchaseStatusFilter === 'PENDING_APPROVAL' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    Pending Approval ({(purchaseInvoices || []).filter(p => p.status === 'PENDING_APPROVAL').length})
                  </button>
                </div>
                <button
                  onClick={openCreatePIForm}
                  className="flex items-center gap-2 btn-primary shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New Purchase
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">GRN / Invoice No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Party / Vendor</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(() => {
                    const filteredPIs = (purchaseInvoices || []).filter((pi) => {
                      if (purchaseStatusFilter === 'POSTED') return pi.status === 'POSTED';
                      if (purchaseStatusFilter === 'PENDING_APPROVAL') return pi.status === 'PENDING_APPROVAL';
                      return true;
                    });
                    if (filteredPIs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                            No purchases recorded for this filter. Click New Purchase to create one.
                          </td>
                        </tr>
                      );
                    }
                    return filteredPIs.map((pi) => {
                      const party = vendors.find((v) => v.id === pi.vendor_id) || customers.find((c) => c.id === pi.vendor_id);
                      const wh = warehouses.find((w) => w.id === pi.warehouse_id);
                      const partyDisplayName = party?.name || (pi as any).vendor_name || (pi as any).party_name || 'Vendor / Party';
                      const isPosted = pi.status === 'POSTED';
                      const isPending = pi.status === 'PENDING_APPROVAL';
                      return (
                        <tr key={pi.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-amber-500 font-mono">{pi.grn_no || pi.invoice_no}</td>
                          <td className="px-4 py-3 text-slate-400">{formatDate(pi.received_date || pi.document_date || '')}</td>
                          <td className="px-4 py-3 font-medium text-slate-200">{partyDisplayName}</td>
                          <td className="px-4 py-3 text-slate-400">{wh?.name || 'Main Warehouse'}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-amber-400">
                            Rs. {(pi.total_amount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                              isPosted
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : isPending
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-slate-500/15 text-slate-300 border-slate-700'
                            }`}>
                              {isPosted ? 'ACCEPTED (POSTED)' : isPending ? 'PENDING APPROVAL' : (pi.status || 'DRAFT')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditPIForm(pi)}
                                className="p-1 text-slate-400 hover:text-amber-400 transition"
                                title="Edit Purchase Invoice"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setPrintInvoice(pi)}
                                className="p-1 text-slate-400 hover:text-white transition"
                                title="Print Purchase Invoice"
                              >
                                <Printer className="h-3.5 w-3.5" />
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
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* NEW / EDIT PURCHASE INVOICE MODAL */}
          {piViewMode === 'form' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 font-mono">PURCHASE INVOICE WORKFLOW</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {editingPIId ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setPiViewMode('list')}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* TOP SECTION: Main Header Card (Left) & Procurement Workflow (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Header Card (Left - 2 Columns) */}
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {editingPIId ? 'Edit Purchase' : 'New Purchase'}
                    </h2>

                    {/* Row 1: Type, Party Selection, Reference No, Document date, Due date */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono">Ref / Invoice No</label>
                        <input
                          type="text"
                          value={piReferenceNo}
                          onChange={(e) => setPiReferenceNo(e.target.value)}
                          placeholder="e.g. PI-01"
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-bold text-amber-500 dark:border-slate-700 dark:bg-slate-800 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Type</label>
                        <select
                          value={piPartyType}
                          onChange={(e) => handlePIPartyTypeChange(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        >
                          <option value="ALL">All Types</option>
                          {accountTypes.map((at) => (
                            <option key={at.id} value={at.name}>{at.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Select {piPartyType}
                        </label>
                        <select
                          value={piVendorId}
                          onChange={(e) => setPiVendorId(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        >
                          <option value="">Select {piPartyType === 'ALL' ? 'Party' : piPartyType}</option>
                          {(() => {
                            const all = [...customers, ...vendors.map(v => ({ ...v, _origin: 'vendor' as const }))];
                            const unique = all.filter((item, idx, arr) => arr.findIndex(x => x.id === item.id) === idx);
                            let list = (!piPartyType || piPartyType === 'ALL')
                              ? unique
                              : unique.filter(c => c.account_type?.toLowerCase() === piPartyType.toLowerCase());
                            if (piVendorId && !list.some(p => p.id === piVendorId)) {
                              const found = unique.find(p => p.id === piVendorId);
                              if (found) {
                                list = [found, ...list];
                              } else {
                                const fromPI = purchaseInvoices.find(p => p.vendor_id === piVendorId || p.id === editingPIId);
                                const partyName = fromPI?.vendor_name || (fromPI as any)?.party_name || piVendorId;
                                list = [{ id: piVendorId, name: partyName } as any, ...list];
                              }
                            }
                            return list;
                          })().map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <DateInput
                        label="Document date (DD/MM/YY)"
                        value={piDocDate}
                        onChange={setPiDocDate}
                        className="mt-1"
                      />

                      <DateInput
                        label="Due date (DD/MM/YY)"
                        value={piDueDate}
                        onChange={setPiDueDate}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Warehouse</label>
                        <select
                          value={piWarehouseId}
                          onChange={(e) => setPiWarehouseId(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        >
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Supplier Invoice No</label>
                        <input
                          type="text"
                          value={piVendorInvoiceNo}
                          onChange={(e) => setPiVendorInvoiceNo(e.target.value)}
                          placeholder="e.g. INV-9901"
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Procurement Workflow (Right - 1 Column) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Procurement Workflow</h3>

                      <div className="rounded-xl bg-amber-500/10 p-3.5 border border-amber-500/30 text-xs font-medium text-amber-800 dark:text-amber-300 leading-relaxed">
                        <p className="font-bold text-amber-400">Approval Workflow</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Submitting this purchase sends it directly to the Approval Center. Once approved by an administrator, it will be posted to the ledger and increase warehouse stock automatically.
                        </p>
                      </div>
                    </div>

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
                        onClick={() => handleSavePIRecord('POSTED')}
                        className="btn-primary text-xs px-5 flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" /> Send to Approval Center
                      </button>
                    </div>
                  </div>
                </div>

                {/* Line Items Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">ITEMS</p>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Products & items purchased</h3>
                    </div>
                    <button
                      type="button"
                      onClick={addPILineItem}
                      className="btn-primary text-xs"
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
                          <th className="px-4 py-3 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {piLineItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="px-4 py-3">
                              {(() => {
                                const currentArt = item.article_id || getArticleForProduct(item.product_id, products, productArticles);
                                let availableProds = currentArt
                                  ? getProductsForArticle(currentArt, products, productArticles)
                                  : products;

                                if (availableProds.length === 0) {
                                  availableProds = products;
                                }

                                if (item.product_id && !availableProds.some((p) => p.id === item.product_id)) {
                                  const currentProd = products.find((p) => p.id === item.product_id);
                                  if (currentProd) {
                                    availableProds = [currentProd, ...availableProds];
                                  } else {
                                    availableProds = [{ id: item.product_id, name: item.description || 'Product', purchase_price: item.rate, cost_price: item.rate, sale_price: item.rate } as any, ...availableProds];
                                  }
                                }

                                return (
                                  <div className="space-y-1.5 min-w-[210px]">
                                    <div>
                                      <label className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 block mb-0.5">
                                        Article (Major Head)
                                      </label>
                                      <select
                                        value={currentArt}
                                        onChange={(e) => {
                                          const newArt = e.target.value;
                                          const prodsForNewArt = getProductsForArticle(newArt, products, productArticles);
                                          const firstP = prodsForNewArt[0];
                                          updatePILineItem(item.id, {
                                            article_id: newArt,
                                            product_id: firstP ? firstP.id : item.product_id,
                                            description: firstP ? `[${newArt}] ${firstP.name}` : (newArt ? `[${newArt}]` : (item.description || '')),
                                            rate: firstP ? (firstP.purchase_price || firstP.cost_price || firstP.sale_price || 0) : item.rate,
                                          });
                                        }}
                                        className="w-full rounded-xl border border-amber-300/80 bg-amber-50/40 p-2 text-xs font-semibold text-slate-800 dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-slate-100 outline-none"
                                      >
                                        <option value="">-- All Articles / None --</option>
                                        {allArticles.map((art) => (
                                          <option key={art} value={art}>
                                            {art}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                                        Product / Option
                                      </label>
                                      <select
                                        value={item.product_id}
                                        onChange={(e) => {
                                          const pid = e.target.value;
                                          const pObj = products.find((x) => x.id === pid);
                                          const resolvedArt = currentArt || (pObj ? getArticleForProduct(pObj.id, products, productArticles) : '');
                                          updatePILineItem(item.id, {
                                            product_id: pid,
                                            article_id: resolvedArt,
                                          });
                                        }}
                                        className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                                      >
                                        <option value="">-- Select Product --</option>
                                        {availableProds.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.name} [{p.code}] — Rs {p.purchase_price || p.cost_price || p.sale_price}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="Description / details"
                                value={item.description}
                                onChange={(e) => updatePILineItem(item.id, { description: e.target.value })}
                                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => updatePILineItem(item.id, { qty: Math.max(1, Number(e.target.value)) })}
                                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => updatePILineItem(item.id, { rate: Number(e.target.value) })}
                                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.discount}
                                onChange={(e) => updatePILineItem(item.id, { discount: Number(e.target.value) })}
                                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removePILineItem(item.id)}
                                className="text-slate-400 hover:text-rose-500 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(() => {
                    const t = calcPITotals();
                    return (
                      <div className="flex justify-end pt-2">
                        <div className="w-64 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2 text-xs">
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Subtotal</span>
                            <span className="font-mono">Rs. {t.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-slate-900 dark:text-slate-100">
                            <span>Grand Total</span>
                            <span className="font-mono text-amber-500">Rs. {t.grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Notes Bottom Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes / Remarks</label>
                  <textarea
                    rows={4}
                    value={piNotes}
                    onChange={(e) => setPiNotes(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GENERIC PURCHASE MODAL */}
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
                <label className="text-[11px] font-semibold text-slate-400">Vendor</label>
                <select
                  value={genericVendorId}
                  onChange={(e) => setGenericVendorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  {availableVendors.map((v) => (
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
              <button onClick={handleSaveGenericRecord} className="btn-primary">Save Record</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW VENDOR BILL MODAL */}
      {newBillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/80">
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
                  <option value="">Select supplier</option>
                  {availableVendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <DateInput
                label="Bill date (DD/MM/YY)"
                value={billDate}
                onChange={setBillDate}
                className="mt-1"
              />

              <DateInput
                label="Due date (DD/MM/YY)"
                value={dueDate}
                onChange={setDueDate}
                className="mt-1"
              />
            </div>

            {/* Line Items */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">LINE ITEMS</p>
                <button
                  onClick={addLine}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-500 hover:underline"
                >
                  + Add line
                </button>
              </div>
              <div className="space-y-2">
                {lineItems.map((line) => (
                  <div key={line.id} className="flex items-center gap-2">
                    {(() => {
                      const currentArt = line.article_id || getArticleForProduct(line.product_id, products, productArticles);
                      const availableProds = getProductsForArticle(currentArt, products, productArticles);

                      return (
                        <div className="flex-1 flex flex-col gap-1.5">
                          <select
                            value={currentArt}
                            onChange={(e) => {
                              const newArt = e.target.value;
                              updateLine(line.id, {
                                article_id: newArt,
                                product_id: '',
                                description: newArt ? `[${newArt}]` : '',
                                rate: 0,
                              });
                            }}
                            className="w-full rounded-lg border border-amber-300/80 bg-amber-50/40 p-2 text-xs font-semibold text-slate-800 dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-slate-100 outline-none"
                          >
                            <option value="">-- Select Article (Major Head) --</option>
                            {allArticles.map((art) => (
                              <option key={art} value={art}>
                                {art}
                              </option>
                            ))}
                          </select>

                          <select
                            value={line.product_id}
                            disabled={!currentArt && availableProds.length === 0}
                            onChange={(e) =>
                              updateLine(line.id, {
                                product_id: e.target.value,
                                article_id: currentArt,
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none disabled:opacity-50"
                          >
                            <option value="">
                              {currentArt ? '-- Select Product under this Article --' : '-- Select Article first --'}
                            </option>
                            {availableProds.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} [{p.code}] — Rs {p.purchase_price || p.cost_price || p.sale_price}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
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
                    <span className="font-mono text-amber-500">Rs. {totals.grandTotal.toFixed(2)}</span>
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
                className="btn-primary"
              >
                Save & Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Invoice Print Modal */}
      {printInvoice && (
        <PurchaseInvoicePrint
          invoice={printInvoice}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </div>
  );
}
