import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function SentToYouPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: shares, error } = await supabase
    .from('card_shares')
    .select(`
      id,
      card_id,
      message,
      created_at,
      read_at,
      sender:profiles!card_shares_sender_id_fkey(username),
      card:cards!card_shares_card_id_fkey(id, name, image_url, set_id)
    `)
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })

  if (error) console.error('Could not load shared cards:', error.message)

  const unreadIds = (shares ?? []).filter((share) => !share.read_at).map((share) => share.id)

  if (unreadIds.length > 0) {
    await supabase
      .from('card_shares')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .eq('recipient_id', user.id)
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/account" className="text-sm text-zinc-500 transition hover:text-white">← Account</Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Sent to You</h1>
        <p className="mt-2 text-sm text-zinc-600">Cards your LostBinder friends think you should see.</p>

        {(shares ?? []).length === 0 ? (
          <div className="mt-10 rounded-3xl border border-white/10 bg-zinc-950 px-6 py-12 text-center">
            <p className="font-semibold">Nothing here yet.</p>
            <p className="mt-2 text-sm text-zinc-600">Cards friends send you will show up here.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {(shares ?? []).map((share: any) => {
              const sender = Array.isArray(share.sender) ? share.sender[0] : share.sender
              const card = Array.isArray(share.card) ? share.card[0] : share.card
              if (!card) return null

              return (
                <Link
                  key={share.id}
                  href={`/cards/${card.id}`}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-white/25"
                >
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} className="h-32 w-24 shrink-0 rounded-lg object-contain" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-600">From @{sender?.username || 'collector'}</p>
                    <h2 className="mt-1 truncate font-semibold text-white">{card.name}</h2>
                    <p className="mt-1 text-xs text-zinc-600">{card.set_id}</p>
                    {share.message ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-5 text-zinc-400">&ldquo;{share.message}&rdquo;</p>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
