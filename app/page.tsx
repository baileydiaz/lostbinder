import { getRecommendations } from '@/app/lib/recommendations'
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

type FavoriteRow = {
  card_id: string
  created_at: string
}

type DismissalRow = {
  card_id: string
}

type FriendshipRow = {
  requester_id: string
  addressee_id: string
}

type FriendReactionRow = {
  user_id: string
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

  let favoriteCardIds:
    string[] = []

  let friendActivityCards:
    CardRecord[] = []

  let friendActivityLabels:
    Record<string, string> = {}

  if (user) {
    const [
      reactionsResult,
      favoritesResult,
      dismissalsResult,
    ] = await Promise.all([
      supabase
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
        ),

      supabase
        .from('card_favorites')
        .select(`
          card_id,
          created_at
        `)
        .eq(
          'user_id',
          user.id
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        ),

      supabase
        .from('card_dismissals')
        .select(`
          card_id
        `)
        .eq(
          'user_id',
          user.id
        ),
    ])

    if (
      reactionsResult.error
    ) {
      console.error(
        'Could not load reactions:',
        reactionsResult.error
          .message
      )
    }

    if (
      favoritesResult.error
    ) {
      console.error(
        'Could not load favorites:',
        favoritesResult.error
          .message
      )
    }

    if (
      dismissalsResult.error
    ) {
      console.error(
        'Could not load dismissals:',
        dismissalsResult.error
          .message
      )
    }

    const reactions =
      (reactionsResult.data ??
        []) as ReactionRow[]

    const favorites =
      (favoritesResult.data ??
        []) as FavoriteRow[]

    const dismissals =
      (dismissalsResult.data ??
        []) as DismissalRow[]

    const reactedCardIds =
      reactions.map(
        (reaction) =>
          reaction.card_id
      )

    favoriteCardIds =
      favorites.map(
        (favorite) =>
          favorite.card_id
      )

    const dismissedCardIds =
      dismissals.map(
        (dismissal) =>
          dismissal.card_id
      )

    const signalCardIds =
      Array.from(
        new Set([
          ...reactedCardIds,
          ...favoriteCardIds,
        ])
      )

    let signalCards:
      CardRecord[] = []

    if (
      signalCardIds.length > 0
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
          signalCardIds
        )

      if (error) {
        console.error(
          'Could not load personalized cards:',
          error.message
        )
      }

      signalCards =
        (data ??
          []) as CardRecord[]
    }

    const signalCardById =
      new Map(
        signalCards.map(
          (card) => [
            card.id,
            card,
          ]
        )
      )

    lovedCards =
      favorites
        .map(
          (favorite) =>
            signalCardById.get(
              favorite.card_id
            )
        )
        .filter(
          (
            card
          ): card is CardRecord =>
            card !== undefined
        )
        .slice(
          0,
          40
        )

  }

  // Home and Explore share the same personalized scoring engine.
  const homeRecommendations = await getRecommendations(
    supabase,
    user?.id ?? null,
    40,
  )
  recommendedCards = homeRecommendations

  // The logged-out hero is an artwork showcase, not a ranking of popular cards.
  // Select lesser-known Pokémon illustrated by distinctive artists from our own catalog.
  // Curate contrasting artwork: surreal Drowzee, painterly art, and a dragon.
  // All cards are fetched from the catalog so links and images stay valid.
  const { data: showcaseData } = !user
    ? await supabase.from('cards')
        .select('id,name,image_url,illustrator,rarity')
        .eq('category', 'Pokemon')
        .not('image_url', 'is', null)
        .in('illustrator', ['Tomokazu Komiya', 'HYOGONOSUKE', 'Shinji Kanda', 'Teeziro', 'AKIRA EGAWA'])
        .limit(500)
    : { data: [] }

  const { data: dragonData } = !user
    ? await supabase.from('cards')
        .select('id,name,image_url,illustrator,rarity')
        .eq('category', 'Pokemon')
        .not('image_url', 'is', null)
        .in('name', ['Druddigon', 'Noivern', 'Haxorus', 'Dragalge', 'Turtonator'])
        .limit(200)
    : { data: [] }

  const showcaseCards = showcaseData ?? []
  const pick = (cards: typeof showcaseCards, names: string[], artists: string[] = []) =>
    cards.find(card => names.includes(card.name) && artists.includes(card.illustrator ?? ''))
    ?? cards.find(card => names.includes(card.name))
  const first = pick(showcaseCards, ['Drowzee'], ['Tomokazu Komiya'])
  const second = pick(showcaseCards, ['Gloom', 'Slowpoke', 'Claydol', 'Gengar'], ['HYOGONOSUKE', 'Shinji Kanda', 'Tomokazu Komiya'])
    ?? showcaseCards.find(card => card.id !== first?.id && card.illustrator !== first?.illustrator)
  const third = pick(dragonData ?? [], ['Druddigon', 'Noivern', 'Haxorus', 'Dragalge', 'Turtonator'], ['Teeziro', 'AKIRA EGAWA', 'Shinji Kanda'])
    ?? (dragonData ?? []).find(card => card.id !== first?.id && card.id !== second?.id)
  const heroCards = user ? homeRecommendations.slice(0, 3) : [first, second, third]
    .filter((card): card is NonNullable<typeof card> => !!card)
    .filter((card, index, cards) => cards.findIndex(other => other.id === card.id) === index)

  /*
   * -------------------------
   * FRIENDS ACTIVITY
   * -------------------------
   */

  if (user) {
    const {
      data: friendshipData,
      error: friendshipError,
    } = await supabase
      .from('friendships')
      .select(`
        requester_id,
        addressee_id
      `)
      .eq('status', 'accepted')
      .or(
        `requester_id.eq.${user.id},addressee_id.eq.${user.id}`
      )

    if (friendshipError) {
      console.error(
        'Could not load friends:',
        friendshipError.message
      )
    }

    const friendships =
      (friendshipData ??
        []) as FriendshipRow[]

    const friendIds =
      Array.from(
        new Set(
          friendships.map(
            (friendship) =>
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

    if (friendIds.length > 0) {
      const {
        data: activityData,
        error: activityError,
      } = await supabase
        .from('card_reactions')
        .select(`
          user_id,
          card_id,
          reaction,
          updated_at
        `)
        .in(
          'user_id',
          friendIds
        )
        .in(
          'reaction',
          ['like', 'love']
        )
        .order(
          'updated_at',
          {
            ascending: false,
          }
        )
        .limit(80)

      if (activityError) {
        console.error(
          'Could not load friend activity:',
          activityError.message
        )
      }

      const activity =
        (activityData ??
          []) as FriendReactionRow[]

      const activeFriendIds =
        Array.from(
          new Set(
            activity.map(
              (item) =>
                item.user_id
            )
          )
        )

      const {
        data: friendProfilesData,
        error: friendProfilesError,
      } =
        activeFriendIds.length > 0
          ? await supabase
              .from('profiles')
              .select(`
                id,
                username
              `)
              .in(
                'id',
                activeFriendIds
              )
          : {
              data: [],
              error: null,
            }

      if (friendProfilesError) {
        console.error(
          'Could not load friend usernames:',
          friendProfilesError.message
        )
      }

      const usernameById =
        new Map(
          (
            (friendProfilesData ??
              []) as {
                id: string
                username:
                  | string
                  | null
              }[]
          ).map(
            (profile) => [
              profile.id,
              profile.username,
            ]
          )
        )

      const latestActivityByCard =
        new Map<
          string,
          FriendReactionRow
        >()

      for (const item of activity) {
        if (
          !latestActivityByCard.has(
            item.card_id
          )
        ) {
          latestActivityByCard.set(
            item.card_id,
            item
          )
        }
      }

      const activityCardIds =
        Array.from(
          latestActivityByCard.keys()
        ).slice(0, 40)

      friendActivityLabels =
        Object.fromEntries(
          activityCardIds.map(
            (cardId) => {
              const item =
                latestActivityByCard.get(
                  cardId
                )

              if (!item) {
                return [
                  cardId,
                  '',
                ]
              }

              const username =
                usernameById.get(
                  item.user_id
                ) ??
                'Friend'

              const action =
                item.reaction ===
                'love'
                  ? 'added to their collection'
                  : 'liked this card'

              return [
                cardId,
                `@${username} ${action}`,
              ]
            }
          )
        )

      if (
        activityCardIds.length > 0
      ) {
        const {
          data: activityCardsData,
          error: activityCardsError,
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
            activityCardIds
          )

        if (activityCardsError) {
          console.error(
            'Could not load friend activity cards:',
            activityCardsError
              .message
          )
        }

        const activityCardMap =
          new Map(
            (
              (activityCardsData ??
                []) as CardRecord[]
            ).map(
              (card) => [
                card.id,
                card,
              ]
            )
          )

        friendActivityCards =
          activityCardIds
            .map(
              (cardId) =>
                activityCardMap.get(
                  cardId
                )
            )
            .filter(
              (
                card
              ): card is CardRecord =>
                card !==
                undefined
            )
      }
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
      (list) =>
        list.id
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
                card !== undefined
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
      <div className="mx-auto max-w-[1400px] px-4 pb-14 pt-6 sm:px-8 sm:pt-10">

        {/*
         * Compact hero.
         *
         * The goal is to communicate
         * LostBinder quickly and get
         * users into the cards.
         */}
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-5 py-7 sm:px-10 sm:py-10">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_0.85fr]">
            <div className="max-w-xl">
              <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                {user ? "YOUR DAILY DISCOVERY" : "POKÉMON ART, REDISCOVERED"}
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                {user ? "Find your next favorite card." : "Forget the price tag. Fall in love with the art."}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">
                {user ? "Explore Pokémon artwork picked around your tastes, with something unexpected in every session." : "Take money out of the equation. Discover overlooked Pokémon artwork, appreciate each card on its own, and build a personal collection around what you love—not what it costs."}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/explore" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
                  {user ? "Start exploring →" : "Discover cards →"}
                </Link>
                {!user ? <Link href="/auth/login" className="px-3 py-3 text-sm text-zinc-400 hover:text-white">Join LostBinder</Link> : null}
              </div>
            </div>
            <div className="flex min-h-[210px] items-center justify-center gap-3 sm:min-h-[280px]">
              {heroCards.map((card, index) => (
                <Link
                  key={card.id}
                  href={`/cards/${card.id}`}
                  aria-label={`View ${card.name}`}
                  className={`block w-[30%] max-w-[155px] shrink-0 transition-transform hover:-translate-y-2 ${index === 1 ? '-translate-y-3' : 'translate-y-2'}`}
                >
                  <img src={card.image_url ?? ''} alt={card.name} className="w-full rounded-xl shadow-2xl shadow-black/70" />
                </Link>
              ))}
              {heroCards.length === 0 ? <p className="text-sm text-zinc-500">Thousands of cards. One you haven’t discovered yet.</p> : null}
            </div>
          </div>
        </section>

        {user &&
        recommendedCards.length >
          0 ? (
          <section className="mt-10 sm:mt-14">
            <CardRow
              title="For You"
              cards={
                recommendedCards as RowCard[]
              }
              userId={
                user?.id ??
                null
              }
              initialLovedCardIds={
                favoriteCardIds
              }
            />

            <p className="-mt-1 text-xs text-zinc-700">
              Based on cards you&apos;ve
              liked and loved.
            </p>
          </section>
        ) : null}

        {user &&
        lovedCards.length > 0 ? (
          <section className="mt-8 sm:mt-10">
            <CardRow
              title="Your Collection"
              cards={
                lovedCards as RowCard[]
              }
              userId={
                user?.id ??
                null
              }
              initialLovedCardIds={
                favoriteCardIds
              }
            />
          </section>
        ) : null}

        {user &&
        friendActivityCards.length >
          0 ? (
          <section className="mt-8 sm:mt-10">
            <CardRow
              title="Friends Activity"
              cards={
                friendActivityCards as RowCard[]
              }
              userId={
                user.id
              }
              initialLovedCardIds={
                favoriteCardIds
              }
              cardLabels={
                friendActivityLabels
              }
            />

            <p className="-mt-1 text-xs text-zinc-700">
              Cards your friends have been
              liking and adding to their
              collections.
            </p>
          </section>
        ) : null}

        <section
          className={
            user &&
            (
              recommendedCards.length >
                0 ||
              lovedCards.length >
                0 ||
              friendActivityCards.length >
                0
            )
              ? 'mt-8 space-y-10 sm:mt-10 sm:space-y-14'
              : 'mt-10 space-y-10 sm:mt-14 sm:space-y-14'
          }
        >
          {rows.map(
            (row) => (
              <div
                key={row.id}
              >
                <CardRow
                  title={
                    row.title
                  }
                  description={
                    row.description
                  }
                  cards={
                    row.cards
                  }
                  userId={
                    user?.id ??
                    null
                  }
                  initialLovedCardIds={
                    favoriteCardIds
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
