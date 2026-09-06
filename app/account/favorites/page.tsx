import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function FavoritesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: favorites } = await supabase
    .from('card_favorites')
    .select(`
      card_id,
      cards (
        id,
        name,
        local_id,
        image_url,
        set_id
      )
    `)
    .eq('user_id', user.id)

  return (
    <main
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 24px',
      }}
    >
      <h1>My Favorites ❤️</h1>

      <p style={{ opacity: 0.7 }}>
        {favorites?.length ?? 0} favorite cards
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
        {favorites?.map((favorite: any) => {
          const card = favorite.cards

          if (!card) return null

          return (
            <Link
              key={card.id}
              href={`/sets/${card.set_id}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {card.image_url && (
                <img
                  src={card.image_url}
                  alt={card.name}
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                  }}
                />
              )}

              <strong>{card.name}</strong>
            </Link>
          )
        })}
      </div>
    </main>
  )
}