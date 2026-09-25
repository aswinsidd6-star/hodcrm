import { PageShell } from '../src/components/ui/Page'
import { Card } from '../src/components/ui/Card'
import { ButtonLink } from '../src/components/ui/Button'
import { Badge } from '../src/components/ui/Badge'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <PageShell width="narrow" className="py-16">
        <Card className="text-center">
          <Badge tone="neutral">404</Badge>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Record not found
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
            This lead, opportunity, estimate, or invoice may have been removed or is outside your
            visibility.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <ButtonLink href="/dashboard">Back to dashboard</ButtonLink>
            <ButtonLink href="/dashboard/leads" variant="secondary">
              Browse leads
            </ButtonLink>
          </div>
        </Card>
      </PageShell>
    </div>
  )
}
