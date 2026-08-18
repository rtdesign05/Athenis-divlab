import { Link } from 'react-router-dom'

// ── Data : 6 modules avec features détaillées ────────────────────────────────

interface ModuleDetail {
  slug:    string
  icon:    string
  title:   string
  tagline: string
  description: string
  features: Array<{ title: string; desc: string }>
  benefits: string[]
  color:    { bg: string; text: string; border: string }
}

export const MODULES: ModuleDetail[] = [
  {
    slug:  'gestion',
    icon:  '🧾',
    title: 'Gestion commerciale',
    tagline: 'Le cycle de vente, de bout en bout',
    description: 'Athenis vous accompagne du devis à l\'encaissement. Toutes vos factures, vos clients, vos stocks et votre trésorerie centralisés et synchronisés en temps réel.',
    color: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    features: [
      { title: 'Devis & factures',           desc: 'Émettez des devis professionnels en 2 min, convertissez-les en factures, suivez les paiements.' },
      { title: 'Clients & fournisseurs',     desc: 'Base centralisée avec historique des transactions, paiements, encours.' },
      { title: 'Stocks & articles',          desc: 'Valorisation FIFO/PMP, alertes stock bas, bons de réception et livraison.' },
      { title: 'Facturation récurrente',     desc: 'Abonnements, contrats de maintenance — Athenis génère les factures automatiquement.' },
      { title: 'Trésorerie multi-comptes',   desc: 'Banque, caisse, Mobile Money — vision consolidée temps réel.' },
      { title: 'Multi-devises',              desc: 'Émettez en F CFA, €, $ ou toute devise. Conversion automatique avec taux du jour.' },
    ],
    benefits: [
      'Réduisez de 80% le temps passé sur la facturation',
      'Plus d\'oubli de relance grâce aux alertes automatiques',
      'Vision unifiée des ventes et de la trésorerie',
    ],
  },
  {
    slug:  'comptabilite',
    icon:  '📒',
    title: 'Comptabilité',
    tagline: 'SYSCOHADA et PCG nativement supportés',
    description: 'Comptabilité générale et analytique conforme aux normes africaines (SYSCOHADA Révisé 2017) et françaises (Plan Comptable Général). Écritures automatiques, états financiers normés.',
    color: { bg: 'bg-forest-50', text: 'text-forest-700', border: 'border-forest-200' },
    features: [
      { title: 'Plan comptable préinstallé',  desc: 'SYSCOHADA Révisé 2017 (17 pays OHADA) ou PCG France. Personnalisable.' },
      { title: 'Écritures automatiques',      desc: 'Les ventes et achats génèrent automatiquement les écritures comptables.' },
      { title: 'Journal, grand livre, balance', desc: 'Visualisations interactives avec filtres par période, compte, journal.' },
      { title: 'États financiers',            desc: 'Bilan, Compte de résultat, TAFIRE (OHADA), annexes — générés en 1 clic.' },
      { title: 'Révision comptable',          desc: 'Outil de révision multi-utilisateurs, marquage des comptes vérifiés.' },
      { title: 'Exports FEC & déclarations',  desc: 'FEC (France), DSF (Cameroun), formats compatibles administration fiscale.' },
    ],
    benefits: [
      'Conformité légale garantie (OHADA, France)',
      'Réduction des erreurs de saisie de 90%',
      'Clôture annuelle accélérée (semaines → jours)',
    ],
  },
  {
    slug:  'rh',
    icon:  '👥',
    title: 'Ressources Humaines',
    tagline: 'Paie, contrats, congés — tout en un',
    description: 'Gérez l\'intégralité du cycle de vie de vos employés. Athenis calcule la paie selon les barèmes locaux (CNPS Cameroun, URSSAF France) et automatise les déclarations sociales.',
    color: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    features: [
      { title: 'Fiches employés',         desc: 'Identité, contrat, salaire, ancienneté, documents, formations, évaluations.' },
      { title: 'Paie locale',             desc: 'Bulletins conformes CNPS (Cameroun) ou URSSAF (France). Calculs automatiques.' },
      { title: 'Contrats',                desc: 'Bibliothèque de modèles (CDI, CDD, intérim). Génération PDF + signature électronique.' },
      { title: 'Congés & absences',       desc: 'Demandes, validation, solde de congés, calendrier équipe.' },
      { title: 'Planning',                desc: 'Vue mensuelle ou hebdomadaire, gestion des absences, rotations.' },
      { title: 'Déclarations sociales',   desc: 'DPAE, DSN, CNPS, attestations — Athenis prépare les fichiers à envoyer.' },
    ],
    benefits: [
      'Bulletins de paie en 30 secondes',
      'Calcul automatique des cotisations sociales',
      'Conformité légale CNPS / URSSAF',
    ],
  },
  {
    slug:  'juridique',
    icon:  '⚖️',
    title: 'Juridique',
    tagline: 'Contrats, conformité, RGPD',
    description: 'Centralisez vos contrats, signez électroniquement de manière conforme (OHADA, eIDAS), suivez vos obligations légales et RGPD.',
    color: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    features: [
      { title: 'Bibliothèque de contrats',  desc: 'Tous vos contrats centralisés avec versions, parties prenantes, dates.' },
      { title: 'Signature électronique',    desc: 'Conforme OHADA (Acte Uniforme 2010) et eIDAS. Certificat de signature inclus.' },
      { title: 'Conformité RGPD',           desc: 'Registre de traitements, gestion des consentements, droits des personnes.' },
      { title: 'Alertes légales',           desc: 'Échéances de renouvellement, dates de fin de contrat, obligations annuelles.' },
      { title: 'Modèles juridiques',        desc: 'Bibliothèque de modèles CDI, NDA, CGV, CGU adaptés à votre juridiction.' },
      { title: 'Audit trail',               desc: 'Traçabilité complète de qui a signé quoi, quand, depuis quelle IP.' },
    ],
    benefits: [
      'Signature de contrats en 5 min (vs 5 jours par courrier)',
      'Conformité RGPD documentée et auditable',
      'Plus de contrats perdus ou oubliés',
    ],
  },
  {
    slug:  'esg',
    icon:  '🌿',
    title: 'ESG / CSRD',
    tagline: 'Reporting environnemental et social',
    description: 'Préparez-vous aux nouvelles obligations CSRD avec un bilan carbone (Scope 1, 2, 3), des indicateurs sociaux et de gouvernance, et un rapport DPEF exportable.',
    color: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    features: [
      { title: 'Bilan carbone',             desc: 'Scope 1 (émissions directes), Scope 2 (énergie), Scope 3 (chaîne de valeur).' },
      { title: 'Indicateurs sociaux',       desc: 'Parité, formation, accidents, turnover — tableau de bord temps réel.' },
      { title: 'Gouvernance',               desc: 'Structure du capital, composition des organes, politique de rémunération.' },
      { title: 'Benchmark sectoriel',       desc: 'Comparez-vous à votre secteur sur les indicateurs ESG clés.' },
      { title: 'Plan d\'action',            desc: 'Définissez vos objectifs ESG, suivez les progrès, communiquez-les.' },
      { title: 'Rapport DPEF / CSRD',       desc: 'Génération automatique du rapport conforme aux normes européennes.' },
    ],
    benefits: [
      'Conformité CSRD anticipée',
      'Argument commercial fort pour appels d\'offres B2B',
      'Réduction documentée de l\'empreinte carbone',
    ],
  },
  {
    slug:  'fiscalite',
    icon:  '🏛️',
    title: 'Fiscalité',
    tagline: 'Déclarations automatisées',
    description: 'TVA, IS, IRPP, DSF — Athenis prépare vos déclarations fiscales à partir de vos écritures comptables. Calculs automatiques selon votre zone fiscale.',
    color: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    features: [
      { title: 'TVA',                       desc: 'Déclarations mensuelles ou trimestrielles, calcul du déductible et collecté.' },
      { title: 'Impôt sur les sociétés',    desc: 'Acomptes, solde, prévisions. Calcul IS Cameroun (33%) ou France (15-25%).' },
      { title: 'IRPP / fiches de paie',     desc: 'Barème IRPP automatique pour le Cameroun (progressif) ou IR français.' },
      { title: 'DSF (Cameroun)',            desc: 'Déclaration Statistique et Fiscale annuelle, format DGI compatible.' },
      { title: 'Calendrier fiscal',         desc: 'Toutes les échéances de votre pays, alertes 7 jours avant.' },
      { title: 'Conseil fiscal',            desc: 'Articles, guides, simulateurs pour vos décisions fiscales courantes.' },
    ],
    benefits: [
      'Plus jamais de pénalités pour retard',
      'Calculs vérifiés par des experts-comptables',
      'Vous gagnez 5h par mois sur les déclarations',
    ],
  },
]

