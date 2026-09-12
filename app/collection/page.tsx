import Link from 'next/link'

import {
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import RemoveFromBinderButton
  from './remove-from-binder-button'

type FavoriteRow = {
  card_id: string
  created_at: string
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
  const supabase =
    await createClient()

  const {
    data: {
      user,
    },
  } =
    await supabase
      .auth
      .getUser()

  if (!user) {
    redirect(
      '/auth/login'
    )
  }

  /*
   * card_favorites is the
   * source of truth for the binder.
   */
  const {
    data:
      favoritesData,
    error:
      favoritesError,
  } =
    await supabase
      .from(
        'card_favorites'
      )
      .select(`
        card_id,
        created_at
      `)
      .eq(
        'user_id',
        user.id
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )

  if (
    favoritesError
  ) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-semibold tracking-tight">
            Your Binder
          </h1>

          <p className="mt-4 text-sm text-red-400">
            Could not load
            your binder:{' '}
            {
              favoritesError.message
            }
          </p>
        </div>
      </main>
    )
  }

  const favorites =
    (favoritesData ??
      []) as FavoriteRow[]

  const cardIds =
    favorites.map(
      (favorite) =>
        favorite.card_id
    )

  let cards:
    CollectionCard[] = []

  if (
    cardIds.length > 0
  ) {
    const {
      data:
        cardData,
      error:
        cardError,
    } =
      await supabase
        .from(
          'cards'
        )
        .select(`
          id,
          name,
          rarity,
          illustrator,
          image_url,
          set_id
        `)
        .in(
          'id',
          cardIds
        )

    if (
      cardError
    ) {
      return (
        <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-3xl font-semibold tracking-tight">
              Your Binder
            </h1>

            <p className="mt-4 text-sm text-red-400">
              Could not load
              your cards:{' '}
              {
                cardError.message
              }
            </p>
          </div>
        </main>
      )
    }

    const cardById =
      new Map(
        (
          (cardData ??
            []) as CollectionCard[]
        ).map(
          (card) => [
            card.id,
            card,
          ]
        )
      )

    /*
     * Preserve favorite order so
     * newest Loves appear first.
     */
    cards =
      cardIds
        .map(
          (id) =>
            cardById.get(
              id
            )
        )
        .filter(
          (
            card
          ): card is CollectionCard =>
            card !==
            undefined
        )
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-16 pt-6 text-white sm:px-8 sm:pt-10">
      <div className="mx-auto max-w-7xl">

        <section className="mb-7 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Your Binder
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              {
                cards.length
              }{' '}
              {
                cards.length ===
                1
                  ? 'card'
                  : 'cards'
              }{' '}
              in your binder.
            </p>
          </div>

          <Link
            href="/explore"
            className="shrink-0 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 sm:px-5"
          >
            Find cards
          </Link>
        </section>

        {cards.length ===
        0 ? (
          <section className="flex min-h-[45vh] items-center justify-center">
            <div className="max-w-sm text-center">
              <h2 className="text-xl font-semibold sm:text-2xl">
                Your binder is
                empty.
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Add cards while
                exploring and
                they&apos;ll show
                up here.
              </p>

              <Link
                href="/explore"
                className="mt-6 inline-block rounded-full border border-white/15 px-6 py-3 text-sm font-medium transition hover:border-white/40"
              >
                Start discovering
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {cards.map(
              (card) => (
                <article
                  key={
                    card.id
                  }
                  className="min-w-0"
                >
                  <Link
                    href={
                      `/cards/${card.id}`
                    }
                    className="group block min-w-0"
                  >
                    <div className="overflow-hidden rounded-xl bg-zinc-950">
                      {card.image_url ? (
                        <img
                          src={
                            card.image_url
                          }
                          alt={
                            card.name
                          }
                          loading="lazy"
                          className="aspect-[2.5/3.5] w-full object-contain transition duration-200 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="aspect-[2.5/3.5] w-full bg-zinc-900" />
                      )}
                    </div>

                    <h2 className="mt-2 truncate text-sm font-medium sm:mt-3">
                      {
                        card.name
                      }
                    </h2>

                    <p className="mt-1 truncate text-xs text-zinc-600">
                      {
                        card.rarity &&
                        card.rarity !==
                          'None'
                          ? card.rarity
                          : 'Pokémon card'
                      }

                      {card.illustrator
                        ? ` · ${card.illustrator}`
                        : ''}
                    </p>
                  </Link>

                  <RemoveFromBinderButton
                    cardId={
                      card.id
                    }
                    userId={
                      user.id
                    }
                  />
                </article>
              )
            )}
          </section>
        )}
      </div>
    </main>
  )
}