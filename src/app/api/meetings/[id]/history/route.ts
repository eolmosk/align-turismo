import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Traer la reunión actual con su created_at
  const { data: current } = await supabaseAdmin
    .from('meetings')
    .select('id, type, meeting_date, created_at, participants, school_id')
    .eq('id', params.id)
    .single()

  if (!current) return NextResponse.json(null)

  // Buscar reuniones anteriores del mismo tipo:
  // mismo tipo, misma escuela, distinta id, creadas ANTES que la actual
  const { data: previous } = await supabaseAdmin
    .from('meetings')
    .select('id, title, type, meeting_date, created_at, participants, ai_questions, ai_commitments, ai_summary, meeting_actions(*)')
    .eq('school_id', current.school_id)
    .eq('type', current.type)
    .neq('id', current.id)
    .lt('created_at', current.created_at)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!previous?.length) return NextResponse.json(null)

  // Elegir la más relevante por participantes en común, sino la más reciente
  let best = previous[0]
  if (current.participants && previous.length > 1) {
    const currentParts = normalize(current.participants)
    for (const m of previous) {
      if (m.participants && overlap(currentParts, normalize(m.participants)) > 0) {
        best = m
        break
      }
    }
  }

  const pendingActions = (best.meeting_actions as any[])?.filter((a) => !a.done) ?? []

  return NextResponse.json({
    meeting: {
      id: best.id,
      title: best.title,
      meeting_date: best.meeting_date,
      participants: best.participants,
      ai_summary: best.ai_summary,
    },
    pendingActions,
    unresolvedQuestions: best.ai_questions ?? [],
    commitments: best.ai_commitments ?? [],
    totalPrevious: previous.length,
  })
}

function normalize(text: string): string[] {
  return text.toLowerCase().split(/[,;·\n]/).map((s) => s.trim()).filter(Boolean)
}

function overlap(a: string[], b: string[]): number {
  return a.filter((x) => b.some((y) => y.includes(x) || x.includes(y))).length
}
