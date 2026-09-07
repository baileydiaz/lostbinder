import Link from 'next/link'

import {
  createClient,
} from '@/lib/supabase/server'

import ExploreCard
  from './explore-card'

type CardRecord = {
  id: string
  local_id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
  set_id: string
  category: string | null
}

type SetRow = {
  id: string
  name: string
}

type ExploreCardType =
  CardRecord & {
    set_name: string
  }

function shuffle<T>(
  items: T[]
) {
  const result = [
    ...items,
  ]

  for (
    let i =
      result.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1)
      )

    ;[
      result[i],
      result[j],
    ] = [
      result[j],
      result[i],
    ]
  }

  return result
}

export default async function ExplorePage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  const {
    data: cardsData,
    error: cardsError,
  } = await supabase
    .from('cards')
    .select(`
      id,
      local_id,
      name,
      rarity,
      illustrator,
      image_url,
      set_id,
      category
    `)
    .not(
      'image_url',
      'is',
      null
    )
    .limit(200)

  if (cardsError) {
    return (
      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-black
          px-6
          text-white
        "
      >
        <div className="text-center">
          <h1
            className="
              text-3xl
              font-semibold
            "
          >
            Explore
          </h1>

          <p
            className="
              mt-4
              text-red-400
            "
          >
            Could not load
            cards:{' '}
            {
              cardsError.message
            }
          </p>
        </div>
      </main>
    )
  }

  const cards =
    (cardsData ??
      []) as CardRecord[]

  const setIds =
    Array.from(
      new Set(
        cards.map(
          (card) =>
            card.set_id
        )
      )
    )

  let sets:
    SetRow[] = []

  if (
    setIds.length > 0
  ) {
    const {
      data: setsData,
      error: setsError,
    } = await supabase
      .from('sets')
      .select(`
        id,
        name
      `)
      .in(
        'id',
        setIds
      )

    if (setsError) {
      console.error(
        'Could not load sets:',
        setsError.message
      )
    }

    sets =
      (setsData ??
        []) as SetRow[]
  }

  const setNameById =
    new Map(
      sets.map(
        (set) => [
          set.id,
          set.name,
        ]
      )
    )

  const exploreCards:
    ExploreCardType[] =
      shuffle(cards)
        .slice(0, 50)
        .map(
          (card) => ({
            ...card,
            set_name:
              setNameById.get(
                card.set_id
              ) ??
              card.set_id,
          })
        )

  const initialReactions:
    Record<
      string,
      'like' | 'love'
    > = {}

  if (
    user &&
    exploreCards.length >
      0
  ) {
    const cardIds =
      exploreCards.map(
        (card) =>
          card.id
      )

    const {
      data:
        reactionData,
      error:
        reactionError,
    } = await supabase
      .from(
        'card_reactions'
      )
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

    if (
      reactionError
    ) {
      console.error(
        'Could not load reactions:',
        reactionError.message
      )
    }

    for (
      const row of
        reactionData ??
        []
    ) {
      if (
        row.reaction ===
          'like' ||
        row.reaction ===
          'love'
      ) {
        initialReactions[
          row.card_id
        ] =
          row.reaction
      }
    }
  }

  return (
    <main
      className="
        min-h-screen
        bg-black
        text-white
      "
    >
      <div
        className="
          mx-auto
          flex
          min-h-screen
          max-w-7xl
          flex-col
          px-4
          sm:px-6
        "
      >
        <header
          className="
            flex
            h-16
            shrink-0
            items-center
            justify-between
          "
        >
          <Link
            href="/"
            className="
              text-lg
              font-semibold
              tracking-tight
            "
          >
            LostBinder
          </Link>

          <nav
            className="
              flex
              items-center
              gap-5
              text-sm
              text-zinc-500
            "
          >
            {user ? (
              <>
                <Link
                  href="/collection"
                  className="
                    transition
                    hover:text-white
                  "
                >
                  Collection
                </Link>

                <Link
                  href="/friends"
                  className="
                    transition
                    hover:text-white
                  "
                >
                  Friends
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="
                  transition
                  hover:text-white
                "
              >
                Sign in
              </Link>
            )}
          </nav>
        </header>

        <section
          className="
            flex
            flex-1
            items-center
            justify-center
            pb-8
          "
        >
          <ExploreCard
            cards={
              exploreCards
            }
            userId={
              user?.id ??
              null
            }
            initialReactions={
              initialReactions
            }
          />
        </section>
      </div>
    </main>
  )
}