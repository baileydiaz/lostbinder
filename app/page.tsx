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
    const {
      data: reactionData,
      error: reactionError,
    } = await supabase
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
      )

    if (reactionError) {
      console.error(
        'Could not load reactions:',
        reactionError.message
      )
    }

    const reactions =
      (reactionData ??
        []) as ReactionRow[]

    const reactedCardIds =
      reactions.map(
        (reaction) =>
          reaction.card_id
      )

    /*
     * Load cards the user has
     * already rated so we can:
     *
     * 1. Show recent Loves
     * 2. Learn which sets they like
     */
    let reactedCards:
      CardRecord[] = []

    if (
      reactedCardIds.length > 0
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
          reactedCardIds
        )

      if (error) {
        console.error(
          'Could not load reacted cards:',
          error.message
        )
      }

      reactedCards =
        (data ??
          []) as CardRecord[]
    }

    const reactedCardById =
      new Map(
        reactedCards.map(
          (card) => [
            card.id,
            card,
          ]
        )
      )

    /*
     * Preserve reaction order so
     * newest Loves appear first.
     */
    lovedCards =
      reactions
        .filter(
          (reaction) =>
            reaction.reaction ===
            'love'
        )
        .map(
          (reaction) =>
            reactedCardById.get(
              reaction.card_id
            )
        )
        .filter(
          (
            card
          ): card is CardRecord =>
            card !== undefined
        )
        .slice(0, 20)

    /*
     * Determine which sets the user
     * has shown interest in.
     *
     * Love gets priority because those
     * cards are the strongest signal.
     */
    const preferredSetIds =
      Array.from(
        new Set(
          reactions
            .map(
              (reaction) => ({
                ...reaction,
                card:
                  reactedCardById.get(
                    reaction.card_id
                  ),
              })
            )
            .filter(
              (item) =>
                item.card !==
                undefined
            )
            .sort(
              (a, b) => {
                if (
                  a.reaction ===
                    'love' &&
                  b.reaction !==
                    'love'
                ) {
                  return -1
                }

                if (
                  b.reaction ===
                    'love' &&
                  a.reaction !==
                    'love'
                ) {
                  return 1
                }

                return 0
              }
            )
            .map(
              (item) =>
                item.card!.set_id
            )
        )
      )
        .slice(0, 6)

    /*
     * First recommendation system:
     *
     * "You liked Pokémon from these
     * sets, so here are more Pokémon
     * from those sets that you haven't
     * rated yet."
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
        .limit(100)

      if (error) {
        console.error(
          'Could not load recommendations:',
          error.message
        )
      }

      const reactedIds =
        new Set(
          reactedCardIds
        )

      recommendedCards =
        (
          (data ??
            []) as CardRecord[]
        )
          .filter(
            (card) =>
              !reactedIds.has(
                card.id
              )
          )
          .slice(0, 30)
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
      (list) => list.id
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
                card !==
                undefined
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
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
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