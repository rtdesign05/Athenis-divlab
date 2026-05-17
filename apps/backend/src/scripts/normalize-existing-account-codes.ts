/**
 * Migration ponctuelle : normalise les numéros de compte existants à 9 caractères.
 *
 * Règle (cf. lib/accountCodes.ts) :
 *  - Compte purement numérique → padding à droite avec des '0' pour atteindre 9 chars
 *  - Compte alphanumérique → uppercase, conservé tel quel (longueur libre 3-9)
 *
 * Gestion des doublons : si la version normalisée existe déjà dans le plan,
 * on supprime l'ancienne ligne et on réimpute ses écritures vers la normalisée.
 *
 * Usage : npx tsx --env-file=../../.env src/scripts/normalize-existing-account-codes.ts
 * Ajouter --dry-run pour simuler sans modifier.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry-run')
const TARGET_LEN = 9

function normalize(code: string): string {
  const c = code.trim().toUpperCase().replace(/\s+/g, '')
  if (!c) return c
  if (/^\d+$/.test(c)) {
    return c.length >= TARGET_LEN ? c.slice(0, TARGET_LEN) : c.padEnd(TARGET_LEN, '0')
  }
  return c.slice(0, TARGET_LEN)
}

async function main() {
  console.log(`\n🔧 Normalisation des comptes ${DRY ? '(DRY RUN — aucune écriture)' : '(APPLIQUÉ)'}\n`)

  // ── 1) Plan comptable ────────────────────────────────────────────────────
  const plans = await prisma.accountPlan.findMany({
    select: { id: true, companyId: true, numero: true },
  })

  // Index : (companyId, numero) → id pour détecter les doublons
  const planIndex = new Map<string, string>()
  for (const p of plans) planIndex.set(`${p.companyId}|${p.numero}`, p.id)

  const planUpdates: { id: string; from: string; to: string; companyId: string }[] = []
  const planMerges:  { from: string; to: string; companyId: string; deleteId: string }[] = []

  for (const p of plans) {
    const target = normalize(p.numero)
    if (target === p.numero) continue
    const key = `${p.companyId}|${target}`
    if (planIndex.has(key) && planIndex.get(key) !== p.id) {
      // Doublon : la version normalisée existe déjà → supprime p, réimpute écritures
      planMerges.push({ from: p.numero, to: target, companyId: p.companyId, deleteId: p.id })
    } else {
      planUpdates.push({ id: p.id, from: p.numero, to: target, companyId: p.companyId })
      planIndex.set(key, p.id)
      planIndex.delete(`${p.companyId}|${p.numero}`)
    }
  }

  console.log(`📋 Plan comptable : ${plans.length} comptes`)
  console.log(`   → ${planUpdates.length} à renommer | ${planMerges.length} à fusionner (doublon)`)

  // ── 2) Écritures journal ─────────────────────────────────────────────────
  const entries = await prisma.journalEntry.findMany({
    select: { id: true, companyId: true, compte: true },
  })
  const entryUpdates: { id: string; from: string; to: string }[] = []
  for (const e of entries) {
    const t = normalize(e.compte)
    if (t !== e.compte) entryUpdates.push({ id: e.id, from: e.compte, to: t })
  }
  console.log(`📒 Écritures journal : ${entries.length} lignes`)
  console.log(`   → ${entryUpdates.length} à normaliser\n`)

  if (DRY) {
    console.log('Échantillon updates plan (10 premiers) :')
    for (const u of planUpdates.slice(0, 10)) console.log(`  ${u.from} → ${u.to}`)
    console.log('\nÉchantillon fusions plan (10 premières) :')
    for (const m of planMerges.slice(0, 10)) console.log(`  ${m.from} → ${m.to} (doublon)`)
    console.log('\nÉchantillon updates entries (10 premières) :')
    for (const u of entryUpdates.slice(0, 10)) console.log(`  ${u.from} → ${u.to}`)
    console.log('\n💡 Pour appliquer : retirer --dry-run')
    return
  }

  // ── 3) Application en transaction ────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // 3.a. Renomme les comptes du plan (sans doublon)
    for (const u of planUpdates) {
      await tx.accountPlan.update({ where: { id: u.id }, data: { numero: u.to } })
    }
    // 3.b. Supprime les doublons du plan (écritures déjà rattachées au compte par numéro, donc safe)
    for (const m of planMerges) {
      await tx.accountPlan.delete({ where: { id: m.deleteId } })
    }
    // 3.c. Normalise toutes les écritures
    let batchN = 0
    for (const e of entryUpdates) {
      await tx.journalEntry.update({ where: { id: e.id }, data: { compte: e.to } })
      batchN++
      if (batchN % 50 === 0) console.log(`  … ${batchN}/${entryUpdates.length} écritures normalisées`)
    }
  }, { timeout: 60000 })

  console.log('\n✅ Migration terminée :')
  console.log(`   - Plan comptable : ${planUpdates.length} renommés, ${planMerges.length} fusionnés`)
  console.log(`   - Écritures      : ${entryUpdates.length} normalisées`)
}

main().then(() => prisma.$disconnect()).catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
