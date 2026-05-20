import { useState } from 'react'
import { Link } from 'react-router-dom'

// ── Reusable: section heading ────────────────────────────────────────────────

function SectionHeading({ eyebrow, title, subtitle, center = false }: {
  eyebrow?: string
  title:    string
  subtitle?: string
  center?:  boolean
}) {
  return (
    <div className={`max-w-3xl ${center ? 'mx-auto text-center' : ''}`}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-wider text-forest-700 mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg text-gray-600 leading-relaxed">{subtitle}</p>
      )}
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-forest-50/40 via-white to-white pt-12 pb-16 lg:pt-20 lg:pb-24">
      {/* Décoratif : motifs en arrière-plan */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 -mr-48 mt-12 h-96 w-96 rounded-full bg-forest-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-48 -mb-24 h-96 w-96 rounded-full bg-amber-100/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: texte */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-forest-50 border border-forest-200 px-3 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-forest-500 animate-pulse"></span>
              <p className="text-xs font-semibold text-forest-800">
                🇨🇲 Conforme SYSCOHADA · 🇫🇷 Conforme PCG
              </p>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.05]">
              La <span className="text-forest-700">gestion 360°</span> de votre PME, enfin&nbsp;simple.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl">
              Comptabilité, facturation, paie, juridique, ESG —
              tous les outils de gestion de votre entreprise dans <strong className="text-gray-900">un seul logiciel</strong>,
              en français, conçu pour les PME d'Afrique et de France.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest-900 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-forest-800 hover:shadow-lg hover:scale-105"
              >
                Essayer gratuitement
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                to="/fonctionnalites"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:border-forest-300 hover:text-forest-700"
              >
                Voir les fonctionnalités
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <svg className="h-5 w-5 text-forest-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"/></svg>
                Gratuit pour démarrer
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-5 w-5 text-forest-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"/></svg>
                Sans engagement
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <svg className="h-5 w-5 text-forest-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"/></svg>
                Données en France/UE
              </div>
            </div>
          </div>

          {/* Right: mock screenshot */}
          <div className="relative">
            <div className="relative rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
              {/* Browser bar */}
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-green-400"></div>
                <div className="ml-4 flex-1 bg-white rounded px-2 py-1 text-xs text-gray-500">
                  athenis360.com/app/dashboard
                </div>
              </div>
              {/* Dashboard mockup */}
              <div className="p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900">Tableau de bord</h3>
                  <div className="flex gap-1">
                    <div className="h-6 w-16 rounded bg-forest-100"></div>
                    <div className="h-6 w-16 rounded bg-gray-200"></div>
                  </div>
                </div>
                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase">Chiffre d'affaires</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">12.4M FCFA</p>
                    <p className="text-[10px] text-green-600 mt-0.5">↑ 12% ce mois</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase">Factures à émettre</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">8</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">3 en retard</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase">Trésorerie</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">3.8M FCFA</p>
                    <p className="text-[10px] text-green-600 mt-0.5">Stable</p>
                  </div>
                </div>
                {/* Chart placeholder */}
                <div className="bg-white rounded-lg p-3 border border-gray-200 h-32 flex items-end gap-1.5 px-2">
                  {[40, 65, 50, 80, 70, 95, 60, 85, 75, 90, 80, 100].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-forest-600 to-forest-400 rounded-t" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
            </div>
            {/* Floating badges */}
            <div className="hidden lg:block absolute -bottom-4 -left-6 bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center text-xl">✓</div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Facture validée</p>
                <p className="text-[10px] text-gray-500">FAC-2026-0042 · 850 000 FCFA</p>
              </div>
            </div>
            <div className="hidden lg:block absolute -top-4 -right-6 bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-xl">🔔</div>
              <div>
                <p className="text-xs font-semibold text-gray-900">CNPS du mois</p>
                <p className="text-[10px] text-gray-500">Échéance dans 5 jours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Trust strip ──────────────────────────────────────────────────────────────

function TrustStrip() {
  return (
    <section className="border-y border-gray-100 py-8 bg-gray-50/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 mb-6">
          Conformité &amp; Standards
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 text-center">
          <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
            <span className="text-2xl">📒</span> SYSCOHADA Révisé 2017
          </div>
          <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
            <span className="text-2xl">🇫🇷</span> Plan Comptable Général
          </div>
          <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
            <span className="text-2xl">🔒</span> RGPD compliant
          </div>
          <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
            <span className="text-2xl">🇪🇺</span> Hébergement UE
          </div>
          <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
            <span className="text-2xl">🔐</span> 2FA · AES-256
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Modules section ──────────────────────────────────────────────────────────

const MODULES = [
  {
    icon: '🧾',
    title: 'Gestion commerciale',
    desc:  'Devis, factures, clients, fournisseurs, stocks et trésorerie en temps réel.',
    color: 'bg-blue-50 text-blue-700 border-blue-100',
    link:  '/fonctionnalites/gestion',
  },
  {
    icon: '📒',
    title: 'Comptabilité',
    desc:  'Journal, grand livre, états financiers (Bilan, CR, TAFIRE). SYSCOHADA + PCG.',
    color: 'bg-forest-50 text-forest-700 border-forest-100',
    link:  '/fonctionnalites/comptabilite',
  },
  {
    icon: '👥',
    title: 'Ressources Humaines',
    desc:  'Employés, contrats, paie (CNPS Cameroun, URSSAF France), congés, planning.',
    color: 'bg-purple-50 text-purple-700 border-purple-100',
    link:  '/fonctionnalites/rh',
  },
  {
    icon: '⚖️',
    title: 'Juridique',
    desc:  'Contrats, signature électronique OHADA, conformité RGPD, alertes légales.',
    color: 'bg-amber-50 text-amber-700 border-amber-100',
    link:  '/fonctionnalites/juridique',
  },
  {
    icon: '🌿',
    title: 'ESG / CSRD',
    desc:  'Bilan carbone, indicateurs sociaux, gouvernance, rapport DPEF exportable.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    link:  '/fonctionnalites/esg',
  },
  {
    icon: '🏛️',
    title: 'Fiscalité',
    desc:  'Déclarations DSF, TVA, IS, IRPP. Calculs automatisés selon votre zone.',
    color: 'bg-rose-50 text-rose-700 border-rose-100',
    link:  '/fonctionnalites/fiscalite',
  },
]

function ModulesSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="6 modules · 1 logiciel"
          title="Tout ce dont votre PME a besoin pour fonctionner"
          subtitle="Fini les outils éparpillés. Athenis regroupe la comptabilité, la gestion, la paie et plus encore — avec une vraie cohérence entre les modules."
          center
        />

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map((m) => (
            <Link
              key={m.title}
              to={m.link}
              className="group relative p-7 rounded-2xl bg-white border border-gray-200 hover:border-forest-300 hover:shadow-lg transition-all"
            >
              <div className={`inline-flex items-center justify-center h-14 w-14 rounded-xl ${m.color} border text-3xl mb-5`}>
                {m.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-forest-700 transition-colors">
                {m.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{m.desc}</p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-forest-700 group-hover:gap-2 transition-all gap-1">
                Découvrir
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '01',
    title: 'Créez votre compte',
    desc:  'Inscription en 2 minutes. Choisissez votre pays — Athenis configure automatiquement votre plan comptable (SYSCOHADA ou PCG) et votre devise locale.',
    icon:  '✍️',
  },
  {
    num: '02',
    title: 'Importez vos données',
    desc:  'Clients, fournisseurs, employés, factures existantes. Import en masse via Excel ou intégration directe avec votre banque.',
    icon:  '📥',
  },
  {
    num: '03',
    title: 'Pilotez votre entreprise',
    desc:  'Tableaux de bord, factures émises en 1 minute, paie automatisée, rapports financiers générés à la demande. Vous gagnez du temps tous les jours.',
    icon:  '🚀',
  },
]

function HowItWorks() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-forest-50/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Démarrage simple"
          title="Opérationnel en 3 étapes"
          subtitle="De l'inscription à la première facture émise — moins de 30 minutes."
          center
        />

        <div className="mt-16 grid lg:grid-cols-3 gap-8 relative">
          {/* Ligne de connexion (desktop only) */}
          <div aria-hidden className="hidden lg:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-forest-200 via-forest-300 to-forest-200" />

          {STEPS.map((step) => (
            <div key={step.num} className="relative bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-12 w-12 rounded-full bg-forest-900 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                  {step.num}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {step.icon} {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/auth/register"
            className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-forest-800 transition-colors"
          >
            Commencer maintenant — gratuit
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Why Athenis ──────────────────────────────────────────────────────────────

const WHY_FEATURES = [
  {
    icon:  '🌍',
    title: 'Multi-zones natif',
    desc:  'Le SEUL logiciel qui gère vraiment SYSCOHADA (Afrique) ET PCG (France) dans la même base de code. Plus besoin de jongler entre 2 outils.',
  },
  {
    icon:  '💱',
    title: 'Multi-devises temps réel',
    desc:  'F CFA, Euro, USD et 50+ devises. Factures, états financiers, tarifs adaptés au pays. Tout est cohérent et formaté correctement.',
  },
  {
    icon:  '👥',
    title: 'Mode cabinet comptable',
    desc:  'Gérez les comptabilités de tous vos clients depuis un seul login. Bascule rapide entre les dossiers, facturation des honoraires intégrée.',
  },
  {
    icon:  '🔒',
    title: 'Sécurité bancaire',
    desc:  'JWT + Refresh tokens, 2FA (TOTP / Email / SMS), AES-256, audit log de toutes les actions. Hébergement UE conforme RGPD.',
  },
  {
    icon:  '📱',
    title: 'Web + Desktop + Mobile',
    desc:  'Une seule app, partout. Navigateur, application Windows native, mobile PWA. Vos données sont synchronisées en permanence.',
  },
  {
    icon:  '🎯',
    title: 'Adapté aux PME',
    desc:  'Pas une usine à gaz comme SAP. Pas un Excel surdimensionné comme QuickBooks. Athenis est conçu pour les PME de 1 à 50 employés.',
  },
]

function WhyAthenis() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Pourquoi Athenis"
          title="Ce qui nous différencie"
          subtitle="6 raisons qui font qu'Athenis est le bon choix pour votre PME."
          center
        />

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {WHY_FEATURES.map((f) => (
            <div key={f.title}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing preview ──────────────────────────────────────────────────────────

function PricingPreview() {
  return (
    <section className="py-20 lg:py-28 bg-forest-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-forest-300 mb-3">
              Tarifs
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Démarrez gratuitement.<br />
              <span className="text-forest-300">Évoluez quand vous voulez.</span>
            </h2>
            <p className="mt-6 text-lg text-gray-300 leading-relaxed">
              Le plan <strong className="text-white">Gratuit</strong> couvre tous les besoins essentiels —
              comptabilité simple, jusqu'à 30 factures/mois, 1 utilisateur. Parfait pour démarrer.
            </p>
            <p className="mt-3 text-gray-300 leading-relaxed">
              Les plans payants débloquent les modules avancés (paie, ESG, juridique),
              plus d'utilisateurs et des limites étendues. Tarifs adaptés à votre pays.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/tarifs"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-forest-900 hover:bg-gray-50 transition-colors"
              >
                Voir les tarifs détaillés
              </Link>
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-forest-700 px-6 py-3 text-base font-semibold text-white hover:bg-forest-800 transition-colors"
              >
                Démarrer gratuitement
              </Link>
            </div>
          </div>

          {/* Mini comparatif tarifs */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 lg:p-8 border border-white/20">
            <p className="text-sm font-semibold text-forest-300 mb-4">EXEMPLES DE TARIFS · F CFA</p>
            <div className="space-y-3">
              {[
                { plan: 'Gratuit', price: '0 F CFA', desc: 'Comptabilité simple, 1 user',  badge: null },
                { plan: 'Starter', price: '5 900',   desc: 'Gestion + RH, 3 users',         badge: null },
                { plan: 'Pro',     price: '19 000',  desc: 'Tout en illimité, 5 users',     badge: 'Populaire' },
                { plan: 'Premium', price: '49 000',  desc: 'Multi-tenant, 20 users',        badge: null },
              ].map(t => (
                <div key={t.plan} className={`flex items-baseline justify-between gap-4 p-3 rounded-lg ${t.badge ? 'bg-amber-400/10 border border-amber-400/30' : 'bg-white/5'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{t.plan}</p>
                      {t.badge && <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300">{t.badge}</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{t.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{t.price}</p>
                    {t.price !== '0 F CFA' && <p className="text-[10px] text-gray-400">/ mois</p>}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-400 text-center">
              En Euros : 9€ / 29€ / 79€ — adaptés à chaque pays
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Est-ce vraiment gratuit pour démarrer ?',
    a: 'Oui. Le plan Gratuit est utilisable indéfiniment, sans carte bancaire requise. Vous accédez à la comptabilité simple, jusqu\'à 30 factures par mois, et 1 utilisateur. Aucune obligation de passer à un plan payant.',
  },
  {
    q: 'Athenis est-il conforme aux normes comptables ?',
    a: 'Oui. Athenis applique automatiquement SYSCOHADA Révisé 2017 pour les pays OHADA (Cameroun, Sénégal, Côte d\'Ivoire, etc.) et le Plan Comptable Général (PCG) pour la France. Tous les documents (Bilan, Compte de Résultat, TAFIRE) sont aux normes.',
  },
  {
    q: 'Mes données sont-elles en sécurité ?',
    a: 'Oui. Vos données sont hébergées en Europe (conformité RGPD), chiffrées en transit (HTTPS/TLS 1.3) et au repos (AES-256). Nous proposons l\'authentification à 2 facteurs (TOTP, e-mail, SMS) et des sauvegardes quotidiennes automatiques avec rétention 30 jours.',
  },
  {
    q: 'Puis-je importer mes données existantes ?',
    a: 'Oui. Vous pouvez importer vos clients, fournisseurs, articles et écritures comptables via fichiers Excel/CSV. Pour des migrations plus complexes (depuis Sage, QuickBooks, etc.), notre équipe peut vous accompagner.',
  },
  {
    q: 'Comment se passe la facturation ?',
    a: 'Athenis est facturé au mois, sans engagement. Vous pouvez résilier à tout moment depuis votre interface. Paiement par carte bancaire, virement, ou Mobile Money (Orange Money, MTN Mobile Money) selon votre pays.',
  },
  {
    q: 'Mes employés ont-ils accès à Athenis ?',
    a: 'Oui. Selon votre plan, vous pouvez ajouter jusqu\'à 1, 3, 5 ou 20 utilisateurs. Chaque utilisateur a un rôle (Admin, Comptable, RH, Lecture seule…) qui limite ce qu\'il peut voir et modifier.',
  },
  {
    q: 'Athenis fonctionne-t-il hors ligne ?',
    a: 'Partiellement. L\'application Web et Desktop fonctionne avec une connexion internet. Pour les périodes hors ligne courtes, les écrans déjà chargés restent consultables. Un vrai mode hors-ligne complet est sur notre roadmap.',
  },
]

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Questions fréquentes"
          title="Tout ce que vous voulez savoir"
          subtitle="Pas trouvé votre question ? Écrivez-nous à contact@athenis360.com"
          center
        />

        <div className="mt-12 space-y-3">
          {FAQS.map((faq, i) => (
            <details
              key={i}
              open={openIndex === i}
              onToggle={(e) => {
                if ((e.target as HTMLDetailsElement).open) setOpenIndex(i)
                else if (openIndex === i) setOpenIndex(null)
              }}
              className="group rounded-xl border border-gray-200 bg-white open:border-forest-300 open:shadow-sm"
            >
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4">
                <span className="text-base font-semibold text-gray-900">{faq.q}</span>
                <svg className="h-5 w-5 shrink-0 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-forest-900 via-forest-800 to-forest-900 px-8 py-16 lg:px-16 lg:py-20 text-center relative overflow-hidden">
          {/* Décoratif */}
          <div aria-hidden className="absolute inset-0 opacity-20">
            <div className="absolute -top-12 -left-12 h-64 w-64 rounded-full bg-amber-400 blur-3xl" />
            <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-forest-400 blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Prêt à simplifier la gestion de votre PME ?
            </h2>
            <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
              Rejoignez les entreprises qui ont choisi Athenis pour leur comptabilité,
              leur paie et leur gestion 360°. Démarrage en 2 minutes, gratuit.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-4 text-base font-semibold text-forest-900 shadow-lg hover:bg-gray-50 transition-colors"
              >
                Créer mon compte gratuit
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/20 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Parler à un expert
              </Link>
            </div>

            <p className="mt-6 text-sm text-gray-400">
              Sans engagement · Sans carte bancaire · Configuration en 2 min
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Page export ──────────────────────────────────────────────────────────────

export function HomePage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <ModulesSection />
      <HowItWorks />
      <WhyAthenis />
      <PricingPreview />
      <FAQ />
      <FinalCTA />
    </>
  )
}
