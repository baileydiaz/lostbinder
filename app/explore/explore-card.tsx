'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AddToBinder from '@/app/components/add-to-binder'


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
      cards
    )

  // Preserve the discovery queue across visits to card details in this tab.
  // A card only leaves the queue after a reaction, not after opening its page.
  const queueReady = useRef(false)
  useEffect(() => {
    const key = 'lostbinder:explore-queue:' + (userId ?? 'guest')
    try {
      const stored = sessionStorage.getItem(key)
      if (stored) {
        const parsed = JSON.parse(stored) as ExploreCardItem[]
        if (Array.isArray(parsed) && parsed.length) {
          const seen = new Set(parsed.map(item => item.id))
          setAllCards([...parsed, ...cards.filter(item => !seen.has(item.id))])
        }
      }
    } catch {
      // Fall back to the freshly recommended queue.
    }
    queueReady.current = true
  }, [userId])

  useEffect(() => {
    if (!queueReady.current) return
    try {
      sessionStorage.setItem(
        'lostbinder:explore-queue:' + (userId ?? 'guest'),
        JSON.stringify(allCards.slice(0, 250)),
      )
    } catch {
      // Storage can be unavailable; Explore remains usable.
    }
  }, [allCards, userId])

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
  type SwipeDirection = 'left' | 'right' | 'up' | 'down'
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [hintVisible, setHintVisible] = useState(false)
  const [swipeBusy, setSwipeBusy] = useState(false)
  const [binderOpenRequest, setBinderOpenRequest] = useState({ cardId: '', count: 0 })
  const gesture = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClick = useRef(false)
  const swipeLock = useRef(false)
  const clearHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = null }

  useEffect(() => {
    if (sessionStorage.getItem('lostbinder:swipe-learned')) return
    const show = setTimeout(() => setHintVisible(true), 350)
    const hide = setTimeout(() => setHintVisible(false), 3800)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [])

  function directionOf(x: number, y: number): SwipeDirection | null {
    if (Math.max(Math.abs(x), Math.abs(y)) < 70) return null
    return Math.abs(x) > Math.abs(y) * 1.2
      ? (x > 0 ? 'right' : 'left')
      : Math.abs(y) > Math.abs(x) * 1.2
        ? (y > 0 ? 'down' : 'up')
        : null
  }

  async function commitSwipe(direction: SwipeDirection, swipedCard: ExploreCardItem) {
    if (swipeLock.current) return
    if (direction === 'down') {
      setBinderOpenRequest(current => ({ cardId: swipedCard.id, count: current.count + 1 }))
      setDrag({ x: 0, y: 0 })
      return
    }
    if (!userId) {
      setError('Log in to save your reactions. You can still browse cards.')
      setDrag({ x: 0, y: 0 })
      return
    }
    swipeLock.current = true
    setSwipeBusy(true)
    const next: Exclude<Reaction, null> = direction === 'left' ? 'pass' : direction === 'right' ? 'like' : 'love'
    const previous = reactions[swipedCard.id] ?? null
    try {
      const supabase = createClient()
      const { error: reactionError } = await supabase.from('card_reactions').upsert(
        { user_id: userId, card_id: swipedCard.id, reaction: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,card_id' },
      )
      if (reactionError) throw reactionError
      if (next === 'love') {
        const { error: favoriteError } = await supabase.from('card_favorites').upsert(
          { user_id: userId, card_id: swipedCard.id },
          { onConflict: 'user_id,card_id' },
        )
        if (favoriteError) throw favoriteError
      }
      setLastDecision({ card: swipedCard, previous, next, ready: true })
      setReactions(current => ({ ...current, [swipedCard.id]: next }))
      if (!previous && today) setDailyCount(count => count + 1)
      setError(null)
      sessionStorage.setItem('lostbinder:swipe-learned', '1')
      setHintVisible(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save swipe. Try again.')
    } finally {
      setDrag({ x: 0, y: 0 })
      setSwipeBusy(false)
      swipeLock.current = false
    }
  }

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
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
      >
        <Link
          href={`/cards/${card.id}`}
          className={`relative block select-none cursor-grab ${gesture.current ? "cursor-grabbing" : ""}`}
          style={{ touchAction: 'none', transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${drag.x / 35}deg)`, transition: gesture.current ? 'none' : 'transform 180ms ease-out' }}
          onDragStart={event => event.preventDefault()}
          onClickCapture={event => {
            if (suppressClick.current) { event.preventDefault(); suppressClick.current = false }
          }}
          onPointerDown={event => {
            if (swipeBusy || event.pointerType === 'mouse' && event.button !== 0) return
            if (event.pointerType === 'mouse') event.preventDefault() // Prevent native link dragging; preserve click-to-open.
            gesture.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId }
            event.currentTarget.setPointerCapture(event.pointerId)
            clearHold()
            holdTimer.current = setTimeout(() => setHintVisible(true), 420)
          }}
          onPointerMove={event => {
            if (!gesture.current || gesture.current.pointerId !== event.pointerId) return
            const x = event.clientX - gesture.current.x
            const y = event.clientY - gesture.current.y
            if (Math.hypot(x, y) > 10) clearHold()
            setDrag({ x, y })
          }}
          onPointerUp={event => {
            if (!gesture.current || gesture.current.pointerId !== event.pointerId) return
            clearHold()
            const x = event.clientX - gesture.current.x
            const y = event.clientY - gesture.current.y
            gesture.current = null
            const direction = directionOf(x, y)
            if (Math.hypot(x, y) > 12) {
              suppressClick.current = true
              setTimeout(() => { suppressClick.current = false }, 350)
            }
            if (direction) void commitSwipe(direction, card)
            else setDrag({ x: 0, y: 0 })
            setHintVisible(false)
          }}
          onPointerCancel={() => { clearHold(); gesture.current = null; setDrag({ x: 0, y: 0 }); setHintVisible(false) }}
        >
          <div className="relative flex h-[calc(100dvh-300px)] min-h-[300px] max-h-[520px] items-center justify-center overflow-hidden bg-zinc-950 sm:aspect-[2.5/3.5] sm:h-auto sm:max-h-none">
            <img
              src={card.image_url!}
              alt={card.name}
              draggable={false}
              onError={() => hideBrokenCard(card.id)}
              className="pointer-events-none h-full w-full object-contain"
            />

          </div>
        </Link>

        {/* Drop targets stay in place while the artwork follows the finger. */}
        <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(100dvh-300px)] min-h-[300px] max-h-[520px] sm:aspect-[2.5/3.5] sm:h-auto sm:max-h-none transition-opacity duration-150 ${hintVisible || Math.hypot(drag.x, drag.y) > 10 ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`absolute left-1/2 top-4 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl border px-4 py-2 shadow-xl backdrop-blur-md transition-all duration-150 ${drag.y < -35 && Math.abs(drag.y) > Math.abs(drag.x) ? 'scale-125 border-rose-300 bg-rose-500 text-white shadow-rose-500/40' : 'border-rose-400/60 bg-rose-950/85 text-rose-200'}`}>
            <span className="text-3xl leading-none">♥</span><span className="text-[11px] font-semibold">LOVE ↑</span>
          </div>
          <div className={`absolute left-2 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border px-3 py-2 shadow-xl backdrop-blur-md transition-all duration-150 ${drag.x < -35 && Math.abs(drag.x) > Math.abs(drag.y) ? 'scale-125 border-white bg-zinc-500 text-white' : 'border-zinc-400/60 bg-zinc-950/85 text-zinc-200'}`}>
            <span className="text-3xl leading-none">×</span><span className="text-[11px] font-semibold">← PASS</span>
          </div>
          <div className={`absolute right-2 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border px-3 py-2 shadow-xl backdrop-blur-md transition-all duration-150 ${drag.x > 35 && Math.abs(drag.x) > Math.abs(drag.y) ? 'scale-125 border-emerald-300 bg-emerald-500 text-black shadow-emerald-500/40' : 'border-emerald-400/60 bg-emerald-950/85 text-emerald-200'}`}>
            <span className="text-3xl leading-none">✓</span><span className="text-[11px] font-semibold">LIKE →</span>
          </div>
          <div className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl border px-4 py-2 shadow-xl backdrop-blur-md transition-all duration-150 ${drag.y > 35 && Math.abs(drag.y) > Math.abs(drag.x) ? 'scale-125 border-white bg-black text-white shadow-white/20' : 'border-white/45 bg-black/90 text-white/85'}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8"><path d="M12 7.5c-2.5-2-5.5-2.5-9-2v13c3.5-.5 6.5 0 9 2 2.5-2 5.5-2.5 9-2v-13c-3.5-.5-6.5 0-9 2Z" /><path d="M12 7.5v13" /></svg><span className="text-[11px] font-semibold">↓ BINDER</span>
          </div>
        </div>

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

          <div className="mt-1 grid grid-cols-4 items-stretch gap-1.5 sm:mt-3 sm:gap-2">
            <div className="col-span-3 min-w-0 [&>div>div]:grid-cols-3 [&>div>div]:gap-1.5 [&_button]:min-h-[44px] [&_button]:min-w-0 [&_button]:px-1 sm:[&>div>div]:gap-2 sm:[&_button]:px-3">
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
            <div className="min-w-0">
              <AddToBinder key={card.id} cardId={card.id} userId={userId} compact openRequest={binderOpenRequest.cardId === card.id ? binderOpenRequest.count : 0} />
            </div>
          </div>
        </div>
      </article>

      <p className="mt-2 hidden text-center text-xs text-zinc-700 sm:block">
        Tap the card to see more
      </p>
    </div>
  )
}