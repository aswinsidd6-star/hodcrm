/**
 * HOD CRM — Server-Side Security Guard
 * Enforces server-side authentication, active membership, and role permissions.
 * Never trusts client assertions: queries Postgres RLS / membership tables directly.
 */

import { redirect } from 'next/navigation'
import { createClient as createServerSupabase } from '../../utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { PERMISSIONS, PermissionKey, isOwnerRole } from './permissions'
import type { Membership, Role, Organization } from '../../types/crm'

export interface AuthContext {
  user: {
    id: string
    email: string
  }
  membership: Membership & {
    role: Role
    organization: Organization
  }
  isOwner: boolean
  hasMoneyAccess: boolean
  supabase: Awaited<ReturnType<typeof createServerSupabase>>
}

/**
 * Require an authenticated user with an active organization membership.
 * Redirects to login if unauthenticated.
 */
export async function requireAuthContext(): Promise<AuthContext> {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/')
  }

  // Fetch active membership, role, and organization
  const { data: membershipData, error: membershipError } = await supabase
    .from('memberships')
    .select(`
      id,
      organization_id,
      user_id,
      role_id,
      is_active,
      invited_by,
      invited_at,
      accepted_at,
      deactivated_at,
      role:roles (
        id,
        organization_id,
        key,
        name,
        description,
        is_system,
        is_owner_role
      ),
      organization:organizations (
        id,
        name,
        timezone,
        date_format,
        default_currency,
        working_days,
        default_followup_days,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (membershipError) {
    throw new Error(`Failed to verify CRM membership: ${membershipError.message}`)
  }

  if (!membershipData || !membershipData.organization || !membershipData.role) {
    // If user has no active organization membership, redirect to login
    redirect('/?error=no_active_membership')
  }

  // TypeScript assertion after validation
  const membership = membershipData as unknown as Membership & {
    role: Role
    organization: Organization
  }

  const isOwner = Boolean(membership.role.is_owner_role || isOwnerRole(membership.role.key))
  // Financial access is held strictly by owner or finance_admin
  const context = {
    user: {
      id: user.id,
      email: user.email,
    },
    membership,
    isOwner,
    hasMoneyAccess: false,
    supabase,
  }

  context.hasMoneyAccess = await userHasPermission(context, PERMISSIONS.MONEY_VIEW)
  return context
}

/**
 * Check whether the active user has a specific permission.
 */
export async function userHasPermission(
  ctx: AuthContext,
  permission: PermissionKey
): Promise<boolean> {
  // Owner short-circuit
  if (ctx.isOwner) return true

  // Check role_permissions
  const { data: rolePerm } = await ctx.supabase
    .from('role_permissions')
    .select('permission_key')
    .eq('role_id', ctx.membership.role.id)
    .eq('permission_key', permission)
    .maybeSingle()

  if (rolePerm) return true

  // Check membership overrides
  const { data: override } = await ctx.supabase
    .from('membership_permission_overrides')
    .select('granted')
    .eq('membership_id', ctx.membership.id)
    .eq('permission_key', permission)
    .maybeSingle()

  if (override !== null && override !== undefined) {
    return Boolean(override.granted)
  }

  return false
}

/**
 * Guard that throws if user does not possess the required permission.
 */
export async function requirePermission(
  ctx: AuthContext,
  permission: PermissionKey
): Promise<void> {
  const allowed = await userHasPermission(ctx, permission)
  if (!allowed) {
    throw new Error(`Unauthorized: Missing permission "${permission}"`)
  }
}

/**
 * Guard that verifies the user has money access (owner or finance_admin with money.view)
 */
export async function requireMoneyAccess(ctx: AuthContext): Promise<void> {
  const hasAccess = await userHasPermission(ctx, PERMISSIONS.MONEY_VIEW)
  if (!hasAccess) {
    redirect('/dashboard/finance-locked')
  }
}

export async function requireMoneyManage(ctx: AuthContext): Promise<void> {
  const hasAccess = await userHasPermission(ctx, PERMISSIONS.MONEY_MANAGE)
  if (!hasAccess) {
    redirect('/dashboard/finance-locked')
  }
}

/**
 * Get a server-side client for the isolated `finance` schema.
 * Uses SUPABASE_SERVICE_ROLE_KEY if set in environment.
 * NEVER exposes this to the browser.
 */
export function getFinanceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !url) {
    return null
  }

  return createSupabaseClient(url, serviceKey, {
    db: { schema: 'finance' },
    auth: { persistSession: false },
  })
}
