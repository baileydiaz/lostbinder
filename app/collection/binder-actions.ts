'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function currentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return { supabase, user }
}

export type CreateBinderState = { error: string }

export async function createBinder(_previous: CreateBinderState, form: FormData): Promise<CreateBinderState> {
  const { supabase, user } = await currentUser()
  const title = String(form.get('title') ?? '').trim().slice(0, 60)
  const description = String(form.get('description') ?? '').trim().slice(0, 500)
  const kind = form.get('kind') === 'dream' ? 'dream' : 'custom'
  if (!title) return { error: 'Please enter a binder name.' }
  if (kind === 'dream') {
    const { data: existing, error: lookupError } = await supabase.from('user_binders')
      .select('id').eq('user_id', user.id).eq('kind', 'dream').maybeSingle()
    if (lookupError) return { error: 'Could not check your Dream Binder. Please try again.' }
    if (existing) return { error: 'You already have a Dream Binder. Open it above or create a Custom Binder instead.' }
  }
  const { data, error } = await supabase.from('user_binders')
    .insert({ user_id: user.id, title, description, kind, is_public: false })
    .select('id').single()
  if (error || !data) {
    if (error?.code === '23505' && kind === 'dream') return { error: 'You already have a Dream Binder. Open it above or create a Custom Binder instead.' }
    return { error: 'Could not create your binder. Please try again.' }
  }
  revalidatePath('/collection')
  redirect('/collection/binders/' + data.id)
}

export async function addBinderCard(form: FormData) {
  const { supabase, user } = await currentUser()
  const binderId = String(form.get('binder_id') ?? '')
  const cardId = String(form.get('card_id') ?? '')
  const { data: binder } = await supabase.from('user_binders')
    .select('id,kind').eq('id', binderId).eq('user_id', user.id).single()
  if (!binder || !cardId) redirect('/collection')
  const { data: existing } = await supabase.from('user_binder_cards')
    .select('position,card_id').eq('binder_id', binderId).order('position')
  if (existing?.some((item) => item.card_id === cardId)) redirect('/collection/binders/' + binderId)
  if (binder.kind === 'dream' && (existing?.length ?? 0) >= 9) redirect('/collection/binders/' + binderId + '?error=full')
  const position = existing?.length ? Math.max(...existing.map((item) => item.position)) + 1 : 0
  const { error } = await supabase.from('user_binder_cards')
    .insert({ binder_id: binderId, user_id: user.id, card_id: cardId, position })
  if (error) redirect('/collection/binders/' + binderId + '?error=add')
  revalidatePath('/collection/binders/' + binderId)
  redirect('/collection/binders/' + binderId)
}

export async function removeBinderCard(form: FormData) {
  const { supabase, user } = await currentUser()
  const binderId = String(form.get('binder_id') ?? '')
  const cardId = String(form.get('card_id') ?? '')
  await supabase.from('user_binder_cards').delete()
    .eq('binder_id', binderId).eq('card_id', cardId).eq('user_id', user.id)
  revalidatePath('/collection/binders/' + binderId)
}

export async function updateBinder(form: FormData) {
  const { supabase, user } = await currentUser()
  const id = String(form.get('binder_id') ?? '')
  const title = String(form.get('title') ?? '').trim().slice(0, 60)
  const description = String(form.get('description') ?? '').trim().slice(0, 500)
  if (!title) redirect('/collection/binders/' + id + '?error=title')
  const isPublic = form.get('is_public') === 'on'
  const { data, error } = await supabase.from('user_binders')
    .update({ title, description, is_public: isPublic })
    .eq('id', id).eq('user_id', user.id).select('id').maybeSingle()
  if (error || !data) redirect('/collection/binders/' + id + '?error=settings')
  revalidatePath('/collection')
  revalidatePath('/collection/binders/' + id)
  redirect('/collection/binders/' + id + '?saved=1')
}

export async function deleteBinder(form: FormData) {
  const { supabase, user } = await currentUser()
  const id = String(form.get('binder_id') ?? '')
  await supabase.from('user_binders').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/collection')
  redirect('/collection')
}
