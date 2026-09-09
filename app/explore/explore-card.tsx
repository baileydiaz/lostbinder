'use client'

import Link
  from 'next/link'

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

  userId:
    string | null

  initialReactions:
    Record<
      string,
      | 'pass'
      | 'like'
      | 'love'
    >
}

const BATCH_SIZE =
  50

const PREFETCH_THRESHOLD =
  10

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
  cards:
    initialCards,
  userId,
  initialReactions,
}: Props) {
  const [
    cards,
    setCards,
  ] =
    useState<Card[]>(
      () =>
        shuffleCards(
          initialCards
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
      () =>
        new Set()
    )

  const [
    loadedImageCardId,
    setLoadedImageCardId,
  ] =
    useState<
      string | null
    >(null)

  const [
    loadingMore,
    setLoadingMore,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const loadingRef =
    useRef(false)

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
            !reactions[
              card.id
            ]
        ),
      [
        cards,
        badCardIds,
        reactions,
      ]
    )

  const card =
    visibleCards[0]

  const nextCard =
    visibleCards[1]

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
          loadingRef.current
        ) {
          return
        }

        loadingRef.current =
          true

        setLoadingMore(
          true
        )

        setError('')

        const supabase =
          createClient()

        const {
          data,
          error:
            cardError,
        } =
          await supabase.rpc(
            'get_random_pokemon_cards',
            {
              limit_count:
                BATCH_SIZE,
            }
          )

        if (
          cardError
        ) {
          console.error(
            'Could not load random cards:',
            cardError.message
          )

          setError(
            cardError.message
          )

          loadingRef.current =
            false

          setLoadingMore(
            false
          )

          return
        }

        const newCards =
          (data ??
            []) as CardRecord[]

        if (
          newCards.length ===
          0
        ) {
          loadingRef.current =
            false

          setLoadingMore(
            false
          )

          return
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

        setLoadingMore(
          false
        )
      },
      []
    )

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
   * Reset current image state
   * whenever the active card changes.
   */
  useEffect(() => {
    if (!card) {
      return
    }

    setLoadedImageCardId(
      null
    )
  }, [
    card?.id,
  ])

  /*
   * Preload the next card image.
   * This makes decisions feel much
   * faster because the next artwork
   * is usually already cached.
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

  if (!card) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-center">
        <div>
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-800 border-t-white" />

          <p className="mt-4 text-sm text-zinc-500">
            Finding your next
            Pokémon...
          </p>

          {error ? (
            <p className="mt-4 text-xs text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  const currentReaction =
    reactions[
      card.id
    ] ?? null

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[360px] sm:max-w-[380px]">

        <div className="mb-2 flex items-center justify-between">
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

          <Link
            href={
              `/cards/${card.id}`
            }
            className={`flex h-[48dvh] min-h-[330px] max-h-[510px] w-full items-center justify-center overflow-hidden bg-zinc-950 sm:h-auto sm:min-h-0 sm:max-h-none sm:aspect-[2.5/3.5] ${
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

          {!imageReady ? (
            <div className="absolute inset-0 flex min-h-[330px] items-center justify-center bg-zinc-950">
              <div className="text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-zinc-800 border-t-white" />

                <p className="mt-4 text-xs text-zinc-600">
                  Finding your next
                  Pokémon...
                </p>
              </div>
            </div>
          ) : null}

          {imageReady ? (
            <div className="p-3 sm:p-4">

              <p className="truncate text-[11px] text-zinc-500 sm:text-xs">
                {
                  card.set_name
                }
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

              <div className="mt-3">
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
                       * This update happens
                       * instantly now.
                       */
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
                  onError={(
                    message
                  ) => {
                    setError(
                      message
                    )
                  }}
                />
              </div>

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