import { createClient } from '@/lib/supabase/server'

type DB = Awaited<ReturnType<typeof createClient>>

export type RecommendedCard = {
  id: string
  local_id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
  set_id: string
  category: string | null
  set_name: string
  recommendation_reason?: string
}

type Reaction = { card_id: string; reaction: string }
type Favorite = { card_id: string }
type BaseCard = Omit<RecommendedCard, 'set_name' | 'recommendation_reason'>

const fields = 'id, local_id, name, rarity, illustrator, image_url, set_id, category'
const norm = (value: string | null | undefined) => (value ?? '').trim().toLowerCase()

// Phase 1: content-based scoring with explicit discovery and set diversity.
// No new tables, API keys, or model training required.
export async function getRecommendations(
  supabase: DB,
  userId: string | null,
  limit = 50,
): Promise<RecommendedCard[]> {
  let reactions: Reaction[] = []
  let favorites: Favorite[] = []
  let dismissed: Favorite[] = []

  if (userId) {
    const [r, f, d] = await Promise.all([
      supabase.from('card_reactions').select('card_id, reaction').eq('user_id', userId).limit(2000),
      supabase.from('card_favorites').select('card_id').eq('user_id', userId).limit(2000),
      supabase.from('card_dismissals').select('card_id').eq('user_id', userId).limit(2000),
    ])
    if (r.error) console.error('Recommendation reactions:', r.error.message)
    if (f.error) console.error('Recommendation favorites:', f.error.message)
    if (d.error) console.error('Recommendation dismissals:', d.error.message)
    reactions = (r.data ?? []) as Reaction[]
    favorites = (f.data ?? []) as Favorite[]
    dismissed = (d.data ?? []) as Favorite[]
  }

  const hidden = new Set([
    ...reactions.map(r => r.card_id),
    ...favorites.map(f => f.card_id),
    ...dismissed.map(d => d.card_id),
  ])
  const signalIds = [...new Set([
    ...reactions.filter(r => r.reaction === 'like' || r.reaction === 'love').map(r => r.card_id),
    ...favorites.map(f => f.card_id),
  ])].slice(0, 250)

  let signals: BaseCard[] = []
  if (signalIds.length) {
    const result = await supabase.from('cards').select(fields).in('id', signalIds)
    if (result.error) console.error('Recommendation signals:', result.error.message)
    signals = (result.data ?? []) as BaseCard[]
  }

  const favoritesSet = new Set(favorites.map(f => f.card_id))
  const reactionMap = new Map(reactions.map(r => [r.card_id, r.reaction]))
  const illustratorWeights = new Map<string, number>()
  const pokemonWeights = new Map<string, number>()
  const rarityWeights = new Map<string, number>()
  const setWeights = new Map<string, number>()
  const bump = (map: Map<string, number>, key: string, weight: number) => {
    if (key) map.set(key, (map.get(key) ?? 0) + weight)
  }

  for (const card of signals) {
    const weight = favoritesSet.has(card.id) ? 4 : reactionMap.get(card.id) === 'love' ? 3 : 1
    bump(illustratorWeights, norm(card.illustrator), weight)
    bump(pokemonWeights, norm(card.name), weight)
    bump(rarityWeights, norm(card.rarity), weight)
    bump(setWeights, card.set_id, weight)
  }

  const strongest = (map: Map<string, number>, count: number) =>
    [...map].sort((a, b) => b[1] - a[1]).slice(0, count).map(([key]) => key)
  const preferredSets = strongest(setWeights, 12)
  const preferredArtists = strongest(illustratorWeights, 8)
  const preferredPokemon = strongest(pokemonWeights, 8)

  const requests = [
    supabase.rpc('get_random_pokemon_cards', { limit_count: 250 }),
    ...(preferredSets.length ? [supabase.from('cards').select(fields).eq('category', 'Pokemon').not('image_url', 'is', null).in('set_id', preferredSets).limit(220)] : []),
    ...(preferredArtists.length ? [supabase.from('cards').select(fields).eq('category', 'Pokemon').not('image_url', 'is', null).in('illustrator', preferredArtists).limit(180)] : []),
    ...(preferredPokemon.length ? [supabase.from('cards').select(fields).eq('category', 'Pokemon').not('image_url', 'is', null).in('name', preferredPokemon).limit(150)] : []),
  ]
  const results = await Promise.all(requests)
  const candidates = new Map<string, BaseCard>()
  for (const result of results) {
    if (result.error) {
      console.error('Recommendation candidates:', result.error.message)
      continue
    }
    for (const card of (result.data ?? []) as BaseCard[]) {
      if (card.id && card.image_url && card.category === 'Pokemon' && !hidden.has(card.id)) candidates.set(card.id, card)
    }
  }

  const setIds = [...new Set([...candidates.values()].map(card => card.set_id))]
  const setNames = new Map<string, string>()
  if (setIds.length) {
    const { data, error } = await supabase.from('sets').select('id, name').in('id', setIds)
    if (error) console.error('Recommendation set names:', error.message)
    for (const set of data ?? []) setNames.set(set.id, set.name)
  }

  const scored = [...candidates.values()].map(card => {
    const artist = illustratorWeights.get(norm(card.illustrator)) ?? 0
    const pokemon = pokemonWeights.get(norm(card.name)) ?? 0
    const rarity = rarityWeights.get(norm(card.rarity)) ?? 0
    const set = setWeights.get(card.set_id) ?? 0
    const bounded = (n: number) => Math.min(1, n / 6)
    const score = 35 * bounded(artist) + 25 * bounded(pokemon) + 15 * bounded(rarity) + 15 * bounded(set)
    const reason = artist > 0 ? `More from ${card.illustrator}`
      : pokemon > 0 ? `Because you like ${card.name}`
      : rarity > 0 ? `Because you like ${card.rarity}`
      : set > 0 ? `More from ${setNames.get(card.set_id) ?? 'a set you like'}`
      : 'Something new to discover'
    return { ...card, set_name: setNames.get(card.set_id) ?? card.set_id, recommendation_reason: reason, score }
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))

  // 80% personalized, 20% discovery; cap each set/illustrator per feed.
  const personalized = scored.filter(card => card.score > 0)
  const discovery = scored.filter(card => card.score === 0)
  const output: RecommendedCard[] = []
  const used = new Set<string>()
  const setCounts = new Map<string, number>()
  const artistCounts = new Map<string, number>()
  const take = (pool: typeof scored, allowRepeat = false) => {
    const card = pool.find(c => !used.has(c.id) && (allowRepeat || (
      (setCounts.get(c.set_id) ?? 0) < Math.max(3, Math.ceil(limit / 8)) &&
      (!c.illustrator || (artistCounts.get(c.illustrator) ?? 0) < Math.max(3, Math.ceil(limit / 7)))
    )))
    if (!card) return false
    used.add(card.id)
    setCounts.set(card.set_id, (setCounts.get(card.set_id) ?? 0) + 1)
    if (card.illustrator) artistCounts.set(card.illustrator, (artistCounts.get(card.illustrator) ?? 0) + 1)
    const { score: _score, ...recommended } = card
    output.push(recommended)
    return true
  }
  while (output.length < limit) {
    const shouldExplore = output.length % 5 === 4 || !personalized.length
    if (!(shouldExplore ? take(discovery) : take(personalized)) &&
        !take(shouldExplore ? personalized : discovery) &&
        !take(scored, true)) break
  }
  return output
}
