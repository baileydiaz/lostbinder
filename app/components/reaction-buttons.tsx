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

export type Reaction =
  | 'pass'
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

  onError?: (
    message: string
  ) => void
}

export default function ReactionButtons({
  cardId,
  userId,
  initialReaction = null,
  compact = false,
  onSaved,
  onError,
}: Props) {
  const [
    reaction,
    setReaction,
  ] =
    useState<Reaction>(
      initialReaction
    )

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const router =
    useRouter()

  function showError(
    message: string
  ) {
    setError(message)

    onError?.(
      message
    )
  }

  async function persistReaction(
    previousReaction:
      Reaction,
    next:
      Reaction
  ) {
    const supabase =
      createClient()

    try {
      /*
       * Remove reaction entirely.
       */
      if (next === null) {
        const {
          error:
            reactionDeleteError,
        } =
          await supabase
            .from(
              'card_reactions'
            )
            .delete()
            .eq(
              'user_id',
              userId!
            )
            .eq(
              'card_id',
              cardId
            )

        if (
          reactionDeleteError
        ) {
          throw new Error(
            reactionDeleteError
              .message
          )
        }

        if (
          previousReaction ===
          'love'
        ) {
          const {
            error:
              favoriteDeleteError,
          } =
            await supabase
              .from(
                'card_favorites'
              )
              .delete()
              .eq(
                'user_id',
                userId!
              )
              .eq(
                'card_id',
                cardId
              )

          if (
            favoriteDeleteError
          ) {
            throw new Error(
              favoriteDeleteError
                .message
            )
          }
        }

        return
      }

      /*
       * Store Pass / Like / Love.
       */
      const {
        error:
          reactionError,
      } =
        await supabase
          .from(
            'card_reactions'
          )
          .upsert(
            {
              user_id:
                userId!,

              card_id:
                cardId,

              reaction:
                next,

              updated_at:
                new Date()
                  .toISOString(),
            },
            {
              onConflict:
                'user_id,card_id',
            }
          )

      if (
        reactionError
      ) {
        throw new Error(
          reactionError.message
        )
      }

      /*
       * Love also belongs in Binder.
       */
      if (
        next === 'love'
      ) {
        const {
          error:
            favoriteError,
        } =
          await supabase
            .from(
              'card_favorites'
            )
            .upsert(
              {
                user_id:
                  userId!,

                card_id:
                  cardId,
              },
              {
                onConflict:
                  'user_id,card_id',
              }
            )

        if (
          favoriteError
        ) {
          throw new Error(
            favoriteError.message
          )
        }
      }

      /*
       * Leaving Love removes it
       * from Binder.
       */
      if (
        previousReaction ===
          'love' &&
        next !== 'love'
      ) {
        const {
          error:
            favoriteDeleteError,
        } =
          await supabase
            .from(
              'card_favorites'
            )
            .delete()
            .eq(
              'user_id',
              userId!
            )
            .eq(
              'card_id',
              cardId
            )

        if (
          favoriteDeleteError
        ) {
          throw new Error(
            favoriteDeleteError
              .message
          )
        }
      }
    } catch (
      caughtError
    ) {
      const message =
        caughtError
          instanceof Error
          ? caughtError.message
          : 'Could not save reaction.'

      /*
       * Roll UI back if the DB
       * save fails.
       */
      setReaction(
        previousReaction
      )

      showError(
        message
      )
    } finally {
      setSaving(false)
    }
  }

  function saveReaction(
    next:
      | 'pass'
      | 'like'
      | 'love'
  ) {
    if (!userId) {
      router.push(
        '/auth/login'
      )

      return
    }

    if (saving) {
      return
    }

    setError('')

    const previousReaction =
      reaction

    const nextReaction:
      Reaction =
      reaction === next
        ? null
        : next

    /*
     * Optimistic UI:
     * update instantly.
     */
    setReaction(
      nextReaction
    )

    onSaved?.(
      nextReaction
    )

    setSaving(true)

    void persistReaction(
      previousReaction,
      nextReaction
    )
  }

  function buttonClasses(
  selected: boolean
  ) {
  const base =
    compact
      ? 'flex min-w-0 items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium leading-tight transition'
      : 'flex min-w-0 items-center justify-center rounded-xl border px-3 py-3 text-sm font-medium leading-tight transition sm:px-5'

  return `${base} ${
    selected
      ? 'border-white bg-white text-black'
      : 'border-white/15 bg-transparent text-zinc-400 hover:border-white/35 hover:text-white'
  } disabled:cursor-default disabled:opacity-60`
  }

  return (
    <div>
      <div
        className={
          compact
            ? 'flex gap-2'
            : 'grid grid-cols-3 gap-2'
        }
      >
        <button
          type="button"
          disabled={
            saving
          }
          onClick={() =>
            saveReaction(
              'pass'
            )
          }
          className={
            buttonClasses(
              reaction ===
                'pass'
            )
          }
        >
          <span
            aria-hidden="true"
            className="mr-1 text-lg leading-none"
          >
            ×
          </span>

          <span>
            Pass
          </span>
        </button>

        <button
          type="button"
          disabled={
            saving
          }
          onClick={() =>
            saveReaction(
              'like'
            )
          }
          className={
            buttonClasses(
              reaction ===
                'like'
            )
          }
        >
          <span
            aria-hidden="true"
            className="mr-1 text-base leading-none"
          >
            +
          </span>

          <span>
            Like
          </span>
        </button>

        <button
          type="button"
          disabled={
            saving
          }
          onClick={() =>
            saveReaction(
              'love'
            )
          }
          className={
            buttonClasses(
              reaction ===
                'love'
            )
          }
        >
          <span className="text-center leading-tight">
            Add to
            <span className="block">
              Collection
            </span>
          </span>
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