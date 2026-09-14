'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(
  formData: FormData
) {
  const supabase =
    await createClient()

  const usernameInput =
    formData.get('username')

  const emailInput =
    formData.get('email')

  const passwordInput =
    formData.get('password')

  if (
    typeof usernameInput !== 'string' ||
    typeof emailInput !== 'string' ||
    typeof passwordInput !== 'string'
  ) {
    redirect(
      '/auth/sign-up?error=Invalid form data'
    )
  }

  const username =
    usernameInput
      .trim()
      .toLowerCase()

  const email =
    emailInput
      .trim()
      .toLowerCase()

  const password =
    passwordInput

  if (
    username.length < 3 ||
    username.length > 30
  ) {
    redirect(
      '/auth/sign-up?error=Username must be between 3 and 30 characters'
    )
  }

  if (
    !/^[a-z0-9_]+$/.test(username)
  ) {
    redirect(
      '/auth/sign-up?error=Username can only contain letters, numbers, and underscores'
    )
  }

  if (password.length < 6) {
    redirect(
      '/auth/sign-up?error=Password must be at least 6 characters'
    )
  }

  // Make sure the username isn't already taken.
  const {
    data: existingProfile,
    error: usernameCheckError,
  } =
    await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

  if (usernameCheckError) {
    console.error(
      'Username check error:',
      usernameCheckError
    )

    redirect(
      '/auth/sign-up?error=Could not check username'
    )
  }

  if (existingProfile) {
    redirect(
      '/auth/sign-up?error=That username is already taken'
    )
  }

  const {
    error,
  } =
    await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          username,
          display_name: username,
        },
      },
    })

  if (error) {
    console.error(
      'Signup error:',
      error
    )

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