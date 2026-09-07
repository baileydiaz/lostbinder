import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReactionButtons from '@/app/components/reaction-buttons'

type LovedReaction = {
  card_id: string
  updated_at: string
}

type CollectionCard = {
  id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
  set_id: string
}

export default async function CollectionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: reactionData,
    error: reactionError,
  } = await supabase
    .from('card_reactions')
    .select(`
      card_id,
      updated_at
    `)
    .eq('user_id', user.id)
    .eq('reaction', 'love')
    .order('updated_at', {
      ascending: false,
    })

  if (reactionError) {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-semibold">
            Collection
          </h1>

          <p className="mt-4 text-red-400">
            Could not load your collection:{' '}
            {reactionError.message}
          </p>
        </div>
      </main>
    )
  }

  const lovedReactions =
    (reactionData ?? []) as LovedReaction[]

  const cardIds = lovedReactions.map(
    (reaction) => reaction.card_id
  )

  let cards: CollectionCard[] = []

  if (cardIds.length > 0) {
    const {
      data: cardData,
      error: cardError,
    } = await supabase
      .from('cards')
      .select(`
        id,
        name,
        rarity,
        illustrator,
        image_url,
        set_id
      `)
      .in('id', cardIds)

    if (cardError) {
      return (
        <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-4xl font-semibold">
              Collection
            </h1>

            <p className="mt-4 text-red-400">
              Could not load your cards:{' '}
              {cardError.message}
            </p>
          </div>
        </main>
      )
    }

    const cardById = new Map(
      ((cardData ?? []) as CollectionCard[]).map(
        (card) => [
          card.id,
          card,
        ]
      )
    )

    cards = cardIds
      .map((id) => cardById.get(id))
      .filter(
        (
          card
        ): card is CollectionCard =>
          card !== undefined
      )
  }

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
              LostBinder
            </p>

            <h1 className="mt-2 text-4xl font-semibold">
              Collection
            </h1>

            <p className="mt-2 text-zinc-400">
              Cards you Love live here.
            </p>
          </div>

          <Link
            href="/explore"
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm transition hover:border-white/40"
          >
            Explore
          </Link>
        </div>

        <p className="mt-8 text-sm text-zinc-500">
          {cards.length}{' '}
          {cards.length === 1
            ? 'card'
            : 'cards'}
        </p>

        {cards.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-10 text-center">
            <p className="text-lg font-medium">
              Your collection is empty.
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Love cards while exploring and
              they&apos;ll appear here.
            </p>

            <Link
              href="/explore"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
            >
              Find some cards
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {cards.map((card) => (
              <article
                key={card.id}
                className="min-w-0"
              >
                <Link
                  href={`/sets/${card.set_id}`}
                  className="block overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-2 transition hover:border-white/25"
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
                  {card.rarity ||
                    'Pokémon card'}
                </p>

                <div className="mt-2">
                  <ReactionButtons
                    cardId={card.id}
                    userId={user.id}
                    initialReaction="love"
                    compact
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}