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
  userId: string | null
  initialLoved?: boolean
}

export default function HomeLoveButton({
  cardId,
  userId,
  initialLoved = false,
}: Props) {
  const [
    loved,
    setLoved,
  ] = useState(initialLoved)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const router =
    useRouter()

  async function toggleLove() {
    if (!userId) {
      router.push('/auth/login')
      return
    }

    if (saving) {
      return
    }

    const previousLoved =
      loved

    const nextLoved =
      !loved

    setLoved(nextLoved)
    setSaving(true)

    const supabase =
      createClient()

    try {
      if (nextLoved) {
        const {
          error:
            reactionError,
        } =
          await supabase
            .from('card_reactions')
            .upsert(
              {
                user_id: userId,
                card_id: cardId,
                reaction: 'love',
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
          throw new Error(
            reactionError.message
          )
        }

        const {
          error:
            favoriteError,
        } =
          await supabase
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
          throw new Error(
            favoriteError.message
          )
        }
      } else {
        const {
          error:
            favoriteError,
        } =
          await supabase
            .from('card_favorites')
            .delete()
            .eq('user_id', userId)
            .eq('card_id', cardId)

        if (favoriteError) {
          throw new Error(
            favoriteError.message
          )
        }

        const {
          error:
            reactionError,
        } =
          await supabase
            .from('card_reactions')
            .delete()
            .eq('user_id', userId)
            .eq('card_id', cardId)
            .eq('reaction', 'love')

        if (reactionError) {
          throw new Error(
            reactionError.message
          )
        }
      }
    } catch (error) {
      console.error(
        'Could not update Love:',
        error
      )

      setLoved(previousLoved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggleLove}
      disabled={saving}
      aria-label={
        loved
          ? 'Remove from Loves'
          : 'Love this card'
      }
      title={
        loved
          ? 'Loved'
          : 'Love'
      }
      className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition active:scale-90 ${
        loved
          ? 'border-white bg-white text-black'
          : 'border-white/20 bg-black/70 text-white hover:border-white/50 hover:bg-black/90'
      } disabled:opacity-70`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[17px] w-[17px]"
        fill={
          loved
            ? 'currentColor'
            : 'none'
        }
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
        />
      </svg>
    </button>
  )
}
