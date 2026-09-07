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

  const router = useRouter()

  async function setCardReaction(
    next: 'like' | 'love'
  ) {
    if (!userId) {
      router.push('/login')
      return
    }

    if (saving) {
      return
    }

    setSaving(true)

    const supabase = createClient()

    // Clicking the same reaction again removes it.
    if (reaction === next) {
      const { error } =
        await supabase
          .from('card_reactions')
          .delete()
          .eq(
            'user_id',
            userId
          )
          .eq(
            'card_id',
            cardId
          )

      if (!error) {
        setReaction(null)
        onSaved?.(null)
      }

      setSaving(false)
      return
    }

    const { error } =
      await supabase
        .from('card_reactions')
        .upsert(
          {
            user_id: userId,
            card_id: cardId,
            reaction: next,
            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              'user_id,card_id',
          }
        )

    if (!error) {
      setReaction(next)
      onSaved?.(next)
    }

    setSaving(false)
  }

  const base = `
    inline-flex
    items-center
    justify-center
    rounded-full
    border
    font-medium
    transition
    active:scale-95
    disabled:opacity-50
  `

  const size =
    compact
      ? 'h-10 px-3 text-sm'
      : 'h-14 px-5 text-base'

  return (
    <div
      className="
        flex
        items-center
        gap-2
      "
    >
      <button
        type="button"
        disabled={saving}
        onClick={() =>
          setCardReaction(
            'like'
          )
        }
        aria-pressed={
          reaction === 'like'
        }
        title="Like — recommendation signal"
        className={[
          base,
          size,

          reaction === 'like'
            ? `
              border-white
              bg-white
              text-black
            `
            : `
              border-white/20
              bg-zinc-950
              text-white
              hover:border-white/50
            `,
        ].join(' ')}
      >
        <span className="mr-1.5">
          👍
        </span>

        {!compact && 'Like'}
      </button>

      <button
        type="button"
        disabled={saving}
        onClick={() =>
          setCardReaction(
            'love'
          )
        }
        aria-pressed={
          reaction === 'love'
        }
        title="Love — collection + recommendation signal"
        className={[
          base,
          size,

          reaction === 'love'
            ? `
              border-red-500
              bg-red-500
              text-white
            `
            : `
              border-white/20
              bg-zinc-950
              text-white
              hover:border-red-400/70
            `,
        ].join(' ')}
      >
        <span className="mr-1.5">
          ♥
        </span>

        {!compact && 'Love'}
      </button>
    </div>
  )
}