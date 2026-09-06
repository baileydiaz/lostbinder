import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AccountPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <main
      style={{
        maxWidth: '700px',
        margin: '60px auto',
        padding: '24px',
      }}
    >
      <h1>My LostBinder Account</h1>

      <div
        style={{
          marginTop: '24px',
          display: 'grid',
          gap: '10px',
        }}
      >
        <p>
          <strong>Email:</strong> {user.email}
        </p>

        <p>
          <strong>Display name:</strong>{' '}
          {profile?.display_name ?? 'Not set'}
        </p>

        <p>
          <strong>Username:</strong>{' '}
          {profile?.username ?? 'Not set'}
        </p>
      </div>

      <form
        action="/auth/signout"
        method="post"
        style={{ marginTop: '30px' }}
      >
        <button
          type="submit"
          style={{
            padding: '10px 18px',
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
      </form>
    </main>
  )
}