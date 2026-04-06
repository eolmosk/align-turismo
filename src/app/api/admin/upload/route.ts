import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_USER_ID = '757692ca-333e-469d-a9eb-d370db452cde'

// POST /api/admin/upload — sube imagen de logo a Supabase Storage
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const schoolId = formData.get('school_id') as string | null

  if (!file || !schoolId) {
    return NextResponse.json({ error: 'file y school_id requeridos' }, { status: 400 })
  }

  // Borrar logos anteriores de esta escuela
  const { data: existing } = await supabaseAdmin.storage
    .from('school-assets')
    .list('logos', { search: schoolId })
  if (existing && existing.length > 0) {
    await supabaseAdmin.storage
      .from('school-assets')
      .remove(existing.map(f => `logos/${f.name}`))
  }

  // Nombre fijo sin extensión variable — siempre logo.webp convertido o el original
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `logos/${schoolId}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await supabaseAdmin.storage
    .from('school-assets')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  // URL pública con cache-buster para forzar recarga
  const { data: urlData } = supabaseAdmin.storage
    .from('school-assets')
    .getPublicUrl(path)

  const logo_url = `${urlData.publicUrl}?v=${Date.now()}`

  await supabaseAdmin
    .from('schools')
    .update({ logo_url })
    .eq('id', schoolId)

  return NextResponse.json({ logo_url })
}
