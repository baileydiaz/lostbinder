import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
}

if (!supabaseSecretKey) {
  throw new Error('Missing SUPABASE_SECRET_KEY in .env.local')
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const DATA_ROOT = path.join(
  process.cwd(),
  '..',
  'tcgdex-data',
  'data'
)

const ASSET_ROOT = 'https://assets.tcgdex.net/en'

function english(value: any): string | null {
  if (value == null) return null

  if (typeof value === 'string') return value

  if (typeof value === 'object') {
    if (typeof value.en === 'string') {
      return value.en
    }

    const first = Object.values(value).find(
      (v) => typeof v === 'string'
    )

    return typeof first === 'string' ? first : null
  }

  return String(value)
}

function removeThirdParty(value: any): any {
  if (Array.isArray(value)) {
    return value.map(removeThirdParty)
  }

  if (value && typeof value === 'object') {
    const result: Record<string, any> = {}

    for (const [key, child] of Object.entries(value)) {
      if (key === 'thirdParty') continue
      if (key === 'set' || key === 'serie') continue

      result[key] = removeThirdParty(child)
    }

    return result
  }

  return value
}

/**
 * Reads a TCGdex .ts data file as text instead of dynamically importing it.
 * This avoids Windows EMFILE / "too many open files" errors from tsx.
 */
function loadModule(filePath: string) {
  const source = fs.readFileSync(filePath, 'utf8')

  const match = source.match(
    /const\s+\w+\s*:\s*(?:Card|Set|Serie)\s*=\s*({[\s\S]*?})\s*;?\s*export default/
  )

  if (!match) {
    throw new Error(`Could not parse ${filePath}`)
  }

  let objectText = match[1]

  // Card files often contain: set: Set,
  // Set files often contain: serie: serie,
  // Replace ONLY those property values. Do not globally replace the
  // words "Set" or "serie", because that would corrupt names such as
  // "Base Set".
  objectText = objectText
    .replace(/(\bset\s*:\s*)Set\b/g, '$1null')
    .replace(/(\bserie\s*:\s*)serie\b/g, '$1null')

  try {
    return Function(
      `"use strict"; return (${objectText})`
    )()
  } catch (error) {
    throw new Error(
      `Could not evaluate ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

async function upsertChunks(
  table: string,
  rows: any[],
  chunkSize = 200
) {
  if (rows.length === 0) return

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)

    const { error } = await supabase
      .from(table)
      .upsert(chunk)

    if (error) {
      throw new Error(
        `${table} import failed: ${error.message}`
      )
    }

    console.log(
      `  ${table}: ${Math.min(i + chunk.length, rows.length)}/${rows.length}`
    )
  }
}

function normalizeVariants(
  cardId: string,
  variants: any
) {
  const output: any[] = []

  if (!variants) return output

  // Newer TCGdex variant-array format
  if (Array.isArray(variants)) {
    for (const variant of variants) {
      output.push({
        card_id: cardId,
        variant_type: variant.type ?? 'unknown',
        subtype: variant.subtype ?? null,
        stamps: Array.isArray(variant.stamp)
          ? variant.stamp
          : null,
        foil: variant.foil ?? null,
        languages: Array.isArray(variant.languages)
          ? variant.languages
          : null,
      })
    }

    return output
  }

  // Older TCGdex boolean-object format
  if (typeof variants === 'object') {
    for (const [variantType, enabled] of Object.entries(variants)) {
      if (enabled === true) {
        output.push({
          card_id: cardId,
          variant_type: variantType,
          subtype: null,
          stamps: null,
          foil: null,
          languages: null,
        })
      }
    }
  }

  return output
}

async function main() {
  console.log('LostBinder TCGdex local importer')
  console.log('--------------------------------')
  console.log(`Reading: ${DATA_ROOT}`)
  console.log('')

  if (!fs.existsSync(DATA_ROOT)) {
    throw new Error(
      `TCGdex data folder not found: ${DATA_ROOT}`
    )
  }

  const seriesRows: any[] = []
  const setRows: any[] = []
  const cardRows: any[] = []
  const variantRows: any[] = []

  // Important: folder names such as "Scarlet & Violet" are NOT always
  // the same as the real TCGdex series ID. We build this map from the
  // root series files first.
  const seriesIdByFolder = new Map<string, string>()

  const rootItems = fs.readdirSync(DATA_ROOT, {
    withFileTypes: true,
  })

  const seriesFiles = rootItems
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.ts')
    )
    .map((entry) =>
      path.join(DATA_ROOT, entry.name)
    )

  console.log(
    `Found ${seriesFiles.length} series definitions.`
  )

  for (const seriesFile of seriesFiles) {
    try {
      const serie = loadModule(seriesFile)

      if (!serie?.id) {
        console.warn(
          `Skipping series without ID: ${seriesFile}`
        )
        continue
      }

      seriesRows.push({
        id: serie.id,
        name: english(serie.name) ?? serie.id,
      })

      const folderName = path.basename(
        seriesFile,
        '.ts'
      )

      seriesIdByFolder.set(
        folderName,
        serie.id
      )
    } catch (error) {
      console.error(
        `Could not read series ${seriesFile}:`,
        error
      )
    }
  }

  console.log(`Loaded ${seriesRows.length} series.`)

  const seriesDirectories = rootItems.filter(
    (entry) => entry.isDirectory()
  )

  for (const seriesDirectory of seriesDirectories) {
    const seriesId = seriesIdByFolder.get(
      seriesDirectory.name
    )

    if (!seriesId) {
      console.warn(
        `Skipping directory "${seriesDirectory.name}" because no matching series definition was loaded.`
      )
      continue
    }

    const seriesDirPath = path.join(
      DATA_ROOT,
      seriesDirectory.name
    )

    const setEntries = fs.readdirSync(
      seriesDirPath,
      { withFileTypes: true }
    )

    const setFiles = setEntries.filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.ts')
    )

    console.log(
      `\nSeries: ${seriesDirectory.name} [${seriesId}] (${setFiles.length} sets)`
    )

    for (const setEntry of setFiles) {
      const setFilePath = path.join(
        seriesDirPath,
        setEntry.name
      )

      try {
        const set = loadModule(setFilePath)

        if (!set?.id) {
          console.warn(
            `Skipping set without ID: ${setEntry.name}`
          )
          continue
        }

        const setFolderName = path.basename(
          setEntry.name,
          '.ts'
        )

        const cardDirectory = path.join(
          seriesDirPath,
          setFolderName
        )

        let cardFiles: string[] = []

        if (fs.existsSync(cardDirectory)) {
          cardFiles = fs
            .readdirSync(cardDirectory)
            .filter((file) => file.endsWith('.ts'))
        }

        setRows.push({
          id: set.id,
          series_id: seriesId,
          name: english(set.name) ?? set.id,
          release_date:
            english(set.releaseDate) ?? null,
          total_official:
            set.cardCount?.official ?? null,
          total_cards: cardFiles.length,
        })

        console.log(
          `  ${english(set.name) ?? set.id}: ${cardFiles.length} cards`
        )

        for (const cardFile of cardFiles) {
          const cardFilePath = path.join(
            cardDirectory,
            cardFile
          )

          try {
            const card = loadModule(cardFilePath)

            const localId = path.basename(
              cardFile,
              '.ts'
            )

            const cardId = `${set.id}-${localId}`

            const imageUrl =
              `${ASSET_ROOT}/${encodeURIComponent(seriesId)}/${encodeURIComponent(set.id)}/${encodeURIComponent(localId)}/high.webp`

            cardRows.push({
              id: cardId,
              set_id: set.id,
              local_id: localId,
              name:
                english(card.name) ??
                `Card ${localId}`,

              category:
                card.category ?? null,

              rarity:
                card.rarity ?? null,

              illustrator:
                card.illustrator ?? null,

              dex_ids:
                Array.isArray(card.dexId)
                  ? card.dexId
                  : null,

              hp:
                typeof card.hp === 'number'
                  ? card.hp
                  : null,

              types:
                Array.isArray(card.types)
                  ? card.types
                  : null,

              evolve_from:
                english(card.evolveFrom),

              description:
                english(card.description),

              stage:
                card.stage ?? null,

              suffix:
                card.suffix ?? null,

              regulation_mark:
                card.regulationMark ?? null,

              abilities:
                card.abilities
                  ? removeThirdParty(card.abilities)
                  : null,

              attacks:
                card.attacks
                  ? removeThirdParty(card.attacks)
                  : null,

              weaknesses:
                card.weaknesses
                  ? removeThirdParty(card.weaknesses)
                  : null,

              resistances:
                card.resistances
                  ? removeThirdParty(card.resistances)
                  : null,

              retreat:
                typeof card.retreat === 'number'
                  ? card.retreat
                  : null,

              image_url: imageUrl,
              language: 'en',

              source_data:
                removeThirdParty(card),

              updated_at:
                new Date().toISOString(),
            })

            variantRows.push(
              ...normalizeVariants(
                cardId,
                card.variants
              )
            )
          } catch (error) {
            console.error(
              `    Failed card ${cardFilePath}:`,
              error
            )
          }
        }
      } catch (error) {
        console.error(
          `  Failed set ${setFilePath}:`,
          error
        )
      }
    }
  }

  console.log('\n--------------------------------')
  console.log('Parsed:')
  console.log(`Series:   ${seriesRows.length}`)
  console.log(`Sets:     ${setRows.length}`)
  console.log(`Cards:    ${cardRows.length}`)
  console.log(`Variants: ${variantRows.length}`)
  console.log('--------------------------------\n')

  console.log('Uploading series...')
  await upsertChunks(
    'series',
    seriesRows
  )

  console.log('\nUploading sets...')
  await upsertChunks(
    'sets',
    setRows
  )

  console.log('\nUploading cards...')
  await upsertChunks(
    'cards',
    cardRows,
    100
  )

  console.log(
    '\nClearing existing source variants...'
  )

  const { error: deleteVariantError } =
    await supabase
      .from('card_variants')
      .delete()
      .gte('id', 0)

  if (deleteVariantError) {
    throw new Error(
      `Could not clear variants: ${deleteVariantError.message}`
    )
  }

  console.log('\nUploading variants...')

  if (variantRows.length > 0) {
    for (
      let i = 0;
      i < variantRows.length;
      i += 300
    ) {
      const chunk =
        variantRows.slice(i, i + 300)

      const { error } =
        await supabase
          .from('card_variants')
          .insert(chunk)

      if (error) {
        throw new Error(
          `Variant import failed: ${error.message}`
        )
      }

      console.log(
        `  card_variants: ${Math.min(
          i + chunk.length,
          variantRows.length
        )}/${variantRows.length}`
      )
    }
  }

  console.log('\n✅ IMPORT COMPLETE')
  console.log(
    `${cardRows.length} cards are now in LostBinder.`
  )
}

main().catch((error) => {
  console.error('\n❌ IMPORT FAILED')
  console.error(error)
  process.exit(1)
})
