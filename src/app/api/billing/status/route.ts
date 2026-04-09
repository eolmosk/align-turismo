import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deriveState, getSubscription } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const sub = await getSubscription(session.user.school_id)
  const state = deriveState(sub)
  return NextResponse.json({ ...state, contactWhatsapp: process.env.CONTACT_WHATSAPP ?? '' })
}
