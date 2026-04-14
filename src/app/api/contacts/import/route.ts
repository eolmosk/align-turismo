import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/contacts/import — importa contactos desde CSV
// Body: { rows: Array<Record<string, string>> }
// Columnas reconocidas: name, email, phone, role, external_id
// Columnas extra → metadata JSONB
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { rows } = await req.json() as { rows: Record<string, string>[] }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No hay filas para importar' }, { status: 400 })
  }

  const KNOWN_COLUMNS = new Set(['name', 'nombre', 'email', 'correo', 'phone', 'telefono', 'móvil', 'movil', 'role', 'rol', 'external_id', 'id_externo'])

  const records = rows
    .filter(row => {
      const name = row.name || row.nombre || ''
      return name.trim().length > 0
    })
    .map(row => {
      // Normalizar columnas comunes con aliases en español
      const name = (row.name || row.nombre || '').trim()
      const email = (row.email || row.correo || '').trim() || null
      const phone = (row.phone || row.telefono || row.móvil || row.movil || '').trim() || null
      const role = (row.role || row.rol || '').trim() || null
      const external_id = (row.external_id || row.id_externo || '').trim() || null

      // Columnas extra → metadata
      const metadata: Record<string, string> = {}
      for (const [key, val] of Object.entries(row)) {
        if (!KNOWN_COLUMNS.has(key.toLowerCase()) && val?.trim()) {
          metadata[key] = val.trim()
        }
      }

      return {
        school_id: session.user.school_id,
        name,
        email,
        phone,
        role,
        external_id: external_id || null,
        source: 'csv' as const,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      }
    })

  if (records.length === 0) {
    return NextResponse.json({ error: 'No se encontraron filas válidas (se requiere columna "name" o "nombre")' }, { status: 400 })
  }

  // Upsert: si ya existe un contacto con el mismo email en la escuela, actualiza
  // Si no tiene email, inserta siempre (puede haber duplicados de nombre)
  const withEmail = records.filter(r => r.email)
  const withoutEmail = records.filter(r => !r.email)

  let inserted = 0
  let updated = 0
  let errors: string[] = []

  if (withEmail.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .upsert(withEmail, { onConflict: 'school_id,email', ignoreDuplicates: false })
      .select()
    if (error) errors.push(error.message)
    else {
      // Contar insertados vs actualizados comparando created_at ≈ updated_at
      inserted += data?.filter(r => {
        const diff = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()
        return diff < 2000
      }).length ?? 0
      updated += data?.filter(r => {
        const diff = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()
        return diff >= 2000
      }).length ?? 0
    }
  }

  if (withoutEmail.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert(withoutEmail)
      .select()
    if (error) errors.push(error.message)
    else inserted += data?.length ?? 0
  }

  return NextResponse.json({
    ok: true,
    inserted,
    updated,
    skipped: rows.length - records.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
