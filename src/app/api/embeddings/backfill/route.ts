import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { upsertMeetingEmbedding } from '@/lib/embeddings'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/embeddings/backfill
 * Genera embeddings para todas las reuniones de la escuela del usuario
 * que todavía no tengan uno. Idempotente.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Reuniones de la escuela que no tienen embedding aún
  const { data: meetings, error } = await supabaseAdmin
    .from('meetings')
    .select('id')
    .eq('school_id', session.user.school_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: existing } = await supabaseAdmin
    .from('meeting_embeddings')
    .select('meeting_id')
    .in('meeting_id', (meetings ?? []).map((m) => m.id))

  const existingSet = new Set((existing ?? []).map((e: any) => e.meeting_id))
  const pending = (meetings ?? []).filter((m) => !existingSet.has(m.id))

  let done = 0
  const errors: string[] = []

  for (const m of pending) {
    try {
      await upsertMeetingEmbedding(m.id)
      done++
    } catch (e: any) {
      errors.push(`${m.id}: ${e?.message ?? 'unknown'}`)
    }
  }

  return NextResponse.json({
    total: meetings?.length ?? 0,
    alreadyIndexed: existingSet.size,
    processed: done,
    errors: errors.length ? errors : undefined,
  })
}
