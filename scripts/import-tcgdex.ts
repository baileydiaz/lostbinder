import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY
)

const TCGDEX = 'https://api.tcgdex.net/v2/en'

interface TCGdexSeries {
  id: string
  name: string
}

interface TCGdexSetBrief {
  id: string
  name: string
}

interface TCGdexSet {
  id: string
  name: string

  logo?: string
  symbol?: string
  releaseDate?: string

  serie?: {
    id: string
    name: string
  }

  cardCount?: {
    total?: number
    official?: number
  }

  cards?: Array<{
    id: string
    localId: string | number
    name: string
    image?: string
  }>
}

interface TCGdexCard {
  id: string
  localId: string | number
  name: string

  category?: string
  illustrator?: string
  rarity?: string
  image?: string

  dexId?: number[]
  hp?: number
  types?: string[]

  stage?: string
  suffix?: string
  evolveFrom?: string
  description?: string

  regulationMark?: string

  trainerType?: string
  energyType?: string

  variants?: Record<string, boolean>

  set: {
    id: string
  }
}

async function fetchJSON<T>(
  url: string,
  retries = 5
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()

      const timeout = setTimeout(() => {
        controller.abort()
      }, 30000)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LostBinder/1.0',
          Accept: 'application/json',
        },
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error) {
      console.error(
        `Request failed (${attempt}/${retries}): ${url}`
      )

      if (attempt === retries) {
        throw error
      }

      // Wait progressively longer:
      // 2s, 4s, 6s, 8s...
      await new Promise((resolve) =>
        setTimeout(resolve, attempt * 2000)
      )
    }
  }

  throw new Error('Unexpected fetch failure')
}

async function importSeries() {
  console.log('Fetching series...')

  const series =
    await fetchJSON<TCGdexSeries[]>(`${TCGDEX}/series`)

  for (const serie of series) {
    const { error } = await supabase
      .from('series')
      .upsert(
        {
          id: serie.id,
          name: serie.name,
        },
        {
          onConflict: 'id',
        }
      )

    if (error) {
      throw new Error(
        `Series ${serie.id}: ${error.message}`
      )
    }
  }

  console.log(`Imported ${series.length} series.`)
}

async function importSets() {
  console.log('Fetching sets...')

  const setList =
    await fetchJSON<TCGdexSetBrief[]>(`${TCGDEX}/sets`)

  for (let i = 0; i < setList.length; i++) {
    const brief = setList[i]

    console.log(
      `[SET ${i + 1}/${setList.length}] ${brief.name}`
    )

    const set =
      await fetchJSON<TCGdexSet>(
        `${TCGDEX}/sets/${brief.id}`
      )

    /*
     * Make sure the referenced series exists.
     * This also protects us if TCGdex returns a series
     * that wasn't present in the initial series list.
     */
    if (set.serie) {
      const { error: seriesError } = await supabase
        .from('series')
        .upsert(
          {
            id: set.serie.id,
            name: set.serie.name,
          },
          {
            onConflict: 'id',
          }
        )

      if (seriesError) {
        throw new Error(
          `Series ${set.serie.id}: ${seriesError.message}`
        )
      }
    }

    const { error } = await supabase
      .from('sets')
      .upsert(
        {
          id: set.id,
          series_id: set.serie?.id ?? null,

          name: set.name,
          release_date: set.releaseDate ?? null,

          total_official:
            set.cardCount?.official ?? null,

          total_cards:
            set.cardCount?.total ?? null,

          logo_url: set.logo ?? null,
          symbol_url: set.symbol ?? null,
        },
        {
          onConflict: 'id',
        }
      )

    if (error) {
      throw new Error(
        `Set ${set.id}: ${error.message}`
      )
    }
  }

  console.log(`Imported ${setList.length} sets.`)
}

async function importCards() {
  console.log('Fetching card list...')

  /*
   * /cards only gives the brief representation.
   *
   * We then fetch each individual card because that
   * response contains illustrator, rarity, variants,
   * Pokédex IDs, HP, types, etc.
   */

  const cards =
    await fetchJSON<Array<{
      id: string
      localId: string | number
      name: string
    }>>(`${TCGDEX}/cards`)

  console.log(`Found ${cards.length} cards.`)

  for (let i = 0; i < cards.length; i++) {
    const brief = cards[i]

    try {
      console.log(
        `[CARD ${i + 1}/${cards.length}] ${brief.id} - ${brief.name}`
      )

      const card =
        await fetchJSON<TCGdexCard>(
          `${TCGDEX}/cards/${brief.id}`
        )

      const { error: cardError } = await supabase
        .from('cards')
        .upsert(
          {
            id: card.id,
            set_id: card.set.id,

            local_id: String(card.localId),
            name: card.name,

            category: card.category ?? null,
            rarity: card.rarity ?? null,
            illustrator: card.illustrator ?? null,

            dex_ids: card.dexId ?? null,

            hp: card.hp ?? null,
            types: card.types ?? null,

            stage: card.stage ?? null,
            suffix: card.suffix ?? null,

            evolve_from:
              card.evolveFrom ?? null,

            description:
              card.description ?? null,

            regulation_mark:
              card.regulationMark ?? null,

            trainer_type:
              card.trainerType ?? null,

            energy_type:
              card.energyType ?? null,

            /*
             * TCGdex image URLs don't contain an extension.
             * Adding /high.webp gives us a usable card image.
             */
            image_url: card.image
              ? `${card.image}/high.webp`
              : null,

            language: 'en',

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: 'id',
          }
        )

      if (cardError) {
        throw new Error(cardError.message)
      }

      /*
       * Store every TRUE variant returned by TCGdex.
       *
       * This deliberately doesn't hard-code only
       * normal/holo/reverse/firstEdition.
       *
       * If TCGdex adds another variant later,
       * LostBinder can store it automatically.
       */
      if (card.variants) {
        const variants = Object.entries(card.variants)
          .filter(([, available]) => available)
          .map(([variant]) => ({
            card_id: card.id,
            variant_type: variant,
          }))

        if (variants.length > 0) {
          const { error: variantError } =
            await supabase
              .from('card_variants')
              .upsert(
                variants,
                {
                  onConflict:
                    'card_id,variant_type',
                }
              )

          if (variantError) {
            throw new Error(
              `Variants: ${variantError.message}`
            )
          }
        }
      }
    } catch (error) {
      console.error(
        `FAILED ${brief.id}:`,
        error
      )

      /*
       * Keep importing the rest instead of losing
       * hours of progress because one card failed.
       */
    }
  }
}

async function main() {
  console.log('==============================')
  console.log('LostBinder TCGdex Import')
  console.log('==============================')

  await importSeries()
  await importSets()
  await importCards()

  console.log('')
  console.log('==============================')
  console.log('Import complete!')
  console.log('==============================')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})