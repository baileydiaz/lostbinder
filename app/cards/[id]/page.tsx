import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import ReactionButtons from '@/app/components/reaction-buttons'
import SendCardButton from '@/app/components/send-card-button'

type Props = {
  params: Promise<{
    id: string
  }>
}

type Friendship = {
  requester_id: string
  addressee_id: string
}

type FriendProfile = {
  id: string
  username: string | null
}

export default async function CardPage({
  params,
}: Props) {
  const { id } = await params

  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  /*
   * Load the card.
   * Pokémon only.
   */
  const {
    data: card,
    error: cardError,
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
    .eq('id', id)
    .eq(
      'category',
      'Pokemon'
    )
    .maybeSingle()

  if (
    cardError ||
    !card
  ) {
    notFound()
  }

  /*
   * Load set information.
   */
  const {
    data: set,
  } = await supabase
    .from('sets')
    .select(`
      id,
      name,
      release_date
    `)
    .eq(
      'id',
      card.set_id
    )
    .maybeSingle()

  /*
   * Load current user's reaction.
   */
  let reaction:
    | 'like'
    | 'love'
    | null = null

  if (user) {
    const {
      data: reactionData,
    } = await supabase
      .from('card_reactions')
      .select(`
        reaction
      `)
      .eq(
        'user_id',
        user.id
      )
      .eq(
        'card_id',
        card.id
      )
      .maybeSingle()

    if (
      reactionData?.reaction ===
        'like' ||
      reactionData?.reaction ===
        'love'
    ) {
      reaction =
        reactionData.reaction
    }
  }

  /*
   * Load accepted friends
   * for the Send button.
   */
  let friends:
    FriendProfile[] = []

  if (user) {
    const {
      data:
        friendshipData,
    } = await supabase
      .from('friendships')
      .select(`
        requester_id,
        addressee_id
      `)
      .eq(
        'status',
        'accepted'
      )
      .or(
        `requester_id.eq.${user.id},addressee_id.eq.${user.id}`
      )

    const friendships =
      (friendshipData ??
        []) as Friendship[]

    const friendIds =
      Array.from(
        new Set(
          friendships.map(
            (
              friendship
            ) =>
              friendship
                .requester_id ===
              user.id
                ? friendship
                    .addressee_id
                : friendship
                    .requester_id
          )
        )
      )

    if (
      friendIds.length > 0
    ) {
      const {
        data:
          friendData,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          username
        `)
        .in(
          'id',
          friendIds
        )

      friends =
        (friendData ??
          []) as FriendProfile[]
    }
  }

  const year =
    set?.release_date
      ? new Date(
          set.release_date
        ).getFullYear()
      : null

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/explore"
          className="text-sm text-zinc-600 transition hover:text-white"
        >
          ← Back to Discover
        </Link>

        <div className="mt-8 grid gap-10 md:grid-cols-2 md:items-center">
          <div className="flex justify-center">
            {card.image_url ? (
              <img
                src={
                  card.image_url
                }
                alt={
                  card.name
                }
                className="max-h-[70vh] w-full max-w-[420px] object-contain"
              />
            ) : (
              <div className="aspect-[2.5/3.5] w-full max-w-[420px] rounded-2xl bg-zinc-950" />
            )}
          </div>

          <div>
            <p className="text-sm text-zinc-500">
              {set?.name ||
                card.set_id}
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              {card.name}
            </h1>

            <div className="mt-6 space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-700">
                  Card
                </p>

                <p className="mt-1 text-zinc-300">
                  #
                  {
                    card.local_id
                  }
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-700">
                  Rarity
                </p>

                <p className="mt-1 text-zinc-300">
                  {card.rarity &&
                  card.rarity !==
                    'None'
                    ? card.rarity
                    : 'Unknown'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-700">
                  Illustrator
                </p>

                <p className="mt-1 text-zinc-300">
                  {card.illustrator ||
                    'Unknown'}
                </p>
              </div>

              {year ? (
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-700">
                    Year
                  </p>

                  <p className="mt-1 text-zinc-300">
                    {year}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ReactionButtons
                cardId={
                  card.id
                }
                userId={
                  user?.id ??
                  null
                }
                initialReaction={
                  reaction
                }
              />

              {user ? (
                <SendCardButton
                  cardId={
                    card.id
                  }
                  userId={
                    user.id
                  }
                  friends={
                    friends
                  }
                />
              ) : null}
            </div>

            <Link
              href={`/sets/${card.set_id}`}
              className="mt-8 inline-block text-sm text-zinc-600 transition hover:text-white"
            >
              View entire set →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}