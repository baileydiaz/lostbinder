import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Card = {
  id: string
  local_id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
  set_id: string
}

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let cards: Card[] = []
  let title = 'Prismatic Evolutions'
  let subtitle = 'A few cards to explore'

  if (user) {
    const { data: favorites } = await supabase
      .from('card_favorites')
      .select(`
        card_id,
        cards (
          id,
          local_id,
          name,
          rarity,
          illustrator,
          image_url,
          set_id
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false,
      })
      .limit(24)

    cards =
      favorites
        ?.map((favorite: any) => favorite.cards)
        .filter(Boolean) ?? []

    title = 'Your Favorites'
    subtitle =
      cards.length > 0
        ? `${cards.length} favorite cards`
        : 'You have not favorited any cards yet'
  }

  if (!user || cards.length === 0) {
    const { data: set } = await supabase
      .from('sets')
      .select('id')
      .ilike('name', 'Prismatic Evolutions')
      .single()

    if (set) {
      const { data: prismaticCards } = await supabase
        .from('cards')
        .select(`
          id,
          local_id,
          name,
          rarity,
          illustrator,
          image_url,
          set_id
        `)
        .eq('set_id', set.id)
        .not('image_url', 'is', null)
        .limit(24)

      cards = (prismaticCards ?? []) as Card[]
    }

    if (user) {
      title = 'Start Your Favorites'
      subtitle =
        'Favorite cards you love and they will appear here'
    }
  }

  return (
    <main
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{title}</h1>

          <p
            style={{
              marginTop: '8px',
              opacity: 0.7,
            }}
          >
            {subtitle}
          </p>
        </div>

        <Link
          href="/sets"
          style={{
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Explore all sets →
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '24px',
        }}
      >
        {cards.map((card) => (
          <Link
            key={card.id}
            href={`/sets/${card.set_id}`}
            style={{
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            {card.image_url && (
              <img
                src={card.image_url}
                alt={card.name}
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: '12px',
                }}
              />
            )}

            <div style={{ marginTop: '10px' }}>
              <strong>{card.name}</strong>

              <div
                style={{
                  fontSize: '14px',
                  opacity: 0.65,
                  marginTop: '3px',
                }}
              >
                #{card.local_id}
                {card.rarity
                  ? ` • ${card.rarity}`
                  : ''}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}