import Link from 'next/link'

import {
  createClient,
} from '@/lib/supabase/server'

import CardRow, {
  type RowCard,
} from '@/app/components/card-row'

type CuratedList = {
  id: string
  title: string
  description: string | null
}

type CuratedListCard = {
  list_id: string
  card_id: string
  sort_order: number
}

type CardRecord = {
  id: string
  name: string
  rarity: string | null
  image_url: string | null
  set_id: string
  category: string | null
}

type ReactionRow = {
  card_id: string
  reaction: 'like' | 'love'
  updated_at: string
}

type FavoriteRow = {
  card_id: string
  created_at: string
}

type DismissalRow = {
  card_id: string
}

export default async function HomePage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  /*
   * -------------------------
   * PERSONALIZED CONTENT
   * -------------------------
   */

  let lovedCards:
    CardRecord[] = []

  let recommendedCards:
    CardRecord[] = []

  if (user) {
    /*
     * Load Likes/Loves, Favorites,
     * and dismissed cards.
     */
    const [
      reactionsResult,
      favoritesResult,
      dismissalsResult,
    ] = await Promise.all([
      supabase
        .from('card_reactions')
        .select(`
          card_id,
          reaction,
          updated_at
        `)
        .eq(
          'user_id',
          user.id
        )
        .order(
          'updated_at',
          {
            ascending: false,
          }
        ),

      supabase
        .from('card_favorites')
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
            ascending: false,
          }
        ),

      supabase
        .from('card_dismissals')
        .select(`
          card_id
        `)
        .eq(
          'user_id',
          user.id
        ),
    ])

    if (
      reactionsResult.error
    ) {
      console.error(
        'Could not load reactions:',
        reactionsResult.error
          .message
      )
    }

    if (
      favoritesResult.error
    ) {
      console.error(
        'Could not load favorites:',
        favoritesResult.error
          .message
      )
    }

    if (
      dismissalsResult.error
    ) {
      console.error(
        'Could not load dismissals:',
        dismissalsResult.error
          .message
      )
    }

    const reactions =
      (reactionsResult.data ??
        []) as ReactionRow[]

    const favorites =
      (favoritesResult.data ??
        []) as FavoriteRow[]

    const dismissals =
      (dismissalsResult.data ??
        []) as DismissalRow[]

    const reactedCardIds =
      reactions.map(
        (reaction) =>
          reaction.card_id
      )

    const favoriteCardIds =
      favorites.map(
        (favorite) =>
          favorite.card_id
      )

    const dismissedCardIds =
      dismissals.map(
        (dismissal) =>
          dismissal.card_id
      )

    /*
     * Load every card we've learned
     * something about.
     *
     * Favorites are included even if
     * an older favorite somehow has no
     * card_reactions row.
     */
    const signalCardIds =
      Array.from(
        new Set([
          ...reactedCardIds,
          ...favoriteCardIds,
        ])
      )

    let signalCards:
      CardRecord[] = []

    if (
      signalCardIds.length > 0
    ) {
      const {
        data,
        error,
      } = await supabase
        .from('cards')
        .select(`
          id,
          name,
          rarity,
          image_url,
          set_id,
          category
        `)
        .eq(
          'category',
          'Pokemon'
        )
        .not(
          'image_url',
          'is',
          null
        )
        .in(
          'id',
          signalCardIds
        )

      if (error) {
        console.error(
          'Could not load personalized cards:',
          error.message
        )
      }

      signalCards =
        (data ??
          []) as CardRecord[]
    }

    const signalCardById =
      new Map(
        signalCards.map(
          (card) => [
            card.id,
            card,
          ]
        )
      )

    /*
     * YOUR LOVES
     *
     * card_favorites is the source
     * of truth for the binder.
     */
    lovedCards =
      favorites
        .map(
          (favorite) =>
            signalCardById.get(
              favorite.card_id
            )
        )
        .filter(
          (
            card
          ): card is CardRecord =>
            card !== undefined
        )
        .slice(
          0,
          40
        )

    /*
     * Preferred sets.
     *
     * Favorites/Loves are strongest.
     * Likes come second.
     */
    const lovedSetIds =
      lovedCards.map(
        (card) =>
          card.set_id
      )

    const likedSetIds =
      reactions
        .filter(
          (reaction) =>
            reaction.reaction ===
            'like'
        )
        .map(
          (reaction) =>
            signalCardById.get(
              reaction.card_id
            )
        )
        .filter(
          (
            card
          ): card is CardRecord =>
            card !== undefined
        )
        .map(
          (card) =>
            card.set_id
        )

    const reactionLoveSetIds =
      reactions
        .filter(
          (reaction) =>
            reaction.reaction ===
            'love'
        )
        .map(
          (reaction) =>
            signalCardById.get(
              reaction.card_id
            )
        )
        .filter(
          (
            card
          ): card is CardRecord =>
            card !== undefined
        )
        .map(
          (card) =>
            card.set_id
        )

    const preferredSetIds =
      Array.from(
        new Set([
          ...lovedSetIds,
          ...reactionLoveSetIds,
          ...likedSetIds,
        ])
      ).slice(
        0,
        8
      )

    /*
     * FOR YOU
     *
     * More Pokémon from sets the user
     * has shown interest in.
     */
    if (
      preferredSetIds.length > 0
    ) {
      const {
        data,
        error,
      } = await supabase
        .from('cards')
        .select(`
          id,
          name,
          rarity,
          image_url,
          set_id,
          category
        `)
        .eq(
          'category',
          'Pokemon'
        )
        .not(
          'image_url',
          'is',
          null
        )
        .in(
          'set_id',
          preferredSetIds
        )
        .limit(150)

      if (error) {
        console.error(
          'Could not load recommendations:',
          error.message
        )
      }

      const hiddenIds =
        new Set([
          ...reactedCardIds,
          ...favoriteCardIds,
          ...dismissedCardIds,
        ])

      recommendedCards =
        (
          (data ??
            []) as CardRecord[]
        )
          .filter(
            (card) =>
              !hiddenIds.has(
                card.id
              )
          )
          .slice(
            0,
            40
          )
    }
  }

  /*
   * -------------------------
   * CURATED CONTENT
   * -------------------------
   */

  const {
    data: listsData,
    error: listsError,
  } = await supabase
    .from('curated_lists')
    .select(`
      id,
      title,
      description
    `)
    .order('title')

  if (listsError) {
    console.error(
      'Could not load curated lists:',
      listsError.message
    )
  }

  const lists =
    (listsData ??
      []) as CuratedList[]

  const listIds =
    lists.map(
      (list) =>
        list.id
    )

  let listCards:
    CuratedListCard[] = []

  if (
    listIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        'curated_list_cards'
      )
      .select(`
        list_id,
        card_id,
        sort_order
      `)
      .in(
        'list_id',
        listIds
      )
      .order(
        'sort_order'
      )

    if (error) {
      console.error(
        'Could not load curated list cards:',
        error.message
      )
    }

    listCards =
      (data ??
        []) as CuratedListCard[]
  }

  const curatedCardIds =
    Array.from(
      new Set(
        listCards.map(
          (row) =>
            row.card_id
        )
      )
    )

  let curatedCards:
    CardRecord[] = []

  if (
    curatedCardIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from('cards')
      .select(`
        id,
        name,
        rarity,
        image_url,
        set_id,
        category
      `)
      .eq(
        'category',
        'Pokemon'
      )
      .not(
        'image_url',
        'is',
        null
      )
      .in(
        'id',
        curatedCardIds
      )

    if (error) {
      console.error(
        'Could not load curated cards:',
        error.message
      )
    }

    curatedCards =
      (data ??
        []) as CardRecord[]
  }

  const curatedCardById =
    new Map(
      curatedCards.map(
        (card) => [
          card.id,
          card,
        ]
      )
    )

  const rows =
    lists.map(
      (list) => {
        const rowCards =
          listCards
            .filter(
              (row) =>
                row.list_id ===
                list.id
            )
            .sort(
              (a, b) =>
                a.sort_order -
                b.sort_order
            )
            .map(
              (row) =>
                curatedCardById.get(
                  row.card_id
                )
            )
            .filter(
              (
                card
              ): card is CardRecord =>
                card !== undefined
            )

        return {
          ...list,

          cards:
            rowCards as RowCard[],
        }
      }
    )

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8">
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
            Discover Pokémon cards
          </p>

          <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
            Find cards you didn&apos;t know you loved.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-500">
            Explore Pokémon cards one
            at a time, build your
            binder, and discover what
            other collectors love.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="rounded-full border border-white/10 px-6 py-3 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
            >
              Start discovering
            </Link>

            {user ? (
              <Link
                href="/collection"
                className="rounded-full border border-white/10 px-6 py-3 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                View binder
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-full border border-white/10 px-6 py-3 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                Sign in
              </Link>
            )}
          </div>
        </section>

        {user &&
        recommendedCards.length >
          0 ? (
          <section className="mt-16">
            <CardRow
              title="For You"
              cards={
                recommendedCards as RowCard[]
              }
            />

            <p className="-mt-1 text-xs text-zinc-700">
              Based on Pokémon you&apos;ve
              liked and loved.
            </p>
          </section>
        ) : null}

        {user &&
        lovedCards.length > 0 ? (
          <section className="mt-10">
            <CardRow
              title="Your Loves"
              cards={
                lovedCards as RowCard[]
              }
            />
          </section>
        ) : null}

        <section
          className={
            user &&
            (
              recommendedCards.length >
                0 ||
              lovedCards.length >
                0
            )
              ? 'mt-10 space-y-14'
              : 'mt-16 space-y-14'
          }
        >
          {rows.map(
            (row) => (
              <div
                key={row.id}
              >
                {row.description ? (
                  <p className="mb-3 text-sm text-zinc-600">
                    {
                      row.description
                    }
                  </p>
                ) : null}

                <CardRow
                  title={
                    row.title
                  }
                  cards={
                    row.cards
                  }
                />
              </div>
            )
          )}
        </section>
      </div>
    </main>
  )
}