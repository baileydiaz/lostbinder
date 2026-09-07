import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FriendsClient from './friends-client'

type Friendship = {
  id: number
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
}

export type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

type FriendItem = {
  friendshipId: number
  profile: Profile
}

export default async function FriendsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: friendshipData, error: friendshipError } =
    await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status
      `)
      .or(
        `requester_id.eq.${user.id},addressee_id.eq.${user.id}`
      )

  if (friendshipError) {
    console.error(
      'Could not load friendships:',
      friendshipError.message
    )
  }

  const friendships =
    (friendshipData ?? []) as Friendship[]

  const otherUserIds = Array.from(
    new Set(
      friendships.map((friendship) =>
        friendship.requester_id === user.id
          ? friendship.addressee_id
          : friendship.requester_id
      )
    )
  )

  let profiles: Profile[] = []

  if (otherUserIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        avatar_url
      `)
      .in('id', otherUserIds)

    if (error) {
      console.error(
        'Could not load profiles:',
        error.message
      )
    }

    profiles = (data ?? []) as Profile[]
  }

  const profileById = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  )

  function hasProfile(
    item: {
      friendshipId: number
      profile: Profile | undefined
    }
  ): item is FriendItem {
    return item.profile !== undefined
  }

  const accepted: FriendItem[] = friendships
    .filter(
      (friendship) =>
        friendship.status === 'accepted'
    )
    .map((friendship) => {
      const otherId =
        friendship.requester_id === user.id
          ? friendship.addressee_id
          : friendship.requester_id

      return {
        friendshipId: friendship.id,
        profile: profileById.get(otherId),
      }
    })
    .filter(hasProfile)

  const incoming: FriendItem[] = friendships
    .filter(
      (friendship) =>
        friendship.status === 'pending' &&
        friendship.addressee_id === user.id
    )
    .map((friendship) => ({
      friendshipId: friendship.id,
      profile: profileById.get(
        friendship.requester_id
      ),
    }))
    .filter(hasProfile)

  const outgoing: FriendItem[] = friendships
    .filter(
      (friendship) =>
        friendship.status === 'pending' &&
        friendship.requester_id === user.id
    )
    .map((friendship) => ({
      friendshipId: friendship.id,
      profile: profileById.get(
        friendship.addressee_id
      ),
    }))
    .filter(hasProfile)

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
          LostBinder Social
        </p>

        <h1 className="mt-2 text-4xl font-semibold">
          Friends
        </h1>

        <p className="mt-2 text-zinc-400">
          Find collectors and see the cards your
          accepted friends Love.
        </p>

        <FriendsClient
          currentUserId={user.id}
          accepted={accepted}
          incoming={incoming}
          outgoing={outgoing}
        />
      </div>
    </main>
  )
}