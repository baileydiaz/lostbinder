'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'


import ReactionButtons, {
  type Reaction,
} from '@/app/components/reaction-buttons'

type ExploreCardItem = {
  id: string
  local_id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
  set_id: string
  category: string | null
  set_name?: string | null
  recommendation_reason?: string
}

type Props = {
  cards: ExploreCardItem[]
  userId: string | null
  reactionDates?: string[]
  initialReactions?: Record<
    string,
    Reaction
  >
}

const LOAD_MORE_AT = 8

const RANDOM_BATCH_SIZE = 40

function diversifyCards(
  cards: ExploreCardItem[]
) {
  const bySet =
    new Map<
      string,
      ExploreCardItem[]
    >()

  for (
    const card of cards
  ) {
    const current =
      bySet.get(
        card.set_id
      ) ?? []

    current.push(
      card
    )

    bySet.set(
      card.set_id,
      current
    )
  }

  const groups =
    Array.from(
      bySet.values()
    )

  for (
    const group of groups
  ) {
    group.sort(
      () =>
        Math.random() -
        0.5
    )
  }

  groups.sort(
    () =>
      Math.random() -
      0.5
  )

  const result:
    ExploreCardItem[] = []

  let cardsLeft =
    true

  while (
    cardsLeft
  ) {
    cardsLeft =
      false

    for (
      const group of groups
    ) {
      const card =
        group.shift()

      if (card) {
        result.push(
          card
        )

        cardsLeft =
          true
      }
    }
  }

  return result
}

