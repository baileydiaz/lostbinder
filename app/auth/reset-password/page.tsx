import { resetPassword } from './actions'

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <main className="mx-auto max-w-md px-5 py-20 text-white">
    <h1 className="text-3xl font-semibold">Choose a new password</h1>
    {params.error && <p role="alert" className="mt-4 text-red-400">{params.error}</p>}
    <form action={resetPassword} className="mt-8 flex flex-col gap-4">
      <input name="password" type="password" minLength={12} autoComplete="new-password" required placeholder="New password (12+ characters)" className="rounded-lg border border-white/20 bg-zinc-900 p-3" />
      <input name="confirm" type="password" minLength={12} autoComplete="new-password" required placeholder="Confirm new password" className="rounded-lg border border-white/20 bg-zinc-900 p-3" />
      <button className="rounded-lg bg-white p-3 font-semibold text-black">Update password</button>
    </form>
  </main>
}
