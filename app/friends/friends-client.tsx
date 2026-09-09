'use client'

import Link from 'next/link'
import {
  useState,
  type FormEvent,
  type MouseEvent,
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

type SentToYouItem = {
  shareId: number
  card: {
    id: string
    name: string
    image_url: string | null
    rarity: string | null
    set_id: string
    category: string | null
  }
  sender: Profile
  message: string | null
  createdAt: string
  readAt: string | null
}

type ActivityItem = {
  eventId: number
  eventType: 'love'
  user: Profile
  card: {
    id: string
    name: string
    image_url: string | null
    rarity: string | null
    set_id: string
    category: string | null
  }
  createdAt: string
}

type Props = {
  currentUserId: string
  accepted: FriendItem[]
  incoming: FriendItem[]
  outgoing: FriendItem[]
  sentToYou: SentToYouItem[]
  activity: ActivityItem[]
}

type Tab =
  | 'activity'
  | 'friends'
  | 'sent'

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
  sentToYou,
  activity,
}: Props) {
  const [
    activeTab,
    setActiveTab,
  ] = useState<Tab>('friends')

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

  const [
    readShareIds,
    setReadShareIds,
  ] = useState<Set<number>>(
    () =>
      new Set(
        sentToYou
          .filter(
            (item) =>
              item.readAt !== null
          )
          .map(
            (item) =>
              item.shareId
          )
      )
  )

  const router =
    useRouter()

  async function searchByUsername(
    event:
      FormEvent<HTMLFormElement>
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

  async function markShareRead(
    shareId: number
  ) {
    if (
      readShareIds.has(
        shareId
      )
    ) {
      return true
    }

    setReadShareIds(
      (current) => {
        const next =
          new Set(current)

        next.add(
          shareId
        )

        return next
      }
    )

    const supabase =
      createClient()

    const {
      error,
    } = await supabase
      .from('card_shares')
      .update({
        read_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        shareId
      )
      .eq(
        'recipient_id',
        currentUserId
      )

    if (error) {
      setReadShareIds(
        (current) => {
          const next =
            new Set(current)

          next.delete(
            shareId
          )

          return next
        }
      )

      console.error(
        'Could not mark share as read:',
        error.message
      )

      return false
    }

    return true
  }

  async function handleSharedCardClick(
    event:
      MouseEvent<HTMLAnchorElement>,
    shareId: number,
    cardId: string
  ) {
    event.preventDefault()

    await markShareRead(
      shareId
    )

    router.push(
      `/cards/${cardId}`
    )
  }

  const unreadCount =
    sentToYou.filter(
      (item) =>
        !readShareIds.has(
          item.shareId
        )
    ).length

  const tabs: {
    id: Tab
    label: string
  }[] = [
    {
      id: 'activity',
      label: 'Activity',
    },
    {
      id: 'friends',
      label: 'Friends',
    },
    {
      id: 'sent',
      label: 'Sent to You',
    },
  ]

  return (
    <div className="mt-10">
      <div className="flex gap-2 overflow-x-auto border-b border-white/10">
        {tabs.map(
          (tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab.id
                )
              }
              className={
                activeTab ===
                tab.id
                  ? 'shrink-0 border-b-2 border-white px-4 py-3 text-sm font-medium text-white'
                  : 'shrink-0 border-b-2 border-transparent px-4 py-3 text-sm text-zinc-600 transition hover:text-white'
              }
            >
              {tab.label}

              {tab.id ===
                'friends' &&
              incoming.length >
                0 ? (
                <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-black">
                  {
                    incoming.length
                  }
                </span>
              ) : null}

              {tab.id ===
                'sent' &&
              unreadCount >
                0 ? (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          )
        )}
      </div>

      {activeTab ===
      'activity' ? (
        <section className="py-10">
          {activity.length ===
          0 ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-950 px-6 py-14 text-center">
              <h2 className="text-xl font-semibold">
                No activity yet.
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-600">
                When your friends Love
                Pokémon, their activity
                will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activity.map(
                (item) => (
                  <Link
                    key={
                      item.eventId
                    }
                    href={`/cards/${item.card.id}`}
                    className="group flex gap-4 rounded-3xl border border-white/10 bg-zinc-950 p-4 transition hover:border-white/20"
                  >
                    <div className="w-20 shrink-0 sm:w-24">
                      {item.card
                        .image_url ? (
                        <img
                          src={
                            item.card
                              .image_url
                          }
                          alt={
                            item.card
                              .name
                          }
                          className="aspect-[2.5/3.5] w-full rounded-xl object-contain"
                        />
                      ) : (
                        <div className="aspect-[2.5/3.5] w-full rounded-xl bg-zinc-900" />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <p className="text-sm text-zinc-400">
                        <span className="font-medium text-white">
                          @
                          {usernameFor(
                            item.user
                          )}
                        </span>
                        {' '}
                        loved
                      </p>

                      <h2 className="mt-2 truncate text-lg font-semibold text-white">
                        {
                          item.card
                            .name
                        }
                      </h2>

                      <p className="mt-1 truncate text-xs text-zinc-600">
                        {item.card
                          .rarity &&
                        item.card
                          .rarity !==
                          'None'
                          ? item.card
                              .rarity
                          : 'Pokémon card'}
                      </p>

                      <p className="mt-4 text-sm text-zinc-400 transition group-hover:text-white">
                        View card →
                      </p>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </section>
      ) : null}

      {activeTab ===
      'sent' ? (
        <section className="py-10">
          {sentToYou.length ===
          0 ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-950 px-6 py-14 text-center">
              <h2 className="text-xl font-semibold">
                No cards sent to you yet.
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-600">
                Pokémon your friends
                send you will appear
                here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sentToYou.map(
                (item) => {
                  const isRead =
                    readShareIds.has(
                      item.shareId
                    )

                  return (
                    <Link
                      key={
                        item.shareId
                      }
                      href={`/cards/${item.card.id}`}
                      onClick={(
                        event
                      ) =>
                        void handleSharedCardClick(
                          event,
                          item.shareId,
                          item.card.id
                        )
                      }
                      className="group flex gap-4 rounded-3xl border border-white/10 bg-zinc-950 p-4 transition hover:border-white/20"
                    >
                      <div className="w-24 shrink-0 sm:w-28">
                        {item.card
                          .image_url ? (
                          <img
                            src={
                              item.card
                                .image_url
                            }
                            alt={
                              item.card
                                .name
                            }
                            className="aspect-[2.5/3.5] w-full rounded-xl object-contain"
                          />
                        ) : (
                          <div className="aspect-[2.5/3.5] w-full rounded-xl bg-zinc-900" />
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <div className="flex items-center gap-2">
                          {!isRead ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                          ) : null}

                          <p className="truncate text-xs text-zinc-500">
                            Sent by @
                            {usernameFor(
                              item.sender
                            )}
                          </p>
                        </div>

                        <h2 className="mt-2 truncate text-lg font-semibold text-white">
                          {
                            item.card
                              .name
                          }
                        </h2>

                        <p className="mt-1 truncate text-xs text-zinc-600">
                          {item.card
                            .rarity &&
                          item.card
                            .rarity !==
                            'None'
                            ? item.card
                                .rarity
                            : 'Pokémon card'}
                        </p>

                        {item.message ? (
                          <p className="mt-3 line-clamp-2 text-sm text-zinc-400">
                            “
                            {
                              item.message
                            }
                            ”
                          </p>
                        ) : null}

                        <p className="mt-4 text-sm text-zinc-300 transition group-hover:text-white">
                          View card →
                        </p>
                      </div>
                    </Link>
                  )
                }
              )}
            </div>
          )}
        </section>
      ) : null}

      {activeTab ===
      'friends' ? (
        <div className="space-y-12 py-10">
          <section>
            <h2 className="text-xl font-semibold">
              Add a friend
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Search for a collector
              by their LostBinder
              username.
            </p>

            <form
              onSubmit={
                searchByUsername
              }
              className="mt-5 flex max-w-xl gap-2"
            >
              <div className="flex min-w-0 flex-1 items-center rounded-full border border-white/10 bg-zinc-950 px-5">
                <span className="text-sm text-zinc-600">
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
                      event.target
                        .value
                    )
                  }
                  placeholder="username"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-zinc-700"
                />
              </div>

              <button
                type="submit"
                disabled={
                  searching
                }
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {searching
                  ? 'Searching'
                  : 'Search'}
              </button>
            </form>

            {message ? (
              <p className="mt-3 text-sm text-zinc-500">
                {message}
              </p>
            ) : null}

            {results.length >
            0 ? (
              <div className="mt-5 max-w-xl space-y-2">
                {results.map(
                  (profile) => (
                    <div
                      key={
                        profile.id
                      }
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4"
                    >
                      <p className="min-w-0 truncate font-medium">
                        @
                        {usernameFor(
                          profile
                        )}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          sendRequest(
                            profile.id
                          )
                        }
                        className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-white/40"
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
              <h2 className="text-xl font-semibold">
                Friend requests
              </h2>

              <div className="mt-4 space-y-3">
                {incoming.map(
                  (item) => (
                    <div
                      key={
                        item.friendshipId
                      }
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4"
                    >
                      <p className="min-w-0 truncate font-medium">
                        @
                        {usernameFor(
                          item.profile
                        )}
                      </p>

                      <div className="flex shrink-0 gap-2">
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
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400"
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
              <h2 className="text-xl font-semibold">
                Sent requests
              </h2>

              <div className="mt-4 space-y-3">
                {outgoing.map(
                  (item) => (
                    <div
                      key={
                        item.friendshipId
                      }
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4"
                    >
                      <p className="min-w-0 truncate font-medium">
                        @
                        {usernameFor(
                          item.profile
                        )}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeFriendship(
                            item.friendshipId
                          )
                        }
                        className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-500 transition hover:text-white"
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
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Your friends
                </h2>

                <p className="mt-1 text-sm text-zinc-600">
                  {
                    accepted.length
                  }{' '}
                  {accepted.length ===
                  1
                    ? 'friend'
                    : 'friends'}
                </p>
              </div>
            </div>

            {accepted.length ===
            0 ? (
              <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 px-6 py-12 text-center">
                <p className="text-zinc-500">
                  You haven&apos;t
                  added any friends
                  yet.
                </p>

                <p className="mt-2 text-sm text-zinc-700">
                  Search for someone
                  by username above.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {accepted.map(
                  (item) => (
                    <div
                      key={
                        item.friendshipId
                      }
                      className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                    >
                      <Link
                        href={`/u/${encodeURIComponent(
                        item.profile.username ??
                          'collector'
                        )}`}
                        className="block"
                      >
                        <p className="truncate text-lg font-medium">
                          @
                          {usernameFor(
                            item.profile
                          )}
                        </p>

                        <p className="mt-6 text-sm text-zinc-300">
                          View binder →
                        </p>
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          removeFriendship(
                            item.friendshipId
                          )
                        }
                        className="mt-5 text-xs text-zinc-700 transition hover:text-zinc-400"
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
      ) : null}
    </div>
  )
}