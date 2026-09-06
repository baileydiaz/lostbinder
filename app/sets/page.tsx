import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function SetsPage() {
  const supabase = await createClient()

  const { data: sets, error } = await supabase
    .from('sets')
    .select('id, name')
    .order('name')

  if (error) {
    return (
      <main style={{ padding: '40px' }}>
        <h1>Sets</h1>
        <p>Could not load sets.</p>
        <p>{error.message}</p>
      </main>
    )
  }

  return (
    <main
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 24px',
      }}
    >
      <h1>Explore Pokémon Sets</h1>

      <p style={{ marginTop: '8px', opacity: 0.7 }}>
        {sets?.length ?? 0} sets
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
          marginTop: '32px',
        }}
      >
        {sets?.map((set) => (
          <Link
            key={set.id}
            href={`/sets/${set.id}`}
            style={{
              border: '1px solid #ddd',
              borderRadius: '12px',
              padding: '20px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <strong>{set.name}</strong>
          </Link>
        ))}
      </div>
    </main>
  )
}