'use client'

import Link from 'next/link'
import ReactionButtons, {
  Reaction,
} from './reaction-buttons'

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
  userId: string | null
  reactions?: Record<string, Reaction>
}

export default function CardRow({
  title,
  cards,
  userId,
  reactions = {},
}: Props) {
  if (cards.length === 0) {
    return null
  }

  return (
    <section className="py-6">
      <h2 className="mb-4 text-xl font-semibold text-white">
        {title}
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="w-[160px] flex-none"
          >
            <Link
              href={`/sets/${card.set_id}`}
              className="block"
            >
              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt={card.name}
                  className="aspect-[2.5/3.5] w-full rounded-xl object-cover"
                />
              ) : (
                <div className="aspect-[2.5/3.5] w-full rounded-xl bg-zinc-900" />
              )}

              <h3 className="mt-2 truncate text-sm font-medium text-white">
                {card.name}
              </h3>

              <p className="truncate text-xs text-zinc-500">
                {card.rarity ?? 'Unknown rarity'}
              </p>
            </Link>

            <div className="mt-2">
              <ReactionButtons
                cardId={card.id}
                userId={userId}
                initialReaction={
                  reactions[card.id] ?? null
                }
                compact
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}