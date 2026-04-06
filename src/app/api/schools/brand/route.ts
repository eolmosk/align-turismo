import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/schools/brand — branding de la escuela activa del usuario
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('schools')
    .select('logo_url, color_primary, color_secondary, color_accent')
    .eq('id', session.user.school_id)
    .single()

  if (!data) return NextResponse.json({}, { status: 404 })
  return NextResponse.json(data)
}
