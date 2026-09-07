import type {
  Metadata,
  Viewport,
} from 'next'

import Link from 'next/link'
import { Geist } from 'next/font/google'

import './globals.css'

import { createClient } from '@/lib/supabase/server'

const geist = Geist({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'LostBinder',
  description:
    'Discover and collect Pokémon cards',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className={geist.className}>
        <header
          style={{
            borderBottom: '1px solid #222',
            background: '#000',
          }}
        >
          <nav
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            <Link
              href="/"
              style={{
                fontSize: '22px',
                fontWeight: 750,
                letterSpacing: '-0.04em',
                color: '#fff',
                textDecoration: 'none',
                marginRight: 'auto',
              }}
            >
              LostBinder
            </Link>

            <Link
              href="/explore"
              style={{
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Discover
            </Link>

            <Link
              href="/sets"
              style={{
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Sets
            </Link>

            {user && (
              <Link
                href="/account/favorites"
                style={{
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                ♥ Favorites
              </Link>
            )}

            <Link
              href={
                user
                  ? '/account'
                  : '/auth/login'
              }
              style={{
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {user ? 'Account' : 'Log In'}
            </Link>
          </nav>
        </header>

        {children}
      </body>
    </html>
  )
}