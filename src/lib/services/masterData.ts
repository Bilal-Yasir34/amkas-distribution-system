import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TABLES } from '@/lib/supabase';
import { ensureUUID, safeUUID } from '@/lib/utils';
import type {
  AccountTypeItem,
  Category,
  Customer,
  Product,
  ProductArticle,
  Vendor,
  Warehouse,
} from '@/lib/types';
import {
  deleteRowById,
  insertOrUpsertRow,
  invalidateTableAndRelated,
  optimisticPatch,
  optimisticRemove,
  optimisticUpsert,
  updateRowById,
} from './dbHelpers';

export function useCustomerMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id'> & { id?: string }) => {
      const id = ensureUUID(customer.id || safeUUID());
      const row: Customer = {
        ...customer,
        id,
        code: customer.code || `CUST-${id.slice(0, 4).toUpperCase()}`,
      };
      optimisticUpsert(queryClient, TABLES.customers, row);
      await insertOrUpsertRow(TABLES.customers, row as unknown as Record<string, unknown>, 'id');
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.customers),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.customers),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Customer> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<Customer>(queryClient, TABLES.customers, targetId, patch);
      await updateRowById(TABLES.customers, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.customers),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.customers),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<Customer>(queryClient, TABLES.customers, targetId);
      await deleteRowById(TABLES.customers, targetId);
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.customers,
        TABLES.salesInvoices,
        TABLES.quotations,
        TABLES.salesOrders,
        TABLES.creditNotes,
        TABLES.customerReceipts,
      ]),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.customers),
  });

  return {
    addCustomer: (c: Omit<Customer, 'id'>) => {
      addMutation.mutate(c);
    },
    updateCustomer: (id: string, patch: Partial<Customer>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteCustomer: (id: string) => {
      deleteMutation.mutate(id);
    },
    addCustomerMutation: addMutation,
    updateCustomerMutation: updateMutation,
    deleteCustomerMutation: deleteMutation,
  };
}

export function useVendorMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (vendor: Omit<Vendor, 'id'> & { id?: string }) => {
      const id = ensureUUID(vendor.id || safeUUID());
      const row: Vendor = {
        ...vendor,
        id,
        code: vendor.code || `VEND-${id.slice(0, 4).toUpperCase()}`,
      };
      optimisticUpsert(queryClient, TABLES.vendors, row);
      await insertOrUpsertRow(TABLES.vendors, row as unknown as Record<string, unknown>, 'id');
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.vendors),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.vendors),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Vendor> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<Vendor>(queryClient, TABLES.vendors, targetId, patch);
      await updateRowById(TABLES.vendors, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.vendors),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.vendors),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<Vendor>(queryClient, TABLES.vendors, targetId);
      await deleteRowById(TABLES.vendors, targetId);
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.vendors,
        TABLES.purchaseOrders,
        TABLES.purchaseInvoices,
        TABLES.vendorBills,
        TABLES.debitNotes,
        TABLES.vendorPayments,
      ]),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.vendors),
  });

  return {
    addVendor: (v: Omit<Vendor, 'id'>) => {
      addMutation.mutate(v);
    },
    updateVendor: (id: string, patch: Partial<Vendor>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteVendor: (id: string) => {
      deleteMutation.mutate(id);
    },
    addVendorMutation: addMutation,
    updateVendorMutation: updateMutation,
    deleteVendorMutation: deleteMutation,
  };
}

