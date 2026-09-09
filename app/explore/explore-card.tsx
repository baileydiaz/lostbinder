'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'

import {
  createClient,
} from '@/lib/supabase/client'

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
}

type Props = {
  cards: ExploreCardItem[]
  userId: string | null
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
      loadingMore
    ) {
      return
    }

    void loadMoreCards()
  }, [
    visibleCards.length,
    loadingMore,
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
      const supabase =
        createClient()

      const {
        data,
        error:
          randomError,
      } =
        await supabase
          .rpc(
            'get_random_pokemon_cards',
            {
              limit_count:
                RANDOM_BATCH_SIZE,
            }
          )

      if (
        randomError
      ) {
        throw new Error(
          randomError.message
        )
      }

      const randomCards =
        (
          data ??
          []
        ) as ExploreCardItem[]

      if (
        randomCards.length ===
        0
      ) {
        return
      }

      const uniqueSetIds =
        Array.from(
          new Set(
            randomCards
              .map(
                (item) =>
                  item.set_id
              )
              .filter(
                Boolean
              )
          )
        )

      let setNameMap:
        Record<
          string,
          string
        > = {}

      if (
        uniqueSetIds.length >
        0
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
            .select(
              'id, name'
            )
            .in(
              'id',
              uniqueSetIds
            )

        if (
          setError
        ) {
          console.error(
            'Could not load set names:',
            setError
          )
        } else {
          setNameMap =
            Object.fromEntries(
              (
                setData ??
                []
              ).map(
                (
                  set
                ) => [
                  set.id,
                  set.name,
                ]
              )
            )
        }
      }

      const hydrated =
        randomCards.map(
          (
            item
          ) => ({
            ...item,

            set_name:
              setNameMap[
                item.set_id
              ] ??
              item.set_name ??
              null,
          })
        )

      const diversified =
        diversifyCards(
          hydrated
        )

      setAllCards(
        (
          current
        ) => {
          const seen =
            new Set(
              current.map(
                (
                  item
                ) =>
                  item.id
              )
            )

          const newCards =
            diversified.filter(
              (
                item
              ) =>
                !seen.has(
                  item.id
                )
            )

          return [
            ...current,
            ...newCards,
          ]
        }
      )
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
                  void loadMoreCards()
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
          <div className="flex h-[48dvh] min-h-[330px] max-h-[510px] items-center justify-center overflow-hidden bg-zinc-950 sm:aspect-[2.5/3.5] sm:h-auto sm:max-h-none">
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

        <div className="p-3 sm:p-4">
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

          {card.illustrator ? (
            <p className="mt-1.5 text-xs text-zinc-600">
              Illustrated by{' '}
              <span className="text-zinc-400">
                {
                  card.illustrator
                }
              </span>
            </p>
          ) : null}

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
                reactions[
                  card.id
                ] ??
                null
              }
              onSaved={(
                nextReaction
              ) => {
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

                setError(
                  message
                )
              }}
            />
          </div>
        </div>
      </article>

      <p className="mt-2 text-center text-[10px] text-zinc-700 sm:text-xs">
        Tap the card to see more
      </p>
    </div>
  )
}