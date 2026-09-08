import Link from 'next/link'
import { redirect } from 'next/navigation'

import FavoriteToggle from '@/app/components/favorite-toggle'
import { createClient } from '@/lib/supabase/server'

type FavoriteRow = {
  card_id: string
  created_at: string
}

type Card = {
  id: string
  name: string
  local_id: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
  set_id: string
  category: string | null
}

type SetInfo = {
  id: string
  name: string
}

export default async function CollectionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const {
    data: favoriteData,
    error: favoriteError,
  } = await supabase
    .from('card_favorites')
    .select(`
      card_id,
      created_at
    `)
    .eq('user_id', user.id)
    .order('created_at', {
      ascending: false,
    })

  if (favoriteError) {
    console.error(
      'Could not load favorites:',
      favoriteError.message
    )
  }

  const favorites =
    (favoriteData ?? []) as FavoriteRow[]

  const cardIds = favorites.map(
    (favorite) => favorite.card_id
  )

  let cards: Card[] = []

  if (cardIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from('cards')
      .select(`
        id,
        name,
        local_id,
        rarity,
        illustrator,
        image_url,
        set_id,
        category
      `)
      .eq('category', 'Pokemon')
      .in('id', cardIds)

    if (error) {
      console.error(
        'Could not load favorite cards:',
        error.message
      )
    }

    cards = (data ?? []) as Card[]
  }

  /*
   * Put the cards back in the same order
   * as the favorites query.
   */
  const cardById = new Map(
    cards.map((card) => [
      card.id,
      card,
    ])
  )

  const orderedCards = favorites
    .map((favorite) =>
      cardById.get(
        favorite.card_id
      )
    )
    .filter(
      (card): card is Card =>
        card !== undefined
    )

  const setIds = Array.from(
    new Set(
      orderedCards.map(
        (card) => card.set_id
      )
    )
  )

  let sets: SetInfo[] = []

  if (setIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from('sets')
      .select(`
        id,
        name
      `)
      .in('id', setIds)

    if (error) {
      console.error(
        'Could not load sets:',
        error.message
      )
    }

    sets =
      (data ?? []) as SetInfo[]
  }

  const setById = new Map(
    sets.map((set) => [
      set.id,
      set,
    ])
  )

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
              Your Binder
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Favorites
            </h1>

            <p className="mt-3 text-sm text-zinc-500">
              {orderedCards.length}{' '}
              {orderedCards.length === 1
                ? 'Pokémon'
                : 'Pokémon'}
              {' '}in your binder
            </p>
          </div>

          <Link
            href="/explore"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-400 transition hover:border-white/30 hover:text-white"
          >
            Discover more
          </Link>
        </div>

        {orderedCards.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-white/10 bg-zinc-950 px-6 py-16 text-center">
            <h2 className="text-xl font-semibold">
              Your binder is empty.
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-600">
              Love a Pokémon while browsing and
              it&apos;ll show up here.
            </p>

            <Link
              href="/explore"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Start discovering
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {orderedCards.map((card) => {
              const set =
                setById.get(
                  card.set_id
                )

              return (
                <div
                  key={card.id}
                  className="min-w-0"
                >
                  <Link
                    href={`/cards/${card.id}`}
                    className="group block"
                  >
                    <div className="overflow-hidden rounded-xl">
                      {card.image_url ? (
                        <img
                          src={card.image_url}
                          alt={card.name}
                          className="aspect-[2.5/3.5] w-full object-contain transition duration-200 group-hover:scale-[1.035]"
                        />
                      ) : (
                        <div className="aspect-[2.5/3.5] w-full rounded-xl bg-zinc-950" />
                      )}
                    </div>

                    <h2 className="mt-3 truncate text-sm font-semibold text-zinc-200 transition group-hover:text-white">
                      {card.name}
                    </h2>

                    <p className="mt-1 truncate text-xs text-zinc-600">
                      {set?.name ??
                        card.set_id}
                      {' · #'}
                      {card.local_id}
                    </p>

                    {card.rarity &&
                    card.rarity !==
                      'None' ? (
                      <p className="mt-1 truncate text-xs text-zinc-700">
                        {card.rarity}
                      </p>
                    ) : null}
                  </Link>

                  <FavoriteToggle
                    cardId={card.id}
                    userId={user.id}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}