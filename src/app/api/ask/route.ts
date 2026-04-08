import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { generateEmbedding } from '@/lib/embeddings'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const dynamic = 'force-dynamic'

/**
 * POST /api/ask
 * body: { question: string }
 * response: { answer: string, sources: Array<{ id, title, meeting_date, type }> }
 *
 * Flujo:
 *   1. Embed de la pregunta (OpenAI)
 *   2. Vector search en meeting_embeddings (top 5 de la escuela)
 *   3. Armamos contexto con esas reuniones
 *   4. Claude responde citando las reuniones
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { question } = await req.json()
  if (!question?.trim() || question.length > 500) {
    return NextResponse.json({ error: 'Pregunta inválida' }, { status: 400 })
  }

  // 1. Embed de la pregunta
  let queryEmbedding: number[]
  try {
    queryEmbedding = await generateEmbedding(question)
  } catch (e: any) {
    console.error('ask: embedding error', e?.message)
    return NextResponse.json({ error: 'Error generando embedding' }, { status: 500 })
  }

  // 2. Vector search
  const { data: matches, error: matchError } = await supabaseAdmin.rpc('match_meetings', {
    query_embedding: queryEmbedding as any,
    school_id_filter: session.user.school_id,
    match_count: 5,
  })

  if (matchError) {
    console.error('ask: match_meetings error', matchError)
    return NextResponse.json({ error: matchError.message }, { status: 500 })
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({
      answer: 'No encontré reuniones relacionadas con tu pregunta. Puede que aún no haya contenido indexado, o que la pregunta no coincida con ninguna reunión.',
      sources: [],
    })
  }

  // 3. Traer las reuniones completas
  const meetingIds = (matches as any[]).map((m) => m.meeting_id)
  const { data: meetings } = await supabaseAdmin
    .from('meetings')
    .select('id, title, type, meeting_date, participants, notes, ai_summary, ai_questions, ai_commitments, thread_id, threads(name)')
    .in('id', meetingIds)

  if (!meetings || meetings.length === 0) {
    return NextResponse.json({ answer: 'No se encontraron reuniones.', sources: [] })
  }

  // Ordenar por similitud
  const byId = new Map((meetings as any[]).map((m) => [m.id, m]))
  const ordered = meetingIds.map((id) => byId.get(id)).filter(Boolean)

  // 4. Contexto para Claude
  const context = ordered.map((m: any, i: number) => {
    const parts = [
      `[Reunión ${i + 1}] ${m.title}`,
      `Fecha: ${m.meeting_date}`,
      `Tipo: ${m.type}`,
    ]
    if (m.threads?.name) parts.push(`Hilo: ${m.threads.name}`)
    if (m.participants) parts.push(`Participantes: ${m.participants}`)
    if (m.ai_summary) parts.push(`Resumen: ${m.ai_summary}`)
    if (m.ai_commitments?.length) parts.push(`Compromisos: ${m.ai_commitments.join(' | ')}`)
    if (m.notes) parts.push(`Notas: ${m.notes.slice(0, 2000)}`)
    return parts.join('\n')
  }).join('\n\n---\n\n')

  // Nombre de la escuela
  const { data: school } = await supabaseAdmin
    .from('schools').select('name').eq('id', session.user.school_id).single()
  const schoolName = school?.name ?? 'la institución'

  const systemPrompt = `Sos el asistente institucional de Align, una plataforma de seguimiento de reuniones escolares. Estás trabajando para ${schoolName}.

Tu tarea: responder preguntas del equipo directivo sobre el historial de reuniones de la escuela, usando ÚNICAMENTE la información del contexto provisto. Si no hay suficiente información en el contexto, decilo honestamente — no inventes.

Reglas:
- Respondé en español rioplatense neutro, tono profesional y cercano.
- Citá las reuniones que usás referenciándolas como [Reunión 1], [Reunión 2], etc. al final de las oraciones relevantes.
- Si la pregunta es sobre una persona específica (familia, estudiante, docente), sé respetuoso y usá solo nombres cuando aparecen explícitamente en el contexto.
- No des opiniones ni recomendaciones más allá de lo que dicen las reuniones.
- Si no hay información suficiente, decí claramente "No encuentro esa información en las reuniones registradas".
- Respuestas concisas: 2-4 párrafos máximo. No listes todo — sintetizá.`

  const userMessage = `Contexto (${ordered.length} reuniones más relevantes):

${context}

---

Pregunta: ${question}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text') as any
    const answer = textBlock?.text ?? 'No pude generar una respuesta.'

    const sources = ordered.map((m: any) => ({
      id: m.id,
      title: m.title,
      meeting_date: m.meeting_date,
      type: m.type,
      threadName: m.threads?.name ?? null,
    }))

    return NextResponse.json({ answer, sources })
  } catch (e: any) {
    console.error('ask: Claude error', e?.message)
    return NextResponse.json({ error: 'Error consultando a Claude' }, { status: 500 })
  }
}
