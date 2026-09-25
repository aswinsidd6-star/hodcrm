/**
 * HOD CRM — Value Formatters
 * Formats currency (paise to INR), dates, and badges consistently.
 */

export function formatINR(paise: number | bigint | null | undefined): string {
  if (paise === null || paise === undefined) return '—'
  const rupees = Number(paise) / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees)
}

export function formatINRWithDecimals(paise: number | bigint | null | undefined): string {
  if (paise === null || paise === undefined) return '—'
  const rupees = Number(paise) / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees)
}

export function parseINRToMinor(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return NaN
  const trimmed = typeof value === 'string' ? value.trim() : value
  if (trimmed === '') return NaN
  const rupees = typeof trimmed === 'number' ? trimmed : Number(trimmed)
  if (!Number.isFinite(rupees) || rupees < 0) return NaN
  const minor = Math.round(rupees * 100)
  return Number.isSafeInteger(minor) ? minor : NaN
}

/** Non-negative money amount in minor units (estimates, invoice lines). */
export function requireNonNegativeMinor(value: string | number | null | undefined, label = 'Amount'): number {
  const minor = parseINRToMinor(value)
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new Error(`${label} must be a valid non-negative rupee amount.`)
  }
  return minor
}

/** Strictly positive money amount in minor units (payments, cash-flow entries). */
export function requirePositiveMinor(value: string | number | null | undefined, label = 'Amount'): number {
  const minor = parseINRToMinor(value)
  if (!Number.isSafeInteger(minor) || minor <= 0) {
    throw new Error(`${label} must be a valid positive rupee amount.`)
  }
  return minor
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '—'
  }
}

export function isPastDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return !isNaN(d.getTime()) && d.getTime() < Date.now()
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
