import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TABLES } from '@/lib/supabase';
import { ensureUUID, safeUUID } from '@/lib/utils';
import type {
  BankAccount,
  ChartOfAccount,
  ExpenseRecord,
  FinancialYear,
  IncomeRecord,
  JournalEntry,
} from '@/lib/types';
import {
  deleteRowById,
  insertOrUpsertRow,
  invalidateTableAndRelated,
  optimisticPatch,
  optimisticRemove,
  optimisticUpsert,
  softOrHardDeleteRow,
  updateRowById,
} from './dbHelpers';

export function useBankAccountMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (ba: Omit<BankAccount, 'id'> & { id?: string }) => {
      const id = ensureUUID(ba.id || safeUUID());
      const row: BankAccount = { ...ba, id };
      optimisticUpsert(queryClient, TABLES.bankAccounts, row);
      await insertOrUpsertRow(
        TABLES.bankAccounts,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.bankAccounts),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.bankAccounts),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<BankAccount> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<BankAccount>(queryClient, TABLES.bankAccounts, targetId, patch);
      await updateRowById(TABLES.bankAccounts, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.bankAccounts),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.bankAccounts),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<BankAccount>(queryClient, TABLES.bankAccounts, targetId);
      await deleteRowById(TABLES.bankAccounts, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.bankAccounts),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.bankAccounts),
  });

  return {
    addBankAccount: (ba: Omit<BankAccount, 'id'>) => {
      addMutation.mutate(ba);
    },
    updateBankAccount: (id: string, patch: Partial<BankAccount>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteBankAccount: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useJournalEntryMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (je: Omit<JournalEntry, 'id'> & { id?: string }) => {
      const id = ensureUUID(je.id || safeUUID());
      const row: JournalEntry = {
        ...je,
        id,
        created_at: je.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.journalEntries, row);
      await insertOrUpsertRow(
        TABLES.journalEntries,
        row as unknown as Record<string, unknown>,
        'entry_no'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.journalEntries),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.journalEntries),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<JournalEntry> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<JournalEntry>(queryClient, TABLES.journalEntries, targetId, patch);
      await updateRowById(TABLES.journalEntries, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.journalEntries),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.journalEntries),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<JournalEntry>(queryClient, TABLES.journalEntries, targetId);
      await softOrHardDeleteRow(TABLES.journalEntries, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.journalEntries),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.journalEntries),
  });

  return {
    addJournalEntry: (je: Omit<JournalEntry, 'id'>) => {
      addMutation.mutate(je);
    },
    updateJournalEntry: (id: string, patch: Partial<JournalEntry>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteJournalEntry: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useChartOfAccountMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (coa: Omit<ChartOfAccount, 'id'> & { id?: string }) => {
      const id = ensureUUID(coa.id || safeUUID());
      const row: ChartOfAccount = {
        ...coa,
        id,
        parent_id: coa.parent_id ? ensureUUID(coa.parent_id) : null,
      };
      optimisticUpsert(queryClient, TABLES.chartOfAccounts, row);
      await insertOrUpsertRow(
        TABLES.chartOfAccounts,
        row as unknown as Record<string, unknown>,
        'code'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.chartOfAccounts),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.chartOfAccounts),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ChartOfAccount> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<ChartOfAccount>(queryClient, TABLES.chartOfAccounts, targetId, patch);
      await updateRowById(TABLES.chartOfAccounts, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.chartOfAccounts),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.chartOfAccounts),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<ChartOfAccount>(queryClient, TABLES.chartOfAccounts, targetId);
      await deleteRowById(TABLES.chartOfAccounts, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.chartOfAccounts),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.chartOfAccounts),
  });

  return {
    addCOAccount: (coa: Omit<ChartOfAccount, 'id'>) => {
      addMutation.mutate(coa);
    },
    updateCOAccount: (id: string, patch: Partial<ChartOfAccount>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteCOAccount: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useFinancialYearMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (fy: Omit<FinancialYear, 'id'> & { id?: string }) => {
      const id = ensureUUID(fy.id || safeUUID());
      const row: FinancialYear = { ...fy, id };
      optimisticUpsert(queryClient, TABLES.financialYears, row);
      await insertOrUpsertRow(
        TABLES.financialYears,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.financialYears),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.financialYears),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<FinancialYear> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<FinancialYear>(queryClient, TABLES.financialYears, targetId, patch);
      await updateRowById(TABLES.financialYears, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.financialYears),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.financialYears),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<FinancialYear>(queryClient, TABLES.financialYears, targetId);
      await deleteRowById(TABLES.financialYears, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.financialYears),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.financialYears),
  });

  return {
    addFinancialYear: (fy: Omit<FinancialYear, 'id'> & { id?: string }) => {
      addMutation.mutate(fy);
    },
    updateFinancialYear: (id: string, patch: Partial<FinancialYear>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteFinancialYear: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useExpenseIncomeMutations() {
  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: async (e: Omit<ExpenseRecord, 'id'> & { id?: string }) => {
      const id = ensureUUID(e.id || safeUUID());
      const row: ExpenseRecord = {
        ...e,
        id,
        created_at: e.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.expenseRecords, row);
      await insertOrUpsertRow(
        TABLES.expenseRecords,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.expenseRecords),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.expenseRecords),
  });

  const addIncomeMutation = useMutation({
    mutationFn: async (i: Omit<IncomeRecord, 'id'> & { id?: string }) => {
      const id = ensureUUID(i.id || safeUUID());
      const row: IncomeRecord = {
        ...i,
        id,
        created_at: i.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.incomeRecords, row);
      await insertOrUpsertRow(
        TABLES.incomeRecords,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.incomeRecords),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.incomeRecords),
  });

  return {
    addExpenseRecord: (e: Omit<ExpenseRecord, 'id'>) => {
      addExpenseMutation.mutate(e);
    },
    addIncomeRecord: (i: Omit<IncomeRecord, 'id'>) => {
      addIncomeMutation.mutate(i);
    },
  };
}
