'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function resendConfirmation(formData: FormData) {
  const email = formData.get('email')
  if (typeof email !== 'string' || !email.includes('@')) redirect('/auth/resend-confirmation?error=Enter a valid email')
  const supabase = await createClient()
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
  if (error) redirect('/auth/resend-confirmation?error=Unable to send email. Please try again later.')
  redirect('/auth/resend-confirmation?sent=1')
}
