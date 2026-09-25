'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Binder = { id: string; title: string; kind: 'dream' | 'custom'; count: number; hasCard: boolean }

export default function AddToBinder({ cardId, userId }: { cardId: string; userId: string | null }) {
  const [open, setOpen] = useState(false)
  const [binders, setBinders] = useState<Binder[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open || !userId) return
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const supabase = createClient()
      const { data, error: loadError } = await supabase.from('user_binders')
        .select('id,title,kind').eq('user_id', userId!).order('created_at', { ascending: false })
      if (loadError) { if (active) setError('Could not load your binders.'); setLoading(false); return }
      const rows = await Promise.all((data ?? []).map(async (binder) => {
        const { data: entries, error: entryError } = await supabase.from('user_binder_cards')
          .select('card_id').eq('binder_id', binder.id)
        if (entryError) throw entryError
        return { ...binder, count: (entries ?? []).length, hasCard: (entries ?? []).some(item => item.card_id === cardId) } as Binder
      }))
      if (active) { setBinders(rows); setSelected(rows.filter(item => item.hasCard).map(item => item.id)); setLoading(false) }
    }
    void load().catch(() => { if (active) { setError('Could not load your binders.'); setLoading(false) } })
    return () => { active = false }
  }, [open, userId, cardId])

  async function createBinder() {
    if (!userId || !newName.trim() || saving) return
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error: createError } = await supabase.from('user_binders')
      .insert({ user_id: userId, title: newName.trim().slice(0, 60), kind: 'custom', is_public: false })
      .select('id,title,kind').single()
    if (createError || !data) setError('Could not create binder. Please try again.')
    else { setBinders(current => [{ ...data, count: 0, hasCard: false } as Binder, ...current]); setSelected(current => [...current, data.id]); setNewName(''); setCreating(false) }
    setSaving(false)
  }

  async function save() {
    if (!userId || saving) return
    setSaving(true); setError(''); setMessage('')
    const supabase = createClient()
    try {
      for (const binder of binders) {
        const wants = selected.includes(binder.id)
        if (wants === binder.hasCard) continue
        if (wants) {
          if (binder.kind === 'dream' && binder.count >= 9) throw new Error('Your Dream Binder already has nine cards.')
          const { data: entries, error: readError } = await supabase.from('user_binder_cards')
            .select('position').eq('binder_id', binder.id).order('position', { ascending: false }).limit(1)
          if (readError) throw readError
          const position = entries?.length ? entries[0].position + 1 : 0
          const { error: insertError } = await supabase.from('user_binder_cards')
            .insert({ binder_id: binder.id, user_id: userId, card_id: cardId, position })
          if (insertError) throw insertError
        } else {
          const { error: removeError } = await supabase.from('user_binder_cards')
            .delete().eq('binder_id', binder.id).eq('user_id', userId).eq('card_id', cardId)
          if (removeError) throw removeError
        }
        setBinders(current => current.map(item => item.id === binder.id
          ? { ...item, hasCard: wants, count: item.count + (wants ? 1 : -1) } : item))
      }
      setMessage('Binder selections saved.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save binder selections.')
    } finally { setSaving(false) }
  }

  if (!userId) return <Link href="/auth/login" className="mt-2 block rounded-xl border border-white/20 py-2 text-center text-sm text-zinc-300">Log in to add to Binder</Link>
  return <div className="mt-3">
    <button type="button" onClick={() => setOpen(current => !current)}
      aria-expanded={open} className="w-full rounded-xl border border-white/25 px-4 py-3 text-sm font-semibold text-white hover:border-white/60">
      {open ? 'Close Binder selector' : '+ Add to Binder'}
    </button>
    {open && <div className="mt-3 space-y-3 rounded-xl border border-white/15 bg-black p-4">
      <h3 className="font-semibold">Add to Binder</h3>
      <p className="text-xs text-zinc-400">Choose one or more collections. This does not change your Love reaction or advance Explore.</p>
      {loading ? <p className="text-sm text-zinc-400">Loading binders…</p> : binders.map(binder => <label key={binder.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/15 p-3">
        <input type="checkbox" checked={selected.includes(binder.id)}
          disabled={saving || (binder.kind === 'dream' && binder.count >= 9 && !binder.hasCard)}
          onChange={event => setSelected(current => event.target.checked ? [...current, binder.id] : current.filter(id => id !== binder.id))} />
        <span className="min-w-0 flex-1 truncate text-sm">{binder.title}</span>
        <span className="text-xs text-zinc-500">{binder.kind === 'dream' ? binder.count + '/9' : binder.count + ' cards'}</span>
      </label>)}
      {creating ? <div className="flex gap-2"><input value={newName} onChange={event => setNewName(event.target.value)}
        maxLength={60} placeholder="New binder name" className="min-w-0 flex-1 rounded-lg border border-white/20 bg-zinc-950 p-2 text-sm" />
        <button type="button" disabled={!newName.trim() || saving} onClick={() => void createBinder()} className="rounded-lg bg-white px-3 text-sm text-black disabled:opacity-50">Create</button></div>
        : <button type="button" onClick={() => setCreating(true)} className="text-sm text-zinc-300 underline">+ Create custom binder</button>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-400">{message}</p>}
      <button type="button" disabled={loading || saving} onClick={() => void save()}
        className="w-full rounded-lg bg-white py-3 text-sm font-semibold text-black disabled:opacity-50">{saving ? 'Saving…' : 'Save Binder selections'}</button>
    </div>}
  </div>
}
