import type { InvoiceStatus } from '../../types/crm'

/** Statuses owned by payment/due-date refresh — never set manually. */
export const PAYMENT_DERIVED_STATUSES: readonly InvoiceStatus[] = [
  'partially_paid',
  'paid',
  'overdue',
]

/** Statuses operators may choose in the invoice editor. */
export const MANUAL_INVOICE_STATUSES: readonly InvoiceStatus[] = [
  'draft',
  'issued',
  'cancelled',
  'written_off',
]

export function isPaymentDerivedStatus(status: string): boolean {
  return (PAYMENT_DERIVED_STATUSES as readonly string[]).includes(status)
}

export function isManualInvoiceStatus(status: string): boolean {
  return (MANUAL_INVOICE_STATUSES as readonly string[]).includes(status)
}

/**
 * Resolve the status to persist on a manual invoice edit.
 * Payment-derived states stay intact unless the operator cancels or writes off.
 * Draft/issued cannot be forced while payments already exist.
 */
export function resolveInvoiceStatusUpdate(input: {
  currentStatus: string
  requestedStatus: string
  paidMinor: number
}): { status: string; lockedDerived: boolean } {
  const { currentStatus, requestedStatus, paidMinor } = input

  if (requestedStatus === 'keep_derived') {
    return { status: currentStatus, lockedDerived: true }
  }

  if (!isManualInvoiceStatus(requestedStatus)) {
    throw new Error('That invoice status cannot be set manually.')
  }

  if (isPaymentDerivedStatus(currentStatus)) {
    if (requestedStatus === 'cancelled' || requestedStatus === 'written_off') {
      return { status: requestedStatus, lockedDerived: false }
    }
    // Keep payment/due-date derived status; ignore draft/issued from a mismatched select.
    return { status: currentStatus, lockedDerived: true }
  }

  if (paidMinor > 0 && (requestedStatus === 'draft' || requestedStatus === 'issued')) {
    throw new Error(
      'This invoice already has payments. Cancel or write it off instead of setting draft or issued.'
    )
  }

  return { status: requestedStatus, lockedDerived: false }
}
