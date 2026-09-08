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

function shuffleCards<T>(
  items: T[]
) {
  const shuffled = [
    ...items,
  ]

  for (
    let i =
      shuffled.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1)
      )

    ;[
      shuffled[i],
      shuffled[j],
    ] = [
      shuffled[j],
      shuffled[i],
    ]
  }

  return shuffled
}

export default function ExploreCard({
  cards: initialCards,
  userId,
  initialReactions,
  initialDismissedCardIds,
  initialOffset,
}: Props) {
  const [
    cards,
    setCards,
  ] = useState<Card[]>(
    () =>
      shuffleCards(
        initialCards
      )
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

  /*
   * The ID of the card whose image
   * has successfully loaded.
   *
   * Until this matches the current
   * card, we only show the loading
   * screen.
   */
  const [
    loadedImageCardId,
    setLoadedImageCardId,
  ] = useState<
    string | null
  >(null)

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

  const offsetRef =
    useRef(initialOffset)

  const loadingRef =
    useRef(false)

  const hasMoreRef =
    useRef(true)

  /*
   * Remove everything the user has
   * already handled.
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
   * Discover is a queue.
   *
   * Always work on the first
   * eligible card.
   */
  const card =
    visibleCards[0]

  const imageReady =
    Boolean(
      card &&
        loadedImageCardId ===
          card.id
    )

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
         * Move the database cursor
         * forward before doing
         * anything else.
         */
        offsetRef.current =
          currentOffset +
          newCards.length

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

        /*
         * Randomize each incoming
         * batch before adding it to
         * the Discover queue.
         */
        const shuffledCards =
          shuffleCards(
            hydratedCards
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

            const uniqueCards =
              shuffledCards.filter(
                (
                  newCard
                ) =>
                  !existingIds.has(
                    newCard.id
                  )
              )

            return [
              ...current,
              ...uniqueCards,
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
   * Keep filling the queue.
   *
   * If entire batches contain cards
   * already seen by the user, this
   * can continue searching in the
   * background.
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

  /*
   * Whenever we move to a different
   * candidate card, it is NOT ready
   * until that exact image fires
   * onLoad.
   *
   * This is what prevents broken
   * McDonald's cards from flashing.
   */
  useEffect(() => {
    if (
      !card ||
      loadedImageCardId !==
        card.id
    ) {
      setLoadedImageCardId(
        null
      )
    }
  }, [
    card,
    loadedImageCardId,
  ])

  async function dismissCard() {
    if (!card) {
      return
    }

    const cardId =
      card.id

    setLoadedImageCardId(
      null
    )

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
    /*
     * Never allow the broken image
     * to become the displayed card.
     */
    setLoadedImageCardId(
      null
    )

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
   * We ran out of eligible cards
   * but there are still more rows
   * in the database.
   */
  if (
    !card &&
    hasMore
  ) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-800 border-t-white" />

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
   * Actually reached the end.
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

        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950 shadow-2xl">
          {/*
            The image is mounted immediately
            so the browser can test it.

            But it stays invisible until
            onLoad succeeds.
          */}
          <Link
            href={`/cards/${card.id}`}
            className={`flex aspect-[2.5/3.5] w-full items-center justify-center overflow-hidden bg-zinc-950 ${
              imageReady
                ? ''
                : 'pointer-events-none'
            }`}
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
              onLoad={() => {
                setLoadedImageCardId(
                  card.id
                )
              }}
              onError={() => {
                removeBrokenCard(
                  card.id
                )
              }}
              className={`h-full w-full object-contain transition-opacity duration-150 ${
                imageReady
                  ? 'opacity-100'
                  : 'opacity-0'
              }`}
            />
          </Link>

          {/*
            Nothing from the candidate
            card is exposed until its
            image is confirmed good.
          */}
          {!imageReady ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <div className="text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-800 border-t-white" />

                <p className="mt-4 text-xs text-zinc-600">
                  Finding your next Pokémon...
                </p>
              </div>
            </div>
          ) : null}

          {imageReady ? (
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
                      setLoadedImageCardId(
                        null
                      )

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
          ) : null}
        </div>
      </div>
    </div>
  )
}