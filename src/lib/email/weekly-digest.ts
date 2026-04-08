import { supabaseAdmin } from '@/lib/supabase'

const MEETING_TYPE_LABELS: Record<string, string> = {
  docentes: 'Docentes',
  padres: 'Padres / Familias',
  individual: 'Individual (1:1)',
  direccion: 'Dirección',
}

function fmtDate(iso: string): string {
  // iso = 'YYYY-MM-DD'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`
}

export interface DigestData {
  directorName: string
  weekLabel: string // ej: "Semana del 7 de abril"
  appUrl: string
  upcomingMeetings: Array<{
    id: string
    title: string
    type: string
    next_date: string
    next_time?: string | null
    threadName?: string | null
  }>
  pendingActions: Array<{
    id: string
    text: string
    meetingTitle: string
    meetingId: string
  }>
  unprocessedMeetings: Array<{
    id: string
    title: string
    meeting_date: string
  }>
  totals: {
    upcoming: number
    pending: number
    unprocessed: number
  }
}

/**
 * Junta los datos del digest semanal para un usuario.
 */
export async function buildDigestData(userId: string, appUrl: string): Promise<DigestData | null> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, name, email, school_id')
    .eq('id', userId)
    .single()

  if (!user?.school_id) return null

  const today = new Date()
  const todayIso = today.toISOString().split('T')[0]
  const inAWeek = new Date(today)
  inAWeek.setDate(inAWeek.getDate() + 7)
  const weekEndIso = inAWeek.toISOString().split('T')[0]
  const twoWeeksAgo = new Date(today)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const twoWeeksAgoIso = twoWeeksAgo.toISOString().split('T')[0]

  // 1) Reuniones próximas (next_date entre hoy y +7)
  const { data: upcoming = [] } = await supabaseAdmin
    .from('meetings')
    .select('id, title, type, next_date, next_time, thread_id, threads(name)')
    .eq('user_id', userId)
    .gte('next_date', todayIso)
    .lte('next_date', weekEndIso)
    .order('next_date', { ascending: true })

  // 2) Acciones pendientes — todas las del usuario
  const { data: meetingsWithActions = [] } = await supabaseAdmin
    .from('meetings')
    .select('id, title, meeting_actions(id, text, done)')
    .eq('user_id', userId)
    .order('meeting_date', { ascending: false })

  const pendingActions: DigestData['pendingActions'] = []
  for (const m of meetingsWithActions ?? []) {
    const acts = ((m as any).meeting_actions ?? []) as Array<{ id: string; text: string; done: boolean }>
    for (const a of acts) {
      if (!a.done) {
        pendingActions.push({
          id: a.id,
          text: a.text,
          meetingTitle: (m as any).title,
          meetingId: (m as any).id,
        })
      }
    }
  }

  // 3) Reuniones sin procesar con IA en los últimos 14 días
  const { data: unprocessed = [] } = await supabaseAdmin
    .from('meetings')
    .select('id, title, meeting_date, ai_summary')
    .eq('user_id', userId)
    .gte('meeting_date', twoWeeksAgoIso)
    .is('ai_summary', null)
    .order('meeting_date', { ascending: false })

  const monthLabels = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const weekLabel = `Semana del ${today.getDate()} de ${monthLabels[today.getMonth()]}`

  return {
    directorName: user.name ?? '',
    weekLabel,
    appUrl,
    upcomingMeetings: (upcoming ?? []).map((m: any) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      next_date: m.next_date,
      next_time: m.next_time,
      threadName: m.threads?.name ?? null,
    })),
    pendingActions: pendingActions.slice(0, 8),
    unprocessedMeetings: (unprocessed ?? []).map((m: any) => ({
      id: m.id,
      title: m.title,
      meeting_date: m.meeting_date,
    })),
    totals: {
      upcoming: upcoming?.length ?? 0,
      pending: pendingActions.length,
      unprocessed: unprocessed?.length ?? 0,
    },
  }
}

