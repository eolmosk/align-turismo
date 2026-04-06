import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/threads/pending?exclude=threadId
// Devuelve hilos con acciones pendientes, excluyendo el hilo actual
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const excludeId = new URL(req.url).searchParams.get('exclude')

  const { data: threads } = await supabaseAdmin
    .from('threads')
    .select(`
      id, name, type, participants, last_meeting_at,
      meetings (
        id,
        meeting_actions ( id, text, done )
      )
    `)
    .eq('school_id', session.user.school_id)
    .eq('archived', false)
    .neq('id', excludeId ?? '')

  const withPending = (threads ?? [])
    .map((t) => {
      const actions = (t.meetings ?? []).flatMap((m: any) => m.meeting_actions ?? [])
      const pending = actions.filter((a: any) => !a.done)
      return { ...t, meetings: undefined, pendingActions: pending }
    })
    .filter((t) => t.pendingActions.length > 0)
    .sort((a, b) => b.pendingActions.length - a.pendingActions.length)
    .slice(0, 5)

  return NextResponse.json(withPending)
}
