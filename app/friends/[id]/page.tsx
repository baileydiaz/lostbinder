import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{
    id: string
  }>
}

type FriendCard = {
  id: string
  set_id: string
  name: string
  image_url: string | null
  rarity: string | null
  illustrator: string | null
  loved_at: string
}

export default async function FriendCollectionPage({
  params,
}: Props) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name
    `)
    .eq('id', id)
    .maybeSingle()

  if (profileError || !profile) {
    notFound()
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'get_friend_loved_cards',
    {
      friend_user_id: id,
    }
  )

  if (error) {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/friends"
            className="text-sm text-zinc-500 hover:text-white"
          >
            ← Friends
          </Link>

          <h1 className="mt-6 text-3xl font-semibold">
            Could not load this collection.
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            You can only view Loved cards for
            accepted friends.
          </p>
        </div>
      </main>
    )
  }

  const cards = (data ?? []) as FriendCard[]

  const displayName =
    profile.display_name ||
    profile.username ||
    'Collector'

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/friends"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Friends
        </Link>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
          Friend Collection
        </p>

        <h1 className="mt-2 text-4xl font-semibold">
          {displayName}&apos;s Loved Cards
        </h1>

        <p className="mt-2 text-zinc-400">
          {cards.length}{' '}
          {cards.length === 1 ? 'card' : 'cards'}
        </p>

        {cards.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-white/10 bg-zinc-950 p-10 text-center">
            <p className="text-zinc-500">
              They have not Loved any cards yet.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {cards.map((card) => (
              <article key={card.id}>
                <Link
                  href={`/sets/${card.set_id}`}
                  className="block overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-2"
                >
                  {card.image_url ? (
                    <img
                      src={card.image_url}
                      alt={card.name}
                      loading="lazy"
                      className="aspect-[2.5/3.5] w-full rounded-xl object-contain"
                    />
                  ) : (
                    <div className="aspect-[2.5/3.5] rounded-xl bg-zinc-900" />
                  )}
                </Link>

                <p className="mt-2 truncate text-sm font-medium">
                  {card.name}
                </p>

                <p className="truncate text-xs text-zinc-600">
                  {card.rarity || 'Pokémon card'}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}