import { requireAuthContext } from '../../src/lib/auth/guard'
import DashboardNav from './DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await requireAuthContext()

  return (
    <div className="min-h-screen bg-[#060606] text-white lg:flex">
      <DashboardNav
        userEmail={auth.user.email}
        orgName={auth.membership.organization.name}
        roleName={auth.membership.role.name}
        isOwner={auth.isOwner}
        hasMoneyAccess={auth.hasMoneyAccess}
      />

      <main className="relative min-w-0 flex-1 overflow-x-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_72%_0%,rgba(228,184,95,0.08),transparent_55%)]"
        />

        <div className="relative min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}