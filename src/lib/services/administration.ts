import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, TABLES } from '@/lib/supabase';
import { ensureUUID, safeUUID } from '@/lib/utils';
import type { ModuleKey, Role } from '@/lib/rbac';
import type {
  AuditLog,
  Branch,
  Department,
  LoginLog,
  Organization,
  UserEmployee,
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

export async function logAuditDirect(log: Omit<AuditLog, 'id'>): Promise<void> {
  try {
    const id = safeUUID();
    await insertOrUpsertRow(
      TABLES.auditLogs,
      {
        id,
        username: log.username || 'admin',
        module: log.module || 'System',
        action: log.action || 'Action',
        description: log.description || '',
        ip_address: log.ip_address || '127.0.0.1',
        timestamp: log.timestamp || new Date().toISOString(),
      },
      'id'
    );
  } catch {
    // Non-blocking audit log write
  }
}

export async function logLoginDirect(log: Omit<LoginLog, 'id'>): Promise<void> {
  try {
    const id = safeUUID();
    await insertOrUpsertRow(
      TABLES.loginLogs,
      {
        id,
        username: log.username || 'admin',
        status: log.status || 'Success',
        ip_address: log.ip_address || '127.0.0.1',
        user_agent: log.user_agent || 'Browser',
        timestamp: log.timestamp || new Date().toISOString(),
      },
      'id'
    );
  } catch {
    // Non-blocking login log write
  }
}

export function useOrganizationMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (o: Omit<Organization, 'id'> & { id?: string }) => {
      const id = ensureUUID(o.id || safeUUID());
      const row: Organization = { ...o, id };
      optimisticUpsert(queryClient, TABLES.organizations, row);
      await insertOrUpsertRow(
        TABLES.organizations,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.organizations),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.organizations),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Organization> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<Organization>(queryClient, TABLES.organizations, targetId, patch);
      await updateRowById(TABLES.organizations, targetId, patch as Record<string, unknown>);
      if (patch.status === 'Inactive') {
        await supabase
          .from(TABLES.branches)
          .update({ is_active: false })
          .eq('org_id', targetId);
      }
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [TABLES.organizations, TABLES.branches]),
    onSettled: () =>
      invalidateTableAndRelated(queryClient, [TABLES.organizations, TABLES.branches]),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<Organization>(queryClient, TABLES.organizations, targetId);
      await deleteRowById(TABLES.organizations, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.organizations),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.organizations),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (patch: Partial<Organization> & { is_maintenance_mode?: boolean }) => {
      const orgs = queryClient.getQueryData<Organization[]>([TABLES.organizations]) || [];
      const primaryOrg = orgs[0];
      if (primaryOrg) {
        optimisticPatch<Organization>(
          queryClient,
          TABLES.organizations,
          primaryOrg.id,
          patch
        );
        await updateRowById(
          TABLES.organizations,
          primaryOrg.id,
          patch as Record<string, unknown>
        );
      } else {
        const id = ensureUUID('org1');
        const newOrg: Organization = {
          id,
          name: patch.name || 'NICE ENTERPRISES',
          legal_name: patch.legal_name || 'NICE ENTERPRISES ERP',
          currency: patch.currency || 'PKR',
          address: patch.address || null,
          phone: patch.phone || null,
          email: patch.email || null,
          tax_id: patch.tax_id || null,
          logo_url: patch.logo_url || null,
        };
        optimisticUpsert(queryClient, TABLES.organizations, newOrg);
        await insertOrUpsertRow(
          TABLES.organizations,
          { ...newOrg, ...patch } as unknown as Record<string, unknown>,
          'id'
        );
      }
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.organizations),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.organizations),
  });

  return {
    addOrg: (o: Omit<Organization, 'id'>) => {
      addMutation.mutate(o);
    },
    updateOrg: (id: string, patch: Partial<Organization>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteOrg: (id: string) => {
      deleteMutation.mutate(id);
    },
    updateOrgSettings: (patch: Partial<Organization>) => {
      updateSettingsMutation.mutate(patch);
    },
    setCompanyLogo: (logoUrl: string | null) => {
      updateSettingsMutation.mutate({ logo_url: logoUrl });
    },
    enableMaintenanceMode: () => {
      updateSettingsMutation.mutate({ is_maintenance_mode: true });
      logAuditDirect({
        username: 'System Admin',
        module: 'Maintenance',
        action: 'Enable Maintenance Mode',
        description: 'System Maintenance Mode was ENABLED',
        ip_address: '127.0.0.1',
        timestamp: new Date().toISOString(),
      });
    },
    disableMaintenanceMode: (password: string): { success: boolean; error?: string } => {
      if (password !== 'AmkasMaintenanceOff!') {
        return {
          success: false,
          error: 'Incorrect password for turning off maintenance mode.',
        };
      }
      updateSettingsMutation.mutate({ is_maintenance_mode: false });
      logAuditDirect({
        username: 'System Admin',
        module: 'Maintenance',
        action: 'Disable Maintenance Mode',
        description: 'System Maintenance Mode was DISABLED using admin verification password',
        ip_address: '127.0.0.1',
        timestamp: new Date().toISOString(),
      });
      return { success: true };
    },
    resetBusinessData: async () => {
      queryClient.invalidateQueries();
    },
  };
}

