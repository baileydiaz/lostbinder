'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import ReactionButtons, {
  type Reaction,
} from '@/app/components/reaction-buttons'

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

type Props = {
  cards: Card[]
  userId: string | null
  initialReactions: Record<
    string,
    'like' | 'love'
  >
}

export default function ExploreCard({
  cards,
  userId,
  initialReactions,
}: Props) {
  const [
    index,
    setIndex,
  ] = useState(0)

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
    imageLoaded,
    setImageLoaded,
  ] =
    useState(false)

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
            )
        ),
      [
        cards,
        badCardIds,
      ]
    )

  const card =
    visibleCards[index]

  useEffect(() => {
    setImageLoaded(false)
  }, [card?.id])

  useEffect(() => {
    if (
      index >=
      visibleCards.length &&
      visibleCards.length > 0
    ) {
      setIndex(
        visibleCards.length -
          1
      )
    }
  }, [
    index,
    visibleCards.length,
  ])

  function nextCard() {
    setIndex(
      (current) =>
        current + 1
    )
  }

  function previousCard() {
    setIndex(
      (current) =>
        Math.max(
          0,
          current - 1
        )
    )
  }

  function killBrokenCard(
    cardId: string
  ) {
    setBadCardIds(
      (current) => {
        const next =
          new Set(
            current
          )

        next.add(cardId)

        return next
      }
    )
  }

  const progress =
    visibleCards.length
      ? Math.min(
          100,
          ((index + 1) /
            visibleCards.length) *
            100
        )
      : 0

  if (
    visibleCards.length ===
    0
  ) {
    return (
      <p className="text-sm text-zinc-500">
        No cards available.
      </p>
    )
  }

  if (!card) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold">
          You&apos;re caught up.
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          Refresh for another
          stack.
        </p>
      </div>
    )
  }

  const currentReaction =
    reactions[card.id] ??
    null

  return (
    <div
      className="
        w-full
        max-w-[380px]
      "
    >
      <div
        className="
          mb-3
          flex
          items-center
          gap-3
        "
      >
        <div
          className="
            h-[3px]
            flex-1
            overflow-hidden
            rounded-full
            bg-zinc-900
          "
        >
          <div
            className="
              h-full
              bg-white
              transition-all
              duration-300
            "
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>

        <span
          className="
            text-[11px]
            text-zinc-600
          "
        >
          {index + 1}
          /
          {
            visibleCards.length
          }
        </span>
      </div>

      <div
        className="
          overflow-hidden
          rounded-[26px]
          border
          border-white/10
          bg-zinc-950
          shadow-2xl
        "
      >
        <Link
          href={
            `/cards/${card.id}`
          }
          className="
            relative
            flex
            aspect-[2.5/3.5]
            w-full
            items-center
            justify-center
            overflow-hidden
            bg-zinc-950
          "
        >
          {!imageLoaded ? (
            <div
              className="
                absolute
                inset-0
                animate-pulse
                bg-zinc-900
              "
            />
          ) : null}

          <img
            src={
              card.image_url!
            }
            alt={card.name}
            onLoad={() =>
              setImageLoaded(
                true
              )
            }
            onError={() =>
              killBrokenCard(
                card.id
              )
            }
            className={`
              h-full
              w-full
              object-contain
              transition-opacity
              duration-200
              ${
                imageLoaded
                  ? 'opacity-100'
                  : 'opacity-0'
              }
            `}
          />
        </Link>

        <div className="p-4">
          <p
            className="
              truncate
              text-xs
              text-zinc-500
            "
          >
            {card.set_name}
          </p>

          <div
            className="
              mt-1
              flex
              items-start
              justify-between
              gap-3
            "
          >
            <div className="min-w-0">
              <h2
                className="
                  truncate
                  text-xl
                  font-semibold
                "
              >
                {card.name}
              </h2>

              <p
                className="
                  mt-1
                  truncate
                  text-xs
                  text-zinc-500
                "
              >
                {card.rarity ||
                  'Pokémon card'}

                {card.illustrator
                  ? ` · ${card.illustrator}`
                  : ''}
              </p>
            </div>
          </div>

          <div
            className="
              mt-4
              flex
              justify-center
            "
          >
            <ReactionButtons
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
                setReactions(
                  (
                    current
                  ) => ({
                    ...current,
                    [card.id]:
                      nextReaction,
                  })
                )

                if (
                  nextReaction
                ) {
                  setTimeout(
                    nextCard,
                    100
                  )
                }
              }}
            />
          </div>

          <button
            type="button"
            onClick={
              nextCard
            }
            className="
              mt-3
              w-full
              rounded-full
              border
              border-white/10
              py-2.5
              text-sm
              text-zinc-500
              transition
              hover:border-white/25
              hover:text-white
            "
          >
            ✕ Don&apos;t Like
          </button>

          {index > 0 ? (
            <button
              type="button"
              onClick={
                previousCard
              }
              className="
                mt-3
                w-full
                text-center
                text-xs
                text-zinc-700
                hover:text-zinc-400
              "
            >
              ← Previous
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}