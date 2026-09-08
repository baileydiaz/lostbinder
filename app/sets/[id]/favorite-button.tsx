'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/client'

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
  const [
    favorite,
    setFavorite,
  ] = useState(
    initialFavorite
  )

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const router =
    useRouter()

  async function toggleFavorite() {
    if (loading) return

    if (!loggedIn) {
      router.push(
        '/auth/login'
      )

      return
    }

    setLoading(true)
    setError('')

    const supabase =
      createClient()

    const {
      data: { user },
    } =
      await supabase.auth.getUser()

    if (!user) {
      router.push(
        '/auth/login'
      )

      setLoading(false)
      return
    }

    if (favorite) {
      const {
        error:
          favoriteError,
      } = await supabase
        .from(
          'card_favorites'
        )
        .delete()
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'card_id',
          cardId
        )

      if (favoriteError) {
        setError(
          favoriteError.message
        )

        setLoading(false)
        return
      }

      const {
        error:
          reactionError,
      } = await supabase
        .from(
          'card_reactions'
        )
        .delete()
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'card_id',
          cardId
        )
        .eq(
          'reaction',
          'love'
        )

      if (reactionError) {
        setError(
          reactionError.message
        )

        setLoading(false)
        return
      }

      setFavorite(false)
    } else {
      const {
        error:
          reactionError,
      } = await supabase
        .from(
          'card_reactions'
        )
        .upsert(
          {
            user_id:
              user.id,

            card_id:
              cardId,

            reaction:
              'love',

            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              'user_id,card_id',
          }
        )

      if (reactionError) {
        setError(
          reactionError.message
        )

        setLoading(false)
        return
      }

      const {
        error:
          favoriteError,
      } = await supabase
        .from(
          'card_favorites'
        )
        .upsert(
          {
            user_id:
              user.id,

            card_id:
              cardId,
          },
          {
            onConflict:
              'user_id,card_id',
          }
        )

      if (favoriteError) {
        setError(
          favoriteError.message
        )

        setLoading(false)
        return
      }

      setFavorite(true)
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={
          toggleFavorite
        }
        disabled={loading}
        aria-label={
          favorite
            ? 'Remove Love'
            : 'Love card'
        }
        className={
          favorite
            ? 'text-3xl text-red-500 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50'
            : 'text-3xl text-zinc-600 transition hover:scale-110 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50'
        }
      >
        {favorite
          ? '♥'
          : '♡'}
      </button>

      {error ? (
        <p className="mt-1 max-w-32 text-center text-[10px] text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}