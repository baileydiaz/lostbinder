import Link from 'next/link'
import { login } from './actions'

type Props = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function LoginPage({
  searchParams,
}: Props) {
  const params = await searchParams

  return (
    <main
      style={{
        maxWidth: '420px',
        margin: '80px auto',
        padding: '24px',
      }}
    >
      <h1>Log in to LostBinder</h1>

      {params.error && (
        <p
          style={{
            color: 'crimson',
            marginTop: '16px',
          }}
        >
          {params.error}
        </p>
      )}

      <form
        action={login}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: '24px',
        }}
      >
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          style={{
            padding: '12px',
            fontSize: '16px',
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid #d4d4d4',
            borderRadius: '6px',
          }}
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          style={{
            padding: '12px',
            fontSize: '16px',
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid #d4d4d4',
            borderRadius: '6px',
          }}
        />

        <button
          type="submit"
          style={{
            marginTop: '10px',
            padding: '14px 18px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            backgroundColor: 'white',
            color: 'black',
            border: 'none',
            borderRadius: '8px',
          }}
        >
          Log in
        </button>
      </form>

      <p style={{ marginTop: '20px' }}>
        Don&apos;t have an account?{' '}
        <Link href="/auth/sign-up">
          Sign up
        </Link>
      </p>
    </main>
  )
}