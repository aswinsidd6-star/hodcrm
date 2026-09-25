import { Badge } from './Badge'

export function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  const p = (priority || 'medium').toLowerCase()
  const tone =
    p === 'urgent' ? 'danger' : p === 'high' ? 'warning' : p === 'low' ? 'neutral' : 'info'
  return <Badge tone={tone}>{p}</Badge>
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'paid'
      ? 'success'
      : status === 'partially_paid'
        ? 'info'
        : status === 'overdue'
          ? 'danger'
          : status === 'cancelled' || status === 'written_off'
            ? 'neutral'
            : status === 'issued'
              ? 'warning'
              : 'neutral'
  return <Badge tone={tone}>{status.replaceAll('_', ' ')}</Badge>
}

export function ConfidenceBadge({ confidence }: { confidence: string | null | undefined }) {
  const c = (confidence || '').toLowerCase()
  const tone = c === 'high' ? 'success' : c === 'medium' ? 'info' : c === 'low' ? 'warning' : 'neutral'
  return <Badge tone={tone}>{c || 'not set'}</Badge>
}
