import type {
  Metadata,
  Viewport,
} from 'next'

import Link from 'next/link'
import { Geist } from 'next/font/google'

import './globals.css'

import MobileNav
  from '@/app/components/mobile-nav'

import {
  createClient,
} from '@/lib/supabase/server'

const geist = Geist({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'LostBinder',
  description:
    'Discover and collect Pokémon cards',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  let socialNotificationCount =
    0

  let username:
    string | null = null

  if (user) {
    const [
      unreadSharesResult,
      friendRequestsResult,
      profileResult,
    ] = await Promise.all([
      supabase
        .from('card_shares')
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'recipient_id',
          user.id
        )
        .is(
          'read_at',
          null
        ),

      supabase
        .from('friendships')
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'addressee_id',
          user.id
        )
        .eq(
          'status',
          'pending'
        ),

      supabase
        .from('profiles')
        .select('username')
        .eq(
          'id',
          user.id
        )
        .maybeSingle(),
    ])

    socialNotificationCount =
      (unreadSharesResult.count ??
        0) +
      (friendRequestsResult.count ??
        0)

    username =
      profileResult.data
        ?.username ??
      null
  }

  const accountLabel =
    username
      ? `@${username}`
      : user
        ? 'Account'
        : 'Log In'

  return (
    <html lang="en">

    <head>
      <meta
        name="impact-site-verification"
        content="bfbd643e-5a15-4c5e-85b7-61ce28ca7598"
      />
    </head>

      <body
        className={
          geist.className
        }
      >
        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur">

          {/* Desktop */}
          <nav className="mx-auto hidden max-w-[1400px] items-center gap-5 px-4 py-3 md:flex">
            <Link
              href="/"
              className="shrink-0 text-[22px] font-bold tracking-[-0.04em] text-white"
            >
              LostBinder
            </Link>

            <div className="flex items-center gap-5">
              <Link
                href="/explore"
                className="text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                Discover
              </Link>

              <Link
                href="/sets"
                className="text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                Sets
              </Link>

              {user ? (
                <Link
                  href="/friends"
                  className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  <span>
                    Friends
                  </span>

                  {socialNotificationCount >
                  0 ? (
                    <span className="flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {socialNotificationCount >
                      99
                        ? '99+'
                        : socialNotificationCount}
                    </span>
                  ) : null}
                </Link>
              ) : null}

              {user ? (
                <Link
                  href="/collection"
                  className="text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  My Binder
                </Link>
              ) : null}
            </div>

            <form
              action="/search"
              method="get"
              className="ml-auto w-full max-w-sm"
            >
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-600">
                  ⌕
                </span>

                <input
                  type="search"
                  name="q"
                  placeholder="Search Pokémon, artist, set, year..."
                  className="w-full rounded-full border border-white/10 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/30"
                />
              </div>
            </form>

            <Link
              href={
                user
                  ? '/account'
                  : '/auth/login'
              }
              className="shrink-0 text-sm font-medium text-zinc-300 transition hover:text-white"
            >
              {accountLabel}
            </Link>
          </nav>

          {/* Mobile */}
          <MobileNav
            isLoggedIn={
              Boolean(user)
            }
            username={
              username
            }
            socialNotificationCount={
              socialNotificationCount
            }
          />
        </header>

        {children}
      </body>
    </html>
  )
}