'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  cardId: string
  initialFavorite: boolean
  loggedIn: boolean
}

export default function FavoriteButton({
  cardId,
  initialFavorite,
  loggedIn,
}: Props) {
  const [favorite, setFavorite] =
    useState(initialFavorite)

  const [loading, setLoading] =
    useState(false)

  const router = useRouter()

  async function toggleFavorite() {
    if (!loggedIn) {
      router.push('/auth/login')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    if (favorite) {
      const { error } = await supabase
        .from('card_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('card_id', cardId)

      if (!error) {
        setFavorite(false)
      }
    } else {
      const { error } = await supabase
        .from('card_favorites')
        .insert({
          user_id: user.id,
          card_id: cardId,
        })

      if (!error) {
        setFavorite(true)
      }
    }

    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={loading}
      aria-label={
        favorite
          ? 'Remove from favorites'
          : 'Add to favorites'
      }
      style={{
        border: 'none',
        background: 'transparent',
        cursor: loading ? 'wait' : 'pointer',
        fontSize: '26px',
        padding: '0',
      }}
    >
      {favorite ? '❤️' : '♡'}
    </button>
  )
}