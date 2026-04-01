import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({}))
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true, passwordHash: true }
  })

  // Always return success to avoid user enumeration
  if (!user || user.deletedAt || !user.passwordHash) {
    return NextResponse.json({ success: true })
  }

  // Invalidate any existing token for this user
  await prisma.verificationToken.deleteMany({
    where: { identifier: `reset:${email}` }
  })

  const token = randomBytes(32).toString('hex')
  await prisma.verificationToken.create({
    data: {
      identifier: `reset:${email}`,
      token,
      expires: new Date(Date.now() + 60 * 60 * 1000), // 1h
    }
  })

  try {
    await sendPasswordResetEmail(email, token)
  } catch (err) {
    console.error('Failed to send password reset email:', err)
  }

  return NextResponse.json({ success: true })
}
