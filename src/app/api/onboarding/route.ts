import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ensureTrial } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

// POST /api/onboarding — completa el setup inicial del director
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { schoolName, groupName, directorName } = await req.json()

  if (!schoolName?.trim()) {
    return NextResponse.json({ error: 'El nombre de la organización es requerido' }, { status: 400 })
  }

  // 1. Crear la escuela
  const { data: school, error: schoolErr } = await supabaseAdmin
    .from('schools')
    .insert({
      name: schoolName.trim(),
      group_name: groupName?.trim() || null,
    })
    .select()
    .single()

  if (schoolErr) {
    return NextResponse.json({ error: schoolErr.message }, { status: 500 })
  }

  // 2. Actualizar el usuario: asignar escuela + nombre + onboarded + rol director
  const { error: userErr } = await supabaseAdmin
    .from('users')
    .update({
      school_id: school.id,
      name: directorName?.trim() || session.user.name,
      onboarded: true,
      role: 'director',
      status: 'active',
    })
    .eq('id', session.user.id)

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 })
  }

  // 3. Registrar membresía en user_schools (no bloqueante si la tabla no existe aún)
  try {
    await supabaseAdmin.from('user_schools').upsert({
      user_id: session.user.id,
      school_id: school.id,
      role: 'director',
    }, { onConflict: 'user_id,school_id' })
  } catch (_) { /* tabla puede no existir aún */ }

  // 4. Crear trial de 14 días para la nueva escuela
  try {
    await ensureTrial(school.id)
  } catch (_) { /* si falla no bloqueamos el onboarding */ }

  return NextResponse.json({ school })
}

// GET /api/onboarding — verifica si el usuario ya completó el onboarding
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('onboarded, school_id, name, schools(name, group_name)')
    .eq('id', session.user.id)
    .single()

  return NextResponse.json({
    onboarded: user?.onboarded ?? false,
    hasSchool: !!user?.school_id,
    name: user?.name,
    school: user?.schools,
  })
}
