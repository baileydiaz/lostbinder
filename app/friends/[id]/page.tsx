import Link from 'next/link'
import {
  notFound,
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

type Props = {
  params: Promise<{
    id: string
  }>
}

type FavoriteRow = {
  card_id: string
}

type FriendCard = {
  id: string
  set_id: string
  name: string
  image_url: string | null
  rarity: string | null
  illustrator: string | null
  category: string | null
}

export default async function FriendCollectionPage({
  params,
}: Props) {
  const { id } = await params

  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      username
    `)
    .eq('id', id)
    .maybeSingle()

  if (
    profileError ||
    !profile
  ) {
    notFound()
  }

  /*
   * Verify these users are
   * accepted friends.
   */
  const {
    data: friendship,
    error: friendshipError,
  } = await supabase
    .from('friendships')
    .select(`
      id,
      requester_id,
      addressee_id,
      status
    `)
    .eq(
      'status',
      'accepted'
    )
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`
    )
    .maybeSingle()

  if (
    friendshipError ||
    !friendship
  ) {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/friends"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            ← Friends
          </Link>

          <h1 className="mt-8 text-3xl font-semibold">
            This collection is private.
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            You can only view collections
            belonging to your friends.
          </p>
        </div>
      </main>
    )
  }

  /*
   * Load friend's actual Favorites.
   */
  const {
    data: favoritesData,
    error: favoritesError,
  } = await supabase
    .from('card_favorites')
    .select(`
      card_id
    `)
    .eq(
      'user_id',
      id
    )

  if (favoritesError) {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/friends"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            ← Friends
          </Link>

          <h1 className="mt-8 text-3xl font-semibold">
            Could not load this collection.
          </h1>
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
    FriendCard[] = []

  if (cardIds.length > 0) {
    const {
      data: cardData,
      error: cardError,
    } = await supabase
      .from('cards')
      .select(`
        id,
        set_id,
        name,
        image_url,
        rarity,
        illustrator,
        category
      `)
      .eq(
        'category',
        'Pokemon'
      )
      .in(
        'id',
        cardIds
      )

    if (cardError) {
      return (
        <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/friends"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              ← Friends
            </Link>

            <h1 className="mt-8 text-3xl font-semibold">
              Could not load this collection.
            </h1>

            <p className="mt-3 text-sm text-red-400">
              {cardError.message}
            </p>
          </div>
        </main>
      )
    }

    const cardById =
      new Map(
        (
          (cardData ??
            []) as FriendCard[]
        ).map(
          (card) => [
            card.id,
            card,
          ]
        )
      )

    cards =
      cardIds
        .map(
          (cardId) =>
            cardById.get(
              cardId
            )
        )
        .filter(
          (
            card
          ): card is FriendCard =>
            card !==
            undefined
        )
  }

  const username =
    profile.username ||
    'collector'

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/friends"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Friends
        </Link>

        <section className="pb-8 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
            Friend&apos;s Binder
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            @{username}
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            {cards.length}{' '}
            {cards.length === 1
              ? 'favorite'
              : 'favorites'}
          </p>
        </section>

        {cards.length === 0 ? (
          <section className="flex min-h-[40vh] items-center justify-center">
            <div className="max-w-md text-center">
              <h2 className="text-2xl font-semibold">
                Nothing here yet.
              </h2>

              <p className="mt-3 text-sm text-zinc-500">
                @{username} hasn&apos;t
                Loved any Pokémon yet.
              </p>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-x-4 gap-y-8 pb-16 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {cards.map(
              (card) => (
                <Link
                  key={card.id}
                  href={`/cards/${card.id}`}
                  className="group min-w-0"
                >
                  <div className="overflow-hidden rounded-xl bg-zinc-950">
                    {card.image_url ? (
                      <img
                        src={card.image_url}
                        alt={card.name}
                        loading="lazy"
                        className="aspect-[2.5/3.5] w-full object-contain transition duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="aspect-[2.5/3.5] w-full bg-zinc-900" />
                    )}
                  </div>

                  <h2 className="mt-3 truncate text-sm font-medium">
                    {card.name}
                  </h2>

                  <p className="mt-1 truncate text-xs text-zinc-600">
                    {card.rarity &&
                    card.rarity !== 'None'
                      ? card.rarity
                      : 'Pokémon card'}
                  </p>
                </Link>
              )
            )}
          </section>
        )}
      </div>
    </main>
  )
}