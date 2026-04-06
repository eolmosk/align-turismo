import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { canSeeAllMeetings } from '@/lib/permissions'

// Palabras comunes a ignorar en el análisis de frecuencia
const STOP_WORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'un', 'una', 'se', 'del',
  'que', 'por', 'con', 'para', 'es', 'su', 'al', 'lo', 'como', 'más', 'pero',
  'sus', 'le', 'ya', 'o', 'fue', 'este', 'ha', 'si', 'sobre', 'ser', 'tiene',
  'entre', 'cuando', 'muy', 'sin', 'no', 'me', 'también', 'hasta', 'hay',
])

// GET /api/stats — estadísticas de reuniones para el usuario
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const schoolId = session.user.school_id
  const seeAll = canSeeAllMeetings(session.user.role)

  let query = supabaseAdmin
    .from('meetings')
    .select('id, type, meeting_date, participants, notes, ai_summary, ai_questions, ai_commitments, user_id')
    .eq('school_id', schoolId)
    .order('meeting_date', { ascending: true })

  if (!seeAll) {
    query = query.eq('user_id', session.user.id)
  }

  const { data: meetings, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!meetings?.length) {
    return NextResponse.json({
      totalMeetings: 0,
      byMonth: [],
      byType: {},
      topParticipants: [],
      topWords: [],
    })
  }

  // Reuniones por mes
  const monthMap: Record<string, number> = {}
  for (const m of meetings) {
    const month = m.meeting_date.slice(0, 7) // "2025-03"
    monthMap[month] = (monthMap[month] ?? 0) + 1
  }
  const byMonth = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))

  // Reuniones por tipo
  const byType: Record<string, number> = {}
  for (const m of meetings) {
    byType[m.type] = (byType[m.type] ?? 0) + 1
  }

  // Participantes más frecuentes
  const participantMap: Record<string, number> = {}
  for (const m of meetings) {
    if (!m.participants) continue
    const names = m.participants.split(/[,;·]/).map((p: string) => p.trim()).filter(Boolean)
    for (const name of names) {
      participantMap[name] = (participantMap[name] ?? 0) + 1
    }
  }
  const topParticipants = Object.entries(participantMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  // Palabras más frecuentes en notas
  const wordMap: Record<string, number> = {}
  for (const m of meetings) {
    const text = [m.notes, m.ai_summary].filter(Boolean).join(' ')
    const words = text.toLowerCase().match(/[a-záéíóúñü]{4,}/g) ?? []
    for (const word of words) {
      if (!STOP_WORDS.has(word)) {
        wordMap[word] = (wordMap[word] ?? 0) + 1
      }
    }
  }
  const topWords = Object.entries(wordMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }))

  return NextResponse.json({
    totalMeetings: meetings.length,
    byMonth,
    byType,
    topParticipants,
    topWords,
  })
}
