import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RELATED_TABLE_KEYS } from '@/lib/queryKeys';
import { ensureUUID, isValidUUID } from '@/lib/utils';

/**
 * Invalidates the React Query cache for `table` and all dependent tables in `RELATED_TABLE_KEYS`.
 */
export function invalidateTableAndRelated(
  queryClient: QueryClient,
  tables: string | readonly string[]
): void {
  const rootSet = new Set<string>();
  const list = typeof tables === 'string' ? [tables] : tables;

  for (const t of list) {
    rootSet.add(t);
    const related = RELATED_TABLE_KEYS[t];
    if (related) {
      for (const r of related) rootSet.add(r);
    }
  }

  for (const tableKey of rootSet) {
    queryClient.invalidateQueries({ queryKey: [tableKey] });
  }
}

/**
 * Optimistically prepends or replaces an item by `id` in a table's React Query cache.
 */
export function optimisticUpsert<T extends { id: string }>(
  queryClient: QueryClient,
  table: string,
  row: T
): void {
  queryClient.setQueryData<T[]>([table], (prev) => {
    const list = Array.isArray(prev) ? prev : [];
    const idx = list.findIndex((item) => item.id === row.id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = { ...next[idx], ...row };
      return next;
    }
    return [row, ...list];
  });
}

/**
 * Optimistically patches an item by `id` in a table's React Query cache.
 */
export function optimisticPatch<T extends { id: string }>(
  queryClient: QueryClient,
  table: string,
  id: string,
  patch: Partial<T>
): void {
  queryClient.setQueryData<T[]>([table], (prev) => {
    if (!Array.isArray(prev)) return prev;
    return prev.map((item) => (item.id === id ? { ...item, ...patch } : item));
  });
}

/**
 * Optimistically removes an item by `id` in a table's React Query cache.
 */
export function optimisticRemove<T extends { id: string }>(
  queryClient: QueryClient,
  table: string,
  id: string
): void {
  queryClient.setQueryData<T[]>([table], (prev) => {
    if (!Array.isArray(prev)) return prev;
    return prev.filter((item) => item.id !== id);
  });
}

/**
 * Extracts a missing column name from a PostgREST PGRST204 error message:
 * `Could not find the 'foo' column of 'bar' in the schema cache`
 */
function extractMissingColumn(message?: string): string | null {
  if (!message) return null;
  const m = message.match(/Could not find the '([^']+)' column/i);
  return m ? m[1] : null;
}

/**
 * Performs a row-level upsert/insert into `table`, automatically stripping any column
 * that has not yet been added to the live database schema cache (PGRST204).
 */
export async function insertOrUpsertRow<T extends Record<string, unknown>>(
  table: string,
  payload: T,
  onConflict: string = 'id'
): Promise<T> {
  const cleanPayload: Record<string, unknown> = { ...payload };
  if (typeof cleanPayload.id === 'string') {
    cleanPayload.id = ensureUUID(cleanPayload.id);
  }

  for (let attempt = 0; attempt < 15; attempt++) {
    const { data, error } = await supabase
      .from(table)
      .upsert(cleanPayload, { onConflict })
      .select()
      .maybeSingle();

    if (!error) {
      return (data || cleanPayload) as T;
    }

    if (error.code === 'PGRST204') {
      const col = extractMissingColumn(error.message);
      if (col && col in cleanPayload) {
        delete cleanPayload[col];
        continue;
      }
    }

    if (error.code === 'PGRST205') {
      // Table not yet created in Supabase (before running migration SQL)
      return cleanPayload as T;
    }

    throw error;
  }

  return cleanPayload as T;
}

/**
 * Performs a row-level update by `id` on `table`, stripping any column not yet in schema cache.
 */
export async function updateRowById<T extends Record<string, unknown>>(
  table: string,
  id: string,
  patch: T
): Promise<void> {
  const cleanPatch: Record<string, unknown> = { ...patch };
  delete cleanPatch.id;
  const targetId = isValidUUID(id) ? id : ensureUUID(id);

  for (let attempt = 0; attempt < 15; attempt++) {
    if (Object.keys(cleanPatch).length === 0) return;

    const { error } = await supabase.from(table).update(cleanPatch).eq('id', targetId);
    if (!error) return;

    if (error.code === 'PGRST204') {
      const col = extractMissingColumn(error.message);
      if (col && col in cleanPatch) {
        delete cleanPatch[col];
        continue;
      }
    }

    if (error.code === 'PGRST205') {
      return;
    }

    throw error;
  }
}

/**
 * Performs a hard delete by `id` on `table`.
 */
export async function deleteRowById(
  table: string,
  id: string,
  altColumn?: string,
  altValue?: string
): Promise<void> {
  const targetId = isValidUUID(id) ? id : ensureUUID(id);
  const { error } = await supabase.from(table).delete().eq('id', targetId);
  if (error && error.code !== 'PGRST205') {
    if (altColumn && altValue) {
      await supabase.from(table).delete().eq(altColumn, altValue);
      return;
    }
    throw error;
  }
  if (altColumn && altValue) {
    await supabase.from(table).delete().eq(altColumn, altValue);
  }
}

/**
 * Soft-deletes a document row by setting `deleted_at = now()` if the `deleted_at` column exists,
 * falling back to hard delete if `deleted_at` is not yet present in the table schema.
 */
export async function softOrHardDeleteRow(
  table: string,
  id: string,
  altColumn?: string,
  altValue?: string
): Promise<void> {
  const targetId = isValidUUID(id) ? id : ensureUUID(id);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: now })
    .eq('id', targetId);

  if (!error) return;

  if (error.code === 'PGRST204') {
    // `deleted_at` column not yet added -> hard delete row
    await deleteRowById(table, targetId, altColumn, altValue);
    return;
  }

  if (error.code === 'PGRST205') return;
  throw error;
}
