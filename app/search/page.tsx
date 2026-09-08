import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

type Props = {
  searchParams: Promise<{
    q?: string
  }>
}

type CardRecord = {
  id: string
  set_id: string
  local_id: string
  name: string
  category: string | null
  rarity: string | null
  illustrator: string | null
  image_url: string | null
}

type SetRecord = {
  id: string
  name: string
  release_date: string | null
}

type SearchResult = CardRecord & {
  set_name: string
  release_date: string | null
}

export default async function SearchPage({
  searchParams,
}: Props) {
  const { q } = await searchParams

  const query = q?.trim() ?? ''

  if (!query) {
    return (
      <main className="min-h-screen bg-black px-5 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-semibold tracking-tight">
            Search
          </h1>

          <p className="mt-3 text-zinc-500">
            Search by Pokémon, artist, set, or year.
          </p>
        </div>
      </main>
    )
  }

  const supabase = await createClient()

  /*
   * Find sets whose name matches the search.
   */
  const {
    data: matchingSetsData,
    error: setSearchError,
  } = await supabase
    .from('sets')
    .select(`
      id,
      name,
      release_date
    `)
    .ilike('name', `%${query}%`)
    .limit(50)

  if (setSearchError) {
    console.error(
      'Could not search sets:',
      setSearchError.message
    )
  }

  /*
   * If the search looks like a year,
   * also find sets released that year.
   */
  let yearSets: SetRecord[] = []

  if (/^\d{4}$/.test(query)) {
    const {
      data,
      error,
    } = await supabase
      .from('sets')
      .select(`
        id,
        name,
        release_date
      `)
      .gte(
        'release_date',
        `${query}-01-01`
      )
      .lte(
        'release_date',
        `${query}-12-31`
      )
      .limit(100)

    if (error) {
      console.error(
        'Could not search release year:',
        error.message
      )
    }

    yearSets =
      (data ?? []) as SetRecord[]
  }

  const matchingSets =
    (matchingSetsData ?? []) as SetRecord[]

  /*
   * Combine set-name matches and
   * year matches.
   */
  const setMap = new Map<
    string,
    SetRecord
  >()

  for (const set of matchingSets) {
    setMap.set(set.id, set)
  }

  for (const set of yearSets) {
    setMap.set(set.id, set)
  }

  const matchingSetIds =
    Array.from(setMap.keys())

  /*
   * Search Pokémon cards by:
   *
   * - Pokémon/card name
   * - illustrator
   *
   * Category is ALWAYS Pokemon.
   */
  const {
    data: directCardsData,
    error: directCardsError,
  } = await supabase
    .from('cards')
    .select(`
      id,
      set_id,
      local_id,
      name,
      category,
      rarity,
      illustrator,
      image_url
    `)
    .eq('category', 'Pokemon')
    .or(
      `name.ilike.%${query}%,illustrator.ilike.%${query}%`
    )
    .not('image_url', 'is', null)
    .limit(100)

  if (directCardsError) {
    console.error(
      'Could not search cards:',
      directCardsError.message
    )
  }

  let setCards: CardRecord[] = []

  /*
   * If the search matched a set or year,
   * grab Pokémon cards belonging to
   * those sets.
   */
  if (matchingSetIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from('cards')
      .select(`
        id,
        set_id,
        local_id,
        name,
        category,
        rarity,
        illustrator,
        image_url
      `)
      .eq('category', 'Pokemon')
      .in(
        'set_id',
        matchingSetIds
      )
      .not('image_url', 'is', null)
      .limit(200)

    if (error) {
      console.error(
        'Could not load cards from matching sets:',
        error.message
      )
    }

    setCards =
      (data ?? []) as CardRecord[]
  }

  /*
   * Remove duplicate cards.
   */
  const cardMap = new Map<
    string,
    CardRecord
  >()

  for (
    const card of
      (directCardsData ?? []) as CardRecord[]
  ) {
    cardMap.set(card.id, card)
  }

  for (const card of setCards) {
    cardMap.set(card.id, card)
  }

  const cards =
    Array.from(cardMap.values())

  /*
   * We also need set information for
   * cards found directly by name/artist.
   */
  const resultSetIds =
    Array.from(
      new Set(
        cards.map(
          (card) => card.set_id
        )
      )
    )

  let resultSets: SetRecord[] = []

  if (resultSetIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from('sets')
      .select(`
        id,
        name,
        release_date
      `)
      .in(
        'id',
        resultSetIds
      )

    if (error) {
      console.error(
        'Could not load set information:',
        error.message
      )
    }

    resultSets =
      (data ?? []) as SetRecord[]
  }

  const resultSetMap =
    new Map(
      resultSets.map(
        (set) => [
          set.id,
          set,
        ]
      )
    )

  const results: SearchResult[] =
    cards.map((card) => {
      const set =
        resultSetMap.get(
          card.set_id
        )

      return {
        ...card,
        set_name:
          set?.name ??
          card.set_id,
        release_date:
          set?.release_date ??
          null,
      }
    })

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-600">
            Search
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Results for &ldquo;{query}&rdquo;
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            {results.length}{' '}
            {results.length === 1
              ? 'card'
              : 'cards'}{' '}
            found
          </p>
        </div>

        {results.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-lg text-zinc-300">
              No Pokémon cards found.
            </p>

            <p className="mt-2 text-sm text-zinc-600">
              Try a Pokémon name, artist,
              set, or release year.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map(
              (card) => (
                <Link
                  key={card.id}
                  href={`/cards/${card.id}`}
                  className="group min-w-0"
                >
                  <div className="overflow-hidden rounded-xl bg-zinc-950">
                    <img
                      src={card.image_url!}
                      alt={card.name}
                      className="aspect-[2.5/3.5] w-full object-contain transition duration-200 group-hover:scale-[1.03]"
                    />
                  </div>

                  <h2 className="mt-3 truncate text-sm font-semibold text-zinc-200 transition group-hover:text-white">
                    {card.name}
                  </h2>

                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {card.set_name}
                  </p>

                  <p className="mt-1 truncate text-xs text-zinc-600">
                    {card.illustrator
                      ? card.illustrator
                      : 'Unknown artist'}

                    {card.release_date
                      ? ` · ${card.release_date.slice(
                          0,
                          4
                        )}`
                      : ''}
                  </p>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </main>
  )
}