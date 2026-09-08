'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

type Props = {
  cardId: string
  userId: string
}

export default function FavoriteToggle({
  cardId,
  userId,
}: Props) {
  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const router = useRouter()

  async function removeFavorite() {
    if (saving) {
      return
    }

    setSaving(true)
    setError('')

    const supabase =
      createClient()

    const {
      error: favoriteError,
    } = await supabase
      .from('card_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('card_id', cardId)

    if (favoriteError) {
      setError(
        favoriteError.message
      )

      setSaving(false)
      return
    }

    /*
     * Keep reaction state consistent too.
     *
     * If this card was Loved, removing
     * it from Favorites also removes
     * the Love reaction.
     */
    const {
      error: reactionError,
    } = await supabase
      .from('card_reactions')
      .delete()
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .eq('reaction', 'love')

    if (reactionError) {
      setError(
        reactionError.message
      )

      setSaving(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={saving}
        onClick={removeFavorite}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-500 transition hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? 'Removing...'
          : '♥ Loved'}
      </button>

      {error ? (
        <p className="mt-2 text-center text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}