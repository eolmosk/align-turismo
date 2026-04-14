import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/group/schools — todas las escuelas del grupo con sus reuniones
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Solo para administradores de grupo' }, { status: 403 })
  }

  // Obtener el group_name de la escuela del admin
  const { data: adminUser } = await supabaseAdmin
    .from('users')
    .select('school_id, schools(group_name)')
    .eq('id', session.user.id)
    .single()

  const groupName = (adminUser?.schools as any)?.group_name
  if (!groupName) return NextResponse.json([])

  // Obtener todas las escuelas del mismo grupo
  const { data: schools } = await supabaseAdmin
    .from('schools')
    .select('id, name')
    .eq('group_name', groupName)

  if (!schools?.length) return NextResponse.json([])

  // Para cada escuela, traer sus reuniones
  const schoolIds = schools.map((s) => s.id)
  const { data: meetings } = await supabaseAdmin
    .from('meetings')
    .select('id, title, type, meeting_date, participants, ai_questions, school_id')
    .in('school_id', schoolIds)
    .order('meeting_date', { ascending: false })
    .limit(200)

  const result = schools.map((school) => ({
    ...school,
    meetings: (meetings ?? []).filter((m) => m.school_id === school.id),
  }))

  return NextResponse.json(result)
}
