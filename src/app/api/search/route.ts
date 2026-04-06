import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { canSeeAllMeetings } from '@/lib/permissions'

// GET /api/search?q=texto — busca en reuniones e hilos
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ meetings: [], threads: [] })
  }

  const schoolId = session.user.school_id
  const seeAll = canSeeAllMeetings(session.user.role)

  // Buscar reuniones
  let meetingsQuery = supabaseAdmin
    .from('meetings')
    .select('id, title, type, meeting_date, participants, notes, thread_id, school_id, user_id')
    .eq('school_id', schoolId)
    .or(`title.ilike.%${q}%,notes.ilike.%${q}%,participants.ilike.%${q}%`)
    .order('meeting_date', { ascending: false })
    .limit(20)

  if (!seeAll) {
    meetingsQuery = meetingsQuery.eq('user_id', session.user.id)
  }

  // Buscar hilos
  const threadsQuery = supabaseAdmin
    .from('threads')
    .select('id, name, type, participants, description')
    .eq('school_id', schoolId)
    .or(`name.ilike.%${q}%,participants.ilike.%${q}%,description.ilike.%${q}%`)
    .eq('archived', false)
    .limit(10)

  const [{ data: meetings, error: mErr }, { data: threads, error: tErr }] =
    await Promise.all([meetingsQuery, threadsQuery])

  if (mErr || tErr) {
    return NextResponse.json({ error: (mErr ?? tErr)?.message }, { status: 500 })
  }

  return NextResponse.json({ meetings: meetings ?? [], threads: threads ?? [] })
}
