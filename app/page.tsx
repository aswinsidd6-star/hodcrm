'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../src/utils/supabase/client'
import { Alert } from '../src/components/ui/Badge'
import { Button } from '../src/components/ui/Button'
import { Field, Input } from '../src/components/ui/Field'
import { HodMark } from '../src/components/ui/HodMark'

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(228,184,95,0.09),transparent_48%)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#a96f24]/[0.035] blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-9 text-center">
          <div className="mx-auto mb-5 inline-flex"><HodMark size="lg" /></div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#a96f24]">Commercial operating system</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#f7f3eb]">HOD CRM</h1>
          <p className="mt-2 text-sm text-zinc-500">House of Durables · Commercial workspace</p>
        </div>

        <div className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-gradient-to-br from-white/[0.05] via-white/[0.025] to-transparent p-7 shadow-[0_30px_90px_rgba(0,0,0,.42)] backdrop-blur-xl sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#e4b85f]/[0.045] blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Welcome back</h2>
            <p className="mt-1 text-sm text-zinc-500">Sign in to your organization workspace.</p>

            <form onSubmit={handleLogin} className="mt-6 space-y-5">
              <Field label="Email" htmlFor="email" required>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required />
              </Field>

              <Field label="Password" htmlFor="password" required>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required />
              </Field>

              {error ? <Alert tone="danger">{error}</Alert> : null}
              <Button type="submit" disabled={loading} className="w-full" size="lg">{loading ? 'Signing in…' : 'Sign in'}</Button>
            </form>
          </div>
        </div>

        <p className="mt-7 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-700">Secure access · HOD — House of Durables</p>
      </div>
    </main>
  )
}
