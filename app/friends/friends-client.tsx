'use client'

import Link from 'next/link'
import {
  useState,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/client'

type Profile = {
  id: string
  username: string | null
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

function usernameFor(
  profile: Profile
) {
  return (
    profile.username ||
    'collector'
  )
}

export default function FriendsClient({
  currentUserId,
  accepted,
  incoming,
  outgoing,
}: Props) {
  const [
    username,
    setUsername,
  ] = useState('')

  const [
    results,
    setResults,
  ] = useState<Profile[]>([])

  const [
    searching,
    setSearching,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState('')

  const router =
    useRouter()

  async function searchByUsername(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const cleanUsername =
      username
        .trim()
        .replace(/^@/, '')
        .toLowerCase()

    if (
      cleanUsername.length < 2
    ) {
      setMessage(
        'Enter a username.'
      )

      return
    }

    setSearching(true)
    setMessage('')
    setResults([])

    const supabase =
      createClient()

    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        avatar_url
      `)
      .neq(
        'id',
        currentUserId
      )
      .ilike(
        'username',
        cleanUsername
      )
      .limit(10)

    if (error) {
      setMessage(
        error.message
      )

      setSearching(false)
      return
    }

    const foundProfiles =
      (data ?? []) as Profile[]

    setResults(
      foundProfiles
    )

    if (
      foundProfiles.length ===
      0
    ) {
      setMessage(
        'No collector found with that username.'
      )
    }

    setSearching(false)
  }

  async function sendRequest(
    profileId: string
  ) {
    const supabase =
      createClient()

    setMessage('')

    const {
      error,
    } = await supabase
      .from('friendships')
      .insert({
        requester_id:
          currentUserId,
        addressee_id:
          profileId,
        status:
          'pending',
      })

    if (error) {
      const lowerMessage =
        error.message
          .toLowerCase()

      if (
        lowerMessage.includes(
          'duplicate'
        ) ||
        lowerMessage.includes(
          'unique'
        )
      ) {
        setMessage(
          'You already have a friend request or friendship with this collector.'
        )
      } else {
        setMessage(
          error.message
        )
      }

      return
    }

    setMessage(
      'Friend request sent.'
    )

    setResults([])
    setUsername('')

    router.refresh()
  }

  async function acceptRequest(
    friendshipId: number
  ) {
    const supabase =
      createClient()

    setMessage('')

    const {
      error,
    } = await supabase
      .from('friendships')
      .update({
        status:
          'accepted',
      })
      .eq(
        'id',
        friendshipId
      )

    if (error) {
      setMessage(
        error.message
      )

      return
    }

    router.refresh()
  }

  async function removeFriendship(
    friendshipId: number
  ) {
    const supabase =
      createClient()

    setMessage('')

    const {
      error,
    } = await supabase
      .from('friendships')
      .delete()
      .eq(
        'id',
        friendshipId
      )

    if (error) {
      setMessage(
        error.message
      )

      return
    }

    router.refresh()
  }

  return (
    <div
      className="
        mt-10
        space-y-12
      "
    >
      <section>
        <h2
          className="
            text-xl
            font-semibold
          "
        >
          Add a friend
        </h2>

        <p
          className="
            mt-1
            text-sm
            text-zinc-500
          "
        >
          Search for a collector
          by their LostBinder
          username.
        </p>

        <form
          onSubmit={
            searchByUsername
          }
          className="
            mt-5
            flex
            max-w-xl
            gap-2
          "
        >
          <div
            className="
              flex
              min-w-0
              flex-1
              items-center
              rounded-full
              border
              border-white/10
              bg-zinc-950
              px-5
            "
          >
            <span
              className="
                text-sm
                text-zinc-600
              "
            >
              @
            </span>

            <input
              value={
                username
              }
              onChange={(
                event
              ) =>
                setUsername(
                  event.target.value
                )
              }
              placeholder="username"
              autoComplete="off"
              className="
                min-w-0
                flex-1
                bg-transparent
                px-1
                py-3
                text-sm
                text-white
                outline-none
                placeholder:text-zinc-700
              "
            />
          </div>

          <button
            type="submit"
            disabled={
              searching
            }
            className="
              rounded-full
              bg-white
              px-5
              py-3
              text-sm
              font-semibold
              text-black
              transition
              hover:bg-zinc-200
              disabled:opacity-50
            "
          >
            {searching
              ? 'Searching'
              : 'Search'}
          </button>
        </form>

        {message ? (
          <p
            className="
              mt-3
              text-sm
              text-zinc-500
            "
          >
            {message}
          </p>
        ) : null}

        {results.length >
        0 ? (
          <div
            className="
              mt-5
              max-w-xl
              space-y-2
            "
          >
            {results.map(
              (profile) => (
                <div
                  key={
                    profile.id
                  }
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    rounded-2xl
                    border
                    border-white/10
                    bg-zinc-950
                    p-4
                  "
                >
                  <p
                    className="
                      min-w-0
                      truncate
                      font-medium
                    "
                  >
                    @
                    {
                      usernameFor(
                        profile
                      )
                    }
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      sendRequest(
                        profile.id
                      )
                    }
                    className="
                      shrink-0
                      rounded-full
                      border
                      border-white/15
                      px-4
                      py-2
                      text-sm
                      transition
                      hover:border-white/40
                    "
                  >
                    Add friend
                  </button>
                </div>
              )
            )}
          </div>
        ) : null}
      </section>

      {incoming.length >
      0 ? (
        <section>
          <h2
            className="
              text-xl
              font-semibold
            "
          >
            Friend requests
          </h2>

          <div
            className="
              mt-4
              space-y-3
            "
          >
            {incoming.map(
              (item) => (
                <div
                  key={
                    item.friendshipId
                  }
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    rounded-2xl
                    border
                    border-white/10
                    bg-zinc-950
                    p-4
                  "
                >
                  <p
                    className="
                      min-w-0
                      truncate
                      font-medium
                    "
                  >
                    @
                    {
                      usernameFor(
                        item.profile
                      )
                    }
                  </p>

                  <div
                    className="
                      flex
                      shrink-0
                      gap-2
                    "
                  >
                    <button
                      type="button"
                      onClick={() =>
                        acceptRequest(
                          item.friendshipId
                        )
                      }
                      className="
                        rounded-full
                        bg-white
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-black
                      "
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
                      className="
                        rounded-full
                        border
                        border-white/10
                        px-4
                        py-2
                        text-sm
                        text-zinc-400
                      "
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      ) : null}

      {outgoing.length >
      0 ? (
        <section>
          <h2
            className="
              text-xl
              font-semibold
            "
          >
            Sent requests
          </h2>

          <div
            className="
              mt-4
              space-y-3
            "
          >
            {outgoing.map(
              (item) => (
                <div
                  key={
                    item.friendshipId
                  }
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    rounded-2xl
                    border
                    border-white/10
                    bg-zinc-950
                    p-4
                  "
                >
                  <p
                    className="
                      min-w-0
                      truncate
                      font-medium
                    "
                  >
                    @
                    {
                      usernameFor(
                        item.profile
                      )
                    }
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      removeFriendship(
                        item.friendshipId
                      )
                    }
                    className="
                      shrink-0
                      rounded-full
                      border
                      border-white/10
                      px-4
                      py-2
                      text-sm
                      text-zinc-500
                      transition
                      hover:text-white
                    "
                  >
                    Cancel
                  </button>
                </div>
              )
            )}
          </div>
        </section>
      ) : null}

      <section>
        <h2
          className="
            text-xl
            font-semibold
          "
        >
          Your friends
        </h2>

        <p
          className="
            mt-1
            text-sm
            text-zinc-600
          "
        >
          {accepted.length}{' '}
          {accepted.length ===
          1
            ? 'friend'
            : 'friends'}
        </p>

        {accepted.length ===
        0 ? (
          <div
            className="
              mt-8
              rounded-3xl
              border
              border-white/10
              bg-zinc-950
              px-6
              py-12
              text-center
            "
          >
            <p
              className="
                text-zinc-500
              "
            >
              You haven&apos;t
              added any friends
              yet.
            </p>

            <p
              className="
                mt-2
                text-sm
                text-zinc-700
              "
            >
              Search for someone
              by username above.
            </p>
          </div>
        ) : (
          <div
            className="
              mt-5
              grid
              gap-3
              sm:grid-cols-2
            "
          >
            {accepted.map(
              (item) => (
                <div
                  key={
                    item.friendshipId
                  }
                  className="
                    rounded-2xl
                    border
                    border-white/10
                    bg-zinc-950
                    p-5
                  "
                >
                  <Link
                    href={
                      `/friends/${item.profile.id}`
                    }
                    className="
                      block
                    "
                  >
                    <p
                      className="
                        truncate
                        text-lg
                        font-medium
                      "
                    >
                      @
                      {
                        usernameFor(
                          item.profile
                        )
                      }
                    </p>

                    <p
                      className="
                        mt-6
                        text-sm
                        text-zinc-300
                      "
                    >
                      View collection
                      →
                    </p>
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      removeFriendship(
                        item.friendshipId
                      )
                    }
                    className="
                      mt-5
                      text-xs
                      text-zinc-700
                      transition
                      hover:text-zinc-400
                    "
                  >
                    Remove friend
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  )
}