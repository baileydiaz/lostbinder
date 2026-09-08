'use client'

import {
  useState,
} from 'react'

import {
  createClient,
} from '@/lib/supabase/client'

type Friend = {
  id: string
  username: string | null
}

type Props = {
  cardId: string
  userId: string
  friends: Friend[]
}

export default function SendCardButton({
  cardId,
  userId,
  friends,
}: Props) {
  const [
    open,
    setOpen,
  ] = useState(false)

  const [
    selectedFriend,
    setSelectedFriend,
  ] = useState<Friend | null>(
    null
  )

  const [
    note,
    setNote,
  ] = useState('')

  const [
    sending,
    setSending,
  ] = useState(false)

  const [
    sent,
    setSent,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  function closeMenu() {
    if (sending) {
      return
    }

    setOpen(false)
    setSelectedFriend(null)
    setNote('')
    setSent(false)
    setError('')
  }

  async function sendCard() {
    if (
      !selectedFriend ||
      sending
    ) {
      return
    }

    setSending(true)
    setError('')

    const supabase =
      createClient()

    const cleanNote =
      note.trim()

    const {
      error: sendError,
    } = await supabase
      .from('card_shares')
      .insert({
        sender_id:
          userId,
        recipient_id:
          selectedFriend.id,
        card_id:
          cardId,
        message:
          cleanNote ||
          null,
      })

    if (sendError) {
      setError(
        sendError.message
      )

      setSending(false)
      return
    }

    setSending(false)
    setSent(true)
  }

  if (
    friends.length === 0
  ) {
    return null
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (open) {
            closeMenu()
          } else {
            setOpen(true)
          }
        }}
        className="rounded-full border border-white/15 px-6 py-3 text-zinc-300 transition hover:border-white/40 hover:text-white"
      >
        ↗ Send
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-3 w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
          {!selectedFriend ? (
            <>
              <div className="border-b border-white/10 px-4 py-4">
                <p className="text-sm font-semibold text-white">
                  Send to a friend
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Choose who you
                  want to send this
                  Pokémon to.
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto p-2">
                {friends.map(
                  (friend) => (
                    <button
                      key={
                        friend.id
                      }
                      type="button"
                      onClick={() => {
                        setSelectedFriend(
                          friend
                        )
                        setError('')
                        setSent(false)
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-white/5"
                    >
                      <span className="truncate text-sm font-medium text-zinc-300">
                        @
                        {friend.username ||
                          'collector'}
                      </span>

                      <span className="text-sm text-zinc-700">
                        →
                      </span>
                    </button>
                  )
                )}
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-white/10 px-4 py-4">
                <button
                  type="button"
                  disabled={
                    sending
                  }
                  onClick={() => {
                    setSelectedFriend(
                      null
                    )
                    setNote('')
                    setSent(false)
                    setError('')
                  }}
                  className="text-xs text-zinc-600 transition hover:text-white disabled:opacity-50"
                >
                  ← Back
                </button>

                <p className="mt-3 text-sm font-semibold text-white">
                  Send to @
                  {selectedFriend.username ||
                    'collector'}
                </p>
              </div>

              <div className="p-4">
                {sent ? (
                  <div className="py-5 text-center">
                    <div className="text-2xl">
                      ✓
                    </div>

                    <p className="mt-3 font-semibold text-white">
                      Card sent
                    </p>

                    <p className="mt-1 text-sm text-zinc-600">
                      It will appear
                      in @
                      {selectedFriend.username ||
                        'collector'}
                      &apos;s Sent to
                      You tab.
                    </p>

                    <button
                      type="button"
                      onClick={
                        closeMenu
                      }
                      className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                      Message
                      <span className="ml-1 normal-case tracking-normal text-zinc-700">
                        optional
                      </span>
                    </label>

                    <textarea
                      value={
                        note
                      }
                      onChange={(
                        event
                      ) =>
                        setNote(
                          event.target
                            .value
                        )
                      }
                      maxLength={
                        200
                      }
                      rows={3}
                      placeholder="Check this card out..."
                      className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-white/25"
                    />

                    <div className="mt-1 text-right text-[10px] text-zinc-700">
                      {
                        note.length
                      }
                      /200
                    </div>

                    {error ? (
                      <p className="mt-3 text-xs text-red-400">
                        {error}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      disabled={
                        sending
                      }
                      onClick={
                        sendCard
                      }
                      className="mt-4 w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending
                        ? 'Sending...'
                        : `Send to @${selectedFriend.username || 'collector'}`}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}