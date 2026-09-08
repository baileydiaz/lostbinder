import Link from 'next/link'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import FavoriteButton from './favorite-button'

type Props = {
  params: Promise<{
    id: string
  }>
}

type Card = {
  id: string
  local_id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
}

export default async function SetPage({
  params,
}: Props) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: set,
    error: setError,
  } = await supabase
    .from('sets')
    .select(`
      id,
      name,
      release_date,
      total_official
    `)
    .eq('id', id)
    .single()

  if (setError || !set) {
    notFound()
  }

  /*
   * Pokémon ONLY.
   *
   * Trainer and Energy cards never
   * make it out of the database query.
   */
  const {
    data: cards,
    error: cardsError,
  } = await supabase
    .from('cards')
    .select(`
      id,
      local_id,
      name,
      rarity,
      illustrator,
      image_url
    `)
    .eq('set_id', id)
    .eq('category', 'Pokemon')
    .not('image_url', 'is', null)
    .order('local_id')

  if (cardsError) {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white">
        <div className="mx-auto max-w-[1400px]">
          <h1 className="text-4xl font-semibold">
            {set.name}
          </h1>

          <p className="mt-4 text-sm text-red-400">
            Could not load cards.
          </p>

          <p className="mt-2 text-xs text-zinc-600">
            {cardsError.message}
          </p>
        </div>
      </main>
    )
  }

  const pokemonCards =
    (cards ?? []) as Card[]

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let favoriteIds =
    new Set<string>()

  if (
    user &&
    pokemonCards.length > 0
  ) {
    const cardIds =
      pokemonCards.map(
        (card) => card.id
      )

    const {
      data: favorites,
      error: favoritesError,
    } = await supabase
      .from('card_favorites')
      .select('card_id')
      .eq('user_id', user.id)
      .in('card_id', cardIds)

    if (favoritesError) {
      console.error(
        'Could not load favorites:',
        favoritesError.message
      )
    }

    favoriteIds =
      new Set(
        favorites?.map(
          (favorite) =>
            favorite.card_id
        ) ?? []
      )
  }

  const releaseYear =
    set.release_date
      ? new Date(
          set.release_date
        ).getFullYear()
      : null

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
            Pokémon Set
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {set.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>
              {pokemonCards.length}{' '}
              Pokémon
            </span>

            {releaseYear ? (
              <>
                <span className="text-zinc-800">
                  •
                </span>

                <span>
                  {releaseYear}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {pokemonCards.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-white/10 bg-zinc-950 px-6 py-16 text-center">
            <h2 className="text-xl font-semibold">
              No Pokémon found.
            </h2>

            <p className="mt-2 text-sm text-zinc-600">
              There aren&apos;t any Pokémon cards
              available for this set yet.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {pokemonCards.map(
              (card) => (
                <div
                  key={card.id}
                  className="min-w-0"
                >
                  <Link
                    href={`/cards/${card.id}`}
                    className="group block"
                  >
                    <div className="overflow-hidden rounded-xl">
                      <img
                        src={
                          card.image_url!
                        }
                        alt={
                          card.name
                        }
                        className="aspect-[2.5/3.5] w-full object-contain transition duration-200 ease-out group-hover:scale-[1.035]"
                      />
                    </div>

                    <h2 className="mt-3 truncate text-sm font-semibold text-zinc-200 transition group-hover:text-white">
                      {card.name}
                    </h2>

                    <p className="mt-1 truncate text-xs text-zinc-600">
                      #
                      {
                        card.local_id
                      }

                      {card.rarity &&
                      card.rarity !==
                        'None'
                        ? ` · ${card.rarity}`
                        : ''}
                    </p>

                    {card.illustrator ? (
                      <p className="mt-1 truncate text-xs text-zinc-700">
                        {
                          card.illustrator
                        }
                      </p>
                    ) : null}
                  </Link>

                  <div className="mt-3">
                    <FavoriteButton
                      cardId={
                        card.id
                      }
                      initialFavorite={favoriteIds.has(
                        card.id
                      )}
                      loggedIn={Boolean(
                        user
                      )}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </main>
  )
}