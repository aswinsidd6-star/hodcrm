import { Alert } from './Badge'

const notices: Record<string, { tone: 'success' | 'warning' | 'danger' | 'info'; message: string }> = {
  saved: { tone: 'success', message: 'Changes saved.' },
  created: { tone: 'success', message: 'Record created.' },
  recorded: { tone: 'success', message: 'Record saved.' },
  already_recorded: {
    tone: 'info',
    message: 'That payment was already recorded. No duplicate was created.',
  },
  possible_duplicate: {
    tone: 'warning',
    message:
      'A payment with the same invoice, amount, and date already exists. Confirm below only if this is an additional legitimate payment.',
  },
  reversed: { tone: 'success', message: 'Payment reversal recorded. Cash flow will show a matching outflow.' },
  issued: { tone: 'success', message: 'Invoice marked as issued. Sending is not configured in this workspace.' },
  invoice_number_exists: {
    tone: 'warning',
    message: 'That invoice number already exists in this organization.',
  },
  exceeds_outstanding: {
    tone: 'danger',
    message: 'Payment exceeds the outstanding invoice balance.',
  },
}

export function FeedbackBanner({
  notice,
  error,
}: {
  notice?: string | null
  error?: string | null
}) {
  const key = error || notice
  if (!key) return null
  const match = notices[key]
  if (!match) return null
  return <Alert tone={match.tone}>{match.message}</Alert>
}
