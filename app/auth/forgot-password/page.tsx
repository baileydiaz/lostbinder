import Link from 'next/link'
import { requestPasswordReset } from './actions'

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const params = await searchParams
  return <main className="mx-auto max-w-md px-5 py-20 text-white">
    <h1 className="text-3xl font-semibold">Reset your password</h1>
    <p className="mt-3 text-zinc-400">Enter your account email and we’ll send you a password reset link.</p>
    {params.error && <p role="alert" className="mt-4 text-red-400">{params.error}</p>}
    {params.sent ? <p className="mt-6 text-green-400">If an account exists for that email, check your inbox for a reset link.</p> :
      <form action={requestPasswordReset} className="mt-8 flex flex-col gap-4">
        <input name="email" type="email" autoComplete="email" required placeholder="Email address" className="rounded-lg border border-white/20 bg-zinc-900 p-3" />
        <button className="rounded-lg bg-white p-3 font-semibold text-black">Send reset link</button>
      </form>}
    <Link href="/auth/login" className="mt-6 inline-block text-zinc-300 underline">Back to login</Link>
  </main>
}
