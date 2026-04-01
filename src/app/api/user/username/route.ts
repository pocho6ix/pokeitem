import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET ?check=monpseudo → { available: boolean }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const check = searchParams.get('check')
  if (!check) return Response.json({ error: 'Missing check param' }, { status: 400 })

  const session = await getServerSession(authOptions)
  const currentUserId = session?.user ? (session.user as { id: string }).id : undefined

  const existing = await prisma.user.findFirst({
    where: {
      username: { equals: check, mode: 'insensitive' },
      ...(currentUserId ? { NOT: { id: currentUserId } } : {}),
    }
  })
  return Response.json({ available: !existing })
}

// PUT { username: string } → save
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const { username } = await req.json()

  if (!username || !/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
    return Response.json({ error: 'Pseudo invalide (3-20 caractères, lettres/chiffres/-/_)' }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: 'insensitive' },
      NOT: { id: userId }
    }
  })
  if (existing) return Response.json({ error: 'Ce pseudo est déjà pris' }, { status: 409 })

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { username },
    select: { username: true }
  })

  return Response.json({ username: updated.username })
}
