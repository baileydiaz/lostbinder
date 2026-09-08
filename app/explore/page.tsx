import { createClient } from '@/lib/supabase/server'

import ExploreCard from './explore-card'

export const dynamic = 'force-dynamic'

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

type ReactionRow = {
  card_id: string
  reaction: 'like' | 'love'
}

type DismissalRow = {
  card_id: string
}

const INITIAL_BATCH_SIZE = 50

export default async function ExplorePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    .eq('category', 'Pokemon')
    .not('image_url', 'is', null)
    .order('id', {
      ascending: true,
    })
    .range(
      0,
      INITIAL_BATCH_SIZE - 1
    )

  if (cardsError) {
    console.error(
      'Could not load cards:',
      cardsError.message
    )
  }

  const cards =
    (cardsData ?? []) as CardRecord[]

  const setIds = Array.from(
    new Set(
      cards.map(
        (card) => card.set_id
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
      .in('id', setIds)

    if (error) {
      console.error(
        'Could not load sets:',
        error.message
      )
    }

    sets =
      (data ?? []) as SetRow[]
  }

  const setNameById = new Map(
    sets.map(
      (set) => [
        set.id,
        set.name,
      ]
    )
  )

  const exploreCards: ExploreCardType[] =
    cards.map(
      (card) => ({
        ...card,
        set_name:
          setNameById.get(
            card.set_id
          ) ?? card.set_id,
      })
    )

  let initialReactions: Record<
    string,
    'like' | 'love'
  > = {}

  let dismissedCardIds: string[] = []

  if (user) {
    const [
      reactionResult,
      dismissalResult,
    ] = await Promise.all([
      supabase
        .from('card_reactions')
        .select(`
          card_id,
          reaction
        `)
        .eq(
          'user_id',
          user.id
        ),

      supabase
        .from('card_dismissals')
        .select('card_id')
        .eq(
          'user_id',
          user.id
        ),
    ])

    if (reactionResult.error) {
      console.error(
        'Could not load reactions:',
        reactionResult.error.message
      )
    }

    if (dismissalResult.error) {
      console.error(
        'Could not load dismissals:',
        dismissalResult.error.message
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
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
            Discover
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Find your next favorite.
          </h1>

          <p className="mt-2 text-sm text-zinc-600">
            Like, Love, or pass.
          </p>
        </div>

        <ExploreCard
          cards={exploreCards}
          userId={
            user?.id ?? null
          }
          initialReactions={
            initialReactions
          }
          initialDismissedCardIds={
            dismissedCardIds
          }
          initialOffset={
            INITIAL_BATCH_SIZE
          }
        />
      </div>
    </main>
  )
}