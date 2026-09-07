'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

type FriendItem = {
  friendshipId: number
  profile: Profile
}

type Props = {
  currentUserId: string
  accepted: FriendItem[]
  incoming: FriendItem[]
  outgoing: FriendItem[]
}

function nameFor(profile: Profile) {
  return (
    profile.display_name ||
    profile.username ||
    'Collector'
  )
}

export default function FriendsClient({
  currentUserId,
  accepted,
  incoming,
  outgoing,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')

  const router = useRouter()

  async function searchPeople(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const clean = query.trim()

    if (clean.length < 2) {
      setMessage('Type at least 2 characters.')
      return
    }

    setSearching(true)
    setMessage('')

    const supabase = createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        avatar_url
      `)
      .neq('id', currentUserId)
      .or(
        `username.ilike.%${clean}%,display_name.ilike.%${clean}%`
      )
      .limit(12)

    if (error) {
      setMessage(error.message)
      setResults([])
    } else {
      setResults((data ?? []) as Profile[])
    }

    setSearching(false)
  }

  async function sendRequest(profileId: string) {
    const supabase = createClient()

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: currentUserId,
        addressee_id: profileId,
        status: 'pending',
      })

    if (error) {
      if (
        error.message
          .toLowerCase()
          .includes('duplicate')
      ) {
        setMessage(
          'A friendship or request already exists.'
        )
      } else {
        setMessage(error.message)
      }

      return
    }

    setMessage('Friend request sent.')
    router.refresh()
  }

  async function acceptRequest(
    friendshipId: number
  ) {
    const supabase = createClient()

    const { error } = await supabase
      .from('friendships')
      .update({
        status: 'accepted',
      })
      .eq('id', friendshipId)

    if (error) {
      setMessage(error.message)
      return
    }

    router.refresh()
  }

  async function removeFriendship(
    friendshipId: number
  ) {
    const supabase = createClient()

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)

    if (error) {
      setMessage(error.message)
      return
    }

    router.refresh()
  }

  return (
    <div className="mt-10 space-y-10">
      <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">
          Find collectors
        </h2>

        <form
          onSubmit={searchPeople}
          className="mt-4 flex gap-2"
        >
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search username or display name"
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black px-5 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/40"
          />

          <button
            type="submit"
            disabled={searching}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
          >
            {searching
              ? 'Searching'
              : 'Search'}
          </button>
        </form>

        {message ? (
          <p className="mt-3 text-sm text-zinc-400">
            {message}
          </p>
        ) : null}

        {results.length > 0 ? (
          <div className="mt-5 divide-y divide-white/10">
            {results.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {nameFor(profile)}
                  </p>

                  <p className="truncate text-sm text-zinc-500">
                    @{profile.username || 'collector'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    sendRequest(profile.id)
                  }
                  className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-sm hover:border-white/50"
                >
                  Add friend
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {incoming.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold">
            Friend requests
          </h2>

          <div className="mt-4 space-y-3">
            {incoming.map((item) => (
              <div
                key={item.friendshipId}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4"
              >
                <div>
                  <p className="font-medium">
                    {nameFor(item.profile)}
                  </p>

                  <p className="text-sm text-zinc-500">
                    @{item.profile.username || 'collector'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      acceptRequest(
                        item.friendshipId
                      )
                    }
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                  >
                    Accept
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      removeFriendship(
                        item.friendshipId
                      )
                    }
                    className="rounded-full border border-white/15 px-4 py-2 text-sm"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold">
            Sent requests
          </h2>

          <div className="mt-4 space-y-3">
            {outgoing.map((item) => (
              <div
                key={item.friendshipId}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4"
              >
                <div>
                  <p className="font-medium">
                    {nameFor(item.profile)}
                  </p>

                  <p className="text-sm text-zinc-500">
                    Pending
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeFriendship(
                      item.friendshipId
                    )
                  }
                  className="rounded-full border border-white/15 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold">
          Your friends
        </h2>

        {accepted.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No friends yet. Search for another
            LostBinder collector above.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {accepted.map((item) => (
              <div
                key={item.friendshipId}
                className="rounded-2xl border border-white/10 bg-zinc-950 p-4"
              >
                <Link
                  href={`/friends/${item.profile.id}`}
                  className="block"
                >
                  <p className="font-medium">
                    {nameFor(item.profile)}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    @{item.profile.username || 'collector'}
                  </p>

                  <p className="mt-4 text-sm text-white">
                    View Loved cards →
                  </p>
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    removeFriendship(
                      item.friendshipId
                    )
                  }
                  className="mt-4 text-xs text-zinc-600 hover:text-zinc-300"
                >
                  Remove friend
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}