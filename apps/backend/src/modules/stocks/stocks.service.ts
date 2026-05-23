import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type {
  CreateFamilyInput, UpdateFamilyInput,
  CreateArticleInput, UpdateArticleInput, ListArticlesInput,
  CreateMouvementInput, ListMouvementsInput,
} from './stocks.dto.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ENTREE_TYPES = ['ENTREE_ACHAT', 'ENTREE_RETOUR', 'ENTREE_INVENTAIRE', 'AJUSTEMENT'] as const
function isEntree(type: string) { return ENTREE_TYPES.includes(type as never) }

async function nextReference(
  companyId: string,
  tx?: import('@prisma/client').Prisma.TransactionClient,
): Promise<string> {
  const db = tx ?? prisma
  // B13 : si appelé dans une transaction, on prend un advisory lock pour
  //       sérialiser la lecture du compteur. Sinon (compatibilité), on
  //       compte sans lock (mitigé par la contrainte unique companyId_reference).
  if (tx) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId + ':ART'}))`
  }
  // N12 : utiliser max(reference) au lieu de count() — un article supprimé
  //       ne doit pas faire "revenir" le compteur en arrière (sinon P2002
  //       car la référence d'origine existe peut-être encore via @@unique).
  const last = await db.article.findFirst({
    where:   { companyId, reference: { startsWith: 'ART-' } },
    orderBy: { reference: 'desc' },
    select:  { reference: true },
  })
  let next = 1
  if (last?.reference) {
    const m = /^ART-(\d+)$/.exec(last.reference)
    if (m) next = parseInt(m[1]!, 10) + 1
  }
  return `ART-${String(next).padStart(5, '0')}`
}

// ── Families ──────────────────────────────────────────────────────────────────

export async function listFamilies(companyId: string) {
  const families = await prisma.stockFamily.findMany({
    where: { companyId },
    include: {
      articles: {
        where: { isActive: true },
        select: { id: true, stockActuel: true, valeurCmup: true, methodeValuation: true, lotsFifo: { where: { isEpuise: false }, select: { quantiteRestante: true, prixUnitaire: true } } },
      },
    },
    orderBy: { code: 'asc' },
  })
  return families.map((f) => {
    const valeur = f.articles.reduce((sum, a) => {
      if (a.methodeValuation === 'FIFO') {
        const v = a.lotsFifo.reduce((s, l) => s + Number(l.quantiteRestante) * Number(l.prixUnitaire), 0)
        return sum + v
      }
      return sum + Number(a.stockActuel) * Number(a.valeurCmup)
    }, 0)
    return { ...f, articlesCount: f.articles.length, valeurStock: valeur, articles: undefined }
  })
}

export async function createFamily(companyId: string, dto: CreateFamilyInput) {
  const existing = await prisma.stockFamily.findUnique({ where: { companyId_code: { companyId, code: dto.code } } })
  if (existing) throw new AppError(`Code famille "${dto.code}" déjà utilisé`, 409, 'CONFLICT')
  return prisma.stockFamily.create({
    data: {
      companyId,
      code: dto.code,
      nom: dto.nom,
      ...(dto.description !== undefined ? { description: dto.description } : {}),
    } as never,
  })
}

export async function updateFamily(companyId: string, id: string, dto: UpdateFamilyInput) {
  const family = await prisma.stockFamily.findFirst({ where: { id, companyId } })
  if (!family) throw new AppError('Famille introuvable', 404, 'NOT_FOUND')
  if (dto.code && dto.code !== family.code) {
    const conflict = await prisma.stockFamily.findUnique({ where: { companyId_code: { companyId, code: dto.code } } })
    if (conflict) throw new AppError(`Code famille "${dto.code}" déjà utilisé`, 409, 'CONFLICT')
  }
  return prisma.stockFamily.update({
    where: { id },
    data: {
      ...(dto.code !== undefined        ? { code: dto.code }               : {}),
      ...(dto.nom !== undefined         ? { nom: dto.nom }                 : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
    } as never,
  })
}

export async function deleteFamily(companyId: string, id: string) {
  const family = await prisma.stockFamily.findFirst({ where: { id, companyId }, include: { _count: { select: { articles: true } } } })
  if (!family) throw new AppError('Famille introuvable', 404, 'NOT_FOUND')
  if (family._count.articles > 0) throw new AppError('Impossible de supprimer une famille contenant des articles', 409, 'CONFLICT')
  await prisma.stockFamily.delete({ where: { id } })
}

// ── Articles ──────────────────────────────────────────────────────────────────

export async function listArticles(companyId: string, query: ListArticlesInput) {
  const { familleId, search, alerte, isActive, page, limit } = query
  const where: Prisma.ArticleWhereInput = {
    companyId,
    ...(familleId ? { familleId } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search ? { OR: [{ reference: { contains: search, mode: 'insensitive' } }, { designation: { contains: search, mode: 'insensitive' } }] } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: {
        famille: { select: { id: true, code: true, nom: true } },
        agence:  { select: { id: true, nom: true } },
      },
      orderBy: { reference: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ])
  const result = alerte ? items.filter((a) => Number(a.stockActuel) <= Number(a.stockMin)) : items
  return { items: result, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getArticle(companyId: string, id: string) {
  const article = await prisma.article.findFirst({
    where: { id, companyId },
    include: {
      famille: true,
      mouvements: { orderBy: { createdAt: 'desc' }, take: 20 },
      lotsFifo: { where: { isEpuise: false }, orderBy: { dateEntree: 'asc' } },
    },
  })
  if (!article) throw new AppError('Article introuvable', 404, 'NOT_FOUND')
  const valeurActuelle = article.methodeValuation === 'FIFO'
    ? article.lotsFifo.reduce((s, l) => s + Number(l.quantiteRestante) * Number(l.prixUnitaire), 0)
    : Number(article.stockActuel) * Number(article.valeurCmup)
  return { ...article, valeurActuelle }
}

export async function createArticle(companyId: string, dto: CreateArticleInput) {
  const { stockInitial, ...rest } = dto

  return prisma.$transaction(async (tx) => {
    // B13 : nextReference avec tx → advisory lock actif. Et la vérif
    //       d'unicité passe par le même tx pour rester cohérente.
    const reference = rest.reference || await nextReference(companyId, tx)
    const existing = await tx.article.findUnique({ where: { companyId_reference: { companyId, reference } } })
    if (existing) throw new AppError(`Référence "${reference}" déjà utilisée`, 409, 'CONFLICT')

    // V10 : vérifier que familleId appartient à companyId. Sinon un user
    //       pouvait rattacher son article à une famille d'un autre tenant
    //       → fuite info via include {famille: true} dans le listing.
    if (rest.familleId) {
      const fam = await tx.stockFamily.findFirst({
        where: { id: rest.familleId, companyId },
        select: { id: true },
      })
      if (!fam) throw new AppError('Famille introuvable', 404, 'FAMILLE_NOT_FOUND')
    }

    const article = await tx.article.create({
      data: {
        companyId,
        reference,
        designation: rest.designation,
        ...(rest.familleId ? { familleId: rest.familleId } : {}),
        ...(rest.agenceId  ? { agenceId:  rest.agenceId }  : {}),
        unite: rest.unite ?? 'unité',
        prixAchat: rest.prixAchat,
        prixVente: rest.prixVente,
        stockMin: rest.stockMin ?? 0,
        ...(rest.stockMax !== undefined ? { stockMax: rest.stockMax } : {}),
        methodeValuation: rest.methodeValuation ?? 'CMUP',
        ...(rest.description !== undefined ? { description: rest.description } : {}),
        ...(rest.compteAchat !== undefined ? { compteAchat: rest.compteAchat } : {}),
        ...(rest.compteVente !== undefined ? { compteVente: rest.compteVente } : {}),
        ...(rest.compteStock !== undefined ? { compteStock: rest.compteStock } : {}),
        ...(rest.compteVariationStock !== undefined ? { compteVariationStock: rest.compteVariationStock } : {}),
        ...(rest.stockTracking !== undefined ? { stockTracking: rest.stockTracking } : {}),
        stockActuel: 0,
        valeurCmup: rest.prixAchat,
      } as never,
    })

    if (stockInitial && stockInitial > 0) {
      await _addMouvementTx(tx, companyId, article.id, {
        type: 'ENTREE_INVENTAIRE',
        quantite: stockInitial,
        prixUnitaire: rest.prixAchat,
        description: 'Stock initial',
      }, 'system')
    }

    return tx.article.findUniqueOrThrow({
      where: { id: article.id },
      include: { famille: true, agence: { select: { id: true, nom: true } } },
    })
  })
}

export async function updateArticle(companyId: string, id: string, dto: UpdateArticleInput) {
  const article = await prisma.article.findFirst({ where: { id, companyId } })
  if (!article) throw new AppError('Article introuvable', 404, 'NOT_FOUND')
  if (dto.reference && dto.reference !== article.reference) {
    const conflict = await prisma.article.findUnique({ where: { companyId_reference: { companyId, reference: dto.reference } } })
    if (conflict) throw new AppError(`Référence "${dto.reference}" déjà utilisée`, 409, 'CONFLICT')
  }
  // V10 : vérifier que familleId appartient à companyId.
  if (dto.familleId) {
    const fam = await prisma.stockFamily.findFirst({
      where: { id: dto.familleId, companyId },
      select: { id: true },
    })
    if (!fam) throw new AppError('Famille introuvable', 404, 'FAMILLE_NOT_FOUND')
  }
  return prisma.article.update({
    where: { id },
    data: {
      ...(dto.reference    !== undefined ? { reference: dto.reference }           : {}),
      ...(dto.designation  !== undefined ? { designation: dto.designation }       : {}),
      ...(dto.familleId    !== undefined ? { familleId: dto.familleId }           : {}),
      ...(dto.unite        !== undefined ? { unite: dto.unite }                   : {}),
      ...(dto.prixAchat    !== undefined ? { prixAchat: dto.prixAchat }           : {}),
      ...(dto.prixVente    !== undefined ? { prixVente: dto.prixVente }           : {}),
      ...(dto.stockMin     !== undefined ? { stockMin: dto.stockMin }             : {}),
      ...(dto.stockMax     !== undefined ? { stockMax: dto.stockMax }             : {}),
      ...(dto.methodeValuation !== undefined ? { methodeValuation: dto.methodeValuation } : {}),
      ...(dto.description  !== undefined ? { description: dto.description }       : {}),
      ...(dto.compteAchat  !== undefined ? { compteAchat: dto.compteAchat }       : {}),
      ...(dto.compteVente  !== undefined ? { compteVente: dto.compteVente }       : {}),
      ...(dto.compteStock  !== undefined ? { compteStock: dto.compteStock }       : {}),
      ...(dto.compteVariationStock !== undefined ? { compteVariationStock: dto.compteVariationStock } : {}),
      ...(dto.stockTracking !== undefined ? { stockTracking: dto.stockTracking } : {}),
      ...(dto.agenceId     !== undefined ? { agenceId: dto.agenceId ?? null }     : {}),
    } as never,
    include: { famille: true, agence: { select: { id: true, nom: true } } },
  })
}

export async function deleteArticle(companyId: string, id: string) {
  const article = await prisma.article.findFirst({ where: { id, companyId } })
  if (!article) throw new AppError('Article introuvable', 404, 'NOT_FOUND')
  if (Number(article.stockActuel) > 0) throw new AppError('Impossible de supprimer un article avec du stock disponible', 409, 'CONFLICT')
  await prisma.article.delete({ where: { id } })
}

// ── Mouvements ────────────────────────────────────────────────────────────────

async function _addMouvementTx(
  tx: Prisma.TransactionClient,
  companyId: string,
  articleId: string,
  dto: { type: string; quantite: number; prixUnitaire: number; description?: string | undefined; reference?: string | undefined; [key: string]: unknown },
  createdBy: string,
) {
  const article = await tx.article.findUniqueOrThrow({ where: { id: articleId } })
  const stockAvant = Number(article.stockActuel)
  const cmupAvant  = Number(article.valeurCmup)
  const qte        = dto.quantite
  const pu         = dto.prixUnitaire
  const entree     = isEntree(dto.type)

  if (!entree && qte > stockAvant) {
    throw new AppError(
      `Stock insuffisant : ${stockAvant} ${article.unite} disponible${stockAvant > 1 ? 's' : ''}, sortie demandée : ${qte}`,
      422, 'STOCK_INSUFFISANT',
    )
  }

  let stockApres: number
  let cmupApres: number
  const prixTotal = qte * pu

  if (article.methodeValuation === 'FIFO') {
    if (entree) {
      await tx.stockLot.create({
        data: {
          articleId,
          quantiteInitiale: qte,
          quantiteRestante: qte,
          prixUnitaire: pu,
          dateEntree: new Date(),
          reference: dto.reference ?? null,
        },
      })
      stockApres = stockAvant + qte
      cmupApres  = cmupAvant
    } else {
      let restant = qte
      const lots = await tx.stockLot.findMany({
        where: { articleId, isEpuise: false },
        orderBy: { dateEntree: 'asc' },
      })
      for (const lot of lots) {
        if (restant <= 0) break
        const consume = Math.min(restant, Number(lot.quantiteRestante))
        const newQte  = Number(lot.quantiteRestante) - consume
        await tx.stockLot.update({
          where: { id: lot.id },
          data: { quantiteRestante: newQte, isEpuise: newQte === 0 },
        })
        restant -= consume
      }
      stockApres = stockAvant - qte
      cmupApres  = cmupAvant
    }
  } else {
    // CMUP
    if (entree) {
      const newCmup = (stockAvant * cmupAvant + qte * pu) / (stockAvant + qte)
      stockApres = stockAvant + qte
      cmupApres  = newCmup
    } else {
      stockApres = stockAvant - qte
      cmupApres  = cmupAvant
    }
  }

  await tx.article.update({
    where: { id: articleId },
    data: { stockActuel: stockApres, valeurCmup: cmupApres },
  })

  return tx.stockMouvement.create({
    data: {
      companyId,
      articleId,
      type: dto.type as never,
      quantite: qte,
      prixUnitaire: pu,
      prixTotal,
      stockAvant,
      stockApres,
      cmupAvant,
      cmupApres,
      reference: dto.reference ?? null,
      description: dto.description ?? null,
      createdBy,
    },
  })
}

export async function addMouvement(companyId: string, dto: CreateMouvementInput, userId: string) {
  const article = await prisma.article.findFirst({ where: { id: dto.articleId, companyId } })
  if (!article) throw new AppError('Article introuvable', 404, 'NOT_FOUND')
  return prisma.$transaction((tx) => _addMouvementTx(tx, companyId, dto.articleId, dto, userId))
}

export async function listMouvements(companyId: string, query: ListMouvementsInput) {
  const { articleId, type, dateFrom, dateTo, page, limit } = query
  const where: Prisma.StockMouvementWhereInput = {
    companyId,
    ...(articleId ? { articleId } : {}),
    ...(type && type !== 'TRANSFERT' ? { type: type as never } : {}),
    ...(dateFrom || dateTo ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.stockMouvement.findMany({
      where,
      include: { article: { select: { id: true, reference: true, designation: true, unite: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockMouvement.count({ where }),
  ])
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

// ── Valorisation ──────────────────────────────────────────────────────────────

export async function getValorisation(companyId: string) {
  const articles = await prisma.article.findMany({
    where: { companyId, isActive: true },
    include: {
      famille: { select: { code: true, nom: true } },
      lotsFifo: { where: { isEpuise: false }, select: { quantiteRestante: true, prixUnitaire: true } },
    },
    orderBy: { reference: 'asc' },
  })
  let totalValeur = 0
  const lignes = articles.map((a) => {
    const valeur = a.methodeValuation === 'FIFO'
      ? a.lotsFifo.reduce((s, l) => s + Number(l.quantiteRestante) * Number(l.prixUnitaire), 0)
      : Number(a.stockActuel) * Number(a.valeurCmup)
    totalValeur += valeur
    return {
      id: a.id, reference: a.reference, designation: a.designation,
      famille: a.famille, unite: a.unite,
      stockActuel: Number(a.stockActuel),
      valeurCmup: Number(a.valeurCmup),
      methodeValuation: a.methodeValuation,
      valeurStock: valeur,
    }
  })
  return { lignes, totalValeur }
}

// ── Alertes ───────────────────────────────────────────────────────────────────

export async function getAlertes(companyId: string) {
  const articles = await prisma.article.findMany({
    where: { companyId, isActive: true },
    include: { famille: { select: { code: true, nom: true } } },
    orderBy: { reference: 'asc' },
  })
  return articles
    .filter((a) => Number(a.stockActuel) <= Number(a.stockMin))
    .map((a) => ({
      id: a.id, reference: a.reference, designation: a.designation,
      famille: a.famille, unite: a.unite,
      stockActuel: Number(a.stockActuel), stockMin: Number(a.stockMin),
      isRupture: Number(a.stockActuel) === 0,
    }))
}

// ── Tableau de bord ───────────────────────────────────────────────────────────

export async function getTableauDeBord(companyId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [articles, mouvementsMois, valorisation] = await Promise.all([
    prisma.article.count({ where: { companyId, isActive: true } }),
    prisma.stockMouvement.count({ where: { companyId, createdAt: { gte: startOfMonth } } }),
    getValorisation(companyId),
  ])

  const alertesCount = await prisma.article.findMany({ where: { companyId, isActive: true } })
    .then((list) => list.filter((a) => Number(a.stockActuel) <= Number(a.stockMin)).length)

  // Top 5 articles par valeur
  const top5 = valorisation.lignes
    .sort((a, b) => b.valeurStock - a.valeurStock)
    .slice(0, 5)

  return {
    articlesActifs: articles,
    alertesCount,
    mouvementsMois,
    valeurTotale: valorisation.totalValeur,
    top5Articles: top5,
  }
}
