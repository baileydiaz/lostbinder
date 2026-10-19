import Link from 'next/link'
import { resendConfirmation } from './actions'

export default async function ResendConfirmation({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const params = await searchParams
  return <main className="mx-auto max-w-md px-5 py-20 text-white">
    <h1 className="text-3xl font-semibold">Resend confirmation</h1>
    {params.error && <p role="alert" className="mt-4 text-red-400">{params.error}</p>}
    {params.sent ? <p className="mt-6 text-green-400">If your email needs confirmation, check your inbox.</p> :
      <form action={resendConfirmation} className="mt-8 flex flex-col gap-4">
        <input name="email" type="email" required placeholder="Email address" className="rounded-lg border border-white/20 bg-zinc-900 p-3" />
        <button className="rounded-lg bg-white p-3 font-semibold text-black">Resend email</button>
      </form>}
    <Link href="/auth/login" className="mt-6 inline-block underline">Back to login</Link>
  </main>
}
