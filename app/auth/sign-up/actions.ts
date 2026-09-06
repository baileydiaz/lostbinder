'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email')
  const password = formData.get('password')
  const displayName = formData.get('displayName')

  if (
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    redirect('/auth/sign-up?error=Invalid form data')
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name:
          typeof displayName === 'string'
            ? displayName
            : null,
      },
    },
  })

  if (error) {
    redirect(
      `/auth/sign-up?error=${encodeURIComponent(
        error.message
      )}`
    )
  }

  redirect(
    '/auth/sign-up?success=Check your email to confirm your account.'
  )
}