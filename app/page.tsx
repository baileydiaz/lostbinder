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
}

export default async function HomePage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

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

  if (listIds.length > 0) {
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

  const cardIds =
    Array.from(
      new Set(
        listCards.map(
          (row) =>
            row.card_id
        )
      )
    )

  let cards:
    CardRecord[] = []

  if (cardIds.length > 0) {
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
        set_id
      `)
      .in(
        'id',
        cardIds
      )

    if (error) {
      console.error(
        'Could not load curated cards:',
        error.message
      )
    }

    cards =
      (data ??
        []) as CardRecord[]
  }

  const cardById =
    new Map(
      cards.map(
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
                cardById.get(
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
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
            Discover Pokémon cards
          </p>

          <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
            Find cards you didn&apos;t know you loved.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-500">
            Explore Pokémon cards one at a time,
            build your collection, and discover
            what other collectors love.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Start exploring
            </Link>

            {user ? (
              <Link
                href="/collection"
                className="rounded-full border border-white/10 px-6 py-3 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                View collection
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/10 px-6 py-3 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                Sign in
              </Link>
            )}
          </div>
        </section>

        <section className="mt-16 space-y-14">
          {rows.map(
            (row) => (
              <div key={row.id}>
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
                />
              </div>
            )
          )}
        </section>
      </div>
    </main>
  )
}