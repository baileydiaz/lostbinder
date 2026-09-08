'use client'

import Link from 'next/link'
import { useState } from 'react'

export type RowCard = {
  id: string
  name: string
  rarity: string | null
  image_url: string | null
  set_id: string
}

type Props = {
  title: string
  cards: RowCard[]
  userId?: string | null
}

export default function CardRow({
  title,
  cards,
}: Props) {
  const [badCardIds, setBadCardIds] =
    useState<Set<string>>(new Set())

  const visibleCards = cards.filter(
    (card) =>
      Boolean(card.image_url) &&
      !badCardIds.has(card.id)
  )

  if (visibleCards.length === 0) {
    return null
  }

  function hideBrokenCard(cardId: string) {
    setBadCardIds((current) => {
      const next = new Set(current)
      next.add(cardId)

      return next
    })
  }

  return (
    <section className="py-4">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleCards.map((card) => (
          <Link
            key={card.id}
            href={`/cards/${card.id}`}
            className="group w-[170px] flex-none sm:w-[185px] md:w-[200px]"
          >
            <div className="overflow-hidden rounded-xl">
              <img
                src={card.image_url!}
                alt={card.name}
                onError={() =>
                  hideBrokenCard(card.id)
                }
                className="aspect-[2.5/3.5] w-full object-contain transition duration-200 ease-out group-hover:scale-[1.035]"
              />
            </div>

            <h3 className="mt-3 truncate text-sm font-semibold text-zinc-200 transition group-hover:text-white">
              {card.name}
            </h3>

            <p className="mt-1 truncate text-xs text-zinc-600">
              {card.rarity &&
              card.rarity !== 'None'
                ? card.rarity
                : 'Pokémon card'}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}