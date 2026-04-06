import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/actions — todos los pendientes de la escuela, agrupados por hilo
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Traer todas las reuniones con sus acciones y datos de hilo
  const { data: meetings, error } = await supabaseAdmin
    .from('meetings')
    .select(`
      id, title, meeting_date, thread_id,
      thread:threads(id, name, type),
      meeting_actions(id, text, done, created_at)
    `)
    .eq('school_id', session.user.school_id)
    .order('meeting_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aplanar acciones pendientes con contexto de hilo y reunión
  const pendingByThread: Record<string, {
    thread: { id: string; name: string; type: string }
    actions: { id: string; text: string; assigned_to: string | null; meeting_id: string; meeting_title: string; meeting_date: string }[]
  }> = {}

  for (const meeting of meetings ?? []) {
    const thread = meeting.thread as any
    if (!thread) continue
    const actions = (meeting.meeting_actions as any[] ?? []).filter(a => !a.done)
    if (actions.length === 0) continue

    if (!pendingByThread[thread.id]) {
      pendingByThread[thread.id] = { thread, actions: [] }
    }
    for (const action of actions) {
      pendingByThread[thread.id].actions.push({
        id: action.id,
        text: action.text,
        assigned_to: action.assigned_to ?? null,
        meeting_id: meeting.id,
        meeting_title: meeting.title,
        meeting_date: meeting.meeting_date,
      })
    }
  }

  // Convertir a array ordenado por cantidad de pendientes desc
  const result = Object.values(pendingByThread).sort(
    (a, b) => b.actions.length - a.actions.length
  )

  return NextResponse.json(result)
}
