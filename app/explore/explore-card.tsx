'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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
  const [index, setIndex] = useState(0)

  const [reactions, setReactions] =
    useState<Record<string, Reaction>>(
      initialReactions
    )

  const [badCardIds, setBadCardIds] =
    useState<Set<string>>(
      new Set()
    )

  const visibleCards = useMemo(
    () =>
      cards.filter(
        (card) =>
          card.image_url &&
          !badCardIds.has(card.id)
      ),
    [cards, badCardIds]
  )

  const card =
    visibleCards[index]

  const progress = useMemo(() => {
    if (visibleCards.length === 0) {
      return 0
    }

    return Math.min(
      100,
      ((index + 1) /
        visibleCards.length) *
        100
    )
  }, [
    visibleCards.length,
    index,
  ])

  useEffect(() => {
    if (
      index >=
      visibleCards.length
    ) {
      setIndex(
        Math.max(
          0,
          visibleCards.length - 1
        )
      )
    }
  }, [
    index,
    visibleCards.length,
  ])

  function nextCard() {
    setIndex((current) =>
      Math.min(
        current + 1,
        visibleCards.length
      )
    )
  }

  function previousCard() {
    setIndex((current) =>
      Math.max(
        0,
        current - 1
      )
    )
  }

  function removeBrokenCard(
    cardId: string
  ) {
    setBadCardIds(
      (current) => {
        const next =
          new Set(current)

        next.add(cardId)

        return next
      }
    )
  }

  if (
    visibleCards.length === 0
  ) {
    return (
      <div
        className="
          flex
          min-h-[65vh]
          w-full
          items-center
          justify-center
        "
      >
        <p className="text-sm text-zinc-500">
          No cards available.
        </p>
      </div>
    )
  }

  if (!card) {
    return (
      <div
        className="
          flex
          min-h-[65vh]
          w-full
          items-center
          justify-center
        "
      >
        <div className="text-center">
          <h2 className="text-2xl font-semibold">
            You&apos;re all caught up.
          </h2>

          <p className="mt-2 text-zinc-500">
            Refresh Explore for another batch.
          </p>
        </div>
      </div>
    )
  }

  const currentReaction =
    reactions[card.id] ?? null

  return (
    <div
      className="
        flex
        w-full
        justify-center
      "
    >
      <div
        className="
          w-full
          max-w-[430px]
        "
      >
        {/* Progress */}
        <div className="mb-4">
          <div
            className="
              h-1
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
                width: `${progress}%`,
              }}
            />
          </div>

          <p
            className="
              mt-2
              text-right
              text-xs
              text-zinc-600
            "
          >
            {index + 1} /{' '}
            {visibleCards.length}
          </p>
        </div>

        <article
          className="
            w-full
            overflow-hidden
            rounded-[28px]
            border
            border-white/10
            bg-zinc-950
            shadow-2xl
          "
        >
          <Link
            href={`/sets/${card.set_id}`}
            className="
              flex
              min-h-[430px]
              w-full
              items-center
              justify-center
              bg-black
              p-6
            "
          >
            <img
              src={card.image_url!}
              alt={card.name}
              onError={() =>
                removeBrokenCard(
                  card.id
                )
              }
              className="
                mx-auto
                block
                max-h-[58vh]
                max-w-full
                object-contain
              "
            />
          </Link>

          <div
            className="
              border-t
              border-white/10
              p-5
              text-center
            "
          >
            <p
              className="
                text-xs
                font-medium
                uppercase
                tracking-[0.18em]
                text-zinc-500
              "
            >
              {card.set_name}
            </p>

            <h2
              className="
                mt-2
                text-2xl
                font-semibold
              "
            >
              {card.name}
            </h2>

            <p
              className="
                mt-2
                text-sm
                text-zinc-400
              "
            >
              {card.illustrator ||
                'Unknown artist'}
            </p>

            <p
              className="
                mt-1
                text-sm
                text-zinc-500
              "
            >
              {card.rarity ||
                'Unknown rarity'}
            </p>

            <div
              className="
                mt-6
                flex
                justify-center
              "
            >
              <ReactionButtons
                cardId={card.id}
                userId={userId}
                initialReaction={
                  currentReaction
                }
                onSaved={(
                  nextReaction
                ) => {
                  setReactions(
                    (current) => ({
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
                      120
                    )
                  }
                }}
              />
            </div>

            <button
              type="button"
              onClick={nextCard}
              className="
                mt-4
                w-full
                rounded-full
                border
                border-white/10
                px-5
                py-3
                text-sm
                font-medium
                text-zinc-400
                transition
                hover:border-white/30
                hover:bg-white/5
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
                  text-xs
                  text-zinc-600
                  transition
                  hover:text-zinc-300
                "
              >
                ← Previous card
              </button>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  )
}