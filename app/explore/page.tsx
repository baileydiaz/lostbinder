import { getRecommendations } from '@/app/lib/recommendations'
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

  const exploreCards = await getRecommendations(
    supabase,
    user?.id ?? null,
    INITIAL_BATCH_SIZE,
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
    <main className="min-h-[calc(100dvh-110px)] bg-black px-3 pb-3 pt-2 text-white sm:min-h-screen sm:px-4 sm:py-8">
      <div className="mx-auto max-w-5xl">

        <div className="hidden text-center sm:mb-8 sm:block">
          <h1 className="text-4xl font-semibold tracking-tight">
            Find your next favorite.
          </h1>

          <p className="mt-2 text-sm text-zinc-600">
            Pass, Like, or Add to Collection.
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