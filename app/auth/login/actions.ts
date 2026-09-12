'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email')
  const password = formData.get('password')

  if (
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    redirect('/auth/login?error=Invalid form data')
  }

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (error) {
    redirect(
      `/auth/login?error=${encodeURIComponent(
        error.message
      )}`
    )
  }

  revalidatePath('/', 'layout')
  redirect('/')
}