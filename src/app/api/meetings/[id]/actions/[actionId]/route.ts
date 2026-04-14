import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; actionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { done, assigned_to, assigned_user_id, assigned_contact_id, text } = await req.json()

  // Verify the parent meeting belongs to the user's school
  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('id')
    .eq('id', params.id)
    .eq('school_id', session.user.school_id)
    .single()
  if (!meeting) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const updates: Record<string, any> = {}
  if (done !== undefined) { updates.done = done; updates.done_at = done ? new Date().toISOString() : null }
  if (assigned_to !== undefined) updates.assigned_to = assigned_to
  if (assigned_user_id !== undefined) updates.assigned_user_id = assigned_user_id
  if (assigned_contact_id !== undefined) updates.assigned_contact_id = assigned_contact_id
  if (text !== undefined) updates.text = text.trim()

  const { data, error } = await supabaseAdmin
    .from('meeting_actions')
    .update(updates)
    .eq('id', params.actionId)
    .eq('meeting_id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; actionId: string } }
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

  const { error } = await supabaseAdmin
    .from('meeting_actions')
    .delete()
    .eq('id', params.actionId)
    .eq('meeting_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
