import { createClient } from '../../../../src/utils/supabase/server'
import { requireAuthContext, requirePermission } from '../../../../src/lib/auth/guard'
import { PERMISSIONS } from '../../../../src/lib/auth/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { parseINRToMinor } from '../../../../src/utils/formatters'
import { PageShell, PageHeader } from '../../../../src/components/ui/Page'
import { Card, CardHeader } from '../../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../../src/components/ui/Button'
import { Field, Input, Select, Textarea } from '../../../../src/components/ui/Field'

async function createLead(formData: FormData) {
  'use server'

  const auth = await requireAuthContext()
  await requirePermission(auth, PERMISSIONS.LEADS_CREATE)
  const { supabase, user, membership } = auth

  const contactName = String(formData.get('contact_name') || '').trim()
  if (!contactName) {
    throw new Error('Contact name is required.')
  }

  const nextFollowup = String(formData.get('next_followup_at') || '').trim()

  const lead = {
    organization_id: membership.organization_id,
    contact_name: contactName,

    company_name: String(formData.get('company_name') || '').trim() || null,
    designation: String(formData.get('designation') || '').trim() || null,
    email: String(formData.get('email') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    whatsapp: String(formData.get('whatsapp') || '').trim() || null,

    city: String(formData.get('city') || '').trim() || null,
    state: String(formData.get('state') || '').trim() || null,
    country: String(formData.get('country') || '').trim() || 'India',

    industry: String(formData.get('industry') || '').trim() || null,
    business_type: String(formData.get('business_type') || '').trim() || null,
    business_size: String(formData.get('business_size') || '').trim() || null,

    problem_need: String(formData.get('problem_need') || '').trim() || null,
    desired_outcome: String(formData.get('desired_outcome') || '').trim() || null,

    urgency: String(formData.get('urgency') || '').trim() || null,
    decision_maker_status: String(formData.get('decision_maker_status') || '').trim() || null,

    service_of_interest: String(formData.get('service_of_interest') || '').trim() || null,
    next_action: String(formData.get('next_action') || '').trim() || null,
    next_followup_at: nextFollowup ? new Date(nextFollowup).toISOString() : null,

    priority: String(formData.get('priority') || 'medium'),
    do_not_contact: formData.get('do_not_contact') === 'on',

    owner_id: user.id,
    created_by: user.id,
  }

  const { data: newLead, error: leadError } = await supabase
    .from('leads')
    .insert(lead)
    .select('id')
    .single()

  if (leadError) {
    throw new Error(`Unable to create lead: ${leadError.message}`)
  }

  const estimatedRaw = String(formData.get('estimated_amount') || '').trim()
  if (estimatedRaw && newLead?.id) {
    const amountMinor = parseINRToMinor(estimatedRaw)
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
      throw new Error('Estimated deal value must be a valid non-negative rupee amount.')
    }
    if (amountMinor > 0) {
      const confidence = String(formData.get('confidence') || 'medium')
      const basis = String(formData.get('basis') || '').trim() || null
      const { error: estimateError } = await supabase.from('lead_estimates').insert({
        lead_id: newLead.id,
        organization_id: membership.organization_id,
        amount_minor: amountMinor,
        currency: 'INR',
        confidence: ['low', 'medium', 'high'].includes(confidence) ? confidence : 'medium',
        basis,
        created_by: user.id,
      })
      if (estimateError) {
        throw new Error(`Lead was created, but estimate could not be saved: ${estimateError.message}`)
      }
    }
  }

  redirect('/dashboard/leads')
}

