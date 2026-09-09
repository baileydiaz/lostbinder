'use client'

import Link from 'next/link'

import {
  useEffect,
  useState,
} from 'react'

type Props = {
  isLoggedIn: boolean
  username: string | null
  socialNotificationCount: number
}

export default function MobileNav({
  isLoggedIn,
  username,
  socialNotificationCount,
}: Props) {
  const [
    open,
    setOpen,
  ] = useState(false)

  function closeMenu() {
    setOpen(false)
  }

  useEffect(() => {
    if (!open) {
      document.body.style
        .overflow = ''

      return
    }

    document.body.style
      .overflow = 'hidden'

    return () => {
      document.body.style
        .overflow = ''
    }
  }, [open])

  const accountLabel =
    username
      ? `@${username}`
      : isLoggedIn
        ? 'Account'
        : 'Log In'

  return (
    <div className="md:hidden">

      {/* Header */}
      <div className="mx-auto max-w-[1400px] px-4 py-3">

        {/* Top row */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="shrink-0 text-[21px] font-bold tracking-[-0.04em] text-white"
          >
            LostBinder
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/explore"
              className="text-sm font-semibold text-white transition hover:text-zinc-300"
            >
              Explore
            </Link>

            {isLoggedIn ? (
              <Link
                href="/account"
                className="max-w-[105px] truncate text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                {accountLabel}
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() =>
                setOpen(true)
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

      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={
          closeMenu
        }
        className={`fixed inset-0 z-[60] bg-black/65 backdrop-blur-[2px] transition-opacity duration-200 ${
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Side drawer */}
      <aside
        className={`fixed right-0 top-0 z-[70] flex h-dvh w-[82%] max-w-[320px] flex-col border-l border-white/10 bg-zinc-950 shadow-2xl transition-transform duration-200 ease-out ${
          open
            ? 'translate-x-0'
            : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <span className="text-base font-semibold text-white">
            Menu
          </span>

          <button
            type="button"
            onClick={
              closeMenu
            }
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-xl text-zinc-400 transition hover:border-white/25 hover:text-white"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-1 flex-col px-5 py-3">
          <Link
            href="/explore"
            onClick={
              closeMenu
            }
            className="flex min-h-14 items-center border-b border-white/5 text-sm font-medium text-white"
          >
            Explore
          </Link>

          <Link
            href="/sets"
            onClick={
              closeMenu
            }
            className="flex min-h-14 items-center border-b border-white/5 text-sm font-medium text-zinc-300 transition hover:text-white"
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
                className="flex min-h-14 items-center justify-between border-b border-white/5 text-sm font-medium text-zinc-300 transition hover:text-white"
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
                className="flex min-h-14 items-center border-b border-white/5 text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                Favorites
              </Link>

              <Link
                href="/account"
                onClick={
                  closeMenu
                }
                className="flex min-h-14 items-center border-b border-white/5 text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                {accountLabel}
              </Link>
            </>
          ) : (
            <Link
              href="/auth/login"
              onClick={
                closeMenu
              }
              className="flex min-h-14 items-center border-b border-white/5 text-sm font-medium text-zinc-300 transition hover:text-white"
            >
              Log In
            </Link>
          )}

          <Link
            href="/"
            onClick={
              closeMenu
            }
            className="flex min-h-14 items-center text-sm font-medium text-zinc-500 transition hover:text-white"
          >
            Home
          </Link>
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs text-zinc-700">
            Discover cards you love.
          </p>
        </div>
      </aside>
    </div>
  )
}