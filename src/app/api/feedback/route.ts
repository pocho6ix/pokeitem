import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { completeQuestIfNotDone } from '@/lib/points'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id

  const body = await req.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'Message requis' }, { status: 400 })

  await prisma.feedback.create({ data: { userId, message } })

  // Complete the send_feedback quest (idempotent)
  await completeQuestIfNotDone(userId, 'send_feedback').catch(() => {})

  return NextResponse.json({ ok: true })
}
