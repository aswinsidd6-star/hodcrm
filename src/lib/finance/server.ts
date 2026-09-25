import { getFinanceClient, requireAuthContext, requireMoneyAccess, requireMoneyManage } from '../auth/guard'

export const FINANCE_ENVIRONMENT_VARIABLE = 'SUPABASE_SERVICE_ROLE_KEY'

export async function requireFinanceContext() {
  const auth = await requireAuthContext()
  await requireMoneyAccess(auth)
  const finance = getFinanceClient()
  return { auth, finance }
}

export async function requireFinanceMutationContext() {
  const context = await requireFinanceContext()
  await requireMoneyManage(context.auth)
  return context
}