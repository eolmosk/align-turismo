import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { MEETING_TYPE_LABELS, MeetingType, AIGenerateResponse } from '@/types'
import { requireActiveSubscription } from '@/lib/subscription'
import { buildSystemPrompt } from '@/config/vertical'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { meetingId, isLiveTranscript } = await req.json()
  if (!meetingId) return NextResponse.json({ error: 'meetingId requerido' }, { status: 400 })

  const access = await requireActiveSubscription(session.user.school_id)
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status })
  }

  const { data: meeting, error: meetingErr } = await supabaseAdmin
    .from('meetings')
    .select('*, meeting_actions(*)')
    .eq('id', meetingId)
    .eq('school_id', session.user.school_id)
    .single()

  if (meetingErr || !meeting) {
    return NextResponse.json({ error: 'Reunión no encontrada' }, { status: 404 })
  }

  const tipoLabel = MEETING_TYPE_LABELS[meeting.type as MeetingType]

  // Obtener nombre de la escuela para contexto del agente
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('name')
    .eq('id', session.user.school_id)
    .single()
  const schoolName = school?.name ?? 'la organización'

  const systemPrompt = buildSystemPrompt(schoolName)

  // User message: solo los datos de la reunión
  const prompt = isLiveTranscript
    ? `Tipo de reunión: ${tipoLabel}
Participantes: ${meeting.participants ?? 'No especificado'}
Fecha: ${meeting.meeting_date}

Transcripción de la reunión:
${meeting.notes}`
    : `Tipo de reunión: ${tipoLabel}
Participantes: ${meeting.participants ?? 'No especificado'}
Fecha: ${meeting.meeting_date}

Notas de la reunión:
${meeting.notes}`

  let aiResult: AIGenerateResponse

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    aiResult = JSON.parse(clean)
  } catch (e) {
    console.error('Error calling Claude API:', e)
    return NextResponse.json({ error: 'Error generando con IA' }, { status: 500 })
  }

  // Guardar en la reunión
  await supabaseAdmin
    .from('meetings')
    .update({
      ai_questions: aiResult.questions,
      ai_commitments: aiResult.commitments,
      ai_summary: aiResult.summary,
    })
    .eq('id', meetingId)

  // Crear acciones: unificar commitments + actions en una sola lista
  const actionTexts = [
    ...(aiResult.commitments ?? []),
    ...(aiResult.actions ?? []),
  ]
  // Re-generación: solo borrar acciones no modificadas por el usuario (preservar asignadas o completadas)
  await supabaseAdmin.from('meeting_actions').delete().eq('meeting_id', meetingId).eq('done', false).is('assigned_to', null)
  if (actionTexts.length) {
    await supabaseAdmin.from('meeting_actions').insert(
      actionTexts.map((text: string) => ({ meeting_id: meetingId, text }))
    )
  }

  return NextResponse.json(aiResult)
}
