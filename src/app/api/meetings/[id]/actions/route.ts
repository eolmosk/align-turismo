import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/meetings/[id]/actions — crear acción manual
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('id')
    .eq('id', params.id)
    .eq('school_id', session.user.school_id)
    .single()
  if (!meeting) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { text, assigned_to } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'El texto es requerido' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('meeting_actions')
    .insert({ meeting_id: params.id, text: text.trim(), assigned_to: assigned_to?.trim() || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
