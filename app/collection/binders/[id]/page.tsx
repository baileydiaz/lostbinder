import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addBinderCard, removeBinderCard, updateBinder, deleteBinder } from '../../binder-actions'
import SaveBinderButton from '../../save-binder-button'
import BinderSettingsPanel from './binder-settings-panel'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }
type Card = { id: string; name: string; image_url: string | null; rarity: string | null }
type Entry = { card_id: string; position: number }

export default async function BinderPage({ params, searchParams }: Props) {
  const { id } = await params
  const { error, saved } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: binder } = await supabase.from('user_binders')
    .select('id,title,description,kind,is_public').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!binder) notFound()
  const { data: entries } = await supabase.from('user_binder_cards')
    .select('card_id,position').eq('binder_id', id).order('position')
  const ids = ((entries ?? []) as Entry[]).map((item) => item.card_id)
  const { data: cards } = ids.length
    ? await supabase.from('cards').select('id,name,image_url,rarity').in('id', ids)
    : { data: [] as Card[] }
  const cardMap = new Map(((cards ?? []) as Card[]).map((card) => [card.id, card]))
  const ordered = ids.map((cardId) => cardMap.get(cardId)).filter((card): card is Card => !!card)
  const { data: favorites } = await supabase.from('card_favorites')
    .select('card_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200)
  const favoriteIds = (favorites ?? []).map((item) => item.card_id).filter((cardId) => !ids.includes(cardId))
  const { data: availableCards } = favoriteIds.length
    ? await supabase.from('cards').select('id,name,image_url,rarity').in('id', favoriteIds)
    : { data: [] as Card[] }
  const availableMap = new Map(((availableCards ?? []) as Card[]).map((card) => [card.id, card]))
  const available = favoriteIds.map((cardId) => availableMap.get(cardId)).filter((card): card is Card => !!card)
  const full = binder.kind === 'dream' && ordered.length >= 9
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/collection" className="text-sm text-zinc-400 hover:text-white">← My Binders</Link>
        <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">{binder.kind === 'dream' ? 'Dream Binder · Nine-card showcase' : 'Custom Binder'}</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">{binder.title}</h1>
            <p className="mt-2 text-sm text-zinc-400">{binder.description || 'Your personal card collection.'}</p>
            <p className="mt-2 text-xs text-zinc-500">{ordered.length}{binder.kind === 'dream' ? '/9' : ''} cards · {binder.is_public ? 'Public' : 'Private'}</p>
            {binder.is_public && <Link href={'/binders/' + id} className="mt-3 inline-block text-sm text-emerald-400 underline-offset-4 hover:underline">View public binder →</Link>}
          </div>
        </div>
        <BinderSettingsPanel initiallyOpen={Boolean(error === "settings" || error === "title")}>
          <h2 className="text-lg font-semibold">Binder settings</h2>
          <form action={updateBinder} className="mt-4 max-w-lg space-y-4">
            <input type="hidden" name="binder_id" value={id} />
            <label className="block text-sm">Name<input name="title" required maxLength={60} defaultValue={binder.title} className="mt-2 w-full rounded-lg border border-white/20 bg-black p-3" /></label>
            <label className="block text-sm">Description<textarea name="description" maxLength={500} defaultValue={binder.description} rows={3} className="mt-2 w-full rounded-lg border border-white/20 bg-black p-3" /></label>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="is_public" defaultChecked={binder.is_public} /> Public binder (visible to anyone with access)</label>
            <SaveBinderButton />
          </form>
          <form action={deleteBinder} className="mt-8">
            <input type="hidden" name="binder_id" value={id} />
            <button className="text-sm text-red-400 hover:text-red-300">Delete this binder</button>
          </form>
        </BinderSettingsPanel>
        {saved === '1' && <p role="status" className="mt-4 rounded-lg border border-emerald-600/30 bg-emerald-950/30 p-3 text-sm text-emerald-300">✓ Binder settings saved. Your changes are live.</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-400">{error === 'full' ? 'Your Dream Binder is full. Remove a card to make room.' : error === 'title' ? 'Please enter a binder name.' : 'Could not save your change. Please try again.'}</p>}
        <section className="mt-8 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-zinc-950 p-3 sm:gap-5 sm:p-6">
          {ordered.map((card) => (
            <article key={card.id} className="min-w-0">
              <Link href={'/cards/' + card.id} className="block overflow-hidden rounded-lg bg-black">
                {card.image_url ? <img src={card.image_url} alt={card.name} loading="lazy" className="aspect-[2.5/3.5] w-full object-contain" /> : <div className="aspect-[2.5/3.5] bg-zinc-900" />}
              </Link>
              <p className="mt-2 truncate text-xs sm:text-sm">{card.name}</p>
              <form action={removeBinderCard} className="mt-1">
                <input type="hidden" name="binder_id" value={id} /><input type="hidden" name="card_id" value={card.id} />
                <button className="text-xs text-zinc-500 hover:text-red-400">Remove</button>
              </form>
            </article>
          ))}
          {binder.kind === 'dream' && Array.from({ length: Math.max(0, 9 - ordered.length) }, (_, index) => (
            <div key={'empty-' + index} className="aspect-[2.5/3.5] rounded-lg border border-dashed border-white/10 bg-black/40" />
          ))}
        </section>
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Add cards from your favorites</h2>
          <p className="mt-2 text-sm text-zinc-500">{full ? 'Your nine-card Dream Binder is full.' : 'Tap a card to add it. A card can belong to multiple binders.'}</p>
          {!full && <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
            {available.map((card) => (
              <form action={addBinderCard} key={card.id} className="min-w-0">
                <input type="hidden" name="binder_id" value={id} /><input type="hidden" name="card_id" value={card.id} />
                <button type="submit" aria-label={'Add ' + card.name + ' to ' + binder.title} title={'Add ' + card.name + ' to binder'} className="group block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  <span className="block overflow-hidden rounded-lg border border-white/10 bg-black transition group-hover:border-white/60 group-hover:brightness-110">
                    {card.image_url ? <img src={card.image_url} alt={card.name} loading="lazy" className="aspect-[2.5/3.5] w-full object-contain" /> : <span className="block aspect-[2.5/3.5] bg-zinc-900" />}
                  </span>
                  <span className="mt-1 block truncate text-xs text-zinc-300 group-hover:text-white">{card.name}</span>
                </button>
              </form>
            ))}
          </div>}
          {!available.length && !full && <p className="mt-4 text-sm text-zinc-500">Love cards in Explore to add them here.</p>}
        </section>

      </div>
    </main>
  )
}
