'use client'

import {
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/client'

type Props = {
  cardId: string
  userId: string
}

export default function RemoveFromBinderButton({
  cardId,
  userId,
}: Props) {
  const router =
    useRouter()

  const [
    removing,
    setRemoving,
  ] = useState(false)

  async function removeFromBinder() {
    if (removing) {
      return
    }

    setRemoving(true)

    const supabase =
      createClient()

    const {
      error:
        favoriteError,
    } = await supabase
      .from('card_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('card_id', cardId)

    if (favoriteError) {
      console.error(
        favoriteError.message
      )
      setRemoving(false)
      return
    }

    const {
      error:
        reactionError,
    } = await supabase
      .from('card_reactions')
      .delete()
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .eq('reaction', 'love')

    if (reactionError) {
      console.error(
        reactionError.message
      )
    }

    router.refresh()
  }

  return (
    <button
      type="button"
      disabled={removing}
      onClick={
        removeFromBinder
      }
      className="mt-2 text-xs text-zinc-600 transition hover:text-zinc-300 disabled:cursor-default disabled:opacity-50"
    >
      {removing
        ? 'Removing...'
        : 'Remove from Binder'}
    </button>
  )
}
