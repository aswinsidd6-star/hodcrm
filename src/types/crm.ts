/**
 * HOD CRM — Type Definitions
 * Accurately models database schema from migrations 0001 through 0007.
 */

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type CallDirection = 'outbound' | 'inbound'
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'written_off'
export type PaymentMethod = 'bank_transfer' | 'upi' | 'cheque' | 'cash' | 'card' | 'gateway' | 'other'
export type DealValueKind = 'estimated' | 'quoted' | 'confirmed_contract'
export type FlowDirection = 'income' | 'expense'

export interface Organization {
  id: string
  name: string
  timezone: string
  date_format: string
  default_currency: string
  working_days: number[]
  default_followup_days: number
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  avatar_url: string | null
}

export interface Role {
  id: string
  organization_id: string
  key: string
  name: string
  description: string | null
  is_system: boolean
  is_owner_role: boolean
}

export interface Membership {
  id: string
  organization_id: string
  user_id: string
  role_id: string
  is_active: boolean
  invited_by: string | null
  invited_at: string
  accepted_at: string | null
  deactivated_at: string | null
  role?: Role
  profile?: Profile
  organization?: Organization
}

export interface LeadStage {
  id: string
  organization_id: string
  key: string
  name: string
  sort_order: number
  is_terminal: boolean
  is_active: boolean
}

export interface LeadSource {
  id: string
  organization_id: string
  name: string
  is_active: boolean
  sort_order: number
}

export interface Lead {
  id: string
  organization_id: string
  reference: number
  contact_name: string
  company_id: string | null
  contact_id: string | null
  company_name: string | null
  designation: string | null
  email: string | null
  phone: string | null
  phone_e164: string | null
  whatsapp: string | null
  whatsapp_e164: string | null
  website: string | null
  website_domain: string | null
  city: string | null
  state: string | null
  country: string | null
  industry: string | null
  business_type: string | null
  business_size: string | null
  business_model: string | null
  existing_presence: string | null
  existing_website_url: string | null
  current_solutions: string | null
  observed_problems: string | null
  improvement_notes: string | null
  source_id: string | null
  campaign: string | null
  referral_source: string | null
  original_contact_method: string | null
  last_contact_channel: string | null
  problem_need: string | null
  desired_outcome: string | null
  decision_maker_status: string | null
  urgency: string | null
  expected_decision_date: string | null
  commercial_fit: string | null
  qualification_notes: string | null
  stage_id: string | null
  priority: PriorityLevel
  service_of_interest: string | null
  last_contact_at: string | null
  last_call_outcome_id: string | null
  next_action: string | null
  next_followup_at: string | null
  lost_reason: string | null
  disqualification_reason: string | null
  do_not_contact: boolean
  owner_id: string | null
  created_by: string | null
  updated_by: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  row_version: number
  custom_fields?: Record<string, unknown>
  // Relations
  owner?: Profile | null
  stage?: LeadStage | null
  estimate?: LeadEstimate | null
}

export interface LeadEstimate {
  lead_id: string
  organization_id: string
  amount_minor: number // paise
  currency: string
  confidence: 'low' | 'medium' | 'high' | null
  basis: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  row_version: number
}

export interface OpportunityStage {
  id: string
  organization_id: string
  key: string
  name: string
  sort_order: number
  is_won: boolean
  is_lost: boolean
  is_active: boolean
}

export interface Opportunity {
  id: string
  organization_id: string
  reference: number
  title: string
  company_id: string | null
  primary_contact_id: string | null
  lead_id: string | null
  owner_id: string | null
  service_of_interest: string | null
  problem_solved: string | null
  proposed_solution: string | null
  scope: string | null
  stage_id: string | null
  expected_close_date: string | null
  next_action: string | null
  lost_reason: string | null
  contract_signed: boolean
  advance_received: boolean
  finance_approval_required: boolean
  finance_approved: boolean
  created_by: string | null
  updated_by: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  row_version: number
  custom_fields?: Record<string, unknown>
  // Joined relations
  lead?: Lead | null
  stage?: OpportunityStage | null
  owner?: Profile | null
  deal_value?: DealValue | null
}

export interface DealValue {
  id: string
  organization_id: string
  opportunity_id: string
  kind: DealValueKind
  amount_minor: number
  currency: string
  effective_from: string
  notes: string | null
  created_by: string
}

export interface Invoice {
  id: string
  organization_id: string
  number: string
  opportunity_id: string | null
  company_id: string | null
  contact_id: string | null
  invoice_date: string
  due_date: string
  amount_minor: number // Base amount in paise
  tax_minor: number    // Tax amount in paise
  currency: string
  status: InvoiceStatus
  notes: string | null
  created_by: string
  updated_by: string | null
  voided_at: string | null
  void_reason: string | null
  created_at: string
  updated_at: string
  // Virtual / computed
  paid_minor?: number
  outstanding_minor?: number
  opportunity?: Opportunity | null
}

export interface Payment {
  id: string
  organization_id: string
  invoice_id: string
  amount_minor: number
  currency: string
  paid_on: string
  method: PaymentMethod
  reference: string | null
  notes: string | null
  reverses_id: string | null
  recorded_by: string
  created_at: string
  invoice?: Invoice | null
}

export interface TransactionCategory {
  id: string
  organization_id: string
  direction: FlowDirection
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
}

export interface Transaction {
  id: string
  organization_id: string
  direction: FlowDirection
  amount_minor: number
  currency: string
  occurred_on: string
  category_id: string | null
  description: string | null
  method: PaymentMethod
  company_id: string | null
  opportunity_id: string | null
  invoice_id: string | null
  payment_id: string | null
  reference: string | null
  receipt_note: string | null
  receipt_url: string | null
  voided_at: string | null
  void_reason: string | null
  recorded_by: string
  created_at: string
  category?: TransactionCategory | null
}

export interface CashFlowMonthly {
  organization_id: string
  month: string
  currency: string
  income_minor: number
  expense_minor: number
  net_minor: number
  entry_count: number
}
