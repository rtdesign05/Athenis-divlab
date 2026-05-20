import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

// ── À propos ─────────────────────────────────────────────────────────────────

export function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-forest-50/40 to-white pt-12 pb-12 lg:pt-20 lg:pb-16 border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-700 mb-3">À propos</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
            Notre mission : simplifier la gestion des <span className="text-forest-700">PME africaines et françaises</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Athenis est né d'un constat simple : les PME méritent mieux que des tableurs Excel et
            des logiciels comptables des années 90.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-gray">
          <h2>Pourquoi Athenis ?</h2>
          <p>
            Les outils comptables actuels sont conçus soit pour les grandes entreprises (SAP, Oracle —
            chers et complexes), soit pour les marchés anglo-saxons (QuickBooks, Xero — incompatibles
            SYSCOHADA). Entre les deux, les <strong>PME francophones d'Afrique et de France</strong>
            sont mal servies.
          </p>
          <p>
            Athenis combine ce qu'il y a de mieux dans le SaaS moderne (interface claire, multi-device,
            sécurité forte) avec une connaissance fine des spécificités locales : <strong>SYSCOHADA
            Révisé 2017</strong>, <strong>Plan Comptable Général</strong>, <strong>CNPS</strong>,
            <strong> URSSAF</strong>, <strong>NIU</strong>, <strong>RCCM</strong>, <strong>Mobile Money</strong>.
          </p>

          <h2>Nos valeurs</h2>
          <ul>
            <li>
              <strong>Simplicité.</strong> Un outil de gestion ne devrait pas nécessiter une formation
              de 3 jours. Athenis est conçu pour être pris en main en moins de 30 minutes.
            </li>
            <li>
              <strong>Souveraineté des données.</strong> Vos données restent sur des serveurs en
              Europe (OVH France), conformes RGPD. Vous restez propriétaire de tout, à tout moment.
            </li>
            <li>
              <strong>Transparence des prix.</strong> Pas de prix cachés, pas de coûts d'installation,
              pas de surcoût pour la fonctionnalité X. Le prix affiché est le prix payé.
            </li>
            <li>
              <strong>Support en français.</strong> Notre équipe est francophone et basée en Afrique
              et en France. Vous parlez à des humains qui comprennent votre contexte.
            </li>
          </ul>

          <h2>L'équipe</h2>
          <p>
            Athenis est porté par une équipe pluridisciplinaire — développeurs, comptables agréés,
            juristes, designers — répartie entre le Cameroun et la France. Nous travaillons en
            étroite collaboration avec des cabinets d'expertise comptable de la zone OHADA pour
            garantir la conformité de notre solution.
          </p>

          <h2>Nous rejoindre</h2>
          <p>
            Vous êtes développeur, comptable, ou commercial intéressé par le projet ?
            Écrivez-nous à <a href="mailto:contact@athenis360.com">contact@athenis360.com</a>.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Prêt à découvrir Athenis ?
          </h2>
          <p className="mt-3 text-gray-600">
            Démarrez gratuitement en 2 minutes, sans carte bancaire.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/auth/register" className="inline-flex items-center justify-center rounded-lg bg-forest-900 px-6 py-3 text-base font-semibold text-white hover:bg-forest-800">
              Créer mon compte
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center rounded-lg border-2 border-gray-200 px-6 py-3 text-base font-semibold text-gray-700 hover:border-forest-300">
              Parler à l'équipe
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Sécurité ─────────────────────────────────────────────────────────────────

const SECURITY_PILLARS = [
  {
    icon: '🔐',
    title: 'Chiffrement de bout en bout',
    points: [
      'HTTPS / TLS 1.3 pour tous les échanges',
      'AES-256-GCM pour les données sensibles au repos (secrets 2FA, etc.)',
      'Mots de passe hachés avec bcrypt (12 rounds — jamais en clair)',
    ],
  },
  {
    icon: '🔑',
    title: 'Authentification forte',
    points: [
      'Authentification à 2 facteurs (TOTP, e-mail, SMS)',
      'Codes de récupération à conserver hors-ligne',
      'Verrouillage automatique après 5 tentatives ratées (anti-brute-force)',
      'Tokens JWT courts (15 min) + refresh tokens rotatifs (7 jours)',
    ],
  },
  {
    icon: '🇪🇺',
    title: 'Hébergement en Europe',
    points: [
      'Datacenters OVH France (Roubaix, Strasbourg)',
      'Conformité RGPD native',
      'Pas de transferts hors UE',
      'Cloud Act US : non concerné',
    ],
  },
  {
    icon: '💾',
    title: 'Sauvegardes & continuité',
    points: [
      'Sauvegardes PostgreSQL quotidiennes automatiques',
      'Rétention 30 jours glissants',
      'Tests de restauration mensuels',
      'SLA cible : 99,5% de disponibilité',
    ],
  },
  {
    icon: '👁️',
    title: 'Audit & traçabilité',
    points: [
      'Audit log de toutes les actions sensibles (login, modif compta, paie)',
      'Conservation 12 mois',
      'Détection d\'anomalies via Sentry',
      'Monitoring temps réel (Uptime Robot)',
    ],
  },
  {
    icon: '🛡️',
    title: 'Protection serveur',
    points: [
      'Pare-feu UFW + Fail2ban',
      'Mises à jour de sécurité automatiques',
      'SSH par clé uniquement (pas de password)',
      'CSP strict + headers de sécurité (HSTS, X-Frame-Options, etc.)',
    ],
  },
]

