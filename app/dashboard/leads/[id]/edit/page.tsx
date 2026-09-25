import { createClient } from '../../../../../src/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { requireAuthContext, requirePermission } from '../../../../../src/lib/auth/guard'
import { PERMISSIONS } from '../../../../../src/lib/auth/permissions'
import { PageShell, PageHeader } from '../../../../../src/components/ui/Page'
import { Card, CardHeader } from '../../../../../src/components/ui/Card'
import { Button, ButtonLink } from '../../../../../src/components/ui/Button'
import { Field, Input, Select, Textarea } from '../../../../../src/components/ui/Field'

type EditLeadPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditLeadPage({ params }: EditLeadPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !lead) {
    notFound()
  }

  async function updateLead(formData: FormData) {
    'use server'

    const auth = await requireAuthContext()
    await requirePermission(auth, PERMISSIONS.LEADS_UPDATE)
    const { supabase, user } = auth

    const contactName = String(formData.get('contact_name') || '').trim()
    if (!contactName) {
      throw new Error('Contact name is required.')
    }

    const nextFollowup = String(formData.get('next_followup_at') || '').trim()

    const { error } = await supabase
      .from('leads')
      .update({
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
        service_of_interest: String(formData.get('service_of_interest') || '').trim() || null,

        priority: String(formData.get('priority') || 'medium'),
        urgency: String(formData.get('urgency') || '').trim() || null,
        decision_maker_status: String(formData.get('decision_maker_status') || '').trim() || null,
        next_action: String(formData.get('next_action') || '').trim() || null,
        next_followup_at: nextFollowup ? new Date(nextFollowup).toISOString() : null,

        problem_need: String(formData.get('problem_need') || '').trim() || null,
        desired_outcome: String(formData.get('desired_outcome') || '').trim() || null,
        qualification_notes: String(formData.get('qualification_notes') || '').trim() || null,
        do_not_contact: formData.get('do_not_contact') === 'on',

        updated_by: user.id,
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Unable to update lead: ${error.message}`)
    }

    revalidatePath('/dashboard/leads')
    revalidatePath(`/dashboard/leads/${id}`)
    redirect(`/dashboard/leads/${id}`)
  }

  let followupValue = ''
  if (lead.next_followup_at) {
    const d = new Date(lead.next_followup_at)
    if (!isNaN(d.getTime())) {
      followupValue = d.toISOString().slice(0, 16)
    }
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Edit Lead"
        description={`Updating record for ${lead.contact_name}${lead.company_name ? ` (${lead.company_name})` : ''}`}
        breadcrumb={
          <Link
            href={`/dashboard/leads/${id}`}
            className="text-xs text-zinc-400 transition hover:text-white"
          >
            ← Back to Lead #{lead.reference}
          </Link>
        }
      />

      <form action={updateLead} className="space-y-6">
        <Card>
          <CardHeader title="Contact details" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact name" htmlFor="contact_name" required>
              <Input
                id="contact_name"
                name="contact_name"
                defaultValue={lead.contact_name}
                required
              />
            </Field>
            <Field label="Company name" htmlFor="company_name">
              <Input id="company_name" name="company_name" defaultValue={lead.company_name || ''} />
            </Field>
            <Field label="Designation" htmlFor="designation">
              <Input id="designation" name="designation" defaultValue={lead.designation || ''} />
            </Field>
            <Field label="Email address" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={lead.email || ''}
              />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={lead.phone || ''} />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp">
              <Input id="whatsapp" name="whatsapp" defaultValue={lead.whatsapp || ''} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Business & location" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Industry" htmlFor="industry">
              <Input id="industry" name="industry" defaultValue={lead.industry || ''} />
            </Field>
            <Field label="Service of interest" htmlFor="service_of_interest">
              <Input
                id="service_of_interest"
                name="service_of_interest"
                defaultValue={lead.service_of_interest || ''}
              />
            </Field>
            <Field label="Business type" htmlFor="business_type">
              <Input
                id="business_type"
                name="business_type"
                defaultValue={lead.business_type || ''}
              />
            </Field>
            <Field label="Business size" htmlFor="business_size">
              <Input
                id="business_size"
                name="business_size"
                defaultValue={lead.business_size || ''}
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="City" htmlFor="city">
              <Input id="city" name="city" defaultValue={lead.city || ''} />
            </Field>
            <Field label="State" htmlFor="state">
              <Input id="state" name="state" defaultValue={lead.state || ''} />
            </Field>
            <Field label="Country" htmlFor="country">
              <Input id="country" name="country" defaultValue={lead.country || 'India'} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Qualification & pipeline status" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority" htmlFor="priority">
              <Select id="priority" name="priority" defaultValue={lead.priority}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </Field>
            <Field label="Urgency" htmlFor="urgency">
              <Input id="urgency" name="urgency" defaultValue={lead.urgency || ''} />
            </Field>
            <Field label="Decision maker status" htmlFor="decision_maker_status">
              <Input
                id="decision_maker_status"
                name="decision_maker_status"
                defaultValue={lead.decision_maker_status || ''}
              />
            </Field>
            <Field label="Next action" htmlFor="next_action">
              <Input id="next_action" name="next_action" defaultValue={lead.next_action || ''} />
            </Field>
            <Field label="Next follow-up" htmlFor="next_followup_at">
              <Input
                id="next_followup_at"
                name="next_followup_at"
                type="datetime-local"
                defaultValue={followupValue}
              />
            </Field>
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Problem / need" htmlFor="problem_need">
              <Textarea
                id="problem_need"
                name="problem_need"
                rows={3}
                defaultValue={lead.problem_need || ''}
              />
            </Field>
            <Field label="Desired outcome" htmlFor="desired_outcome">
              <Textarea
                id="desired_outcome"
                name="desired_outcome"
                rows={3}
                defaultValue={lead.desired_outcome || ''}
              />
            </Field>
            <Field label="Qualification notes" htmlFor="qualification_notes">
              <Textarea
                id="qualification_notes"
                name="qualification_notes"
                rows={2}
                defaultValue={lead.qualification_notes || ''}
              />
            </Field>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-xs text-zinc-400">
            <input
              type="checkbox"
              name="do_not_contact"
              defaultChecked={lead.do_not_contact}
              className="h-4 w-4 rounded border-white/[0.065] bg-zinc-950 accent-white"
            />
            Do not contact
          </label>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <ButtonLink href={`/dashboard/leads/${id}`} variant="secondary">
            Cancel
          </ButtonLink>
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </PageShell>
  )
}