// ── Page : overview de tous les modules ──────────────────────────────────────

export function FeaturesPage() {
  return (
    <div className="marketing-page marketing-features bg-white">
      {/* Header */}
      <section className="bg-gradient-to-b from-forest-50/40 to-white pt-12 pb-12 lg:pt-20 lg:pb-16 border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-700 mb-3">Fonctionnalités</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
            6 modules pour <span className="text-forest-700">tout gérer</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            De la comptabilité à l'ESG en passant par la paie — Athenis est le seul logiciel
            qui couvre tout le cycle de gestion d'une PME, en français.
          </p>
        </div>
      </section>

      {/* Modules en alternance image/texte */}
      <div className="space-y-24 lg:space-y-32 py-20">
        {MODULES.map((mod, i) => (
          <section key={mod.slug} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${i % 2 === 1 ? 'lg:[&>div:first-child]:order-2' : ''}`}>
              {/* Texte */}
              <div>
                <div className={`inline-flex items-center gap-2 ${mod.color.bg} ${mod.color.text} ${mod.color.border} border rounded-full px-3 py-1`}>
                  <span className="text-lg">{mod.icon}</span>
                  <p className="text-xs font-semibold uppercase tracking-wider">{mod.title}</p>
                </div>
                <h2 className="mt-4 text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                  {mod.tagline}
                </h2>
                <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                  {mod.description}
                </p>

                <div className="mt-6 space-y-3">
                  {mod.benefits.map((b) => (
                    <div key={b} className="flex items-start gap-3">
                      <svg className={`h-5 w-5 shrink-0 ${mod.color.text} mt-0.5`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/></svg>
                      <p className="text-sm font-medium text-gray-700">{b}</p>
                    </div>
                  ))}
                </div>

                <Link
                  to="/auth/register"
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-forest-800"
                >
                  Essayer ce module
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>

              {/* Features list mockup */}
              <div className="bg-gray-50 rounded-2xl p-6 lg:p-8 border border-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Inclus dans ce module</p>
                <div className="space-y-4">
                  {mod.features.map((f) => (
                    <div key={f.title} className="bg-white rounded-lg p-4 border border-gray-100">
                      <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                      <p className="mt-1 text-xs text-gray-600 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* CTA final */}
      <section className="py-16 bg-gradient-to-br from-forest-900 to-forest-800 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Prêt à essayer Athenis ?</h2>
          <p className="text-lg text-gray-300 mb-8">
            Activez tous les modules en quelques minutes. Commencez gratuitement.
          </p>
          <Link
            to="/auth/register"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-forest-900 hover:bg-gray-50"
          >
            Créer mon compte
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
