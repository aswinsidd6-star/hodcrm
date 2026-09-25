import { PageHeader, PageShell } from '../../../src/components/ui/Page'
import { Card } from '../../../src/components/ui/Card'
import { ButtonLink } from '../../../src/components/ui/Button'
import { Alert, Badge } from '../../../src/components/ui/Badge'

export default function FinanceLockedPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Finance locked"
        description="This workspace section requires elevated commercial permissions."
        actions={<Badge tone="warning">Access denied</Badge>}
      />

      <Card>
        <Alert tone="warning" title="Finance workspace is locked">
          Invoices, payments, and cash flow require the{' '}
          <span className="font-mono text-amber-100">money.view</span> permission. Ask an
          organization owner to grant finance access if you need these records.
        </Alert>
        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink href="/dashboard">Back to overview</ButtonLink>
          <ButtonLink href="/dashboard/deals" variant="secondary">
            View deals
          </ButtonLink>
        </div>
      </Card>
    </PageShell>
  )
}
