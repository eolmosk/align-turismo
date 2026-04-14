import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DOCS_API = 'https://docs.googleapis.com/v1'

const MEETING_TYPE_LABELS: Record<string, string> = {
  docentes: 'Docentes',
  padres: 'Padres',
  individual: 'Individual',
  direccion: 'Dirección',
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session?.user?.school_id || !session.accessToken) {
    return NextResponse.json({ error: 'No autorizado o sin token de Google' }, { status: 401 })
  }

  const { meetingId, action } = await req.json()
  const token = session.accessToken

  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('*, schools(name, group_name), threads(id, name, type)')
    .eq('id', meetingId)
    .eq('school_id', session.user.school_id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Reunión no encontrada' }, { status: 404 })

  const results: Record<string, unknown> = {}

  // ─── GOOGLE CALENDAR ─────────────────────────────────────
  if (action === 'calendar' || action === 'both') {
    if (!meeting.next_date) {
      results.calendar = { skipped: true, reason: 'No hay próxima reunión definida' }
    } else {
      const startTime = meeting.next_time ?? '09:00:00'
      const duration = meeting.next_duration ?? 60
      const startISO = `${meeting.next_date}T${startTime}`
      const endISO = addMinutes(startISO, duration)

      const eventBody = {
        summary: `${meeting.title}`,
        description: buildCalendarDescription(meeting),
        start: { dateTime: startISO, timeZone: 'America/Montevideo' },
        end: { dateTime: endISO, timeZone: 'America/Montevideo' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 },
            { method: 'email', minutes: 60 },
          ],
        },
      }

      const calRes = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
      })

      if (calRes.ok) {
        const calData = await calRes.json()
        await supabaseAdmin.from('meetings').update({ calendar_event_id: calData.id }).eq('id', meetingId)
        results.calendar = { success: true, eventId: calData.id, htmlLink: calData.htmlLink }
      } else {
        const err = await calRes.json()
        results.calendar = { error: err.error?.message ?? 'Error en Calendar' }
      }
    }
  }

  // ─── GOOGLE DRIVE con carpetas organizadas ────────────────
  if (action === 'drive' || action === 'both') {
    const schoolName = (meeting.schools as any)?.name ?? 'Escuela'
    const year = new Date(meeting.meeting_date).getFullYear().toString()
    const typeLabel = MEETING_TYPE_LABELS[meeting.type] ?? meeting.type

    // Estructura: Minutas / Escuela / Tipo / Año
    const rootFolderId = await getOrCreateFolder(token, 'Minutas', null)
    const schoolFolderId = await getOrCreateFolder(token, schoolName, rootFolderId)
    const typeFolderId = await getOrCreateFolder(token, typeLabel, schoolFolderId)
    const yearFolderId = await getOrCreateFolder(token, year, typeFolderId)

    // Crear el Google Doc
    const createRes = await fetch(`${DOCS_API}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Minuta — ${meeting.title} (${meeting.meeting_date})` }),
    })

    if (createRes.ok) {
      const doc = await createRes.json()
      const docId = doc.documentId

      // Insertar contenido
      await fetch(`${DOCS_API}/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ insertText: { location: { index: 1 }, text: buildDocContent(meeting) } }],
        }),
      })

      // Mover el doc a la carpeta correcta
      await fetch(`${DRIVE_API}/files/${docId}?addParents=${yearFolderId}&removeParents=root`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })

      const driveUrl = `https://docs.google.com/document/d/${docId}`
      await supabaseAdmin.from('meetings').update({ drive_doc_id: docId, drive_doc_url: driveUrl }).eq('id', meetingId)
      results.drive = { success: true, docId, url: driveUrl, folder: `Minutas / ${schoolName} / ${typeLabel} / ${year}` }
    } else {
      const err = await createRes.json()
      results.drive = { error: err.error?.message ?? 'Error creando Doc' }
    }
  }

  return NextResponse.json(results)
}

// ─── HELPERS ─────────────────────────────────────────────────

function addMinutes(isoString: string, minutes: number): string {
  const date = new Date(isoString)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString().slice(0, 19)
}

async function getOrCreateFolder(token: string, name: string, parentId: string | null): Promise<string> {
  // Buscar si ya existe la carpeta (escape single quotes for Drive API query)
  const safeName = name.replace(/'/g, "\\'")
  const q = parentId
    ? `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`

  const searchRes = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const searchData = await searchRes.json()
  if (searchData.files?.length > 0) return searchData.files[0].id

  // Crear la carpeta si no existe
  const body: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentId) body.parents = [parentId]

  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const folder = await createRes.json()
  return folder.id
}

function buildCalendarDescription(meeting: any): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tu-app.vercel.app'
  const thread = meeting.threads as any
  const lines: string[] = []

  // Link al hilo si existe, sino a la reunión
  if (thread?.id) {
    lines.push(`Ver hilo en la app: ${appUrl}/thread/${thread.id}`)
  } else {
    lines.push(`Ver reunión en la app: ${appUrl}/meeting/${meeting.id}`)
  }
  lines.push('')

  if (meeting.participants) lines.push(`Participantes: ${meeting.participants}`, '')

  if (meeting.ai_summary) {
    lines.push('RESUMEN DE LA ÚLTIMA REUNIÓN')
    lines.push(meeting.ai_summary, '')
  }

  if (meeting.ai_questions?.length) {
    lines.push('PREGUNTAS PARA TRATAR')
    meeting.ai_questions.forEach((q: string, i: number) => lines.push(`${i + 1}. ${q}`))
    lines.push('')
  }

  if (meeting.ai_commitments?.length) {
    lines.push('COMPROMISOS A VERIFICAR')
    meeting.ai_commitments.forEach((c: string) => lines.push(`• ${c}`))
  }

  return lines.filter((l) => l !== null).join('\n')
}

function buildDocContent(meeting: any): string {
  const typeLabel = MEETING_TYPE_LABELS[meeting.type] ?? meeting.type
  const lines = [
    `MINUTA DE REUNIÓN`,
    ``,
    `Título: ${meeting.title}`,
    `Fecha: ${meeting.meeting_date}`,
    `Tipo: ${typeLabel}`,
    meeting.participants ? `Participantes: ${meeting.participants}` : '',
    ``,
    `NOTAS`,
    meeting.notes,
    ``,
  ]
  if (meeting.ai_summary) lines.push('RESUMEN EJECUTIVO', meeting.ai_summary, '')
  if (meeting.ai_questions?.length) {
    lines.push('PREGUNTAS PARA LA PRÓXIMA REUNIÓN')
    meeting.ai_questions.forEach((q: string, i: number) => lines.push(`${i + 1}. ${q}`))
    lines.push('')
  }
  if (meeting.ai_commitments?.length) {
    lines.push('COMPROMISOS Y DECISIONES')
    meeting.ai_commitments.forEach((c: string) => lines.push(`• ${c}`))
    lines.push('')
  }
  if (meeting.next_date) {
    const nextLine = meeting.next_time
      ? `PRÓXIMA REUNIÓN: ${meeting.next_date} a las ${meeting.next_time.slice(0, 5)}${meeting.next_duration ? ` (${meeting.next_duration} min)` : ''}`
      : `PRÓXIMA REUNIÓN: ${meeting.next_date}`
    lines.push(nextLine)
  }
  return lines.filter((l) => l !== null).join('\n')
}
