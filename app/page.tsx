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

  let favoriteCardIds:
    string[] = []

  if (user) {
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

    favoriteCardIds =
      favorites.map(
        (favorite) =>
          favorite.card_id
      )

    const dismissedCardIds =
      dismissals.map(
        (dismissal) =>
          dismissal.card_id
      )

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
      <div className="mx-auto max-w-[1400px] px-4 pb-14 pt-6 sm:px-8 sm:pt-10">

        {/*
         * Compact hero.
         *
         * The goal is to communicate
         * LostBinder quickly and get
         * users into the cards.
         */}
        <section className="max-w-2xl">
          <h1 className="max-w-xl text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Find cards you didn&apos;t
            know you&apos;d love.
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500 sm:mt-4 sm:text-base">
            Discover Pokémon cards based
            on what you love — not what
            they cost.
          </p>

          <div className="mt-5 flex items-center gap-3 sm:mt-6">
            <Link
              href="/explore"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Start discovering
            </Link>

            {!user ? (
              <Link
                href="/auth/login"
                className="px-2 py-2.5 text-sm text-zinc-500 transition hover:text-white"
              >
                Sign in
              </Link>
            ) : null}
          </div>
        </section>

        {user &&
        recommendedCards.length >
          0 ? (
          <section className="mt-10 sm:mt-14">
            <CardRow
              title="For You"
              cards={
                recommendedCards as RowCard[]
              }
              userId={
                user?.id ??
                null
              }
              initialLovedCardIds={
                favoriteCardIds
              }
            />

            <p className="-mt-1 text-xs text-zinc-700">
              Based on cards you&apos;ve
              liked and loved.
            </p>
          </section>
        ) : null}

        {user &&
        lovedCards.length > 0 ? (
          <section className="mt-8 sm:mt-10">
            <CardRow
              title="Your Loves"
              cards={
                lovedCards as RowCard[]
              }
              userId={
                user?.id ??
                null
              }
              initialLovedCardIds={
                favoriteCardIds
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
              ? 'mt-8 space-y-10 sm:mt-10 sm:space-y-14'
              : 'mt-10 space-y-10 sm:mt-14 sm:space-y-14'
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
                  userId={
                    user?.id ??
                    null
                  }
                  initialLovedCardIds={
                    favoriteCardIds
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
