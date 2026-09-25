/**
 * HOD CRM — Permissions Catalogue and Role Definitions
 * Aligns strictly with database migrations:
 * 0001_foundation.sql, 0003_rls.sql, 0004_seed_permissions.sql, 0006_lead_estimates.sql
 */

export const PERMISSIONS = {
  // Leads
  LEADS_VIEW: 'leads.view',
  LEADS_VIEW_ALL: 'leads.view_all',
  LEADS_CREATE: 'leads.create',
  LEADS_UPDATE: 'leads.update',
  LEADS_DELETE: 'leads.delete',
  LEADS_ASSIGN: 'leads.assign',
  LEADS_EXPORT: 'leads.export',
  LEADS_IMPORT: 'leads.import',
  LEADS_MERGE: 'leads.merge',
  LEADS_VIEW_ESTIMATE: 'leads.view_estimate',
  LEADS_EDIT_ESTIMATE: 'leads.edit_estimate',

  // Opportunities
  OPPORTUNITIES_VIEW: 'opportunities.view',
  OPPORTUNITIES_VIEW_ALL: 'opportunities.view_all',
  OPPORTUNITIES_CREATE: 'opportunities.create',
  OPPORTUNITIES_UPDATE: 'opportunities.update',
  OPPORTUNITIES_EXPORT: 'opportunities.export',

  // Tasks
  TASKS_MANAGE: 'tasks.manage',
  TASKS_VIEW_ALL: 'tasks.view_all',

  // Reports
  REPORTS_VIEW: 'reports.view',

  // Administration
  USERS_MANAGE: 'users.manage',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',

  // Money (Finance Schema)
  MONEY_VIEW: 'money.view',
  MONEY_MANAGE: 'money.manage',
  MONEY_EXPORT: 'money.export',
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export type RoleKey = 'owner' | 'sales_admin' | 'sales_rep' | 'finance_admin'

export interface RoleDefinition {
  key: RoleKey
  name: string
  description: string
  isOwner: boolean
  defaultPermissions: PermissionKey[]
}

export const SYSTEM_ROLES: Record<RoleKey, RoleDefinition> = {
  owner: {
    key: 'owner',
    name: 'Owner',
    description: 'Full administrative access and financial governance',
    isOwner: true,
    defaultPermissions: Object.values(PERMISSIONS) as PermissionKey[],
  },
  sales_admin: {
    key: 'sales_admin',
    name: 'Sales Administrator',
    description: 'Manages sales team, pipelines and shared leads (no financial access)',
    isOwner: false,
    defaultPermissions: [
      PERMISSIONS.LEADS_VIEW,
      PERMISSIONS.LEADS_VIEW_ALL,
      PERMISSIONS.LEADS_CREATE,
      PERMISSIONS.LEADS_UPDATE,
      PERMISSIONS.LEADS_DELETE,
      PERMISSIONS.LEADS_ASSIGN,
      PERMISSIONS.LEADS_EXPORT,
      PERMISSIONS.LEADS_IMPORT,
      PERMISSIONS.LEADS_MERGE,
      PERMISSIONS.LEADS_VIEW_ESTIMATE,
      PERMISSIONS.LEADS_EDIT_ESTIMATE,
      PERMISSIONS.OPPORTUNITIES_VIEW,
      PERMISSIONS.OPPORTUNITIES_VIEW_ALL,
      PERMISSIONS.OPPORTUNITIES_CREATE,
      PERMISSIONS.OPPORTUNITIES_UPDATE,
      PERMISSIONS.OPPORTUNITIES_EXPORT,
      PERMISSIONS.TASKS_MANAGE,
      PERMISSIONS.TASKS_VIEW_ALL,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.SETTINGS_MANAGE,
    ],
  },
  sales_rep: {
    key: 'sales_rep',
    name: 'Sales Representative',
    description: 'Works assigned leads, logs calls, records lead estimates (no financial access)',
    isOwner: false,
    defaultPermissions: [
      PERMISSIONS.LEADS_VIEW,
      PERMISSIONS.LEADS_CREATE,
      PERMISSIONS.LEADS_UPDATE,
      PERMISSIONS.LEADS_EXPORT,
      PERMISSIONS.LEADS_VIEW_ESTIMATE,
      PERMISSIONS.LEADS_EDIT_ESTIMATE,
      PERMISSIONS.OPPORTUNITIES_VIEW,
      PERMISSIONS.OPPORTUNITIES_CREATE,
      PERMISSIONS.OPPORTUNITIES_UPDATE,
      PERMISSIONS.TASKS_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  finance_admin: {
    key: 'finance_admin',
    name: 'Financial Administrator',
    description: 'Manages invoices, payments, cash flow and financial reporting',
    isOwner: false,
    defaultPermissions: [
      PERMISSIONS.MONEY_VIEW,
      PERMISSIONS.MONEY_MANAGE,
      PERMISSIONS.MONEY_EXPORT,
      PERMISSIONS.OPPORTUNITIES_VIEW,
      PERMISSIONS.OPPORTUNITIES_VIEW_ALL,
      PERMISSIONS.LEADS_VIEW_ESTIMATE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.AUDIT_VIEW,
    ],
  },
}

export function isOwnerRole(roleKey: string): boolean {
  return roleKey === 'owner'
}

export function isFinancePerm(permKey: string): boolean {
  return permKey.startsWith('money.')
}
