import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CardRow, {
  RowCard,
} from '@/app/components/card-row'

type CuratedList = {
  id: number
  slug: string
  title: string
  description: string | null
  sort_order: number
}

type CuratedListCard = {
  list_id: number
  card_id: string
  sort_order: number
}

type CardRecord = RowCard

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const {
    data: listData,
    error: listError,
  } = await supabase
    .from('curated_lists')
    .select(`
      id,
      slug,
      title,
      description,
      sort_order
    `)
    .order('sort_order', {
      ascending: true,
    })

  if (listError) {
    console.error(
      'Could not load curated lists:',
      listError.message
    )
  }

  const lists =
    (listData ?? []) as CuratedList[]

  const listIds = lists.map(
    (list) => list.id
  )

  let listCardData: CuratedListCard[] = []

  if (listIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from('curated_list_cards')
      .select(`
        list_id,
        card_id,
        sort_order
      `)
      .in('list_id', listIds)
      .order('sort_order', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Could not load curated list cards:',
        error.message
      )
    }

    listCardData =
      (data ?? []) as CuratedListCard[]
  }

  const cardIds = Array.from(
    new Set(
      listCardData.map(
        (item) => item.card_id
      )
    )
  )

  let cards: CardRecord[] = []

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
      .in('id', cardIds)

    if (error) {
      console.error(
        'Could not load cards:',
        error.message
      )
    }

    cards = (data ?? []) as CardRecord[]
  }

  const cardById = new Map(
    cards.map((card) => [
      card.id,
      card,
    ])
  )

  const reactions: Record<
    string,
    'like' | 'love'
  > = {}

  if (
    user &&
    cardIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from('card_reactions')
      .select(`
        card_id,
        reaction
      `)
      .eq(
        'user_id',
        user.id
      )
      .in(
        'card_id',
        cardIds
      )

    if (error) {
      console.error(
        'Could not load reactions:',
        error.message
      )
    }

    for (const row of data ?? []) {
      if (
        row.reaction === 'like' ||
        row.reaction === 'love'
      ) {
        reactions[row.card_id] =
          row.reaction
      }
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="text-xl font-semibold"
          >
            LostBinder
          </Link>

          <nav className="flex items-center gap-5 text-sm text-zinc-400">
            <Link
              href="/explore"
              className="transition hover:text-white"
            >
              Explore
            </Link>

            {user ? (
              <>
                <Link
                  href="/collection"
                  className="transition hover:text-white"
                >
                  Collection
                </Link>

                <Link
                  href="/friends"
                  className="transition hover:text-white"
                >
                  Friends
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="transition hover:text-white"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
          Discover Pokémon cards
        </p>

        <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">
          Find cards you didn&apos;t know you loved.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
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
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40"
            >
              View collection
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40"
            >
              Sign in
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        {lists.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-8">
            <h2 className="text-xl font-semibold">
              Curated lists aren&apos;t ready yet.
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Run the LostBinder social SQL in
              Supabase to create and populate the
              curated lists.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {lists.map((list) => {
              const listCards =
                listCardData
                  .filter(
                    (item) =>
                      item.list_id === list.id
                  )
                  .sort(
                    (a, b) =>
                      a.sort_order -
                      b.sort_order
                  )
                  .map(
                    (item) =>
                      cardById.get(
                        item.card_id
                      )
                  )
                  .filter(
                    (
                      card
                    ): card is CardRecord =>
                      card !== undefined
                  )

              return (
                <div key={list.id}>
                  {list.description ? (
                    <div className="mb-1">
                      <p className="text-sm text-zinc-500">
                        {list.description}
                      </p>
                    </div>
                  ) : null}

                  <CardRow
                    title={list.title}
                    cards={listCards}
                    userId={
                      user?.id ?? null
                    }
                    reactions={reactions}
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}