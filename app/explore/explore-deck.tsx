'use client'

import { useState } from 'react'
import Link from 'next/link'
import FavoriteButton from '../sets/[id]/favorite-button'

type Card = {
  id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string
  set_id: string
  set_name: string
}

type Props = {
  cards: Card[]
  favoriteIds: string[]
  loggedIn: boolean
}

export default function ExploreDeck({
  cards,
  favoriteIds,
  loggedIn,
}: Props) {
  const [index, setIndex] = useState(0)

  const [brokenCards, setBrokenCards] =
    useState<Set<string>>(new Set())

  function nextCard() {
    setIndex((current) => current + 1)
  }

  function imageFailed(cardId: string) {
    setBrokenCards((current) => {
      const updated = new Set(current)
      updated.add(cardId)
      return updated
    })

    setTimeout(() => {
      nextCard()
    }, 0)
  }

  let currentIndex = index

  while (
    currentIndex < cards.length &&
    brokenCards.has(cards[currentIndex].id)
  ) {
    currentIndex++
  }

  if (currentIndex >= cards.length) {
    return (
      <div
        style={{
          maxWidth: '430px',
          margin: '60px auto',
          textAlign: 'center',
          padding: '0 16px',
        }}
      >
        <h2
          style={{
            fontSize: '28px',
            letterSpacing: '-0.03em',
          }}
        >
          You reached the end
        </h2>

        <p
          style={{
            color: '#999',
            marginTop: '8px',
          }}
        >
          You explored {cards.length} cards.
        </p>

        <button
          type="button"
          onClick={() => {
            setIndex(0)
            setBrokenCards(new Set())
          }}
          style={{
            marginTop: '24px',
            padding: '13px 24px',
            minHeight: '48px',
            borderRadius: '999px',
            border: '1px solid #333',
            background: '#111',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 600,
          }}
        >
          Start Again
        </button>
      </div>
    )
  }

  const card = cards[currentIndex]

  const initiallyFavorite =
    favoriteIds.includes(card.id)

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '430px',
        margin: '0 auto',
      }}
    >
      {/* Progress */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: '#777',
          marginBottom: '10px',
          padding: '0 4px',
        }}
      >
        <span>Discover</span>

        <span>
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Card */}

      <div
        style={{
          width: '100%',
          borderRadius: '20px',
          border: '1px solid #222',
          overflow: 'hidden',
          background: '#0d0d0d',
          boxShadow:
            '0 12px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        <Link
          href={`/sets/${card.set_id}`}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            display: 'block',
          }}
        >
          <img
            src={card.image_url}
            alt={card.name}
            onError={() =>
              imageFailed(card.id)
            }
            style={{
              width: '100%',
              display: 'block',
              height: 'auto',
            }}
          />
        </Link>

        {/* Card information */}

        <div
          style={{
            padding: '18px 20px 20px',
          }}
        >
          <Link
            href={`/sets/${card.set_id}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize:
                  'clamp(22px, 5vw, 27px)',
                fontWeight: 650,
                letterSpacing: '-0.035em',
                lineHeight: 1.15,
                color: '#fff',
              }}
            >
              {card.name}
            </h2>
          </Link>

          <div
            style={{
              marginTop: '7px',
              fontSize: '15px',
              color: '#aaa',
            }}
          >
            {card.set_name}
          </div>

          {(card.illustrator ||
            (card.rarity &&
              card.rarity !== 'None')) && (
            <div
              style={{
                marginTop: '5px',
                fontSize: '14px',
                color: '#666',
              }}
            >
              {card.illustrator ?? ''}

              {card.illustrator &&
              card.rarity &&
              card.rarity !== 'None'
                ? ' • '
                : ''}

              {card.rarity &&
              card.rarity !== 'None'
                ? card.rarity
                : ''}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '34px',
          marginTop: '22px',
        }}
      >
        <button
          type="button"
          onClick={nextCard}
          aria-label="Skip card"
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            border: '1px solid #333',
            background: '#111',
            color: '#aaa',
            cursor: 'pointer',
            fontSize: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        <div
          onClick={() => {
            setTimeout(nextCard, 250)
          }}
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            border: '1px solid #333',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#111',
            cursor: 'pointer',
          }}
        >
          <FavoriteButton
            key={card.id}
            cardId={card.id}
            initialFavorite={
              initiallyFavorite
            }
            loggedIn={loggedIn}
          />
        </div>
      </div>

      <p
        style={{
          textAlign: 'center',
          marginTop: '14px',
          color: '#555',
          fontSize: '13px',
          fontWeight: 500,
        }}
      >
        ✕ Skip · ♥ Favorite
      </p>
    </div>
  )
}