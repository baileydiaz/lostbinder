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

type ExploreCardType = CardRecord & {
  set_name: string
}

function shuffle<T>(
  items: T[]
) {
  const result =
    [...items]

  for (
    let i =
      result.length - 1;

    i > 0;

    i--
  ) {
    const j =
      Math.floor(
        Math.random()
          * (i + 1)
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
    data: {
      user,
    },
  } =
    await supabase
      .auth
      .getUser()

  const {
    data: cardsData,
    error: cardsError,
  } =
    await supabase
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
      .limit(180)

  if (cardsError) {
    return (
      <main
        className="
          min-h-screen
          bg-black
          px-6
          py-16
          text-white
        "
      >
        <div
          className="
            mx-auto
            max-w-xl
          "
        >
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
            Could not load cards:
            {' '}
            {
              cardsError
                .message
            }
          </p>
        </div>
      </main>
    )
  }

  const cards = (cardsData ?? []) as CardRecord[]

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
      data,
    } =
      await supabase
        .from('sets')
        .select(
          'id, name'
        )
        .in(
          'id',
          setIds
        )

      sets = (data ?? []) as SetRow[]
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
              setNameById
                .get(
                  card.set_id
                )
              ??
              card.set_id,
          })
        )

  const initialReactions:
    Record<
      string,
      'like' | 'love'
    > = {}

  if (
    user
    &&
    exploreCards.length > 0
  ) {
    const ids =
      exploreCards.map(
        (card) =>
          card.id
      )

    const {
      data: reactions,
    } =
      await supabase
        .from(
          'card_reactions'
        )
        .select(
          'card_id, reaction'
        )
        .eq(
          'user_id',
          user.id
        )
        .in(
          'card_id',
          ids
        )

    for (
      const row
      of reactions ?? []
    ) {
      if (
        row.reaction
          === 'like'
        ||
        row.reaction
          === 'love'
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
        px-4
        py-8
        text-white
        sm:px-6
      "
    >
      <div
        className="
          mx-auto
          max-w-lg
        "
      >
        <div
          className="
            mb-6
          "
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.28em]
              text-zinc-500
            "
          >
            LostBinder
          </p>

          <h1
            className="
              mt-2
              text-3xl
              font-semibold
            "
          >
            Explore
          </h1>

          <p
            className="
              mt-2
              text-sm
              text-zinc-400
            "
          >
            Like trains your taste.
            Love adds a card to your
            collection and counts
            even more.
          </p>
        </div>

        <ExploreCard
          cards={
            exploreCards
          }

          userId={
            user?.id
            ?? null
          }

          initialReactions={
            initialReactions
          }
        />
      </div>
    </main>
  )
}