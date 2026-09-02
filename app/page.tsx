import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase
    .from('connection_test')
    .select('*')

  if (error) {
    return (
      <main>
        <h1>Supabase connection failed</h1>
        <pre>{error.message}</pre>
      </main>
    )
  }

  return (
    <main>
      <h1>Supabase connected ✅</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  )
}