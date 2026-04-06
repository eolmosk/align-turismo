import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: 'No autorizado o sin token' }, { status: 401 })
  }

  const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err.error?.message ?? 'Error listando calendarios' }, { status: res.status })
  }

  const data = await res.json()

  const writable = (data.items ?? [])
    .filter((c: any) => c.accessRole === 'owner' || c.accessRole === 'writer')
    .map((c: any) => ({
      id: c.id,
      summary: c.summary,
      primary: c.primary ?? false,
      backgroundColor: c.backgroundColor,
    }))

  return NextResponse.json(writable)
}