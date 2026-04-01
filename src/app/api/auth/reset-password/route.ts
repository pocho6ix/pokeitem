import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { token, password } = await request.json().catch(() => ({}))

  if (!token || !password) {
    return NextResponse.json({ error: 'Token et mot de passe requis' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } })

  if (!record || !record.identifier.startsWith('reset:')) {
    return NextResponse.json({ error: 'Lien invalide ou déjà utilisé' }, { status: 400 })
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } })
    return NextResponse.json({ error: 'Ce lien a expiré. Faites une nouvelle demande.' }, { status: 400 })
  }

  const email = record.identifier.replace('reset:', '')
  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { email },
    data: { passwordHash }
  })

  await prisma.verificationToken.delete({ where: { token } })

  return NextResponse.json({ success: true })
}
