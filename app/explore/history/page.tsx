import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DiscoveryHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: decisions, error } = await supabase.from('card_reactions')
    .select('card_id, reaction, updated_at').eq('user_id', user.id)
    .order('updated_at', { ascending: false }).limit(100)
  if (error) console.error('Discovery history:', error.message)
  const ids = [...new Set((decisions ?? []).map(item => item.card_id))]
  const { data: cards } = ids.length
    ? await supabase.from('cards').select('id, name, image_url, set_id').in('id', ids)
    : { data: [] }
  const byId = new Map((cards ?? []).map(card => [card.id, card]))
  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-black px-4 py-10 text-white">
      <Link href="/explore" className="text-sm text-zinc-400 hover:text-white">← Back to Explore</Link>
      <h1 className="mt-5 text-3xl font-semibold">Discovery history</h1>
      <p className="mt-2 text-sm text-zinc-400">Your 100 most recent decisions. Revisit any card to change your mind.</p>
      {!decisions?.length ? <p className="mt-10 text-zinc-500">Your discoveries will appear here after you react to cards.</p> : null}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {(decisions ?? []).map(item => {
          const card = byId.get(item.card_id)
          if (!card) return null
          return <Link href={`/cards/${card.id}`} key={item.card_id} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950 p-2 hover:border-white/40">
            {card.image_url ? <img src={card.image_url} alt={card.name} className="aspect-[2.5/3.5] w-full object-contain" /> : null}
            <p className="mt-2 truncate text-sm font-medium">{card.name}</p>
            <p className="mt-1 text-xs capitalize text-zinc-400">{item.reaction === 'love' ? 'Added to collection' : item.reaction}</p>
          </Link>
        })}
      </div>
    </main>
  )
}