export function SecurityPage() {
  return (
    <div className="bg-white">
      {/* Header */}
      <section className="bg-gradient-to-b from-forest-50/40 to-white pt-12 pb-12 lg:pt-20 lg:pb-16 border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-700 mb-3">Sécurité</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
            Vos données sont en <span className="text-forest-700">sécurité</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Athenis applique les standards de sécurité du secteur bancaire à la gestion de PME.
            Voici comment nous protégeons vos données.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECURITY_PILLARS.map((p) => (
              <div key={p.title} className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{p.title}</h3>
                <ul className="space-y-1.5">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="h-4 w-4 shrink-0 text-forest-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/></svg>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conformité */}
      <section className="py-16 bg-gray-50/40 border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 text-center mb-12">Conformité réglementaire</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-2">🇪🇺 RGPD</h3>
              <p className="text-sm text-gray-600">
                Politique de confidentialité documentée, DPO nommé, registre des traitements,
                exercice des droits facilité.
              </p>
              <Link to="/rgpd" className="mt-3 inline-flex text-sm font-semibold text-forest-700 hover:underline">
                Voir notre politique RGPD →
              </Link>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-2">📒 SYSCOHADA</h3>
              <p className="text-sm text-gray-600">
                Conformité comptable OHADA Révisé 2017 : plan comptable, états financiers,
                exports DSF (Cameroun).
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-2">🇫🇷 PCG France</h3>
              <p className="text-sm text-gray-600">
                Plan Comptable Général conforme, exports FEC pour l'administration fiscale française.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-2">⚖️ Signature électronique</h3>
              <p className="text-sm text-gray-600">
                Conforme à l'Acte Uniforme OHADA (2010) et au règlement eIDAS européen.
                Certificat de signature inclus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclosure */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Politique de divulgation responsable</h2>
          <p className="text-gray-600 mb-6">
            Vous avez identifié une faille de sécurité ? Nous prenons les vulnérabilités au sérieux
            et vous remercions par avance pour votre signalement.
          </p>
          <a href="mailto:security@athenis360.com" className="inline-flex items-center gap-2 rounded-lg border-2 border-forest-300 px-5 py-2.5 text-sm font-semibold text-forest-700 hover:bg-forest-50">
            security@athenis360.com
          </a>
        </div>
      </section>
    </div>
  )
}

// ── Contact ──────────────────────────────────────────────────────────────────

export function ContactPage() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // En attendant l'API contact, on génère un mailto
    const body = `Nom : ${name}\nEmail : ${email}\nSujet : ${subject}\n\n${message}`
    const mailto = `mailto:contact@athenis360.com?subject=${encodeURIComponent(subject || 'Contact depuis athenis360.com')}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
    setSent(true)
  }

  return (
    <div className="bg-white">
      <section className="bg-gradient-to-b from-forest-50/40 to-white pt-12 pb-12 lg:pt-20 lg:pb-16 border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-700 mb-3">Contact</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
            Parlons de votre <span className="text-forest-700">projet</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Une question, une démo, un partenariat ? Notre équipe vous répond sous 24h ouvrées.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12">
          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Envoyez-nous un message</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
              <select required value={subject} onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20">
                <option value="">Choisir…</option>
                <option>Demande de démo</option>
                <option>Question sur les tarifs</option>
                <option>Support technique</option>
                <option>Partenariat / Cabinet comptable</option>
                <option>Sécurité / Bug bounty</option>
                <option>Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Votre message</label>
              <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20" />
            </div>

            <button type="submit"
              className="w-full rounded-lg bg-forest-900 px-5 py-3 text-sm font-semibold text-white hover:bg-forest-800 transition-colors">
              Envoyer le message
            </button>

            {sent && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                ✓ Votre client mail a été ouvert avec le message pré-rempli.
              </p>
            )}

            <p className="text-xs text-gray-400 text-center">
              Vos données ne sont utilisées que pour vous répondre. Voir notre <Link to="/rgpd" className="underline">politique RGPD</Link>.
            </p>
          </form>

          {/* Coordonnées */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Autres moyens de nous joindre</h2>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-forest-100 flex items-center justify-center text-xl">✉️</div>
                <div>
                  <p className="font-semibold text-gray-900">Email général</p>
                  <a href="mailto:contact@athenis360.com" className="text-sm text-forest-700 hover:underline">contact@athenis360.com</a>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-forest-100 flex items-center justify-center text-xl">🔒</div>
                <div>
                  <p className="font-semibold text-gray-900">Sécurité (DPO + bug bounty)</p>
                  <a href="mailto:security@athenis360.com" className="text-sm text-forest-700 hover:underline">security@athenis360.com</a>
                  <p className="text-xs text-gray-500 mt-1">Pour signaler une vulnérabilité ou exercer vos droits RGPD.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-forest-100 flex items-center justify-center text-xl">⏱️</div>
                <div>
                  <p className="font-semibold text-gray-900">Délai de réponse</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Sous <strong>24h ouvrées</strong> en moyenne. Plus rapide pour les clients sur plan Pro/Premium.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-forest-50 border border-forest-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-forest-900">💡 Pas envie d'écrire ?</p>
              <p className="text-sm text-forest-800 mt-1">
                Créez un compte gratuit et testez Athenis pendant 5 minutes. C'est souvent plus parlant qu'une démo.
              </p>
              <Link to="/auth/register" className="mt-3 inline-flex text-sm font-bold text-forest-700 hover:underline">
                Créer un compte gratuit →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