export function useAccountTypeMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (at: Omit<AccountTypeItem, 'id'> & { id?: string }) => {
      const id = ensureUUID(at.id || safeUUID());
      const row: AccountTypeItem = {
        ...at,
        id,
        created_at: at.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.accountTypes, row);
      await insertOrUpsertRow(TABLES.accountTypes, row as unknown as Record<string, unknown>, 'id');
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.accountTypes),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.accountTypes),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AccountTypeItem> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<AccountTypeItem>(queryClient, TABLES.accountTypes, targetId, patch);
      await updateRowById(TABLES.accountTypes, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.accountTypes),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.accountTypes),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<AccountTypeItem>(queryClient, TABLES.accountTypes, targetId);
      await deleteRowById(TABLES.accountTypes, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.accountTypes),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.accountTypes),
  });

  return {
    addAccountType: (at: Omit<AccountTypeItem, 'id'>) => {
      addMutation.mutate(at);
    },
    updateAccountType: (id: string, patch: Partial<AccountTypeItem>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteAccountType: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (cat: Omit<Category, 'id'> & { id?: string }) => {
      const id = ensureUUID(cat.id || safeUUID());
      const row: Category = {
        ...cat,
        id,
        created_at: cat.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.categories, row);
      await insertOrUpsertRow(TABLES.categories, row as unknown as Record<string, unknown>, 'id');
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.categories),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.categories),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Category> }) => {
      const targetId = ensureUUID(id);
      const currentCats = queryClient.getQueryData<Category[]>([TABLES.categories]) || [];
      const existingCat = currentCats.find((c) => c.id === targetId);
      optimisticPatch<Category>(queryClient, TABLES.categories, targetId, patch);
      await updateRowById(TABLES.categories, targetId, patch as Record<string, unknown>);

      if (patch.is_active === false && existingCat?.name) {
        await supabase
          .from(TABLES.products)
          .update({ is_active: false })
          .eq('category', existingCat.name);
      }
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [TABLES.categories, TABLES.products]),
    onSettled: () =>
      invalidateTableAndRelated(queryClient, [TABLES.categories, TABLES.products]),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      const currentCats = queryClient.getQueryData<Category[]>([TABLES.categories]) || [];
      const existingCat = currentCats.find((c) => c.id === targetId);
      optimisticRemove<Category>(queryClient, TABLES.categories, targetId);

      if (existingCat?.name) {
        await supabase
          .from(TABLES.products)
          .update({ category: null })
          .eq('category', existingCat.name);
      }
      await deleteRowById(TABLES.categories, targetId);
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [TABLES.categories, TABLES.products]),
    onSettled: () =>
      invalidateTableAndRelated(queryClient, [TABLES.categories, TABLES.products]),
  });

  return {
    addCategory: (cat: Omit<Category, 'id'>) => {
      addMutation.mutate(cat);
    },
    updateCategory: (id: string, patch: Partial<Category>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteCategory: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useWarehouseMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (w: Omit<Warehouse, 'id'> & { id?: string }) => {
      const id = ensureUUID(w.id || safeUUID());
      const branchId = w.branch_id ? ensureUUID(w.branch_id) : null;
      const row: Warehouse = {
        ...w,
        id,
        branch_id: branchId,
        code: w.code || `WH-${id.slice(0, 4).toUpperCase()}`,
      };
      optimisticUpsert(queryClient, TABLES.warehouses, row);
      await insertOrUpsertRow(TABLES.warehouses, row as unknown as Record<string, unknown>, 'id');
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.warehouses),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.warehouses),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Warehouse> }) => {
      const targetId = ensureUUID(id);
      const normalizedPatch = {
        ...patch,
        ...(patch.branch_id ? { branch_id: ensureUUID(patch.branch_id) } : {}),
      };
      optimisticPatch<Warehouse>(queryClient, TABLES.warehouses, targetId, normalizedPatch);
      await updateRowById(TABLES.warehouses, targetId, normalizedPatch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.warehouses),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.warehouses),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<Warehouse>(queryClient, TABLES.warehouses, targetId);
      await deleteRowById(TABLES.warehouses, targetId);
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.warehouses,
        TABLES.salesInvoices,
        TABLES.salesOrders,
        TABLES.stockTransfers,
        TABLES.stockAdjustments,
      ]),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.warehouses),
  });

  return {
    addWarehouse: (w: Omit<Warehouse, 'id'>) => {
      addMutation.mutate(w);
    },
    updateWarehouse: (id: string, patch: Partial<Warehouse>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteWarehouse: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useProductMutations() {
  const queryClient = useQueryClient();

  const addProductMut = useMutation({
    mutationFn: async (p: Omit<Product, 'id'> & { id?: string }) => {
      const id = ensureUUID(p.id || safeUUID());
      const row: Product = {
        ...p,
        id,
        code: p.code || `PROD-${id.slice(0, 4).toUpperCase()}`,
      };
      optimisticUpsert(queryClient, TABLES.products, row);
      await insertOrUpsertRow(TABLES.products, row as unknown as Record<string, unknown>, 'id');
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.products),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.products),
  });

  const updateProductMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Product> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<Product>(queryClient, TABLES.products, targetId, patch);
      await updateRowById(TABLES.products, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.products),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.products),
  });

  const deleteProductMut = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<Product>(queryClient, TABLES.products, targetId);
      await supabase.from(TABLES.productArticles).delete().eq('product_id', targetId);
      await deleteRowById(TABLES.products, targetId);
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.products,
        TABLES.productArticles,
        TABLES.productBatches,
        TABLES.productSerials,
      ]),
    onSettled: () =>
      invalidateTableAndRelated(queryClient, [TABLES.products, TABLES.productArticles]),
  });

  const addArticleMut = useMutation({
    mutationFn: async (a: Omit<ProductArticle, 'id'> & { id?: string }) => {
      const id = ensureUUID(a.id || safeUUID());
      const productId = ensureUUID(a.product_id);
      const row: ProductArticle = {
        ...a,
        id,
        product_id: productId,
        colours: a.colours || [],
      };
      optimisticUpsert(queryClient, TABLES.productArticles, row);
      if (row.name?.trim()) {
        queryClient.setQueryData<string[]>([TABLES.universalArticles], (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((u) => u.toLowerCase() === row.name.trim().toLowerCase())) return list;
          return [...list, row.name.trim()];
        });
      }
      await insertOrUpsertRow(
        TABLES.productArticles,
        row as unknown as Record<string, unknown>,
        'id'
      );
      if (row.name?.trim()) {
        await insertOrUpsertRow(
          TABLES.universalArticles,
          { id: safeUUID(), name: row.name.trim() },
          'name'
        );
      }
      return row;
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [TABLES.productArticles, TABLES.universalArticles]),
    onSettled: () =>
      invalidateTableAndRelated(queryClient, [TABLES.productArticles, TABLES.universalArticles]),
  });

  const updateArticleMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ProductArticle> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<ProductArticle>(queryClient, TABLES.productArticles, targetId, patch);
      await updateRowById(TABLES.productArticles, targetId, patch as Record<string, unknown>);
      if (patch.name?.trim()) {
        await insertOrUpsertRow(
          TABLES.universalArticles,
          { id: safeUUID(), name: patch.name.trim() },
          'name'
        );
      }
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [TABLES.productArticles, TABLES.universalArticles]),
    onSettled: () =>
      invalidateTableAndRelated(queryClient, [TABLES.productArticles, TABLES.universalArticles]),
  });

  const deleteArticleMut = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<ProductArticle>(queryClient, TABLES.productArticles, targetId);
      await deleteRowById(TABLES.productArticles, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.productArticles),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.productArticles),
  });

  const addUniversalArticleMut = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      queryClient.setQueryData<string[]>([TABLES.universalArticles], (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some((u) => u.toLowerCase() === trimmed.toLowerCase())) return list;
        return [...list, trimmed];
      });
      await insertOrUpsertRow(
        TABLES.universalArticles,
        { id: safeUUID(), name: trimmed },
        'name'
      );
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.universalArticles),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.universalArticles),
  });

  const removeUniversalArticleMut = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      queryClient.setQueryData<string[]>([TABLES.universalArticles], (prev) =>
        (prev || []).filter((u) => u.toLowerCase() !== trimmed.toLowerCase())
      );
      await supabase.from(TABLES.universalArticles).delete().ilike('name', trimmed);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.universalArticles),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.universalArticles),
  });

  return {
    addProduct: (p: Omit<Product, 'id'> & { id?: string }) => {
      addProductMut.mutate(p);
    },
    updateProduct: (id: string, patch: Partial<Product>) => {
      updateProductMut.mutate({ id, patch });
    },
    deleteProduct: (id: string) => {
      deleteProductMut.mutate(id);
    },
    addProductArticle: (a: Omit<ProductArticle, 'id'>) => {
      addArticleMut.mutate(a);
    },
    updateProductArticle: (id: string, patch: Partial<ProductArticle>) => {
      updateArticleMut.mutate({ id, patch });
    },
    deleteProductArticle: (id: string) => {
      deleteArticleMut.mutate(id);
    },
    addUniversalArticle: (name: string) => {
      addUniversalArticleMut.mutate(name);
    },
    removeUniversalArticle: (name: string) => {
      removeUniversalArticleMut.mutate(name);
    },
  };
}