export default function ExploreCard({
  cards,
  userId,
  initialReactions = {},
  reactionDates = [],
}: Props) {
  const [
    allCards,
    setAllCards,
  ] =
    useState<
      ExploreCardItem[]
    >(
      diversifyCards(
        cards
      )
    )

  const [
    reactions,
    setReactions,
  ] =
    useState<
      Record<
        string,
        Reaction
      >
    >(
      initialReactions
    )

  const [
    badCardIds,
    setBadCardIds,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    )

  const [exhausted, setExhausted] = useState(false)
  const [today, setToday] = useState('')
  const [dailyCount, setDailyCount] = useState(0)
  const [lastDecision, setLastDecision] = useState<{ card: ExploreCardItem; previous: Reaction; next: Reaction; ready: boolean } | null>(null)
  const [undoing, setUndoing] = useState(false)
  useEffect(() => {
    const day = new Date().toLocaleDateString('en-CA')
    setToday(day)
    setDailyCount(reactionDates.filter(date => new Date(date).toLocaleDateString('en-CA') === day).length)
  }, [reactionDates])

  async function undoLastDecision() {
    if (!lastDecision?.ready || !userId || undoing) return
    setUndoing(true)
    const { card: previousCard, previous, next } = lastDecision
    const supabase = createClient()
    try {
      const result = previous === null
        ? await supabase.from('card_reactions').delete().eq('user_id', userId).eq('card_id', previousCard.id)
        : await supabase.from('card_reactions').upsert({ user_id: userId, card_id: previousCard.id, reaction: previous, updated_at: new Date().toISOString() }, { onConflict: 'user_id,card_id' })
      if (result.error) throw result.error
      if (previous === 'love' || next === 'love') {
        const favoriteResult = previous === 'love'
          ? await supabase.from('card_favorites').upsert({ user_id: userId, card_id: previousCard.id }, { onConflict: 'user_id,card_id' })
          : await supabase.from('card_favorites').delete().eq('user_id', userId).eq('card_id', previousCard.id)
        if (favoriteResult.error) throw favoriteResult.error
      }
      setReactions(current => {
        const updated = { ...current }
        if (previous === null) delete updated[previousCard.id]
        else updated[previousCard.id] = previous
        return updated
      })
      if (previous === null && today) setDailyCount(count => Math.max(0, count - 1))
      setAllCards(current => [previousCard, ...current.filter(item => item.id !== previousCard.id)])
      setLastDecision(null)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not undo that decision.')
    } finally { setUndoing(false) }
  }

  const [
    loadingMore,
    setLoadingMore,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  const visibleCards =
    useMemo(
      () =>
        allCards.filter(
          (card) =>
            Boolean(
              card.image_url
            ) &&
            !badCardIds.has(
              card.id
            ) &&
            !reactions[
              card.id
            ]
        ),
      [
        allCards,
        badCardIds,
        reactions,
      ]
    )

  const card =
    visibleCards[0]

  /*
   * Prefer the next card from a
   * different set.
   */
  const nextCard =
    useMemo(
      () => {
        if (
          visibleCards.length <
          2
        ) {
          return undefined
        }

        if (!card) {
          return visibleCards[
            1
          ]
        }

        return (
          visibleCards
            .slice(1)
            .find(
              (
                candidate
              ) =>
                candidate
                  .set_id !==
                card.set_id
            ) ??
          visibleCards[
            1
          ]
        )
      },
      [
        card,
        visibleCards,
      ]
    )

  /*
   * Reorder the queue so the
   * preferred next card actually
   * becomes card #2.
   */
  useEffect(() => {
    if (
      !card ||
      !nextCard ||
      visibleCards[
        1
      ]?.id ===
        nextCard.id
    ) {
      return
    }

    setAllCards(
      (current) => {
        const currentIndex =
          current.findIndex(
            (item) =>
              item.id ===
              card.id
          )

        const nextIndex =
          current.findIndex(
            (item) =>
              item.id ===
              nextCard.id
          )

        if (
          currentIndex ===
            -1 ||
          nextIndex ===
            -1 ||
          nextIndex ===
            currentIndex +
              1
        ) {
          return current
        }

        const copy =
          [
            ...current,
          ]

        const [
          moved,
        ] =
          copy.splice(
            nextIndex,
            1
          )

        copy.splice(
          currentIndex +
            1,
          0,
          moved
        )

        return copy
      }
    )
  }, [
    card?.id,
    nextCard?.id,
    visibleCards,
  ])

  /*
   * Preload the preferred
   * next card image.
   */
  useEffect(() => {
    if (
      !nextCard
        ?.image_url
    ) {
      return
    }

    const image =
      new Image()

    image.src =
      nextCard.image_url
  }, [
    nextCard?.id,
    nextCard?.image_url,
  ])

  /*
   * Grab another batch before
   * the queue gets low.
   */
  useEffect(() => {
    if (
      visibleCards.length >
        LOAD_MORE_AT ||
      loadingMore || exhausted
    ) {
      return
    }

    void loadMoreCards()
  }, [
    visibleCards.length,
    loadingMore,
    exhausted,
  ])

  async function loadMoreCards() {
    if (
      loadingMore
    ) {
      return
    }

    setLoadingMore(
      true
    )

    try {
      const response = await fetch('/api/recommendations', { cache: 'no-store' })
      if (!response.ok) throw new Error('Could not load recommendations')
      const payload = (await response.json()) as { cards: ExploreCardItem[] }
      const nextCards = payload.cards ?? []
      const existingIds = new Set(allCards.map(item => item.id))
      if (!nextCards.some(item => !existingIds.has(item.id))) setExhausted(true)
      setAllCards(current => {
        const seen = new Set(current.map(item => item.id))
        const fresh = nextCards.filter(item => !seen.has(item.id))
        return [...current, ...fresh]
      })
    } catch (
      loadError
    ) {
      console.error(
        'Could not load more Explore cards:',
        loadError
      )
    } finally {
      setLoadingMore(
        false
      )
    }
  }

  function hideBrokenCard(
    cardId: string
  ) {
    setBadCardIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          )

        next.add(
          cardId
        )

        return next
      }
    )
  }

  if (!card) {
    return (
      <div className="mx-auto flex min-h-[55dvh] max-w-md items-center justify-center px-4 text-center">
        <div>
          {loadingMore ? (
            <>
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-800 border-t-white" />

              <p className="mt-4 text-sm text-zinc-500">
                Finding more cards...
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white">
                You&apos;re all caught up.
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                We&apos;re grabbing another batch of cards for you.
              </p>

              <button
                type="button"
                onClick={() =>
                  (setExhausted(false), void loadMoreCards())
                }
                className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Find more cards
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div className="mb-3 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3">
        <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
          <span>Daily Discovery · {Math.min(dailyCount, 10)} of 10</span>
          <Link href="/explore/history" className="text-zinc-200 underline-offset-4 hover:underline">History</Link>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(dailyCount, 10) * 10}%` }} /></div>
        {dailyCount >= 10 ? <p className="mt-2 text-xs text-emerald-400">Today's ten discoveries complete. Keep exploring!</p> : null}
        <button type="button" disabled={!lastDecision?.ready || undoing} onClick={() => void undoLastDecision()} className="mt-3 text-xs text-zinc-300 underline-offset-4 enabled:hover:underline disabled:opacity-30">↶ Undo last decision</button>
      </div>
      {error ? (
        <div className="mb-2 rounded-lg border border-red-950 bg-red-950/30 px-3 py-2 text-center text-xs text-red-300">
          {error}
        </div>
      ) : null}

      <article
        key={
          card.id
        }
        className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
      >
        <Link
          href={`/cards/${card.id}`}
          className="block"
        >
          <div className="flex h-[calc(100dvh-300px)] min-h-[300px] max-h-[520px] items-center justify-center overflow-hidden bg-zinc-950 sm:aspect-[2.5/3.5] sm:h-auto sm:max-h-none">
            <img
              src={
                card.image_url!
              }
              alt={
                card.name
              }
              onError={() =>
                hideBrokenCard(
                  card.id
                )
              }
              className="h-full w-full object-contain"
            />
          </div>
        </Link>

        <div className="p-2 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/cards/${card.id}`}
                className="block"
              >
                <h2 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {
                    card.name
                  }
                </h2>
              </Link>

              <p className="mt-0.5 truncate text-xs text-zinc-500 sm:text-sm">
                {
                  card.set_name ??
                  card.set_id
                }
              </p>
            </div>

            {card.rarity &&
            card.rarity !==
              'None' ? (
              <span className="shrink-0 rounded-full border border-white/10 bg-black px-2.5 py-1 text-[10px] text-zinc-400 sm:text-xs">
                {
                  card.rarity
                }
              </span>
            ) : null}
          </div>

          {card.recommendation_reason ? (
            <p className="mt-2 text-xs font-medium text-emerald-400">
              ✦ {card.recommendation_reason}
            </p>
          ) : null}

          {card.illustrator ? (
            <p className="mt-0.5 text-xs text-zinc-600 sm:mt-1.5">
              Illustrated by{' '}
              <span className="text-zinc-400">
                {
                  card.illustrator
                }
              </span>
            </p>
          ) : null}

          <div className="mt-1 sm:mt-3">
            <ReactionButtons
              key={
                card.id
              }
              cardId={
                card.id
              }
              userId={
                userId
              }
              initialReaction={
                reactions[
                  card.id
                ] ??
                null
              }
              onSaved={(
                nextReaction
              ) => {
                if (nextReaction && userId) {
                  setLastDecision({ card, previous: reactions[card.id] ?? null, next: nextReaction, ready: false })
                }
                if (
                  nextReaction
                ) {
                  setReactions(
                    (
                      current
                    ) => ({
                      ...current,

                      [card.id]:
                        nextReaction,
                    })
                  )
                }

                setError(
                  null
                )
              }}
              onPersisted={(saved) => {
                setLastDecision(current => current?.card.id === card.id ? { ...current, ready: true } : current)
                if (saved && today && !reactions[card.id]) setDailyCount(count => count + 1)
              }}
              onError={(
                message
              ) => {
                setReactions(
                  (
                    current
                  ) => {
                    const next =
                      {
                        ...current,
                      }

                    delete next[
                      card.id
                    ]

                    return next
                  }
                )

                setLastDecision(current => current?.card.id === card.id ? null : current)
                setError(
                  message
                )
              }}
            />
          </div>
        </div>
      </article>

      <p className="mt-2 hidden text-center text-xs text-zinc-700 sm:block">
        Tap the card to see more
      </p>
    </div>
  )
}