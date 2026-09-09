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
  reaction: 'like' | 'love'
}

type DismissalRow = {
  card_id: string
}

const INITIAL_BATCH_SIZE = 50

export default async function ExplorePage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  /*
   * Pull a genuinely random batch
   * instead of taking the first 50
   * cards by ID.
   */
  const {
    data: cardsData,
    error: cardsError,
  } = await supabase.rpc(
    'get_random_pokemon_cards',
    {
      limit_count:
        INITIAL_BATCH_SIZE,
    }
  )

  if (cardsError) {
    console.error(
      'Could not load cards:',
      cardsError.message
    )
  }

  const cards =
    (cardsData ??
      []) as CardRecord[]

  /*
   * Grab the set names for the
   * random cards we received.
   */
  const setIds =
    Array.from(
      new Set(
        cards.map(
          (card) =>
            card.set_id
        )
      )
    )

  let sets: SetRow[] = []

  if (setIds.length > 0) {
    const {
      data,
      error,
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

    if (error) {
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
      'like' | 'love'
    > = {}

  let dismissedCardIds:
    string[] = []

  /*
   * Logged-in users should not see
   * cards they have already handled.
   */
  if (user) {
    const [
      reactionResult,
      dismissalResult,
    ] = await Promise.all([
      supabase
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
        ),

      supabase
        .from(
          'card_dismissals'
        )
        .select(
          'card_id'
        )
        .eq(
          'user_id',
          user.id
        ),
    ])

    if (
      reactionResult.error
    ) {
      console.error(
        'Could not load reactions:',
        reactionResult.error
          .message
      )
    }

    if (
      dismissalResult.error
    ) {
      console.error(
        'Could not load dismissals:',
        dismissalResult.error
          .message
      )
    }

    const reactions =
      (reactionResult.data ??
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

    dismissedCardIds =
      (
        (dismissalResult.data ??
          []) as DismissalRow[]
      ).map(
        (dismissal) =>
          dismissal.card_id
      )
  }

  return (
    <main className="min-h-screen bg-black px-3 py-4 text-white sm:px-4 sm:py-8">
      <div className="mx-auto max-w-5xl">

        {/*
         * Compact on mobile so the
         * discovery card gets most of
         * the viewport.
         */}
        <div className="mb-4 text-center sm:mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600 sm:text-xs sm:tracking-[0.28em]">
            Discover
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:mt-2 sm:text-4xl">
            Find your next favorite.
          </h1>

          <p className="mt-1 text-xs text-zinc-600 sm:mt-2 sm:text-sm">
            Like, Love, or pass.
          </p>
        </div>

        <ExploreCard
          cards={
            exploreCards
          }
          userId={
            user?.id ?? null
          }
          initialReactions={
            initialReactions
          }
          initialDismissedCardIds={
            dismissedCardIds
          }
        />
      </div>
    </main>
  )
}