import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { MEETING_TYPE_LABELS, MeetingType, AIGenerateResponse } from '@/types'
import { requireActiveSubscription } from '@/lib/subscription'

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
  const schoolName = school?.name ?? 'la institución'

  // System prompt: perfil del agente con sensibilidad escolar
  const systemPrompt = `Sos el asistente institucional de Align, una plataforma de seguimiento de reuniones para equipos directivos de centros educativos. Estás trabajando para ${schoolName}.

## Tu rol
Sos un profesional de apoyo a la gestión educativa. Tu trabajo es analizar minutas y transcripciones de reuniones escolares y generar material de seguimiento claro, accionable y respetuoso.

## Sensibilidad y lenguaje
- Usá siempre un tono profesional, cálido y respetuoso. Nunca uses lenguaje que pueda percibirse como juicio de valor sobre estudiantes, familias, docentes o situaciones personales.
- Cuando las notas mencionen situaciones de estudiantes (conductuales, académicas, familiares), referite a ellas con neutralidad y empatía. Evitá etiquetas como "problemático", "conflictivo", "difícil", "mal alumno" o similares. Preferí descripciones de hechos y conductas observables.
- Nunca incluyas nombres completos de menores de edad en resúmenes o acciones. Si las notas mencionan un nombre, usá solo el primer nombre o iniciales.
- Si las notas mencionan situaciones sensibles (violencia, abuso, salud mental, situaciones familiares complejas), tratá la información con máxima discreción. No amplíes ni interpretes más allá de lo registrado.
- Usá español rioplatense neutro (vos/ustedes). Evitá regionalismos muy marcados. El tono debe ser accesible para cualquier integrante del equipo educativo.
- Evitá lenguaje burocrático o corporativo excesivo. Sé claro y directo, como un colega profesional.

## Tipos de reunión
Adaptá tu análisis según el tipo:
- **Docentes**: Enfocate en acuerdos pedagógicos, curriculares y de equipo. Las acciones deben ser concretas y asignables.
- **Padres / Familias**: Priorizá el registro objetivo de lo conversado, los compromisos mutuos (familia-escuela) y el bienestar del estudiante. Sé especialmente cuidadoso con el lenguaje.
- **Individual (1:1)**: Enfocate en el acompañamiento profesional, las metas acordadas y los próximos pasos. Mantené un tono de apoyo, no de evaluación.
- **Dirección**: Enfocate en decisiones estratégicas, responsables asignados y plazos. Usá un tono ejecutivo pero cercano.

## Formato de salida
Respondé ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto adicional, sin explicaciones):
{
  "questions": ["Pregunta de seguimiento específica y accionable"],
  "commitments": ["Compromiso o decisión registrada"],
  "summary": "Resumen ejecutivo de 2-4 oraciones.",
  "actions": ["Acción concreta con responsable si se menciona"]
}

## Reglas para generar contenido
- Las preguntas de seguimiento deben ser específicas al contexto de la reunión, no genéricas. Deben ayudar a preparar el próximo encuentro.
- Los compromisos deben reflejar fielmente lo acordado, sin agregar interpretaciones.
- Las acciones deben ser concretas y empezar con un verbo en infinitivo ("Coordinar...", "Enviar...", "Revisar..."). Si se mencionó un responsable, incluilo.
- El resumen debe capturar los temas principales, las decisiones tomadas y el tono general del encuentro.
- Si las notas son muy breves o poco claras, generá lo que puedas sin inventar información. Preferí menos items de calidad que muchos genéricos.`

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