export function useBranchMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (b: Omit<Branch, 'id'> & { id?: string }) => {
      const id = ensureUUID(b.id || safeUUID());
      const orgs = queryClient.getQueryData<Organization[]>([TABLES.organizations]) || [];
      const orgId =
        b.org_id && b.org_id !== 'org1'
          ? ensureUUID(b.org_id)
          : orgs[0]?.id || ensureUUID('org1');
      const row: Branch = {
        ...b,
        id,
        org_id: orgId,
      };
      optimisticUpsert(queryClient, TABLES.branches, row);
      await insertOrUpsertRow(
        TABLES.branches,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.branches),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.branches),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Branch> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<Branch>(queryClient, TABLES.branches, targetId, patch);
      await updateRowById(TABLES.branches, targetId, patch as Record<string, unknown>);
      if (patch.is_active === false) {
        await supabase
          .from(TABLES.warehouses)
          .update({ is_active: false })
          .eq('branch_id', targetId);
        await supabase
          .from(TABLES.departments)
          .update({ is_active: false })
          .eq('branch_id', targetId);
      }
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.branches,
        TABLES.warehouses,
        TABLES.departments,
      ]),
    onSettled: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.branches,
        TABLES.warehouses,
        TABLES.departments,
      ]),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<Branch>(queryClient, TABLES.branches, targetId);
      await deleteRowById(TABLES.branches, targetId);
    },
    onSuccess: () =>
      invalidateTableAndRelated(queryClient, [
        TABLES.branches,
        TABLES.warehouses,
        TABLES.departments,
      ]),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.branches),
  });

  return {
    addBranch: (b: Omit<Branch, 'id'>) => {
      addMutation.mutate(b);
    },
    updateBranch: (id: string, patch: Partial<Branch>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteBranch: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useDepartmentMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (d: Omit<Department, 'id'> & { id?: string }) => {
      const id = ensureUUID(d.id || safeUUID());
      const row: Department = {
        ...d,
        id,
        branch_id: d.branch_id ? ensureUUID(d.branch_id) : null,
      };
      optimisticUpsert(queryClient, TABLES.departments, row);
      await insertOrUpsertRow(
        TABLES.departments,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.departments),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.departments),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Department> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<Department>(queryClient, TABLES.departments, targetId, patch);
      await updateRowById(TABLES.departments, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.departments),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.departments),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<Department>(queryClient, TABLES.departments, targetId);
      await deleteRowById(TABLES.departments, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.departments),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.departments),
  });

  return {
    addDepartment: (d: Omit<Department, 'id'>) => {
      addMutation.mutate(d);
    },
    updateDepartment: (id: string, patch: Partial<Department>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteDepartment: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useUserMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (u: Omit<UserEmployee, 'id'> & { id?: string }) => {
      const id = ensureUUID(u.id || safeUUID());
      const row: UserEmployee = {
        ...u,
        id,
        branch_id: u.branch_id ? ensureUUID(u.branch_id) : null,
        department_id: u.department_id ? ensureUUID(u.department_id) : null,
        created_at: u.created_at || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.userProfiles, row);
      await insertOrUpsertRow(
        TABLES.userProfiles,
        row as unknown as Record<string, unknown>,
        'id'
      );
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.userProfiles),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.userProfiles),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<UserEmployee> }) => {
      const targetId = ensureUUID(id);
      optimisticPatch<UserEmployee>(queryClient, TABLES.userProfiles, targetId, patch);
      await updateRowById(TABLES.userProfiles, targetId, patch as Record<string, unknown>);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.userProfiles),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.userProfiles),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetId = ensureUUID(id);
      optimisticRemove<UserEmployee>(queryClient, TABLES.userProfiles, targetId);
      await deleteRowById(TABLES.userProfiles, targetId);
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.userProfiles),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.userProfiles),
  });

  return {
    addUser: (u: Omit<UserEmployee, 'id'>) => {
      addMutation.mutate(u);
    },
    updateUser: (id: string, patch: Partial<UserEmployee>) => {
      updateMutation.mutate({ id, patch });
    },
    deleteUser: (id: string) => {
      deleteMutation.mutate(id);
    },
  };
}

export function useSecurityMutations() {
  const queryClient = useQueryClient();

  const addAuditMutation = useMutation({
    mutationFn: async (log: Omit<AuditLog, 'id'>) => {
      const row: AuditLog = {
        ...log,
        id: safeUUID(),
        timestamp: log.timestamp || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.auditLogs, row);
      await logAuditDirect(log);
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.auditLogs),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.auditLogs),
  });

  const addLoginMutation = useMutation({
    mutationFn: async (log: Omit<LoginLog, 'id'>) => {
      const row: LoginLog = {
        ...log,
        id: safeUUID(),
        timestamp: log.timestamp || new Date().toISOString(),
      };
      optimisticUpsert(queryClient, TABLES.loginLogs, row);
      await logLoginDirect(log);
      return row;
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.loginLogs),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.loginLogs),
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ role, modules }: { role: Role; modules: ModuleKey[] }) => {
      queryClient.setQueryData<Record<Role, ModuleKey[]>>([TABLES.rolePermissions], (prev) => {
        if (!prev) return prev;
        return { ...prev, [role]: modules };
      });
      await supabase.from(TABLES.rolePermissions).delete().eq('role_id', role);
      if (modules.length > 0) {
        const rows = modules.map((mod) => ({
          role_id: role,
          module_key: mod,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          can_approve: true,
          can_export: true,
        }));
        await supabase.from(TABLES.rolePermissions).upsert(rows, {
          onConflict: 'role_id,module_key',
        });
      }
    },
    onSuccess: () => invalidateTableAndRelated(queryClient, TABLES.rolePermissions),
    onSettled: () => invalidateTableAndRelated(queryClient, TABLES.rolePermissions),
  });

  return {
    addAuditLog: (log: Omit<AuditLog, 'id'>) => {
      addAuditMutation.mutate(log);
    },
    addLoginLog: (log: Omit<LoginLog, 'id'>) => {
      addLoginMutation.mutate(log);
    },
    updateRolePermissions: (role: Role, modules: ModuleKey[]) => {
      updatePermissionsMutation.mutate({ role, modules });
    },
  };
}
