import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TABLES } from '@/lib/supabase';
import { ensureUUID, safeUUID } from '@/lib/utils';
import type {
  ProductBatch,
  ProductSerial,
  StockAdjustment,
  StockTransfer,
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

export function useStockTransferMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (st: Omit<StockTransfer, 'id'> & { id?: string }) => {
      const id = ensureUUID(st.id || safeUUID());
      const row: StockTransfer = {
        ...st,
        id,
        from_warehouse_id: st.from_warehouse_id ? ensureUUID(st.from_warehouse_id) : null,
        to_warehouse_id: st.to_warehouse_id ? ensureUUID(st.to_warehouse_id) : null,
        created_at: st.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.stockTransfers, row);
      await insertOrUpsertRow(
        TABLES.stockTransfers,
        row as unknown as Record<string, unknown>,
        'transfer_no'
      );
      if (row.status === 'COMPLETED' || row.status === 'Completed') {
        await supabase.rpc('post_stock_transfer', { p_transfer_id: id });
      }
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.stockTransfers),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.stockTransfers),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<StockTransfer> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<StockTransfer>(queryClient, TABLES.stockTransfers, targetId, patch);
      await updateRowById(TABLES.stockTransfers, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.stockTransfers),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.stockTransfers),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<StockTransfer>(queryClient, TABLES.stockTransfers, targetId);
      await deleteRowById(TABLES.stockTransfers, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.stockTransfers),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.stockTransfers),
  });

  return {
    addStockTransfer: (st: Omit<StockTransfer, 'id'>) => {
      addMutation.mutate(st);
    },
    updateStockTransfer: (id: string, patch: Partial<StockTransfer>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteStockTransfer: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useStockAdjustmentMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (sa: Omit<StockAdjustment, 'id'> & { id?: string }) => {
      const id = ensureUUID(sa.id || safeUUID());
      const row: StockAdjustment = {
        ...sa,
        id,
        warehouse_id: sa.warehouse_id ? ensureUUID(sa.warehouse_id) : null,
        created_at: sa.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.stockAdjustments, row);
      await insertOrUpsertRow(
        TABLES.stockAdjustments,
        row as unknown as Record<string, unknown>,
        'adjustment_no'
      );
      if (row.status === 'POSTED' || row.status === 'COMPLETED') {
        await supabase.rpc('post_stock_adjustment', { p_adjustment_id: id });
      }
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.stockAdjustments),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.stockAdjustments),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<StockAdjustment> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<StockAdjustment>(queryClient, TABLES.stockAdjustments, targetId, patch);
      await updateRowById(TABLES.stockAdjustments, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.stockAdjustments),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.stockAdjustments),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<StockAdjustment>(queryClient, TABLES.stockAdjustments, targetId);
      await deleteRowById(TABLES.stockAdjustments, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.stockAdjustments),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.stockAdjustments),
  });

  return {
    addStockAdjustment: (sa: Omit<StockAdjustment, 'id'>) => {
      addMutation.mutate(sa);
    },
    updateStockAdjustment: (id: string, patch: Partial<StockAdjustment>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteStockAdjustment: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useBatchMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (b: Omit<ProductBatch, 'id'> & { id?: string }) => {
      const id = ensureUUID(b.id || safeUUID());
      const row: ProductBatch = {
        ...b,
        id,
        product_id: ensureUUID(b.product_id),
        batch_no: b.batch_no || b.batch_number,
        batch_number: b.batch_number || b.batch_no || 'BATCH-01',
        qty: b.qty ?? b.quantity_on_hand ?? 0,
        warehouse_id: b.warehouse_id ? ensureUUID(b.warehouse_id) : null,
      };
      optimisticUpsert(queryClient, TABLES.productBatches, row);
      await insertOrUpsertRow(
        TABLES.productBatches,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.productBatches),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.productBatches),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ProductBatch> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<ProductBatch>(queryClient, TABLES.productBatches, targetId, patch);
      await updateRowById(TABLES.productBatches, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.productBatches),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.productBatches),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<ProductBatch>(queryClient, TABLES.productBatches, targetId);
      await deleteRowById(TABLES.productBatches, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.productBatches),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.productBatches),
  });

  return {
    addBatch: (b: Omit<ProductBatch, 'id'>) => {
      addMutation.mutate(b);
    },
    updateBatch: (id: string, patch: Partial<ProductBatch>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteBatch: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useSerialMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (s: Omit<ProductSerial, 'id'> & { id?: string }) => {
      const id = ensureUUID(s.id || safeUUID());
      const row: ProductSerial = {
        ...s,
        id,
        product_id: ensureUUID(s.product_id),
        serial_no: s.serial_no || s.serial_number,
        serial_number: s.serial_number || s.serial_no || 'SN-001',
        warehouse_id: s.warehouse_id ? ensureUUID(s.warehouse_id) : null,
      };
      optimisticUpsert(queryClient, TABLES.productSerials, row);
      await insertOrUpsertRow(
        TABLES.productSerials,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.productSerials),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.productSerials),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ProductSerial> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<ProductSerial>(queryClient, TABLES.productSerials, targetId, patch);
      await updateRowById(TABLES.productSerials, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.productSerials),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.productSerials),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<ProductSerial>(queryClient, TABLES.productSerials, targetId);
      await deleteRowById(TABLES.productSerials, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.productSerials),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.productSerials),
  });

  return {
    addSerial: (s: Omit<ProductSerial, 'id'>) => {
      addMutation.mutate(s);
    },
    updateSerial: (id: string, patch: Partial<ProductSerial>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteSerial: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}