export default async function NewLeadPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Add Lead"
        description="Capture prospect contact details, business requirements, and a preliminary deal estimate."
        breadcrumb={
          <Link href="/dashboard/leads" className="text-xs text-zinc-400 transition hover:text-white">
            ← Back to Leads
          </Link>
        }
      />

      <form action={createLead} className="space-y-6">
        <Card>
          <CardHeader title="Contact details" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person name" htmlFor="contact_name" required>
              <Input id="contact_name" name="contact_name" placeholder="e.g. Ramesh Patel" required />
            </Field>
            <Field label="Company / business name" htmlFor="company_name">
              <Input id="company_name" name="company_name" placeholder="e.g. Patel Engineering Works" />
            </Field>
            <Field label="Designation" htmlFor="designation">
              <Input id="designation" name="designation" placeholder="e.g. Managing Director" />
            </Field>
            <Field label="Email address" htmlFor="email">
              <Input id="email" name="email" type="email" placeholder="ramesh@company.com" />
            </Field>
            <Field label="Phone number" htmlFor="phone">
              <Input id="phone" name="phone" placeholder="+91 98765 43210" />
            </Field>
            <Field label="WhatsApp number" htmlFor="whatsapp">
              <Input id="whatsapp" name="whatsapp" placeholder="+91 98765 43210" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Business profile & location" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Industry / niche" htmlFor="industry">
              <Input id="industry" name="industry" placeholder="e.g. Interior Design, Manufacturing" />
            </Field>
            <Field label="Service of interest" htmlFor="service_of_interest">
              <Input
                id="service_of_interest"
                name="service_of_interest"
                placeholder="e.g. Website Redesign, SEO"
              />
            </Field>
            <Field label="Business type" htmlFor="business_type">
              <Input id="business_type" name="business_type" placeholder="e.g. B2B, Retail" />
            </Field>
            <Field label="Business size" htmlFor="business_size">
              <Input id="business_size" name="business_size" placeholder="e.g. 5–20 employees" />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="City" htmlFor="city">
              <Input id="city" name="city" placeholder="e.g. Mumbai" />
            </Field>
            <Field label="State" htmlFor="state">
              <Input id="state" name="state" placeholder="e.g. Maharashtra" />
            </Field>
            <Field label="Country" htmlFor="country">
              <Input id="country" name="country" defaultValue="India" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Preliminary deal estimate"
            description="Optional sales estimate stored securely with the lead."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Estimated value (INR ₹)" htmlFor="estimated_amount" hint="Enter rupees, not paise.">
              <Input
                id="estimated_amount"
                name="estimated_amount"
                type="number"
                step="500"
                min="0"
                placeholder="25000"
              />
            </Field>
            <Field label="Confidence level" htmlFor="confidence">
              <Select id="confidence" name="confidence" defaultValue="medium">
                <option value="low">Low — rough initial inquiry</option>
                <option value="medium">Medium — expressed budget range</option>
                <option value="high">High — scope and pricing aligned</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Estimate basis / scope summary" htmlFor="basis">
              <Input
                id="basis"
                name="basis"
                placeholder="e.g. 5-page business website with enquiry form"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Qualification & next action" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority level" htmlFor="priority">
              <Select id="priority" name="priority" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </Field>
            <Field label="Urgency / timeline" htmlFor="urgency">
              <Input id="urgency" name="urgency" placeholder="e.g. Needs launch in 2 weeks" />
            </Field>
            <Field label="Decision maker status" htmlFor="decision_maker_status">
              <Input
                id="decision_maker_status"
                name="decision_maker_status"
                placeholder="e.g. Sole owner / Board approval"
              />
            </Field>
            <Field label="Immediate next action" htmlFor="next_action">
              <Input
                id="next_action"
                name="next_action"
                placeholder="e.g. Share portfolio & schedule call"
              />
            </Field>
            <Field label="Next follow-up date & time" htmlFor="next_followup_at">
              <Input id="next_followup_at" name="next_followup_at" type="datetime-local" />
            </Field>
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Observed problem / client need" htmlFor="problem_need">
              <Textarea
                id="problem_need"
                name="problem_need"
                rows={3}
                placeholder="Current site is non-responsive on mobile…"
              />
            </Field>
            <Field label="Desired outcome" htmlFor="desired_outcome">
              <Textarea
                id="desired_outcome"
                name="desired_outcome"
                rows={3}
                placeholder="Increase inbound qualified phone leads…"
              />
            </Field>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-xs text-zinc-400">
            <input
              type="checkbox"
              name="do_not_contact"
              className="h-4 w-4 rounded border-white/[0.065] bg-zinc-950 accent-white"
            />
            Do not contact (restricted from cold outreach)
          </label>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <ButtonLink href="/dashboard/leads" variant="secondary">
            Cancel
          </ButtonLink>
          <Button type="submit">Create Lead</Button>
        </div>
      </form>
    </PageShell>
  )
}
