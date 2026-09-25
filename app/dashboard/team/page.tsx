import { requireAuthContext, userHasPermission } from '../../../src/lib/auth/guard'
import { PERMISSIONS } from '../../../src/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import { getInitials } from '../../../src/utils/formatters'
import type { Membership } from '../../../src/types/crm'
import { PageHeader, PageShell } from '../../../src/components/ui/Page'
import { Card, CardHeader } from '../../../src/components/ui/Card'
import { Button } from '../../../src/components/ui/Button'
import { Select } from '../../../src/components/ui/Field'
import { Alert, Badge, EmptyState } from '../../../src/components/ui/Badge'

async function changeRole(formData: FormData) {
  'use server'
  const auth = await requireAuthContext()
  if (!(await userHasPermission(auth, PERMISSIONS.USERS_MANAGE))) {
    throw new Error('You are not authorized to manage team roles.')
  }
  const membershipId = String(formData.get('membership_id') || '').trim()
  const roleId = String(formData.get('role_id') || '').trim()
  if (!membershipId || !roleId || membershipId === auth.membership.id) {
    throw new Error('Select another active member and a role.')
  }
  const { data: role } = await auth.supabase
    .from('roles')
    .select('id, is_owner_role')
    .eq('id', roleId)
    .eq('organization_id', auth.membership.organization_id)
    .maybeSingle()
  if (!role || role.is_owner_role) {
    throw new Error('Only an existing non-owner role may be assigned.')
  }
  const { error } = await auth.supabase
    .from('memberships')
    .update({ role_id: role.id })
    .eq('id', membershipId)
    .eq('organization_id', auth.membership.organization_id)
    .eq('is_active', true)
  if (error) throw new Error(`Unable to change role: ${error.message}`)
  revalidatePath('/dashboard/team')
}

export default async function TeamPage() {
  const auth = await requireAuthContext()
  const { data: membershipRows, error: membershipError } = await auth.supabase
    .from('memberships')
    .select('id, user_id, role_id, is_active, accepted_at')
    .eq('organization_id', auth.membership.organization_id)
    .eq('is_active', true)
    .order('accepted_at', { ascending: true })
  if (membershipError) {
    throw new Error(`Unable to load team memberships: ${membershipError.message}`)
  }

  const memberships = membershipRows || []
  const userIds = memberships.map((member) => member.user_id)
  const roleIds = memberships.map((member) => member.role_id)
  const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
    await Promise.all([
      userIds.length > 0
        ? auth.supabase.from('profiles').select('id, full_name, email').in('id', userIds)
        : Promise.resolve({ data: [], error: null }),
      roleIds.length > 0
        ? auth.supabase.from('roles').select('id, name, key, is_owner_role').in('id', roleIds)
        : Promise.resolve({ data: [], error: null }),
    ])
  if (profilesError) throw new Error(`Unable to load team profiles: ${profilesError.message}`)
  if (rolesError) throw new Error(`Unable to load team roles: ${rolesError.message}`)

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]))
  const rolesById = new Map((roles || []).map((role) => [role.id, role]))
  const members = memberships.map((member) => ({
    ...member,
    profile: profilesById.get(member.user_id) || null,
    role: rolesById.get(member.role_id) || null,
  })) as unknown as Membership[]
  const canManage = await userHasPermission(auth, PERMISSIONS.USERS_MANAGE)
  const { data: assignableRoles, error: assignableRolesError } = canManage
    ? await auth.supabase
        .from('roles')
        .select('id, name, key, is_owner_role')
        .eq('organization_id', auth.membership.organization_id)
        .eq('is_system', true)
        .eq('is_owner_role', false)
        .order('name')
    : { data: [], error: null }
  if (assignableRolesError) {
    throw new Error(`Unable to load assignable team roles: ${assignableRolesError.message}`)
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title="Team"
        description="Active members and their CRM roles."
        actions={
          <Badge tone={canManage ? 'success' : 'neutral'}>
            {canManage ? 'Can manage roles' : 'View only'}
          </Badge>
        }
      />

      {!canManage ? (
        <Alert tone="info" title="Limited access">
          You can view who is on the team, but only members with{' '}
          <span className="font-mono text-zinc-200">users.manage</span> can change roles.
        </Alert>
      ) : null}

      {members.length === 0 ? (
        <Card>
          <EmptyState title="No active members found" description="Invite colleagues to join this organization." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => {
            const isSelf = member.id === auth.membership.id
            const roleName = member.role?.name || 'Assigned role'
            const isOwner = Boolean(member.role?.is_owner_role)
            return (
              <Card key={member.id} className="flex flex-col">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.09] bg-zinc-950 text-xs font-semibold tracking-wide text-zinc-200"
                    aria-hidden
                  >
                    {getInitials(member.profile?.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-white">
                        {member.profile?.full_name || 'Unnamed member'}
                      </p>
                      {isSelf ? <Badge tone="info">You</Badge> : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{member.profile?.email}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.055] pt-4">
                  <Badge tone={isOwner ? 'warning' : 'neutral'}>{roleName}</Badge>
                  <Badge tone="success">Active</Badge>
                </div>

                {canManage ? (
                  <div className="mt-4">
                    {isSelf ? (
                      <p className="text-xs text-zinc-600">You cannot change your own role here.</p>
                    ) : isOwner ? (
                      <p className="text-xs text-zinc-600">Owner role cannot be reassigned from this screen.</p>
                    ) : (
                      <>
                        <CardHeader title="Assign role" description="Non-owner system roles only" />
                        <form action={changeRole} className="flex flex-col gap-2 sm:flex-row">
                          <input type="hidden" name="membership_id" value={member.id} />
                          <Select name="role_id" defaultValue="" required className="flex-1 !mt-0">
                            <option value="">Select role</option>
                            {(assignableRoles || []).map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </Select>
                          <Button type="submit" variant="secondary" size="sm">
                            Save
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
