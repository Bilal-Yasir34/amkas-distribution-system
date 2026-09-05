import { supabase, TABLES } from './supabase';
import { useDataStore } from './dataStore';
import type { Customer, Vendor, Product, Category, Warehouse, SalesInvoice, UserEmployee } from './types';

export interface CloudSyncResult {
  success: boolean;
  message: string;
  counts?: Record<string, number>;
}

/**
 * Pushes the current active Zustand store state into Supabase tables.
 */
export async function pushStateToSupabase(): Promise<CloudSyncResult> {
  try {
    const state = useDataStore.getState();

    // 1. Sync Categories
    if (state.categories.length > 0) {
      const catRows = state.categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || null,
        is_active: c.is_active ?? true,
      }));
      await supabase.from('categories').upsert(catRows, { onConflict: 'id' });
    }

    // 2. Sync Warehouses
    if (state.warehouses.length > 0) {
      const whRows = state.warehouses.map((w) => ({
        id: w.id,
        code: w.code,
        name: w.name,
        branch_id: w.branch_id || null,
        address: w.address || null,
        is_active: w.is_active ?? true,
        is_default: w.is_default ?? false,
      }));
      await supabase.from('warehouses').upsert(whRows, { onConflict: 'id' });
    }

    // 3. Sync Customers
    if (state.customers.length > 0) {
      const custRows = state.customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        address: c.address || null,
        tax_number: c.tax_number || null,
        credit_limit: c.credit_limit || 0,
        current_balance: c.current_balance || 0,
        is_active: c.is_active ?? true,
      }));
      await supabase.from('customers').upsert(custRows, { onConflict: 'id' });
    }

    // 4. Sync Vendors
    if (state.vendors.length > 0) {
      const vendRows = state.vendors.map((v) => ({
        id: v.id,
        name: v.name,
        email: v.email || null,
        phone: v.phone || null,
        address: v.address || null,
        tax_number: v.tax_number || null,
        current_balance: v.current_balance || 0,
        is_active: v.is_active ?? true,
      }));
      await supabase.from('vendors').upsert(vendRows, { onConflict: 'id' });
    }

    // 5. Sync Products
    if (state.products.length > 0) {
      const prodRows = state.products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        article_name: p.article_name || null,
        unit: p.unit || 'pcs',
        category: p.category || 'Uncategorized',
        length: p.length || 0,
        width: p.width || 0,
        purchase_price: p.purchase_price || 0,
        opening_average_cost: p.opening_average_cost || 0,
        sale_price: p.sale_price || 0,
        tax_pct: p.tax_pct || 0,
        reorder_level: p.reorder_level || 0,
        stock_quantity: p.stock_quantity ?? p.opening_balance ?? 0,
        opening_balance: p.opening_balance || 0,
        track_batches: p.track_batches ?? false,
        track_serials: p.track_serials ?? false,
        barcode_value: p.barcode_value || p.code,
        description: p.description || null,
        is_active: p.is_active ?? true,
      }));
      await supabase.from('products').upsert(prodRows, { onConflict: 'id' });
    }

    // 6. Sync Product Articles
    if (state.productArticles.length > 0) {
      const artRows = state.productArticles.map((pa) => ({
        id: pa.id,
        product_id: pa.product_id,
        name: pa.name,
        colours: pa.colours || [],
      }));
      await supabase.from('product_articles').upsert(artRows, { onConflict: 'id' });
    }

    // 7. Sync Users / User Profiles
    if (state.users.length > 0) {
      const userRows = state.users.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role || 'super_admin',
        is_active: u.is_active ?? true,
      }));
      await supabase.from('user_profiles').upsert(userRows, { onConflict: 'id' });
    }

    return {
      success: true,
      message: 'Local business state successfully pushed to Supabase Cloud Database!',
      counts: {
        products: state.products.length,
        customers: state.customers.length,
        vendors: state.vendors.length,
        users: state.users.length,
        categories: state.categories.length,
        warehouses: state.warehouses.length,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Failed to push to Supabase: ${msg}`,
    };
  }
}

/**
 * Pulls latest records from Supabase tables and populates the Zustand store.
 */
export async function pullStateFromSupabase(): Promise<CloudSyncResult> {
  try {
    const store = useDataStore.getState();

    // Fetch Products
    const { data: prods } = await supabase.from('products').select('*');
    if (prods && prods.length > 0) {
      prods.forEach((p: Product) => {
        const existing = store.products.find((ep) => ep.id === p.id);
        if (existing) {
          store.updateProduct(p.id, p);
        } else {
          store.addProduct(p);
        }
      });
    }

    // Fetch Customers
    const { data: custs } = await supabase.from('customers').select('*');
    if (custs && custs.length > 0) {
      custs.forEach((c: Customer) => {
        const existing = store.customers.find((ec) => ec.id === c.id);
        if (existing) {
          store.updateCustomer(c.id, c);
        } else {
          store.addCustomer(c);
        }
      });
    }

    // Fetch Vendors
    const { data: vends } = await supabase.from('vendors').select('*');
    if (vends && vends.length > 0) {
      vends.forEach((v: Vendor) => {
        const existing = store.vendors.find((ev) => ev.id === v.id);
        if (existing) {
          store.updateVendor(v.id, v);
        } else {
          store.addVendor(v);
        }
      });
    }

    // Fetch Categories
    const { data: cats } = await supabase.from('categories').select('*');
    if (cats && cats.length > 0) {
      cats.forEach((cat: Category) => {
        const existing = store.categories.find((ec) => ec.id === cat.id);
        if (existing) {
          store.updateCategory(cat.id, cat);
        } else {
          store.addCategory(cat);
        }
      });
    }

    return {
      success: true,
      message: 'Successfully pulled latest data from Supabase Cloud!',
      counts: {
        products: prods?.length || 0,
        customers: custs?.length || 0,
        vendors: vends?.length || 0,
        categories: cats?.length || 0,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Failed to pull from Supabase: ${msg}`,
    };
  }
}
