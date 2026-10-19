import PasswordInput from '@/app/components/password-input'
import { resetPassword } from './actions'

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <main className="mx-auto max-w-md px-5 py-20 text-white">
    <h1 className="text-3xl font-semibold">Choose a new password</h1>
    {params.error && <p role="alert" className="mt-4 text-red-400">{params.error}</p>}
    <form action={resetPassword} className="mt-8 flex flex-col gap-4">
      <PasswordInput name="password" placeholder="New password (12+ characters)" />
      <PasswordInput name="confirm" placeholder="Confirm new password" />
      <button className="rounded-lg bg-white p-3 font-semibold text-black">Update password</button>
    </form>
  </main>
}
