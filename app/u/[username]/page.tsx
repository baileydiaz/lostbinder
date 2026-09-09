import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

type Profile = {
  id: string
  username: string | null
  avatar_url: string | null
}

type FavoriteRow = {
  card_id: string
  created_at: string
}

type Card = {
  id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
  set_id: string
}

type PageProps = {
  params: Promise<{
    username: string
  }>
}

export default async function PublicProfilePage({
  params,
}: PageProps) {
  const {
    username,
  } = await params

  const cleanUsername =
    decodeURIComponent(
      username
    )
      .replace(/^@/, '')
      .trim()
      .toLowerCase()

  const supabase =
    await createClient()

  /*
   * Load the public profile.
   */
  const {
    data: profileData,
    error: profileError,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        username,
        avatar_url
      `)
      .ilike(
        'username',
        cleanUsername
      )
      .maybeSingle()

  if (
    profileError
  ) {
    console.error(
      'Could not load profile:',
      profileError.message
    )
  }

  if (
    !profileData
  ) {
    notFound()
  }

  const profile =
    profileData as Profile

  /*
   * Their binder is made from
   * the cards they have Loved.
   */
  const {
    data: favoriteData,
    error: favoriteError,
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
        profile.id
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )

  if (
    favoriteError
  ) {
    console.error(
      'Could not load binder:',
      favoriteError.message
    )
  }

  const favorites =
    (favoriteData ??
      []) as FavoriteRow[]

  const cardIds =
    favorites.map(
      (favorite) =>
        favorite.card_id
    )

  let cards:
    Card[] = []

  if (
    cardIds.length > 0
  ) {
    const {
      data: cardData,
      error: cardError,
    } =
      await supabase
        .from('cards')
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
      console.error(
        'Could not load binder cards:',
        cardError.message
      )
    }

    const cardById =
      new Map(
        (
          (cardData ??
            []) as Card[]
        ).map(
          (card) => [
            card.id,
            card,
          ]
        )
      )

    /*
     * Preserve newest-Love-first
     * order from card_favorites.
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
          ): card is Card =>
            card !==
            undefined
        )
  }

  const displayUsername =
    profile.username ??
    'collector'

  const initial =
    displayUsername
      .charAt(0)
      .toUpperCase()

  return (
    <main className="min-h-screen bg-black px-4 pb-16 pt-6 text-white sm:px-8 sm:pt-10">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/friends"
          className="text-sm text-zinc-600 transition hover:text-white"
        >
          ← Back
        </Link>

        <header className="mt-8 border-b border-white/10 pb-8 sm:mt-10 sm:pb-10">
          <div className="flex items-center gap-4 sm:gap-5">

            {profile.avatar_url ? (
              <img
                src={
                  profile.avatar_url
                }
                alt={
                  `@${displayUsername}`
                }
                className="h-16 w-16 rounded-full object-cover sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-xl font-semibold text-zinc-400 sm:h-20 sm:w-20 sm:text-2xl">
                {initial}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-4xl">
                @{displayUsername}
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                LostBinder collector
              </p>
            </div>
          </div>

          <div className="mt-7 flex gap-8">
            <div>
              <p className="text-xl font-semibold">
                {cards.length}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Loved cards
              </p>
            </div>
          </div>
        </header>

        <section className="pt-8 sm:pt-10">
          <div className="mb-6">
            <h2 className="text-xl font-semibold sm:text-2xl">
              Loved cards
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Cards that caught
              @{displayUsername}&apos;s
              eye.
            </p>
          </div>

          {cards.length ===
          0 ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-950 px-6 py-14 text-center">
              <h3 className="text-lg font-semibold">
                Nothing here yet.
              </h3>

              <p className="mt-2 text-sm text-zinc-600">
              @{displayUsername}{' '}
              hasn&apos;t Loved any cards yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">

              {cards.map(
                (card) => (
                  <Link
                    key={
                      card.id
                    }
                    href={
                      `/cards/${card.id}`
                    }
                    className="group min-w-0"
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

                    <h3 className="mt-2 truncate text-sm font-medium sm:mt-3">
                      {card.name}
                    </h3>

                    <p className="mt-1 truncate text-xs text-zinc-600">
                      {card.rarity &&
                      card.rarity !==
                        'None'
                        ? card.rarity
                        : 'Pokémon card'}

                      {card.illustrator
                        ? ` · ${card.illustrator}`
                        : ''}
                    </p>
                  </Link>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}