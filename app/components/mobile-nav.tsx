'use client'

import Link from 'next/link'
import {
  useState,
} from 'react'

type Props = {
  isLoggedIn: boolean
  socialNotificationCount: number
}

export default function MobileNav({
  isLoggedIn,
  socialNotificationCount,
}: Props) {
  const [
    open,
    setOpen,
  ] = useState(false)

  function closeMenu() {
    setOpen(false)
  }

  return (
    <div className="md:hidden">
      <div className="mx-auto max-w-[1400px] px-4 py-3">

        {/* Top row */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="shrink-0 text-[21px] font-bold tracking-[-0.04em] text-white"
          >
            LostBinder
          </Link>

          <Link
            href="/explore"
            className="ml-auto text-sm font-semibold text-white transition hover:text-zinc-300"
          >
            Explore
          </Link>

          <button
            type="button"
            onClick={() =>
              setOpen(
                (current) =>
                  !current
              )
            }
            aria-label="Open navigation menu"
            aria-expanded={
              open
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-white transition hover:border-white/25"
          >
            <span className="sr-only">
              Menu
            </span>

            <div className="flex flex-col gap-[4px]">
              <span className="block h-[1.5px] w-4 bg-white" />
              <span className="block h-[1.5px] w-4 bg-white" />
              <span className="block h-[1.5px] w-4 bg-white" />
            </div>
          </button>
        </div>

        {/* Search */}
        <form
          action="/search"
          method="get"
          className="mt-3 w-full"
        >
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-600">
              ⌕
            </span>

            <input
              type="search"
              name="q"
              placeholder="Search cards..."
              className="w-full rounded-full border border-white/10 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/30"
            />
          </div>
        </form>
      </div>

      {/* Dropdown */}
      {open ? (
        <div className="border-t border-white/10 bg-black">
          <nav className="mx-auto max-w-[1400px] px-4 py-3">

            <Link
              href="/sets"
              onClick={
                closeMenu
              }
              className="flex min-h-12 items-center border-b border-white/5 text-sm font-medium text-zinc-300 transition hover:text-white"
            >
              Sets
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  href="/friends"
                  onClick={
                    closeMenu
                  }
                  className="flex min-h-12 items-center justify-between border-b border-white/5 text-sm font-medium text-zinc-300 transition hover:text-white"
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

                <Link
                  href="/collection"
                  onClick={
                    closeMenu
                  }
                  className="flex min-h-12 items-center border-b border-white/5 text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  Favorites
                </Link>

                <Link
                  href="/account"
                  onClick={
                    closeMenu
                  }
                  className="flex min-h-12 items-center text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  Account
                </Link>
              </>
            ) : (
              <Link
                href="/auth/login"
                onClick={
                  closeMenu
                }
                className="flex min-h-12 items-center text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                Log In
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </div>
  )
}