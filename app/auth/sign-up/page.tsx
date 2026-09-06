import Link from 'next/link'
import { signup } from './actions'

type Props = {
  searchParams: Promise<{
    error?: string
    success?: string
  }>
}

export default async function SignUpPage({
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
      <h1>Create a LostBinder account</h1>

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

      {params.success && (
        <p
          style={{
            color: 'green',
            marginTop: '16px',
          }}
        >
          {params.success}
        </p>
      )}

      <form
        action={signup}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: '24px',
        }}
      >
        <input
          name="displayName"
          type="text"
          placeholder="Display name"
          style={{
            padding: '12px',
            fontSize: '16px',
          }}
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          style={{
            padding: '12px',
            fontSize: '16px',
          }}
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          minLength={6}
          required
          style={{
            padding: '12px',
            fontSize: '16px',
          }}
        />

        <button
          type="submit"
          style={{
            padding: '12px',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          Sign up
        </button>
      </form>

      <p style={{ marginTop: '20px' }}>
        Already have an account?{' '}
        <Link href="/auth/login">
          Log in
        </Link>
      </p>
    </main>
  )
}