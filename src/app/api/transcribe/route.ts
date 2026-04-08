import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/transcribe
 * body: FormData con campo "file" (blob de audio)
 * response: { text: string }
 *
 * Reenvía el audio a OpenAI Whisper y devuelve la transcripción.
 * No persiste el audio — sin Supabase Storage.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 })
  }

  let incoming: FormData
  try {
    incoming = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })
  }

  const file = incoming.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Falta el archivo de audio' }, { status: 400 })
  }

  // Whisper: 25 MB máximo
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio excede 25 MB (límite de Whisper)' }, { status: 413 })
  }

  const fd = new FormData()
  fd.append('file', file, (file as any).name ?? 'audio.webm')
  fd.append('model', 'whisper-1')
  fd.append('language', 'es')
  fd.append('response_format', 'json')

  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('transcribe: whisper error', res.status, err)
      return NextResponse.json({ error: 'Error de transcripción' }, { status: 500 })
    }
    const data = await res.json()
    return NextResponse.json({ text: data.text ?? '' })
  } catch (e: any) {
    console.error('transcribe: fetch error', e?.message)
    return NextResponse.json({ error: 'Error consultando Whisper' }, { status: 500 })
  }
}
