'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function resetPassword(formData: FormData) {
  const password = formData.get('password')
  const confirm = formData.get('confirm')
  if (typeof password !== 'string' || password.length < 12 || password !== confirm) {
    redirect('/auth/reset-password?error=Passwords must match and be at least 12 characters')
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/forgot-password?error=Your reset link has expired. Request a new one.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect('/auth/reset-password?error=Unable to update password. Request a new reset link.')
  redirect('/account?success=Password updated')
}
