import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

type SetRow = {
  id: string
  name: string
  release_date: string | null
  total_cards: number | null
}

export default async function SetsPage() {
  const supabase = await createClient()

  const {
    data: setsData,
    error,
  } = await supabase
    .from('sets')
    .select(`
      id,
      name,
      release_date,
      total_cards
    `)
    .order('release_date', {
      ascending: false,
      nullsFirst: false,
    })

  if (error) {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white">
        <div className="mx-auto max-w-[1400px]">
          <h1 className="text-4xl font-semibold tracking-tight">
            Sets
          </h1>

          <p className="mt-4 text-sm text-red-400">
            Could not load sets.
          </p>

          <p className="mt-2 text-xs text-zinc-600">
            {error.message}
          </p>
        </div>
      </main>
    )
  }

  const sets =
    (setsData ?? []) as SetRow[]

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">
            Browse
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Pokémon Sets
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            {sets.length}{' '}
            {sets.length === 1
              ? 'set'
              : 'sets'}
          </p>
        </div>

        {sets.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-white/10 bg-zinc-950 px-6 py-16 text-center">
            <h2 className="text-xl font-semibold">
              No sets found.
            </h2>

            <p className="mt-2 text-sm text-zinc-600">
              Pokémon sets will appear here once they&apos;re added to LostBinder.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sets.map((set) => {
              const year =
                set.release_date
                  ? new Date(
                      set.release_date
                    ).getFullYear()
                  : null

              return (
                <Link
                  key={set.id}
                  href={`/sets/${set.id}`}
                  className="group rounded-2xl border border-white/10 bg-zinc-950 p-5 transition hover:border-white/25 hover:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-zinc-200 transition group-hover:text-white">
                        {set.name}
                      </h2>

                      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                        {year ? (
                          <span>
                            {year}
                          </span>
                        ) : null}

                        {year &&
                        set.total_cards ? (
                          <span className="text-zinc-800">
                            •
                          </span>
                        ) : null}

                        {set.total_cards ? (
                          <span>
                            {set.total_cards}{' '}
                            cards
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <span className="text-zinc-700 transition group-hover:translate-x-1 group-hover:text-white">
                      →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}