import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }
type Entry = { card_id: string; position: number }
type Card = { id: string; name: string; image_url: string | null; rarity: string | null }

export default async function PublicBinderPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: binder } = await supabase.from('user_binders')
    .select('id,user_id,title,description,kind,is_public')
    .eq('id', id).eq('is_public', true).maybeSingle()
  if (!binder) notFound()
  const { data: profile } = await supabase.from('profiles')
    .select('username').eq('id', binder.user_id).maybeSingle()
  const { data: entries } = await supabase.from('user_binder_cards')
    .select('card_id,position').eq('binder_id', id).order('position')
  const ids = ((entries ?? []) as Entry[]).map((item) => item.card_id)
  const { data: cards } = ids.length
    ? await supabase.from('cards').select('id,name,image_url,rarity').in('id', ids)
    : { data: [] as Card[] }
  const byId = new Map(((cards ?? []) as Card[]).map((card) => [card.id, card]))
  const ordered = ids.map((cardId) => byId.get(cardId)).filter((card): card is Card => !!card)
  return <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-5xl">
      {profile?.username && <Link href={'/u/' + encodeURIComponent(profile.username)} className="text-sm text-zinc-400 hover:text-white">← @{profile.username}</Link>}
      <p className="mt-8 text-xs uppercase tracking-widest text-zinc-500">{binder.kind === 'dream' ? 'Dream Binder' : 'Custom Binder'} · Public collection</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">{binder.title}</h1>
      <p className="mt-3 text-zinc-400">{binder.description}</p>
      <p className="mt-3 text-xs text-zinc-500">{ordered.length}{binder.kind === 'dream' ? '/9' : ''} cards</p>
      <section className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-3 sm:gap-6 sm:p-6">
        {ordered.map((card) => <Link key={card.id} href={'/cards/' + card.id} className="min-w-0">
          {card.image_url ? <img src={card.image_url} alt={card.name} loading="lazy" className="aspect-[2.5/3.5] w-full rounded-lg object-contain" /> : <div className="aspect-[2.5/3.5] rounded-lg bg-zinc-900" />}
          <p className="mt-2 truncate text-xs sm:text-sm">{card.name}</p>
        </Link>)}
        {binder.kind === 'dream' && Array.from({ length: Math.max(0, 9 - ordered.length) }, (_, i) => <div key={i} className="aspect-[2.5/3.5] rounded-lg border border-dashed border-white/10" />)}
      </section>
    </div>
  </main>
}
