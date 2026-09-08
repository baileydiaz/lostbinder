'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type Reaction =
  | 'like'
  | 'love'
  | null

type Props = {
  cardId: string
  userId: string | null
  initialReaction?: Reaction
  compact?: boolean
  onSaved?: (
    reaction: Reaction
  ) => void
}

export default function ReactionButtons({
  cardId,
  userId,
  initialReaction = null,
  compact = false,
  onSaved,
}: Props) {
  const [reaction, setReaction] =
    useState<Reaction>(
      initialReaction
    )

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const router = useRouter()

  async function saveReaction(
    next: 'like' | 'love'
  ) {
    if (!userId) {
      router.push('/auth/login')
      return
    }

    if (saving) {
      return
    }

    setSaving(true)
    setError('')

    const supabase =
      createClient()

    /*
     * Clicking the currently selected
     * reaction removes it.
     */
    if (reaction === next) {
      const {
        error: reactionDeleteError,
      } = await supabase
        .from('card_reactions')
        .delete()
        .eq('user_id', userId)
        .eq('card_id', cardId)

      if (reactionDeleteError) {
        setError(
          reactionDeleteError.message
        )

        setSaving(false)
        return
      }

      /*
       * If removing Love,
       * also remove from collection.
       */
      if (next === 'love') {
        const {
          error: favoriteDeleteError,
        } = await supabase
          .from('card_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('card_id', cardId)

        if (favoriteDeleteError) {
          setError(
            favoriteDeleteError.message
          )

          setSaving(false)
          return
        }
      }

      setReaction(null)

      onSaved?.(null)

      router.refresh()

      setSaving(false)

      return
    }

    /*
     * Save Like or Love as
     * the user's reaction.
     */
    const {
      error: reactionError,
    } = await supabase
      .from('card_reactions')
      .upsert(
        {
          user_id: userId,
          card_id: cardId,
          reaction: next,
          updated_at:
            new Date().toISOString(),
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

      setSaving(false)
      return
    }

    /*
     * Love means Favorite,
     * so add it to collection.
     */
    if (next === 'love') {
      const {
        error: favoriteError,
      } = await supabase
        .from('card_favorites')
        .upsert(
          {
            user_id: userId,
            card_id: cardId,
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

        setSaving(false)
        return
      }
    }

    /*
     * Switching from Love to Like
     * should remove it from collection.
     */
    if (
      next === 'like' &&
      reaction === 'love'
    ) {
      const {
        error: favoriteDeleteError,
      } = await supabase
        .from('card_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('card_id', cardId)

      if (favoriteDeleteError) {
        setError(
          favoriteDeleteError.message
        )

        setSaving(false)
        return
      }
    }

    setReaction(next)

    onSaved?.(next)

    router.refresh()

    setSaving(false)
  }

  return (
    <div>
      <div
        className={
          compact
            ? 'flex gap-2'
            : 'flex justify-center gap-3'
        }
      >
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            saveReaction('like')
          }
          className={
            reaction === 'like'
              ? compact
                ? 'rounded-full bg-white px-3 py-2 text-xs font-semibold text-black transition'
                : 'rounded-full bg-white px-6 py-3 font-semibold text-black transition'
              : compact
                ? 'rounded-full border border-white/15 px-3 py-2 text-xs text-zinc-400 transition hover:border-white/40 hover:text-white'
                : 'rounded-full border border-white/15 px-6 py-3 text-zinc-300 transition hover:border-white/40 hover:text-white'
          }
        >
          👍 Like
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            saveReaction('love')
          }
          className={
            reaction === 'love'
              ? compact
                ? 'rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500'
                : 'rounded-full bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500'
              : compact
                ? 'rounded-full border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-500 transition hover:border-red-500 hover:bg-red-500/10'
                : 'rounded-full border border-red-500/40 px-6 py-3 font-semibold text-red-500 transition hover:border-red-500 hover:bg-red-500/10'
          }
        >
          ♥ Love
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-center text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}