'use client'

import { useState } from 'react'
import Link from 'next/link'
import CardImage from './card-image'
import FavoriteButton from '../sets/[id]/favorite-button'

type Props = {
  card: {
    id: string
    name: string
    rarity: string | null
    illustrator: string | null
    image_url: string
    set_id: string
    set_name: string
  }

  initialFavorite: boolean
  loggedIn: boolean
}

export default function ExploreCard({
  card,
  initialFavorite,
  loggedIn,
}: Props) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return null
  }

  return (
    <div>
      <Link
        href={`/sets/${card.set_id}`}
        style={{
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <CardImage
          src={card.image_url}
          alt={card.name}
          onBroken={() => setBroken(true)}
        />
      </Link>

      <div
        style={{
          marginTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Link
            href={`/sets/${card.set_id}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <strong>{card.name}</strong>
          </Link>

          <div
            style={{
              fontSize: '14px',
              opacity: 0.65,
              marginTop: '4px',
            }}
          >
            {card.set_name}
          </div>

          <div
            style={{
              fontSize: '13px',
              opacity: 0.55,
              marginTop: '3px',
            }}
          >
            {card.illustrator ?? 'Unknown artist'}

            {card.rarity &&
              card.rarity !== 'None'
              ? ` • ${card.rarity}`
              : ''}
          </div>
        </div>

        <FavoriteButton
          cardId={card.id}
          initialFavorite={initialFavorite}
          loggedIn={loggedIn}
        />
      </div>
    </div>
  )
}