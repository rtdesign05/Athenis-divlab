import { Link } from 'react-router-dom'

// ── Layout commun aux pages légales ─────────────────────────────────────────

function LegalPageLayout({
  title,
  lastUpdate,
  toc,
  children,
}: {
  title: string
  lastUpdate: string
  toc?: Array<{ id: string; label: string }>
  children: React.ReactNode
}) {
  return (
    <div className="bg-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-forest-50/40 to-white border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-700 mb-3">
            Informations légales
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="mt-3 text-sm text-gray-500">Dernière mise à jour : {lastUpdate}</p>
        </div>
      </div>

      {/* Content + optional TOC */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-[1fr_220px] gap-12">
        <article className="prose prose-gray max-w-none lg:order-1">
          {children}
        </article>

        {toc && (
          <aside className="lg:order-2 lg:sticky lg:top-20 lg:self-start hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Sommaire</p>
            <ul className="space-y-2 text-sm">
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-gray-600 hover:text-forest-700 transition-colors">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  )
}

// ── RGPD ─────────────────────────────────────────────────────────────────────

export function RgpdPage() {
  const toc = [
    { id: 'responsable',  label: '1. Responsable du traitement' },
    { id: 'donnees',      label: '2. Données collectées' },
    { id: 'finalites',    label: '3. Finalités' },
    { id: 'base-legale',  label: '4. Base légale' },
    { id: 'conservation', label: '5. Durées de conservation' },
    { id: 'partage',      label: '6. Partage des données' },
    { id: 'transferts',   label: '7. Transferts hors UE' },
    { id: 'securite',     label: '8. Sécurité' },
    { id: 'droits',       label: '9. Vos droits' },
    { id: 'cookies',      label: '10. Cookies' },
    { id: 'contact',      label: '11. Contact DPO' },
  ]

  return (
    <LegalPageLayout title="Politique de confidentialité (RGPD)" lastUpdate="20 mai 2026" toc={toc}>
      <p>
        Athenis (« <strong>nous</strong> », « <strong>notre</strong> », « <strong>l'éditeur</strong> ») s'engage à protéger
        votre vie privée et la confidentialité de vos données personnelles, conformément au
        <strong> Règlement Général sur la Protection des Données (RGPD)</strong> (Règlement UE 2016/679)
        et, le cas échéant, à la <strong>Loi N°2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité au Cameroun</strong>.
      </p>

      <p>
        Cette politique décrit les données que nous collectons, pourquoi nous les collectons, comment nous les
        utilisons, et quels sont vos droits.
      </p>

      <h2 id="responsable">1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données est <strong>Athenis SARL</strong>,
        dont les coordonnées figurent dans nos <Link to="/mentions-legales">mentions légales</Link>.
        Vous pouvez le contacter à : <a href="mailto:dpo@athenis360.com">dpo@athenis360.com</a>.
      </p>

      <h2 id="donnees">2. Données collectées</h2>
      <p>Nous collectons les catégories de données suivantes :</p>
      <ul>
        <li><strong>Données d'identification</strong> : nom, prénom, adresse e-mail, téléphone, numéro Athenis.</li>
        <li><strong>Données d'authentification</strong> : mot de passe (chiffré bcrypt 12 rounds), secret TOTP (chiffré AES-256), tokens de session.</li>
        <li><strong>Données d'entreprise</strong> : raison sociale, RCCM/SIRET, NIU, secteur, taille, pays.</li>
        <li><strong>Données métier</strong> : factures, clients, employés, écritures comptables, paie, contrats — saisies par vous-même.</li>
        <li><strong>Données techniques</strong> : adresse IP, type de navigateur, OS, dates/heures de connexion, logs d'audit.</li>
        <li><strong>Données de paiement</strong> : nous n'avons jamais accès aux numéros de carte. Les paiements sont traités par notre prestataire (Stripe / opérateur Mobile Money) qui conserve ces données.</li>
      </ul>

      <h2 id="finalites">3. Finalités du traitement</h2>
      <p>Vos données sont traitées pour les finalités suivantes :</p>
      <ul>
        <li>Fournir et maintenir le service Athenis (création de compte, authentification, fonctionnement des modules).</li>
        <li>Assurer la sécurité du service (détection de fraude, audit log, blocage anti-brute force).</li>
        <li>Vous envoyer des e-mails de service (validation, factures, alertes de sécurité, notifications).</li>
        <li>Améliorer le service (analytics agrégés et anonymisés, suivi des erreurs via Sentry).</li>
        <li>Respecter nos obligations légales (comptabilité, fiscalité, lutte contre la fraude).</li>
      </ul>

      <h2 id="base-legale">4. Base légale</h2>
      <p>Le traitement de vos données repose sur les bases légales suivantes :</p>
      <ul>
        <li><strong>Exécution du contrat</strong> : pour fournir les services que vous nous demandez.</li>
        <li><strong>Obligations légales</strong> : pour la facturation, la fiscalité, les obligations comptables.</li>
        <li><strong>Intérêt légitime</strong> : pour la sécurité et l'amélioration du service.</li>
        <li><strong>Consentement</strong> : pour les e-mails marketing (que nous n'envoyons pas pour l'instant) et les cookies non essentiels.</li>
      </ul>

      <h2 id="conservation">5. Durées de conservation</h2>
      <ul>
        <li><strong>Compte actif</strong> : tant que votre compte est ouvert, vos données sont conservées.</li>
        <li><strong>Compte supprimé</strong> : les données d'identification sont supprimées sous 30 jours. Les données comptables sont conservées 10 ans après clôture (obligation légale OHADA et française).</li>
        <li><strong>Logs d'audit</strong> : 12 mois.</li>
        <li><strong>Backups</strong> : 30 jours glissants.</li>
      </ul>

      <h2 id="partage">6. Partage des données</h2>
      <p>Nous ne vendons JAMAIS vos données. Nous les partageons uniquement avec :</p>
      <ul>
        <li><strong>Sous-traitants techniques</strong> qui nous permettent de fonctionner :
          <ul>
            <li>OVH (hébergeur, France, conforme RGPD)</li>
            <li>Brevo (e-mails transactionnels, France, conforme RGPD)</li>
            <li>Sentry (monitoring d'erreurs, données hébergées UE)</li>
            <li>Stripe ou opérateur Mobile Money (paiements)</li>
            <li>Twilio / Africa's Talking (SMS, le cas échéant)</li>
          </ul>
        </li>
        <li><strong>Autorités</strong> : sur réquisition légale (administration fiscale, justice).</li>
        <li><strong>Vous-même</strong> : à votre demande, export complet de vos données.</li>
      </ul>

      <h2 id="transferts">7. Transferts hors Union Européenne</h2>
      <p>
        Toutes vos données sont hébergées en Union Européenne (datacenters OVH en France).
        Aucun transfert hors UE n'est effectué dans le cadre du fonctionnement normal d'Athenis.
        Si vous êtes basé hors UE (Cameroun, Côte d'Ivoire, etc.), vos données restent en UE — ce qui
        renforce leur sécurité juridique.
      </p>

      <h2 id="securite">8. Sécurité</h2>
      <p>Nous mettons en œuvre des mesures techniques et organisationnelles strictes :</p>
      <ul>
        <li>Chiffrement en transit (HTTPS / TLS 1.3) et au repos (AES-256).</li>
        <li>Mots de passe hachés avec bcrypt (12 rounds, jamais en clair).</li>
        <li>Authentification à 2 facteurs (TOTP, e-mail, SMS).</li>
        <li>Sauvegardes chiffrées quotidiennes, testées régulièrement.</li>
        <li>Logs d'audit horodatés pour toutes les actions sensibles.</li>
        <li>Politique de mots de passe stricte (8 caractères min, complexité).</li>
        <li>Pare-feu (UFW + fail2ban) sur tous nos serveurs.</li>
        <li>Mises à jour de sécurité automatiques.</li>
      </ul>

      <h2 id="droits">9. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Droit d'accès</strong> : obtenir une copie de vos données.</li>
        <li><strong>Droit de rectification</strong> : modifier vos données inexactes.</li>
        <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données (sauf obligations légales).</li>
        <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré (JSON, CSV).</li>
        <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements.</li>
        <li><strong>Droit à la limitation</strong> : restreindre l'utilisation de vos données.</li>
      </ul>
      <p>
        Pour exercer ces droits, écrivez à <a href="mailto:dpo@athenis360.com">dpo@athenis360.com</a>.
        Nous répondons sous 30 jours maximum.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation
        auprès de la <strong>CNIL</strong> (France) :
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer"> www.cnil.fr</a>.
      </p>

      <h2 id="cookies">10. Cookies</h2>
      <p>
        Athenis utilise des cookies strictement nécessaires au fonctionnement (authentification, session)
        et des cookies de mesure d'audience anonymisée. Voir notre <Link to="/cookies">politique cookies</Link> détaillée.
      </p>

      <h2 id="contact">11. Contact DPO</h2>
      <p>
        Délégué à la Protection des Données : <a href="mailto:dpo@athenis360.com">dpo@athenis360.com</a><br />
        Adresse postale : voir <Link to="/mentions-legales">mentions légales</Link>.
      </p>
    </LegalPageLayout>
  )
}

// ── CGU ──────────────────────────────────────────────────────────────────────

export function CguPage() {
  return (
    <LegalPageLayout title="Conditions Générales d'Utilisation" lastUpdate="20 mai 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de
        la plateforme Athenis (le « Service »), accessible à l'adresse https://athenis360.com,
        éditée par <strong>Athenis SARL</strong>.
      </p>

      <h2>2. Acceptation des CGU</h2>
      <p>
        L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU.
        L'utilisateur reconnaît avoir pris connaissance des CGU avant de créer son compte.
      </p>

      <h2>3. Inscription</h2>
      <p>
        L'inscription au Service est ouverte à toute personne majeure agissant pour le compte d'une
        entreprise (PME, cabinet comptable, ou personne physique pour la gestion personnelle).
      </p>
      <p>
        L'utilisateur s'engage à fournir des informations exactes et à les maintenir à jour.
        En phase de test fermée, chaque inscription est soumise à validation par notre équipe.
      </p>

      <h2>4. Services proposés</h2>
      <p>Athenis met à disposition :</p>
      <ul>
        <li>Un module de comptabilité (SYSCOHADA / PCG)</li>
        <li>Un module de gestion commerciale (factures, devis, clients, stocks)</li>
        <li>Un module de ressources humaines (paie, contrats, congés)</li>
        <li>Un module juridique (contrats, signature électronique)</li>
        <li>Un module ESG (bilan carbone, reporting)</li>
        <li>Un module fiscalité (déclarations, TVA, IS, IRPP)</li>
      </ul>
      <p>
        Les fonctionnalités disponibles dépendent du plan tarifaire souscrit (Gratuit, Starter, Pro, Premium).
      </p>

      <h2>5. Tarification et paiement</h2>
      <p>
        Le plan Gratuit est utilisable sans contrepartie financière, dans les limites définies à la
        page <Link to="/tarifs">Tarifs</Link>.
      </p>
      <p>
        Les plans payants sont facturés mensuellement par carte bancaire, virement, ou Mobile Money
        (selon le pays). Le tarif affiché est valable pour la durée du contrat. Sans engagement.
      </p>
      <p>
        L'utilisateur peut résilier son abonnement à tout moment depuis son interface. La résiliation
        prend effet à la fin de la période de facturation en cours.
      </p>

      <h2>6. Obligations de l'utilisateur</h2>
      <p>L'utilisateur s'engage à :</p>
      <ul>
        <li>Utiliser le Service conformément à sa destination et aux lois en vigueur.</li>
        <li>Maintenir la confidentialité de ses identifiants.</li>
        <li>Ne pas tenter de compromettre la sécurité du Service.</li>
        <li>Ne pas utiliser le Service pour des activités illégales ou contraires à l'ordre public.</li>
      </ul>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        Athenis et tous ses éléments (logo, design, code source, marque) sont la propriété exclusive
        de l'éditeur. Les données saisies par l'utilisateur (clients, factures, etc.) restent sa propriété.
      </p>

      <h2>8. Disponibilité du service</h2>
      <p>
        L'éditeur s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la disponibilité
        du Service. Toutefois, des interruptions peuvent survenir (maintenance, incident technique).
      </p>
      <p>
        <strong>SLA cible</strong> : 99,5% de disponibilité mensuelle (hors maintenances planifiées).
      </p>

      <h2>9. Responsabilité</h2>
      <p>
        L'éditeur ne pourra être tenu responsable des dommages indirects (perte de chiffre d'affaires,
        perte de chance, etc.) résultant de l'utilisation ou de l'impossibilité d'utiliser le Service.
      </p>
      <p>
        En tout état de cause, la responsabilité de l'éditeur est plafonnée au montant payé par
        l'utilisateur au cours des 12 mois précédant le fait générateur du dommage.
      </p>

      <h2>10. Résiliation</h2>
      <p>
        L'utilisateur peut résilier son compte à tout moment. L'éditeur se réserve le droit de
        suspendre ou de résilier un compte en cas de manquement aux présentes CGU, après mise en demeure
        restée infructueuse pendant 15 jours.
      </p>
      <p>
        En cas de résiliation, les données comptables sont conservées 10 ans (obligation légale) puis
        supprimées. Les autres données sont supprimées sous 30 jours.
      </p>

      <h2>11. Modifications des CGU</h2>
      <p>
        L'éditeur se réserve le droit de modifier les présentes CGU à tout moment. L'utilisateur sera
        informé par e-mail au moins 30 jours avant l'entrée en vigueur des nouvelles CGU.
      </p>

      <h2>12. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Tout litige relatif à leur interprétation
        ou exécution relève de la compétence exclusive des tribunaux de Paris, sauf disposition
        d'ordre public contraire.
      </p>
      <p>
        Pour les utilisateurs basés dans un pays OHADA, le <strong>droit OHADA</strong> s'applique
        également à titre subsidiaire pour les matières qu'il couvre.
      </p>

      <h2>13. Contact</h2>
      <p>
        Toute question relative aux CGU peut être adressée à <a href="mailto:contact@athenis360.com">contact@athenis360.com</a>.
      </p>
    </LegalPageLayout>
  )
}

// ── Mentions légales ─────────────────────────────────────────────────────────

export function MentionsLegalesPage() {
  return (
    <LegalPageLayout title="Mentions légales" lastUpdate="20 mai 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le site <strong>athenis360.com</strong> est édité par :<br />
        <strong>Athenis SARL</strong><br />
        Adresse : à compléter (Cameroun / France)<br />
        RCCM / SIRET : à compléter<br />
        Capital social : à compléter<br />
        N° NIU / TVA intracommunautaire : à compléter
      </p>
      <p>
        Directeur de la publication : <strong>Ulrich Mouafo</strong><br />
        Contact : <a href="mailto:contact@athenis360.com">contact@athenis360.com</a>
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par :<br />
        <strong>OVH SAS</strong><br />
        2 rue Kellermann, 59100 Roubaix, France<br />
        Téléphone : +33 9 72 10 10 07<br />
        Site web : <a href="https://www.ovh.com" target="_blank" rel="noopener noreferrer">www.ovh.com</a>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble des contenus du site (textes, logos, images, code source, design) est protégé par le
        droit d'auteur. Toute reproduction, représentation, modification, publication ou adaptation,
        partielle ou totale, sans autorisation préalable écrite, est strictement interdite.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Voir notre <Link to="/rgpd">politique de confidentialité (RGPD)</Link>.
      </p>

      <h2>Cookies</h2>
      <p>
        Voir notre <Link to="/cookies">politique cookies</Link>.
      </p>

      <h2>Crédits</h2>
      <p>
        Conception et développement : équipe Athenis.<br />
        Icônes : émojis Unicode standard.<br />
        Police : Inter (open source, Google Fonts).
      </p>
    </LegalPageLayout>
  )
}

// ── Cookies ──────────────────────────────────────────────────────────────────

export function CookiesPage() {
  return (
    <LegalPageLayout title="Politique relative aux cookies" lastUpdate="20 mai 2026">
      <h2>Qu'est-ce qu'un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte stocké par votre navigateur lors de votre visite sur
        un site web. Il permet au site de mémoriser certaines informations vous concernant
        (préférences, session, statistiques).
      </p>

      <h2>Cookies utilisés par Athenis</h2>

      <h3>Cookies strictement nécessaires</h3>
      <p>
        Ces cookies sont indispensables au bon fonctionnement du Service. Vous ne pouvez pas les
        refuser sans rendre le site inutilisable.
      </p>
      <ul>
        <li><strong>refreshToken</strong> (httpOnly) : conservation de votre session connectée — 7 jours.</li>
        <li><strong>session_id</strong> (httpOnly) : identifiant temporaire de votre session — supprimé à la fermeture du navigateur.</li>
      </ul>

      <h3>Cookies de mesure d'audience (anonymisés)</h3>
      <p>
        Ces cookies permettent de comprendre comment notre site est utilisé pour l'améliorer.
        Les données sont anonymisées (pas d'identification personnelle).
      </p>
      <ul>
        <li><strong>PostHog</strong> (le cas échéant) : analytics comportementaux, hébergés en UE.</li>
        <li><strong>Sentry</strong> : suivi des erreurs frontend pour les corriger plus vite.</li>
      </ul>

      <h3>Cookies tiers</h3>
      <p>
        Nous n'utilisons aucun cookie tiers à des fins publicitaires.
        Les seuls cookies tiers présents sont ceux nécessaires au fonctionnement (CDN Google Fonts par exemple).
      </p>

      <h2>Gérer vos cookies</h2>
      <p>
        Vous pouvez à tout moment supprimer ou bloquer les cookies via les paramètres de votre navigateur :
      </p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a></li>
        <li><a href="https://support.mozilla.org/fr/kb/protection-renforcee-contre-pistage-firefox-ordinateur" target="_blank" rel="noopener noreferrer">Firefox</a></li>
        <li><a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
        <li><a href="https://support.microsoft.com/fr-fr/help/4027947/microsoft-edge-delete-cookies" target="_blank" rel="noopener noreferrer">Edge</a></li>
      </ul>

      <h2>Durée de conservation</h2>
      <p>
        Les cookies de session sont supprimés à la fermeture du navigateur.
        Les cookies persistants (refreshToken) expirent au bout de 7 jours.
        Aucun cookie n'est conservé au-delà de 13 mois (durée maximale recommandée par la CNIL).
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question sur l'usage des cookies : <a href="mailto:dpo@athenis360.com">dpo@athenis360.com</a>.
      </p>
    </LegalPageLayout>
  )
}
