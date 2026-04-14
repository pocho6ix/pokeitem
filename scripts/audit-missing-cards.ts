import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const series = await prisma.serie.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      cardCount: true,
      bloc: { select: { name: true, slug: true } },
      cards: {
        select: { id: true, number: true, imageUrl: true },
      },
    },
    orderBy: [{ bloc: { order: 'asc' } }, { order: 'asc' }],
  })

  type ProblemSerie = {
    blocName: string
    blocSlug: string
    serieName: string
    serieSlug: string
    expected: number | null
    actual: number
    missingImageUrl: number
    countGap: number
    sampleMissingNumbers: string[]
  }

  const problems: ProblemSerie[] = []

  for (const serie of series) {
    const actual = serie.cards.length
    const expected = serie.cardCount ?? null

    const missingImageUrl = serie.cards.filter(
      (c) => !c.imageUrl || c.imageUrl.trim() === ''
    ).length

    const countGap = expected !== null ? Math.max(0, expected - actual) : 0

    if (missingImageUrl === 0 && countGap === 0) continue

    // Try to find "missing" numeric card numbers (gap between expected and actual)
    // Only feasible when card numbers are purely numeric
    const numericNumbers = serie.cards
      .map((c) => parseInt(c.number, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b)

    let sampleMissingNumbers: string[] = []
    if (
      expected !== null &&
      numericNumbers.length > 0 &&
      numericNumbers.length < expected
    ) {
      const present = new Set(numericNumbers)
      const missing: number[] = []
      for (let i = 1; i <= expected; i++) {
        if (!present.has(i)) missing.push(i)
        if (missing.length >= 20) break
      }
      sampleMissingNumbers = missing.map(String)
    }

    problems.push({
      blocName: serie.bloc.name,
      blocSlug: serie.bloc.slug,
      serieName: serie.name,
      serieSlug: serie.slug,
      expected,
      actual,
      missingImageUrl,
      countGap,
      sampleMissingNumbers,
    })
  }

  if (problems.length === 0) {
    console.log('No missing cards found — catalog is complete!')
    return
  }

  // Group by bloc
  const byBloc = new Map<string, ProblemSerie[]>()
  for (const p of problems) {
    const key = `${p.blocName}|${p.blocSlug}`
    if (!byBloc.has(key)) byBloc.set(key, [])
    byBloc.get(key)!.push(p)
  }

  // Sort each bloc's series by total problems desc
  for (const [, list] of byBloc) {
    list.sort((a, b) => (b.missingImageUrl + b.countGap) - (a.missingImageUrl + a.countGap))
  }

  console.log('\n# Card Catalog Audit — Missing Cards Report\n')

  for (const [blocKey, list] of byBloc) {
    const blocName = blocKey.split('|')[0]
    console.log(`## Bloc: ${blocName}\n`)
    console.log(
      '| Serie | Slug | Expected | In DB | No Image | Count Gap | Sample Missing # |'
    )
    console.log(
      '|-------|------|----------|-------|----------|-----------|------------------|'
    )
    for (const p of list) {
      const sample =
        p.sampleMissingNumbers.length > 0
          ? p.sampleMissingNumbers.slice(0, 10).join(', ') +
            (p.sampleMissingNumbers.length === 20 ? '…' : '')
          : '-'
      console.log(
        `| ${p.serieName} | ${p.serieSlug} | ${p.expected ?? '?'} | ${p.actual} | ${p.missingImageUrl} | ${p.countGap} | ${sample} |`
      )
    }
    console.log()
  }

  const totalNoImage = problems.reduce((s, p) => s + p.missingImageUrl, 0)
  const totalGap = problems.reduce((s, p) => s + p.countGap, 0)
  console.log(`**Summary:** ${problems.length} series affected | ${totalNoImage} cards missing imageUrl | ${totalGap} cards never imported`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
