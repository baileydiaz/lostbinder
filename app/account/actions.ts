'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function changeUsername(formData: FormData) {
  const value = formData.get('username')
  if (typeof value !== 'string') redirect('/account?error=Invalid username')
  const username = value.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    redirect('/account?error=Use 3-30 letters, numbers, or underscores')
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { error } = await supabase.from('profiles').update({ username }).eq('id', user.id)
  if (error) redirect('/account?error=Username unavailable or could not be saved')
  revalidatePath('/', 'layout')
  redirect('/account?success=Username updated')
}
