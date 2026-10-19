'use server'

import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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
  if (formData.get('confirmation') !== 'DELETE') {
    redirect('/account?error=Type DELETE to confirm account deletion')
  }
  const password = formData.get('password')
  if (typeof password !== 'string' || !password) {
    redirect('/account?error=Enter your current password to delete your account')
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user?.email) redirect('/auth/login')

  // Reauthenticate with the user's current password immediately before deletion.
  // This flow supports password-based accounts; OAuth-only accounts need a separate flow.
  const { data: verified, error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (verifyError || verified.user?.id !== user.id) {
    redirect('/account?error=Password verification failed. Account was not deleted')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) {
    console.error('Account deletion requires server-side Supabase admin credentials')
    redirect('/account?error=Account deletion is temporarily unavailable')
  }

  // Server-only credential: never expose this client or key to browser components.
  const admin = createAdminClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: deletionError } = await admin.auth.admin.deleteUser(user.id)
  if (deletionError) {
    console.error('Account deletion failed:', deletionError.message)
    redirect('/account?error=Account deletion failed. Please try again')
  }

  await supabase.auth.signOut()
  redirect('/auth/login?message=Your account has been deleted')
}
