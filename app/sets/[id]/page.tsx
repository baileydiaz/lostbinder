import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FavoriteButton from './favorite-button'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function SetPage({
  params,
}: Props) {
  const { id } = await params

  const supabase = await createClient()

  const { data: set } = await supabase
    .from('sets')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!set) {
    notFound()
  }

  const { data: cards, error } = await supabase
    .from('cards')
    .select(`
      id,
      local_id,
      name,
      rarity,
      illustrator,
      image_url
    `)
    .eq('set_id', id)
    .order('local_id')

  if (error) {
    return (
      <main style={{ padding: '40px' }}>
        <h1>{set.name}</h1>
        <p>Could not load cards.</p>
        <p>{error.message}</p>
      </main>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let favoriteIds = new Set<string>()

  if (user && cards && cards.length > 0) {
    const cardIds = cards.map((card) => card.id)

    const { data: favorites } = await supabase
      .from('card_favorites')
      .select('card_id')
      .eq('user_id', user.id)
      .in('card_id', cardIds)

    favoriteIds = new Set(
      favorites?.map((favorite) => favorite.card_id) ?? []
    )
  }

  return (
    <main
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 24px',
      }}
    >
      <h1>{set.name}</h1>

      <p style={{ opacity: 0.7 }}>
        {cards?.length ?? 0} cards
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '24px',
          marginTop: '32px',
        }}
      >
        {cards?.map((card) => (
          <div key={card.id}>
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

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '10px',
                marginTop: '10px',
              }}
            >
              <div>
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

              <FavoriteButton
                cardId={card.id}
                initialFavorite={favoriteIds.has(
                  card.id
                )}
                loggedIn={Boolean(user)}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}