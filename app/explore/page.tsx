import { createClient } from '@/lib/supabase/server'
import ExploreDeck from './explore-deck'

export const dynamic = 'force-dynamic'

type Card = {
  id: string
  local_id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
  set_id: string
  category: string | null
}

type SetInfo = {
  id: string
  name: string
}

type ExploreCardData = Card & {
  set_name: string
}

function shuffle<T>(items: T[]) {
  const array = [...items]

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }

  return array
}

export default async function ExplorePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: rawSets, error: setsError } = await supabase
    .from('sets')
    .select('id, name')

  if (setsError) {
    return (
      <main
        style={{
          maxWidth: '700px',
          margin: '0 auto',
          padding: '40px 20px',
        }}
      >
        <h1>Discover</h1>
        <p>Could not load Pokémon sets.</p>
        <p>{setsError.message}</p>
      </main>
    )
  }

  const filteredSets = ((rawSets ?? []) as SetInfo[]).filter(
    (set) => {
      const name = set.name.toLowerCase()

      return (
        !name.includes('trainer kit') &&
        !name.includes('trainer gallery') &&
        !name.includes("mcdonald") &&
        !name.includes('my first battle') &&
        !name.includes('energy')
      )
    }
  )

  const randomizedSets = shuffle(filteredSets)
  const chosenSets = randomizedSets.slice(0, 50)

  let pool: ExploreCardData[] = []

  for (const set of chosenSets) {
    const { data: cards } = await supabase
      .from('cards')
      .select(`
        id,
        local_id,
        name,
        rarity,
        illustrator,
        image_url,
        set_id,
        category
      `)
      .eq('set_id', set.id)
      .in('category', ['Pokemon', 'Pokémon'])
      .not('image_url', 'is', null)
      .limit(12)

    const mapped = ((cards ?? []) as Card[]).map(
      (card) => ({
        ...card,
        set_name: set.name,
      })
    )

    pool.push(...mapped)
  }

  pool = shuffle(pool)

  const selected: ExploreCardData[] = []
  const usedSets = new Set<string>()
  const usedArtists = new Set<string>()

  for (const card of pool) {
    if (selected.length >= 36) break

    const artist = card.illustrator?.trim()

    if (usedSets.has(card.set_id)) continue

    if (artist && usedArtists.has(artist)) {
      continue
    }

    selected.push(card)
    usedSets.add(card.set_id)

    if (artist) {
      usedArtists.add(artist)
    }
  }

  for (const card of pool) {
    if (selected.length >= 60) break

    const alreadySelected = selected.some(
      (selectedCard) =>
        selectedCard.id === card.id
    )

    if (alreadySelected) continue

    const artist = card.illustrator?.trim()

    if (artist && usedArtists.has(artist)) {
      continue
    }

    selected.push(card)

    if (artist) {
      usedArtists.add(artist)
    }
  }

  for (const card of pool) {
    if (selected.length >= 80) break

    const alreadySelected = selected.some(
      (selectedCard) =>
        selectedCard.id === card.id
    )

    if (alreadySelected) continue

    selected.push(card)
  }

  let favoriteIds = new Set<string>()

  if (user && selected.length > 0) {
    const { data: favorites } = await supabase
      .from('card_favorites')
      .select('card_id')
      .eq('user_id', user.id)
      .in(
        'card_id',
        selected.map((card) => card.id)
      )

    favoriteIds = new Set(
      favorites?.map(
        (favorite) => favorite.card_id
      ) ?? []
    )
  }

  const deckCards = selected
    .filter(
      (
        card
      ): card is ExploreCardData & {
        image_url: string
      } => Boolean(card.image_url)
    )
    .map((card) => ({
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      illustrator: card.illustrator,
      image_url: card.image_url,
      set_id: card.set_id,
      set_name: card.set_name,
    }))

  return (
    <main
      style={{
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px 16px 80px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: '20px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(30px, 7vw, 40px)',
          }}
        >
          Discover
        </h1>

        <p
          style={{
            marginTop: '8px',
            opacity: 0.65,
          }}
        >
          Find Pokémon cards you love.
        </p>
      </div>

      <ExploreDeck
        cards={deckCards}
        favoriteIds={Array.from(favoriteIds)}
        loggedIn={Boolean(user)}
      />
    </main>
  )
}