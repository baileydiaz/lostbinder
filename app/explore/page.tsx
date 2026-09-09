import {
  createClient,
} from '@/lib/supabase/server'

import ExploreCard
  from './explore-card'

export const dynamic =
  'force-dynamic'

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

type ReactionRow = {
  card_id: string

  reaction:
    | 'pass'
    | 'like'
    | 'love'
}

const INITIAL_BATCH_SIZE =
  50

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

  /*
   * Random, diverse initial
   * discovery batch.
   */
  const {
    data:
      cardsData,
    error:
      cardsError,
  } =
    await supabase.rpc(
      'get_random_pokemon_cards',
      {
        limit_count:
          INITIAL_BATCH_SIZE,
      }
    )

  if (
    cardsError
  ) {
    console.error(
      'Could not load cards:',
      cardsError.message
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
      data,
      error,
    } =
      await supabase
        .from('sets')
        .select(`
          id,
          name
        `)
        .in(
          'id',
          setIds
        )

    if (
      error
    ) {
      console.error(
        'Could not load sets:',
        error.message
      )
    }

    sets =
      (data ??
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
    cards.map(
      (card) => ({
        ...card,

        set_name:
          setNameById.get(
            card.set_id
          ) ??
          card.set_id,
      })
    )

  let initialReactions:
    Record<
      string,
      | 'pass'
      | 'like'
      | 'love'
    > = {}

  /*
   * Every decision now comes from
   * card_reactions.
   */
  if (user) {
    const {
      data:
        reactionData,
      error:
        reactionError,
    } =
      await supabase
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

    if (
      reactionError
    ) {
      console.error(
        'Could not load reactions:',
        reactionError.message
      )
    }

    const reactions =
      (reactionData ??
        []) as ReactionRow[]

    initialReactions =
      Object.fromEntries(
        reactions.map(
          (reaction) => [
            reaction.card_id,
            reaction.reaction,
          ]
        )
      )
  }

  return (
    <main className="min-h-screen bg-black px-3 py-4 text-white sm:px-4 sm:py-8">
      <div className="mx-auto max-w-5xl">

        <div className="mb-4 text-center sm:mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600 sm:text-xs">
            Discover
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:mt-2 sm:text-4xl">
            Find your next
            favorite.
          </h1>

          <p className="mt-1 text-xs text-zinc-600 sm:mt-2 sm:text-sm">
            Pass, Like, or Love.
          </p>
        </div>

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
      </div>
    </main>
  )
}