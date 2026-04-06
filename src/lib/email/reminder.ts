const MEETING_TYPE_LABELS: Record<string, string> = {
  docentes: 'Docentes',
  padres: 'Padres / Familias',
  individual: 'Individual (1:1)',
  direccion: 'Dirección',
}

interface EmailData {
  directorName: string
  threadName: string
  threadType: string
  meetingDate: string
  meetingTime?: string
  threadUrl: string
  // Contenido de la guía
  aiSummary?: string | null
  aiQuestions?: string[] | null
  pendingActions?: { text: string }[]
  commitments?: string[] | null
}

export function buildReminderEmail(data: EmailData): { subject: string; html: string } {
  const {
    directorName,
    threadName,
    threadType,
    meetingDate,
    meetingTime,
    threadUrl,
    aiSummary,
    aiQuestions,
    pendingActions = [],
    commitments = [],
  } = data

  const typeLabel = MEETING_TYPE_LABELS[threadType] ?? threadType
  const timeStr = meetingTime ? ` a las ${meetingTime.slice(0, 5)}` : ''
  const subject = `Hoy reunión: ${threadName}${timeStr}`

  const questionsHtml = aiQuestions?.length
    ? `
    <tr><td style="padding:20px 32px 0">
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">
        Preguntas para tratar
      </p>
      ${aiQuestions.map((q, i) => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
          <tr>
            <td width="28" valign="top" style="padding-top:1px">
              <div style="width:20px;height:20px;border-radius:50%;background:#EFF6FF;text-align:center;line-height:20px;font-size:11px;font-weight:600;color:#1d4ed8">${i + 1}</div>
            </td>
            <td style="font-size:14px;color:#111827;line-height:1.6">${q}</td>
          </tr>
        </table>`).join('')}
    </td></tr>` : ''

  const actionsHtml = pendingActions.length
    ? `
    <tr><td style="padding:20px 32px 0">
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">
        Acciones pendientes (${pendingActions.length})
      </p>
      ${pendingActions.map(a => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px">
          <tr>
            <td width="20" valign="top" style="padding-top:3px">
              <div style="width:14px;height:14px;border:2px solid #d97706;border-radius:3px"></div>
            </td>
            <td style="font-size:14px;color:#111827;line-height:1.6;padding-left:8px">${a.text}</td>
          </tr>
        </table>`).join('')}
    </td></tr>` : ''

  const commitmentsHtml = commitments?.length
    ? `
    <tr><td style="padding:20px 32px 0">
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">
        Compromisos a verificar
      </p>
      ${commitments.map(c => `
        <p style="margin:0 0 6px;font-size:14px;color:#374151;line-height:1.6">
          <span style="color:#d97706;margin-right:8px">·</span>${c}
        </p>`).join('')}
    </td></tr>` : ''

  const summaryHtml = aiSummary
    ? `
    <tr><td style="padding:20px 32px 0">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">
        Resumen de la última reunión
      </p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;background:#f9fafb;border-left:3px solid #e5e7eb;padding:12px 14px;border-radius:0 6px 6px 0">
        ${aiSummary}
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
            Recordatorio de reunión
          </p>
          <h1 style="margin:6px 0 0;font-size:22px;font-weight:600;color:#ffffff;line-height:1.3">
            ${threadName}
          </h1>
          <p style="margin:6px 0 0;font-size:14px;color:#9ca3af">
            ${typeLabel}${timeStr ? ` · Hoy${timeStr}` : ' · Hoy'}
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:0">
          <table width="100%" cellpadding="0" cellspacing="0">

            <!-- Saludo -->
            <tr><td style="padding:24px 32px 0">
              <p style="margin:0;font-size:15px;color:#111827;line-height:1.6">
                Hola${directorName ? ' ' + directorName.split(' ')[0] : ''}, hoy tenés una reunión de <strong>${typeLabel.toLowerCase()}</strong> en el hilo <strong>${threadName}</strong>. Acá está tu guía de seguimiento:
              </p>
            </td></tr>

            ${summaryHtml}
            ${questionsHtml}
            ${actionsHtml}
            ${commitmentsHtml}

            <!-- CTA -->
            <tr><td style="padding:28px 32px">
              <a href="${threadUrl}"
                style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:8px">
                Abrir hilo en la app →
              </a>
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px;padding:16px 32px">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
            Este recordatorio fue generado automáticamente por el Gestor de Reuniones.
            Para dejar de recibir estos emails, desactivá los recordatorios desde la app.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}
