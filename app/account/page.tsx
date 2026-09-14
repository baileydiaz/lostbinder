import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user.id)
    .single()

  if (error) console.error('Could not load profile:', error.message)

  const { count: unreadCount } = await supabase
    .from('card_shares')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-600">LostBinder</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Account</h1>

        <div className="mt-10 rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Username</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {profile?.username ? `@${profile.username}` : 'Not set'}
            </p>
          </div>

          <div className="mt-8 border-t border-white/10 pt-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Shared cards</p>
            <Link
              href="/account/sent-to-you"
              className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black px-4 py-4 transition hover:border-white/25"
            >
              <div>
                <p className="font-semibold text-white">Sent to You</p>
                <p className="mt-1 text-sm text-zinc-600">Cards your friends have shared with you.</p>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount ? (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black">
                    {unreadCount}
                  </span>
                ) : null}
                <span className="text-zinc-600">→</span>
              </div>
            </Link>
          </div>

          <div className="mt-8 border-t border-white/10 pt-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Email</p>
            <p className="mt-2 text-sm text-zinc-300">{user.email}</p>
          </div>

          <form action="/auth/signout" method="post" className="mt-8 border-t border-white/10 pt-8">
            <button type="submit" className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/40 hover:text-white">
              Log out
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
