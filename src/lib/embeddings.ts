import { supabaseAdmin } from '@/lib/supabase'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const EMBEDDING_MODEL = 'text-embedding-3-small' // 1536 dims

/**
 * Genera un embedding de OpenAI para un texto.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada')
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 30000), // cap de seguridad
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI embedding error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.data[0].embedding as number[]
}

/**
 * Construye el texto a embeddar para una reunión.
 * Combina los campos más significativos en un solo string.
 */
export function buildMeetingText(meeting: {
  title: string
  type?: string | null
  participants?: string | null
  notes?: string | null
  ai_summary?: string | null
  ai_questions?: string[] | null
  ai_commitments?: string[] | null
  meeting_date?: string | null
}): string {
  const parts: string[] = []
  parts.push(`Título: ${meeting.title}`)
  if (meeting.meeting_date) parts.push(`Fecha: ${meeting.meeting_date}`)
  if (meeting.type) parts.push(`Tipo: ${meeting.type}`)
  if (meeting.participants) parts.push(`Participantes: ${meeting.participants}`)
  if (meeting.ai_summary) parts.push(`Resumen: ${meeting.ai_summary}`)
  if (meeting.ai_questions?.length) parts.push(`Preguntas: ${meeting.ai_questions.join(' | ')}`)
  if (meeting.ai_commitments?.length) parts.push(`Compromisos: ${meeting.ai_commitments.join(' | ')}`)
  if (meeting.notes) parts.push(`Notas: ${meeting.notes}`)
  return parts.join('\n')
}

/**
 * Genera y guarda el embedding de una reunión.
 * Llamar después de crear o actualizar una reunión.
 * Si falla, loguea el error pero no rompe el flujo.
 */
export async function upsertMeetingEmbedding(meetingId: string): Promise<void> {
  try {
    const { data: meeting, error } = await supabaseAdmin
      .from('meetings')
      .select('id, title, type, participants, notes, ai_summary, ai_questions, ai_commitments, meeting_date')
      .eq('id', meetingId)
      .single()

    if (error || !meeting) {
      console.error(`upsertMeetingEmbedding: meeting ${meetingId} not found`, error)
      return
    }

    const text = buildMeetingText(meeting as any)
    const embedding = await generateEmbedding(text)

    const { error: upsertError } = await supabaseAdmin
      .from('meeting_embeddings')
      .upsert({
        meeting_id: meetingId,
        embedding: embedding as any,
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      console.error(`upsertMeetingEmbedding: upsert failed for ${meetingId}`, upsertError)
    }
  } catch (e: any) {
    console.error(`upsertMeetingEmbedding error for ${meetingId}:`, e?.message)
  }
}