export function buildDigestEmail(data: DigestData): { subject: string; html: string } {
  const { directorName, weekLabel, appUrl, upcomingMeetings, pendingActions, unprocessedMeetings, totals } = data

  const subject = totals.upcoming > 0
    ? `Tu semana en Align — ${totals.upcoming} ${totals.upcoming === 1 ? 'reunión' : 'reuniones'} por delante`
    : `Tu semana en Align — ${weekLabel}`

  const upcomingHtml = upcomingMeetings.length
    ? `
    <tr><td style="padding:24px 32px 0">
      <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">
        Reuniones esta semana (${totals.upcoming})
      </p>
      ${upcomingMeetings.map((m) => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;background:#f9fafb;border-radius:8px">
          <tr>
            <td style="padding:12px 14px">
              <p style="margin:0;font-size:11px;color:#6b7280;font-weight:500">
                ${fmtDate(m.next_date)}${m.next_time ? ` · ${m.next_time.slice(0, 5)}` : ''}${m.threadName ? ` · ${m.threadName}` : ''}
              </p>
              <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:500">
                ${m.title}
              </p>
              <p style="margin:2px 0 0;font-size:12px;color:#9ca3af">
                ${MEETING_TYPE_LABELS[m.type] ?? m.type}
              </p>
            </td>
          </tr>
        </table>`).join('')}
    </td></tr>` : ''

  const pendingHtml = pendingActions.length
    ? `
    <tr><td style="padding:24px 32px 0">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">
        Acciones pendientes
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;line-height:1.5">
        ${totals.pending > 8
          ? `Tenés ${totals.pending} acciones abiertas. Estas son las más recientes — entrá al dashboard para ver el resto.`
          : `Tenés ${totals.pending} ${totals.pending === 1 ? 'acción abierta' : 'acciones abiertas'}.`}
      </p>
      ${pendingActions.map((a) => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
          <tr>
            <td width="22" valign="top" style="padding-top:3px">
              <div style="width:14px;height:14px;border:2px solid #d97706;border-radius:3px"></div>
            </td>
            <td style="font-size:14px;color:#111827;line-height:1.5;padding-left:8px">
              ${a.text}
              <br>
              <a href="${appUrl}/meeting/${a.meetingId}" style="font-size:11px;color:#6b7280;text-decoration:none">
                ${a.meetingTitle} →
              </a>
            </td>
          </tr>
        </table>`).join('')}
    </td></tr>` : ''

  const unprocessedHtml = unprocessedMeetings.length
    ? `
    <tr><td style="padding:24px 32px 0">
      <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">
        Reuniones sin procesar con IA (${totals.unprocessed})
      </p>
      ${unprocessedMeetings.map((m) => `
        <p style="margin:0 0 6px;font-size:14px;color:#374151;line-height:1.5">
          <a href="${appUrl}/meeting/${m.id}" style="color:#374151;text-decoration:none">
            <span style="color:#9ca3af">${fmtDate(m.meeting_date)}</span> · ${m.title} →
          </a>
        </p>`).join('')}
    </td></tr>` : ''

  const isEmpty = !upcomingMeetings.length && !pendingActions.length && !unprocessedMeetings.length

  const emptyHtml = isEmpty
    ? `
    <tr><td style="padding:32px 32px 8px;text-align:center">
      <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6">
        No tenés acciones pendientes, reuniones agendadas ni minutas sin procesar.<br>
        <strong style="color:#111827">Tu semana arranca limpia.</strong>
      </p>
    </td></tr>` : ''

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Header -->
        <tr><td style="background:#111827;border-radius:12px 12px 0 0;padding:24px 32px">
          <p style="margin:0;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em">
            Tu semana en Align
          </p>
          <h1 style="margin:6px 0 0;font-size:22px;font-weight:600;color:#ffffff;line-height:1.3">
            ${weekLabel}
          </h1>
          <p style="margin:8px 0 0;font-size:13px;color:#9ca3af">
            Hola${directorName ? ' ' + directorName.split(' ')[0] : ''}, esto es lo que tenés esta semana.
          </p>
        </td></tr>

        <!-- Stats -->
        <tr><td style="background:#ffffff;padding:24px 32px 0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="text-align:center;padding:12px;background:#f9fafb;border-radius:8px">
                <p style="margin:0;font-size:24px;font-weight:600;color:#111827">${totals.upcoming}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280">Reuniones</p>
              </td>
              <td width="6"></td>
              <td width="33%" style="text-align:center;padding:12px;background:#f9fafb;border-radius:8px">
                <p style="margin:0;font-size:24px;font-weight:600;color:#111827">${totals.unprocessed}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280">Sin IA</p>
              </td>
              <td width="6"></td>
              <td width="33%" style="text-align:center;padding:12px;background:#f9fafb;border-radius:8px">
                <p style="margin:0;font-size:24px;font-weight:600;color:#d97706">${totals.pending}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280">Pendientes</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${emptyHtml}
            ${upcomingHtml}
            ${unprocessedHtml}
            ${pendingHtml}

            <!-- CTA -->
            <tr><td style="padding:32px 32px 28px">
              <a href="${appUrl}/dashboard"
                style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:8px">
                Abrir Align →
              </a>
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px;padding:16px 32px">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
            Recibís este resumen todos los lunes. Lo genera Align automáticamente desde la actividad de tu escuela.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}
