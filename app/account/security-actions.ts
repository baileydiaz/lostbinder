'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function changePassword(formData: FormData) {
  const current = formData.get('current')
  const next = formData.get('next')
  const confirm = formData.get('confirm')
  if (typeof current !== 'string' || typeof next !== 'string' || next.length < 12 || next !== confirm) {
    redirect('/account?error=New passwords must match and contain at least 12 characters')
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/auth/login')
  const { error: checkError } = await supabase.auth.signInWithPassword({ email: user.email, password: current })
  if (checkError) redirect('/account?error=Current password is incorrect')
  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) redirect('/account?error=Could not update password')
  redirect('/account?success=Password changed')
}

export async function requestAccountDeletion(formData: FormData) {
  const confirmation = formData.get('confirmation')
  if (confirmation !== 'DELETE') redirect('/account?error=Type DELETE to confirm')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  // Never expose the service role key or delete auth.users from a client request.
  // Actual deletion must be implemented through a protected backend with verified identity,
  // a recent reauthentication step, and database cascade checks.
  redirect('/account?error=Account deletion is not enabled yet. Contact support for deletion.')
}
