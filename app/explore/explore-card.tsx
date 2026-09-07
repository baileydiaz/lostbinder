'use client'

import Link
  from 'next/link'

import {
  useMemo,
  useState,
} from 'react'

import ReactionButtons, {
  Reaction,
} from '@/app/components/reaction-buttons'

type Card = {
  id: string
  local_id: string
  name: string

  rarity:
    | string
    | null

  illustrator:
    | string
    | null

  image_url:
    | string
    | null

  set_id: string

  category:
    | string
    | null

  set_name: string
}

type Props = {
  cards: Card[]

  userId:
    | string
    | null

  initialReactions:
    Record<
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
  ] =
    useState(0)

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

  const card =
    cards[index]

  const progress =
    useMemo(
      () => {
        if (
          cards.length === 0
        ) {
          return 0
        }

        return Math.min(
          100,

          (
            (index + 1)
            / cards.length
          ) * 100
        )
      },

      [
        cards.length,
        index,
      ]
    )

  function nextCard() {
    setIndex(
      (current) =>
        Math.min(
          current + 1,
          cards.length
        )
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

  if (
    cards.length === 0
  ) {
    return (
      <div
        className="
          rounded-3xl
          border
          border-white/10
          bg-zinc-950
          p-8
          text-center
        "
      >
        <p
          className="
            text-lg
            font-medium
          "
        >
          No cards loaded.
        </p>

        <p
          className="
            mt-2
            text-sm
            text-zinc-500
          "
        >
          If this only happens
          while signed in,
          run the RLS SQL.
        </p>
      </div>
    )
  }

  if (!card) {
    return (
      <div
        className="
          rounded-3xl
          border
          border-white/10
          bg-zinc-950
          p-10
          text-center
        "
      >
        <div
          className="
            text-4xl
          "
        >
          ✨
        </div>

        <h2
          className="
            mt-4
            text-2xl
            font-semibold
          "
        >
          You made it
          through this stack.
        </h2>

        <p
          className="
            mt-2
            text-zinc-400
          "
        >
          Refresh Explore
          for another batch.
        </p>
      </div>
    )
  }

  const currentReaction =
    reactions[
      card.id
    ] ?? null

  return (
    <div>
      <div
        className="
          mb-4
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
          "
          style={{
            width:
              `${progress}%`,
          }}
        />
      </div>

      <article
        className="
          overflow-hidden
          rounded-[28px]
          border
          border-white/10
          bg-zinc-950
          shadow-2xl
        "
      >
        <Link
          href={
            `/sets/${card.set_id}`
          }
          className="
            block
            bg-zinc-950
            p-5
          "
        >
          {
            card.image_url
            ? (
              <img
                src={
                  card.image_url
                }
                alt={
                  card.name
                }
                className="
                  mx-auto
                  max-h-[62vh]
                  w-auto
                  rounded-2xl
                  object-contain
                "
              />
            )
            : (
              <div
                className="
                  aspect-[2.5/3.5]
                  rounded-2xl
                  bg-zinc-900
                "
              />
            )
          }
        </Link>

        <div
          className="
            border-t
            border-white/10
            p-5
          "
        >
          <p
            className="
              text-xs
              uppercase
              tracking-[0.18em]
              text-zinc-500
            "
          >
            {
              card.set_name
            }
          </p>

          <h2
            className="
              mt-2
              text-2xl
              font-semibold
            "
          >
            {
              card.name
            }
          </h2>

          <p
            className="
              mt-2
              text-sm
              text-zinc-400
            "
          >
            {
              card.illustrator
              ||
              'Unknown artist'
            }

            {' · '}

            {
              card.rarity
              ||
              'Unknown rarity'
            }
          </p>

          <div
            className="
              mt-6
              flex
              items-center
              justify-center
              gap-3
            "
          >
            <button
              type="button"
              onClick={
                previousCard
              }
              disabled={
                index === 0
              }
              className="
                h-14
                rounded-full
                border
                border-white/15
                px-5
                text-sm
                text-zinc-300
                transition
                hover:border-white/40
                disabled:opacity-30
              "
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={
                nextCard
              }
              className="
                h-14
                rounded-full
                border
                border-white/15
                px-5
                text-sm
                text-zinc-300
                transition
                hover:border-white/40
              "
            >
              ✕ Skip
            </button>
          </div>

          <div
            className="
              mt-3
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

              onSaved={
                (
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
                      120
                    )
                  }
                }
              }
            />
          </div>

          <div
            className="
              mt-4
              grid
              grid-cols-2
              gap-2
              text-center
              text-xs
              text-zinc-500
            "
          >
            <span>
              👍 Like =
              algorithm
            </span>

            <span>
              ♥ Love =
              collection + algorithm
            </span>
          </div>
        </div>
      </article>
    </div>
  )
}