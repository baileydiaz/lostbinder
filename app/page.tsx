import { createClient } from '@/lib/supabase/server'

type Card = {
  id: string
  local_id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
}

export default async function Home() {
  const supabase = await createClient()

  // Find Prismatic Evolutions
  const { data: set, error: setError } = await supabase
    .from('sets')
    .select('*')
    .ilike('name', 'Prismatic Evolutions')
    .single()

  if (setError || !set) {
    return (
      <main style={{ padding: '40px' }}>
        <h1>LostBinder</h1>

        <p>Could not find Prismatic Evolutions.</p>

        {setError && (
          <pre>{setError.message}</pre>
        )}
      </main>
    )
  }

  // Get every card in the set
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select(`
      id,
      local_id,
      name,
      rarity,
      illustrator,
      image_url
    `)
    .eq('set_id', set.id)
    .order('local_id')

  if (cardsError) {
    return (
      <main style={{ padding: '40px' }}>
        <h1>LostBinder</h1>
        <p>Could not load cards.</p>
        <pre>{cardsError.message}</pre>
      </main>
    )
  }

  const typedCards = (cards ?? []) as Card[]

  return (
    <main
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 24px',
      }}
    >
      <h1
        style={{
          fontSize: '42px',
          marginBottom: '5px',
        }}
      >
        LostBinder
      </h1>

      <h2
        style={{
          fontSize: '28px',
          marginBottom: '5px',
        }}
      >
        {set.name}
      </h2>

      <p
        style={{
          marginBottom: '30px',
          opacity: 0.7,
        }}
      >
        {typedCards.length} cards
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '24px',
        }}
      >
        {typedCards.map((card) => (
          <div key={card.id}>
            {card.image_url ? (
              <img
                src={card.image_url}
                alt={card.name}
                style={{
                  width: '100%',
                  borderRadius: '10px',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  aspectRatio: '2.5 / 3.5',
                  background: '#222',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                No image
              </div>
            )}

            <div style={{ marginTop: '8px' }}>
              <strong>
                {card.local_id}. {card.name}
              </strong>

              {card.rarity && (
                <div
                  style={{
                    fontSize: '14px',
                    opacity: 0.65,
                  }}
                >
                  {card.rarity}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}