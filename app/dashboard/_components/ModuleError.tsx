'use client'

import { PageShell } from '../../../src/components/ui/Page'
import { Card } from '../../../src/components/ui/Card'
import { Button } from '../../../src/components/ui/Button'
import { Alert, Badge } from '../../../src/components/ui/Badge'

export default function ModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const message =
    error?.message && !error.message.startsWith('An error occurred')
      ? error.message
      : 'The request could not be completed. Your records were not changed.'

  return (
    <PageShell width="narrow">
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Badge tone="danger">Error</Badge>
          {error?.digest ? (
            <span className="font-mono text-[10px] text-zinc-600">{error.digest}</span>
          ) : null}
        </div>
        <h1 className="text-lg font-semibold text-white">Unable to load this CRM view</h1>
        <div className="mt-4">
          <Alert tone="danger">{message}</Alert>
        </div>
        <Button type="button" onClick={() => reset()} className="mt-6">
          Try again
        </Button>
      </Card>
    </PageShell>
  )
}
