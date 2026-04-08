import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildDigestData } from '@/lib/email/weekly-digest'

export const dynamic = 'force-dynamic'

/**
 * GET /api/inbox
 * Devuelve los datos del "Hoy" del director: reuniones próximas,
 * minutas sin procesar con IA y acciones pendientes recientes.
 * Usa la misma lógica que el digest semanal (weekly-digest).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const filterParam = req.nextUrl.searchParams.get('filter')
  const actionsFilter: 'all' | 'mine' = filterParam === 'all' ? 'all' : 'mine'
  const data = await buildDigestData(session.user.id, appUrl, { actionsFilter })

  if (!data) {
    return NextResponse.json({ error: 'No hay datos disponibles' }, { status: 404 })
  }

  return NextResponse.json(data)
}
