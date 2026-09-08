import { redirect } from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import FriendsClient from './friends-client'

type Friendship = {
  id: number
  requester_id: string
  addressee_id: string
  status:
    | 'pending'
    | 'accepted'
}

export type Profile = {
  id: string
  username: string | null
  avatar_url: string | null
}

type FriendItem = {
  friendshipId: number
  profile: Profile
}

type ShareRow = {
  id: number
  sender_id: string
  recipient_id: string
  card_id: string
  message: string | null
  created_at: string
  read_at: string | null
}

type SharedCard = {
  id: string
  name: string
  image_url: string | null
  rarity: string | null
  set_id: string
  category: string | null
}

export type SentToYouItem = {
  shareId: number
  card: SharedCard
  sender: Profile
  message: string | null
  createdAt: string
  readAt: string | null
}

type ActivityRow = {
  id: number
  user_id: string
  event_type: 'love'
  card_id: string
  created_at: string
}

type ActivityCard = {
  id: string
  name: string
  image_url: string | null
  rarity: string | null
  set_id: string
  category: string | null
}

export type ActivityItem = {
  eventId: number
  eventType: 'love'
  user: Profile
  card: ActivityCard
  createdAt: string
}

export default async function FriendsPage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const {
    data: friendshipData,
    error: friendshipError,
  } = await supabase
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
    (friendshipData ??
      []) as Friendship[]

  const otherUserIds =
    Array.from(
      new Set(
        friendships.map(
          (friendship) =>
            friendship.requester_id ===
            user.id
              ? friendship.addressee_id
              : friendship.requester_id
        )
      )
    )

  let profiles:
    Profile[] = []

  if (
    otherUserIds.length >
    0
  ) {
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
      .in(
        'id',
        otherUserIds
      )

    if (error) {
      console.error(
        'Could not load profiles:',
        error.message
      )
    }

    profiles =
      (data ??
        []) as Profile[]
  }

  const profileById =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    )

  function hasProfile(
    item: {
      friendshipId: number
      profile:
        | Profile
        | undefined
    }
  ): item is FriendItem {
    return (
      item.profile !==
      undefined
    )
  }

  const accepted:
    FriendItem[] =
    friendships
      .filter(
        (friendship) =>
          friendship.status ===
          'accepted'
      )
      .map(
        (friendship) => {
          const otherId =
            friendship.requester_id ===
            user.id
              ? friendship.addressee_id
              : friendship.requester_id

          return {
            friendshipId:
              friendship.id,

            profile:
              profileById.get(
                otherId
              ),
          }
        }
      )
      .filter(
        hasProfile
      )

  const incoming:
    FriendItem[] =
    friendships
      .filter(
        (friendship) =>
          friendship.status ===
            'pending' &&
          friendship.addressee_id ===
            user.id
      )
      .map(
        (friendship) => ({
          friendshipId:
            friendship.id,

          profile:
            profileById.get(
              friendship.requester_id
            ),
        })
      )
      .filter(
        hasProfile
      )

  const outgoing:
    FriendItem[] =
    friendships
      .filter(
        (friendship) =>
          friendship.status ===
            'pending' &&
          friendship.requester_id ===
            user.id
      )
      .map(
        (friendship) => ({
          friendshipId:
            friendship.id,

          profile:
            profileById.get(
              friendship.addressee_id
            ),
        })
      )
      .filter(
        hasProfile
      )

  /*
   * SENT TO YOU
   */
  const {
    data: sharesData,
    error: sharesError,
  } = await supabase
    .from('card_shares')
    .select(`
      id,
      sender_id,
      recipient_id,
      card_id,
      message,
      created_at,
      read_at
    `)
    .eq(
      'recipient_id',
      user.id
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    )

  if (sharesError) {
    console.error(
      'Could not load card shares:',
      sharesError.message
    )
  }

  const shares =
    (sharesData ??
      []) as ShareRow[]

  const sharedCardIds =
    Array.from(
      new Set(
        shares.map(
          (share) =>
            share.card_id
        )
      )
    )

  const senderIds =
    Array.from(
      new Set(
        shares.map(
          (share) =>
            share.sender_id
        )
      )
    )

  let sharedCards:
    SharedCard[] = []

  if (
    sharedCardIds.length >
    0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from('cards')
      .select(`
        id,
        name,
        image_url,
        rarity,
        set_id,
        category
      `)
      .eq(
        'category',
        'Pokemon'
      )
      .in(
        'id',
        sharedCardIds
      )

    if (error) {
      console.error(
        'Could not load shared cards:',
        error.message
      )
    }

    sharedCards =
      (data ??
        []) as SharedCard[]
  }

  let senderProfiles:
    Profile[] = []

  if (
    senderIds.length > 0
  ) {
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
      .in(
        'id',
        senderIds
      )

    if (error) {
      console.error(
        'Could not load senders:',
        error.message
      )
    }

    senderProfiles =
      (data ??
        []) as Profile[]
  }

  const sharedCardById =
    new Map(
      sharedCards.map(
        (card) => [
          card.id,
          card,
        ]
      )
    )

  const senderById =
    new Map(
      senderProfiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    )

  const sentToYou:
    SentToYouItem[] =
    shares
      .map(
        (share) => {
          const card =
            sharedCardById.get(
              share.card_id
            )

          const sender =
            senderById.get(
              share.sender_id
            )

          if (
            !card ||
            !sender
          ) {
            return null
          }

          return {
            shareId:
              share.id,
            card,
            sender,
            message:
              share.message,
            createdAt:
              share.created_at,
            readAt:
              share.read_at,
          }
        }
      )
      .filter(
        (
          item
        ): item is SentToYouItem =>
          item !== null
      )

  /*
   * ACTIVITY
   */
  const acceptedFriendIds =
    accepted.map(
      (item) =>
        item.profile.id
    )

  let activityRows:
    ActivityRow[] = []

  if (
    acceptedFriendIds.length >
    0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from('activity_events')
      .select(`
        id,
        user_id,
        event_type,
        card_id,
        created_at
      `)
      .in(
        'user_id',
        acceptedFriendIds
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(50)

    if (error) {
      console.error(
        'Could not load activity:',
        error.message
      )
    }

    activityRows =
      (data ??
        []) as ActivityRow[]
  }

  const activityCardIds =
    Array.from(
      new Set(
        activityRows.map(
          (event) =>
            event.card_id
        )
      )
    )

  let activityCards:
    ActivityCard[] = []

  if (
    activityCardIds.length >
    0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from('cards')
      .select(`
        id,
        name,
        image_url,
        rarity,
        set_id,
        category
      `)
      .eq(
        'category',
        'Pokemon'
      )
      .in(
        'id',
        activityCardIds
      )

    if (error) {
      console.error(
        'Could not load activity cards:',
        error.message
      )
    }

    activityCards =
      (data ??
        []) as ActivityCard[]
  }

  const activityCardById =
    new Map(
      activityCards.map(
        (card) => [
          card.id,
          card,
        ]
      )
    )

  const activity:
    ActivityItem[] =
    activityRows
      .map(
        (event) => {
          const activityUser =
            profileById.get(
              event.user_id
            )

          const activityCard =
            activityCardById.get(
              event.card_id
            )

          if (
            !activityUser ||
            !activityCard
          ) {
            return null
          }

          return {
            eventId:
              event.id,

            eventType:
              event.event_type,

            user:
              activityUser,

            card:
              activityCard,

            createdAt:
              event.created_at,
          }
        }
      )
      .filter(
        (
          item
        ): item is ActivityItem =>
          item !== null
      )

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
          LostBinder Social
        </p>

        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          Friends
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
          See what your friends are loving,
          discover their binders, and send
          Pokémon cards to each other.
        </p>

        <FriendsClient
          currentUserId={
            user.id
          }
          accepted={
            accepted
          }
          incoming={
            incoming
          }
          outgoing={
            outgoing
          }
          sentToYou={
            sentToYou
          }
          activity={
            activity
          }
        />
      </div>
    </main>
  )
}