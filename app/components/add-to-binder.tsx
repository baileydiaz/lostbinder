'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Binder = { id: string; title: string; kind: 'dream' | 'custom'; count: number; hasCard: boolean }

export default function AddToBinder({ cardId, userId, compact = false, openRequest = 0 }: { cardId: string; userId: string | null; compact?: boolean; openRequest?: number }) {
  const [open, setOpen] = useState(false)
  const [binders, setBinders] = useState<Binder[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (openRequest > 0) setOpen(true) }, [openRequest])
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) setOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown) }
  }, [open, saving])

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
      setOpen(false)
      setMessage('Binder selections saved.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save binder selections.')
    } finally { setSaving(false) }
  }

  if (!userId) return <Link href="/auth/login" className="mt-2 block rounded-xl border border-white/20 py-2 text-center text-sm text-zinc-300">Log in to add to Binder</Link>
  return <div className={compact ? "h-full" : "mt-3"}>
    <button type="button" onClick={() => setOpen(current => !current)}
      aria-expanded={open} aria-label="Add to Binder" className={compact ? "flex h-full min-h-[44px] w-full min-w-0 items-center justify-center gap-1 rounded-xl border border-white/30 bg-black px-1 py-3 text-xs font-medium leading-tight text-white transition hover:border-white/60 hover:bg-zinc-950 sm:px-3 sm:text-sm" : "flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-black px-4 py-3 text-sm font-medium leading-tight text-white transition hover:border-white/60 hover:bg-zinc-950"}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0"><path d="M12 7.5c-2.5-2-5.5-2.5-9-2v13c3.5-.5 6.5 0 9 2 2.5-2 5.5-2.5 9-2v-13c-3.5-.5-6.5 0-9 2Z" /><path d="M12 7.5v13" /></svg><span>{compact ? 'Binder' : 'Add to Binder'}</span>
    </button>
    {mounted && open && createPortal(<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button type="button" aria-label="Close Add to Binder" onClick={() => { if (!saving) setOpen(false) }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-labelledby="add-to-binder-title" className="relative z-10 max-h-[min(85dvh,680px)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/20 bg-zinc-950 p-5 text-white shadow-2xl sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id="add-to-binder-title" className="text-lg font-semibold">Add to Binder</h3>
        <button type="button" aria-label="Close" disabled={saving} onClick={() => setOpen(false)} className="rounded-full border border-white/20 px-3 py-1 text-xl text-zinc-300 hover:text-white">×</button>
      </div>
      <div className="space-y-3">
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
      </div>
      </div>
    </div>, document.body)}
  </div>
}
