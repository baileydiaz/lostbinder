'use client'

import Link from 'next/link'
import {
  useEffect,
  useRef,
  useState,
} from 'react'

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

  const [canScrollLeft, setCanScrollLeft] =
    useState(false)

  const [canScrollRight, setCanScrollRight] =
    useState(false)

  const scrollRef =
    useRef<HTMLDivElement | null>(null)

  const visibleCards = cards.filter(
    (card) =>
      Boolean(card.image_url) &&
      !badCardIds.has(card.id)
  )

  function hideBrokenCard(cardId: string) {
    setBadCardIds((current) => {
      const next = new Set(current)
      next.add(cardId)
      return next
    })
  }

  function updateScrollState() {
    const element = scrollRef.current

    if (!element) {
      return
    }

    const maxScroll =
      element.scrollWidth -
      element.clientWidth

    setCanScrollLeft(
      element.scrollLeft > 8
    )

    setCanScrollRight(
      element.scrollLeft <
        maxScroll - 8
    )
  }

  function scrollRow(
    direction: 'left' | 'right'
  ) {
    const element = scrollRef.current

    if (!element) {
      return
    }

    const amount =
      Math.max(
        element.clientWidth * 0.8,
        400
      )

    element.scrollBy({
      left:
        direction === 'left'
          ? -amount
          : amount,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    updateScrollState()

    const element = scrollRef.current

    if (!element) {
      return
    }

    const handleScroll = () => {
      updateScrollState()
    }

    const handleResize = () => {
      updateScrollState()
    }

    element.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      }
    )

    window.addEventListener(
      'resize',
      handleResize
    )

    return () => {
      element.removeEventListener(
        'scroll',
        handleScroll
      )

      window.removeEventListener(
        'resize',
        handleResize
      )
    }
  }, [visibleCards.length])

  if (visibleCards.length === 0) {
    return null
  }

  return (
    <section className="relative py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() =>
              scrollRow('left')
            }
            disabled={!canScrollLeft}
            aria-label={`Scroll ${title} left`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-lg text-zinc-300 transition hover:border-white/25 hover:bg-zinc-900 hover:text-white disabled:cursor-default disabled:opacity-20"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={() =>
              scrollRow('right')
            }
            disabled={!canScrollRight}
            aria-label={`Scroll ${title} right`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-lg text-zinc-300 transition hover:border-white/25 hover:bg-zinc-900 hover:text-white disabled:cursor-default disabled:opacity-20"
          >
            ›
          </button>
        </div>
      </div>

      <div className="relative">
        {canScrollLeft ? (
          <div className="pointer-events-none absolute left-0 top-0 z-10 hidden h-full w-16 bg-gradient-to-r from-black to-transparent md:block" />
        ) : null}

        {canScrollRight ? (
          <div className="pointer-events-none absolute right-0 top-0 z-10 hidden h-full w-16 bg-gradient-to-l from-black to-transparent md:block" />
        ) : null}

        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visibleCards.map(
            (card) => (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                className="group w-[160px] flex-none snap-start sm:w-[180px] md:w-[195px] lg:w-[205px]"
              >
                <div className="overflow-hidden rounded-xl transition duration-200 ease-out group-hover:-translate-y-1">
                  <img
                    src={
                      card.image_url!
                    }
                    alt={card.name}
                    onError={() =>
                      hideBrokenCard(
                        card.id
                      )
                    }
                    className="aspect-[2.5/3.5] w-full object-contain transition duration-200 ease-out group-hover:scale-[1.045]"
                  />
                </div>

                <h3 className="mt-3 truncate text-sm font-semibold text-zinc-200 transition group-hover:text-white">
                  {card.name}
                </h3>

                <p className="mt-1 truncate text-xs text-zinc-600">
                  {card.rarity &&
                  card.rarity !==
                    'None'
                    ? card.rarity
                    : 'Pokémon card'}
                </p>
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  )
}