import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRecommendations } from '@/app/lib/recommendations'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cards = await getRecommendations(supabase, user?.id ?? null, 80)
  return NextResponse.json({ cards }, { headers: { 'Cache-Control': 'no-store' } })
}
