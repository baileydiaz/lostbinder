'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(formData: FormData) {
  const value = formData.get('email')
  if (typeof value !== 'string' || !value.includes('@')) {
    redirect('/auth/forgot-password?error=Enter a valid email address')
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(value.trim(), {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://thelostbinder.com'}/auth/confirm?next=/auth/reset-password`,
  })
  if (error) {
    redirect('/auth/forgot-password?error=Unable to send reset email. Please try again later.')
  }
  redirect('/auth/forgot-password?sent=1')
}
