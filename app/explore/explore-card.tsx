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

  initialDismissedCardIds:
    string[]
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
    Record<
      string,
      Reaction
    >
  >(
    initialReactions
  )

  const [
    dismissedCardIds,
    setDismissedCardIds,
  ] = useState<
    Set<string>
  >(
    () =>
      new Set(
        initialDismissedCardIds
      )
  )

  const [
    badCardIds,
    setBadCardIds,
  ] = useState<
    Set<string>
  >(
    () => new Set()
  )

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
    error,
    setError,
  ] = useState('')

  const loadingRef =
    useRef(false)

  /*
   * Anything the user already
   * reacted to or dismissed is
   * removed from the queue.
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

  const card =
    visibleCards[0]

  const imageReady =
    Boolean(
      card &&
        loadedImageCardId ===
          card.id
    )

  /*
   * Get another RANDOM batch.
   *
   * There is intentionally no
   * offset anymore.
   */
  const loadMoreCards =
    useCallback(
      async () => {
        if (
          loadingRef.current
        ) {
          return
        }

        loadingRef.current =
          true

        setLoadingMore(true)
        setError('')

        const supabase =
          createClient()

        const {
          data,
          error: cardError,
        } = await supabase.rpc(
          'get_random_pokemon_cards',
          {
            limit_count:
              BATCH_SIZE,
          }
        )

        if (cardError) {
          console.error(
            'Could not load random cards:',
            cardError.message
          )

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
          loadingRef.current =
            false

          setLoadingMore(false)

          return
        }

        /*
         * Hydrate the cards with their
         * actual set names.
         */
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
         * The RPC is random already,
         * but shuffling here prevents
         * any accidental ordering.
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
   * Refill the discovery queue before
   * the user reaches the end.
   */
  useEffect(() => {
    if (
      visibleCards.length <=
        PREFETCH_THRESHOLD &&
      !loadingMore
    ) {
      void loadMoreCards()
    }
  }, [
    visibleCards.length,
    loadingMore,
    loadMoreCards,
  ])

  /*
   * A new card isn't considered ready
   * until that exact image loads.
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
   * Random discovery is effectively
   * endless, so if our local queue
   * empties we wait for another batch.
   */
  if (!card) {
    return (
      <div className="py-12 text-center sm:py-20">
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

  const currentReaction =
    reactions[
      card.id
    ] ?? null

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[340px] sm:max-w-[380px]">

        <div className="mb-2 flex items-center justify-between sm:mb-3">
          <span className="text-[10px] text-zinc-700 sm:text-[11px]">
            Discover
          </span>

          {loadingMore ? (
            <span className="text-[10px] text-zinc-700 sm:text-[11px]">
              Loading more...
            </span>
          ) : null}
        </div>

        <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-zinc-950 shadow-2xl sm:rounded-[28px]">

          {/*
           * On phones the artwork is
           * capped relative to viewport
           * height so controls remain
           * reachable.
           */}
          <Link
            href={
              `/cards/${card.id}`
            }
            className={`flex max-h-[56vh] w-full items-center justify-center overflow-hidden bg-zinc-950 sm:max-h-none sm:aspect-[2.5/3.5] ${
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
              className={`max-h-[56vh] w-full object-contain transition-opacity duration-150 sm:h-full sm:max-h-none ${
                imageReady
                  ? 'opacity-100'
                  : 'opacity-0'
              }`}
            />
          </Link>

          {!imageReady ? (
            <div className="absolute inset-0 flex min-h-[360px] items-center justify-center bg-zinc-950">
              <div className="text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-800 border-t-white" />

                <p className="mt-4 text-xs text-zinc-600">
                  Finding your next Pokémon...
                </p>
              </div>
            </div>
          ) : null}

          {imageReady ? (
            <div className="p-3 sm:p-4">

              <p className="truncate text-[11px] text-zinc-500 sm:text-xs">
                {card.set_name}
              </p>

              <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight sm:mt-1 sm:text-xl">
                {card.name}
              </h2>

              <p className="mt-0.5 truncate text-[11px] text-zinc-500 sm:mt-1 sm:text-xs">
                {card.rarity &&
                card.rarity !==
                  'None'
                  ? card.rarity
                  : 'Pokémon card'}

                {card.illustrator
                  ? ` · ${card.illustrator}`
                  : ''}
              </p>

              <div className="mt-3 sm:mt-4">
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
                className="mt-2 w-full rounded-full border border-white/10 py-2 text-xs text-zinc-500 transition hover:border-white/25 hover:text-white sm:mt-3 sm:py-2.5 sm:text-sm"
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