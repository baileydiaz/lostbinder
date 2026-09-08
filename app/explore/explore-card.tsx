'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import ReactionButtons, {
  type Reaction,
} from '@/app/components/reaction-buttons'

import {
  createClient,
} from '@/lib/supabase/client'

type Card = {
  id: string
  local_id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
  set_id: string
  category: string | null
  set_name: string
}

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

type Props = {
  cards: Card[]
  userId: string | null

  initialReactions: Record<
    string,
    'like' | 'love'
  >

  initialDismissedCardIds: string[]

  initialOffset: number
}

const BATCH_SIZE = 50

const PREFETCH_THRESHOLD = 10

export default function ExploreCard({
  cards: initialCards,
  userId,
  initialReactions,
  initialDismissedCardIds,
  initialOffset,
}: Props) {
  const [cards, setCards] =
    useState<Card[]>(
      initialCards
    )

  const [
    reactions,
    setReactions,
  ] = useState<
    Record<string, Reaction>
  >(initialReactions)

  const [
    dismissedCardIds,
    setDismissedCardIds,
  ] = useState<Set<string>>(
    () =>
      new Set(
        initialDismissedCardIds
      )
  )

  const [
    badCardIds,
    setBadCardIds,
  ] = useState<Set<string>>(
    () => new Set()
  )

  const [
    offset,
    setOffset,
  ] = useState(initialOffset)

  const offsetRef =
    useRef(initialOffset)

  const loadingRef =
    useRef(false)

  const hasMoreRef =
    useRef(true)

  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false)

  const [
    hasMore,
    setHasMore,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  /*
   * Only cards the user has never
   * interacted with are eligible.
   */
  const visibleCards =
    useMemo(
      () =>
        cards.filter(
          (card) =>
            Boolean(
              card.image_url
            ) &&
            !badCardIds.has(
              card.id
            ) &&
            !dismissedCardIds.has(
              card.id
            ) &&
            !reactions[
              card.id
            ]
        ),
      [
        cards,
        badCardIds,
        dismissedCardIds,
        reactions,
      ]
    )

  /*
   * Discover always displays the
   * first eligible card.
   *
   * There is intentionally no
   * currentIndex anymore.
   */
  const card =
    visibleCards[0]

  const loadMoreCards =
    useCallback(
      async () => {
        if (
          loadingRef.current ||
          !hasMoreRef.current
        ) {
          return
        }

        loadingRef.current =
          true

        setLoadingMore(true)
        setError('')

        const currentOffset =
          offsetRef.current

        const supabase =
          createClient()

        const {
          data,
          error:
            cardError,
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
          .eq(
            'category',
            'Pokemon'
          )
          .not(
            'image_url',
            'is',
            null
          )
          .order(
            'id',
            {
              ascending: true,
            }
          )
          .range(
            currentOffset,
            currentOffset +
              BATCH_SIZE -
              1
          )

        if (cardError) {
          setError(
            cardError.message
          )

          loadingRef.current =
            false

          setLoadingMore(false)

          return
        }

        const newCards =
          (data ??
            []) as CardRecord[]

        if (
          newCards.length === 0
        ) {
          hasMoreRef.current =
            false

          setHasMore(false)

          loadingRef.current =
            false

          setLoadingMore(false)

          return
        }

        /*
         * Advance the database cursor
         * immediately so another fetch
         * cannot request this same
         * batch.
         */
        const nextOffset =
          currentOffset +
          newCards.length

        offsetRef.current =
          nextOffset

        setOffset(
          nextOffset
        )

        if (
          newCards.length <
          BATCH_SIZE
        ) {
          hasMoreRef.current =
            false

          setHasMore(false)
        }

        const setIds =
          Array.from(
            new Set(
              newCards.map(
                (
                  newCard
                ) =>
                  newCard.set_id
              )
            )
          )

        let sets:
          SetRow[] = []

        if (
          setIds.length > 0
        ) {
          const {
            data:
              setData,
            error:
              setError,
          } =
            await supabase
              .from(
                'sets'
              )
              .select(`
                id,
                name
              `)
              .in(
                'id',
                setIds
              )

          if (
            setError
          ) {
            console.error(
              'Could not load sets:',
              setError.message
            )
          }

          sets =
            (setData ??
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

        const hydratedCards:
          Card[] =
          newCards.map(
            (
              newCard
            ) => ({
              ...newCard,

              set_name:
                setNameById.get(
                  newCard.set_id
                ) ??
                newCard.set_id,
            })
          )

        setCards(
          (current) => {
            const existingIds =
              new Set(
                current.map(
                  (
                    currentCard
                  ) =>
                    currentCard.id
                )
              )

            const uniqueNewCards =
              hydratedCards.filter(
                (
                  newCard
                ) =>
                  !existingIds.has(
                    newCard.id
                  )
              )

            return [
              ...current,
              ...uniqueNewCards,
            ]
          }
        )

        loadingRef.current =
          false

        setLoadingMore(false)
      },
      []
    )

  /*
   * Keep the queue full.
   *
   * If we have fewer than 10 usable
   * cards remaining, quietly fetch
   * another batch.
   *
   * If a batch contains nothing usable,
   * visibleCards remains low, causing
   * this effect to continue searching
   * through the DB.
   */
  useEffect(() => {
    if (
      visibleCards.length <=
        PREFETCH_THRESHOLD &&
      hasMore &&
      !loadingMore
    ) {
      void loadMoreCards()
    }
  }, [
    visibleCards.length,
    hasMore,
    loadingMore,
    loadMoreCards,
  ])

  async function dismissCard() {
    if (!card) {
      return
    }

    const cardId =
      card.id

    /*
     * Immediately remove the current
     * card from the visible queue.
     *
     * The next eligible card becomes
     * visibleCards[0].
     */
    setDismissedCardIds(
      (current) => {
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

    /*
     * Logged-out visitors can pass
     * cards for this session, but the
     * choice cannot be persisted.
     */
    if (!userId) {
      return
    }

    const supabase =
      createClient()

    const {
      error:
        dismissalError,
    } = await supabase
      .from(
        'card_dismissals'
      )
      .upsert(
        {
          user_id:
            userId,

          card_id:
            cardId,
        },
        {
          onConflict:
            'user_id,card_id',
        }
      )

    if (
      dismissalError
    ) {
      console.error(
        'Could not save dismissal:',
        dismissalError.message
      )

      /*
       * Put the card back if the
       * database write failed.
       */
      setDismissedCardIds(
        (current) => {
          const next =
            new Set(
              current
            )

          next.delete(
            cardId
          )

          return next
        }
      )

      setError(
        'Could not save your choice.'
      )
    }
  }

  function removeBrokenCard(
    cardId: string
  ) {
    setBadCardIds(
      (current) => {
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

  /*
   * There is temporarily no eligible
   * card, but there are still database
   * batches available.
   *
   * Keep searching invisibly.
   */
  if (
    !card &&
    hasMore
  ) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-white" />

        <p className="mt-4 text-sm text-zinc-500">
          Finding your next Pokémon...
        </p>

        {error ? (
          <p className="mt-4 text-xs text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  /*
   * No eligible cards and we've
   * actually reached the end of the
   * Pokémon database.
   */
  if (!card) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-semibold">
          You&apos;re caught up.
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          You&apos;ve gone through
          every Pokémon currently
          available in LostBinder.
        </p>
      </div>
    )
  }

  const currentReaction =
    reactions[
      card.id
    ] ?? null

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[360px]">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] text-zinc-700">
            Discover
          </span>

          {loadingMore ? (
            <span className="text-[11px] text-zinc-700">
              Loading more...
            </span>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950 shadow-2xl">
          <Link
            href={`/cards/${card.id}`}
            className="flex aspect-[2.5/3.5] w-full items-center justify-center overflow-hidden bg-zinc-950"
          >
            <img
              key={
                card.id
              }
              src={
                card.image_url!
              }
              alt={
                card.name
              }
              onError={() =>
                removeBrokenCard(
                  card.id
                )
              }
              className="h-full w-full object-contain"
            />
          </Link>

          <div className="p-4">
            <p className="truncate text-xs text-zinc-500">
              {card.set_name}
            </p>

            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight">
              {card.name}
            </h2>

            <p className="mt-1 truncate text-xs text-zinc-500">
              {card.rarity &&
              card.rarity !==
                'None'
                ? card.rarity
                : 'Pokémon card'}

              {card.illustrator
                ? ` · ${card.illustrator}`
                : ''}
            </p>

            <div className="mt-4">
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
                  currentReaction
                }
                onSaved={(
                  nextReaction
                ) => {
                  if (
                    nextReaction
                  ) {
                    /*
                     * Remove this card from
                     * the queue. The next
                     * eligible card becomes
                     * visibleCards[0].
                     */
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
                }}
              />
            </div>

            <button
              type="button"
              onClick={() =>
                void dismissCard()
              }
              className="mt-3 w-full rounded-full border border-white/10 py-2.5 text-sm text-zinc-500 transition hover:border-white/25 hover:text-white"
            >
              ✕ Don&apos;t Like
            </button>

            {error ? (
              <p className="mt-3 text-center text-xs text-red-400">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}