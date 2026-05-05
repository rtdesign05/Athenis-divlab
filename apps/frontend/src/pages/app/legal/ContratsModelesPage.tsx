import { useState } from 'react'

// ── Template definitions ───────────────────────────────────────────────────────

interface Template {
  id:          string
  name:        string
  description: string
  icon:        string
  color:       string
  tags:        string[]
  preview:     string   // first paragraph of the template
  body:        string   // full template text
}

const TEMPLATES: Template[] = [
  {
    id: 'nda',
    name: 'Accord de confidentialité (NDA)',
    description: 'Protégez vos informations sensibles lors de négociations ou partenariats',
    icon: '🔒',
    color: 'border-gray-200 bg-gray-50',
    tags: ['Juridique', 'Confidentiel'],
    preview: 'Le présent accord de confidentialité (ci-après « l\'Accord ») est conclu entre les parties mentionnées ci-dessous...',
    body: `ACCORD DE CONFIDENTIALITÉ

Entre les soussignés :

Partie divulgatrice : [NOM / RAISON SOCIALE], [FORME JURIDIQUE], dont le siège social est situé à [ADRESSE], immatriculée au Registre du Commerce et du Crédit Mobilier sous le numéro [RCCM], représentée par [PRÉNOM NOM], en qualité de [FONCTION] ;

Partie réceptrice : [NOM / RAISON SOCIALE], dont le siège social est situé à [ADRESSE], représentée par [PRÉNOM NOM], en qualité de [FONCTION] ;

Il a été convenu ce qui suit :

ARTICLE 1 – OBJET
Le présent accord a pour objet de définir les conditions dans lesquelles les Informations Confidentielles seront communiquées par la Partie Divulgatrice à la Partie Réceptrice dans le cadre de : [DÉCRIRE L'OBJET — ex. : négociation d'un partenariat commercial].

ARTICLE 2 – DÉFINITION DES INFORMATIONS CONFIDENTIELLES
Sont considérées comme Informations Confidentielles toutes les informations de nature technique, commerciale, financière, stratégique ou autre communiquées par la Partie Divulgatrice, que ce soit par écrit, oralement ou par tout autre moyen.

ARTICLE 3 – OBLIGATIONS
La Partie Réceptrice s'engage à :
- Maintenir la confidentialité des Informations Confidentielles ;
- Ne pas divulguer les Informations Confidentielles à des tiers sans l'accord préalable écrit de la Partie Divulgatrice ;
- N'utiliser les Informations Confidentielles qu'aux fins strictement nécessaires à l'objet du présent accord.

ARTICLE 4 – DURÉE
Le présent accord prend effet à la date de sa signature et demeure en vigueur pendant une durée de [X] ans.

ARTICLE 5 – DROIT APPLICABLE
Le présent accord est régi par le droit [CAMEROUNAIS / FRANÇAIS / OHADA].

Fait à [VILLE], le [DATE]

Signature Partie divulgatrice             Signature Partie réceptrice`,
  },
  {
    id: 'prestation',
    name: 'Contrat de prestation de services',
    description: 'Formalisez vos missions de conseil, expertise ou sous-traitance',
    icon: '🤝',
    color: 'border-purple-200 bg-purple-50',
    tags: ['Commercial', 'Prestations'],
    preview: 'Le présent contrat de prestation de services est conclu entre le Prestataire et le Client pour la réalisation de...',
    body: `CONTRAT DE PRESTATION DE SERVICES

Entre les soussignés :

Le Prestataire : [NOM / RAISON SOCIALE], [FORME JURIDIQUE], dont le siège social est situé à [ADRESSE], immatriculée sous le numéro [RCCM], représentée par [PRÉNOM NOM], en qualité de [FONCTION] ;

Le Client : [NOM / RAISON SOCIALE], dont le siège social est situé à [ADRESSE], représenté par [PRÉNOM NOM], en qualité de [FONCTION] ;

Il a été convenu ce qui suit :

ARTICLE 1 – OBJET DU CONTRAT
Le Prestataire s'engage à fournir au Client les services suivants :
[DESCRIPTION DÉTAILLÉE DES PRESTATIONS]

ARTICLE 2 – DURÉE
Le contrat est conclu pour une durée de [X mois / jours] à compter du [DATE DE DÉBUT], sauf renouvellement par accord des parties.

ARTICLE 3 – RÉMUNÉRATION
En contrepartie des services rendus, le Client s'engage à payer au Prestataire la somme de [MONTANT] FCFA HT, selon les modalités suivantes :
- [% ou montant] à la commande
- [% ou montant] à la livraison

ARTICLE 4 – PROPRIÉTÉ INTELLECTUELLE
Les livrables produits dans le cadre de ce contrat restent la propriété du [CLIENT / PRESTATAIRE] jusqu'au paiement intégral.

ARTICLE 5 – CONFIDENTIALITÉ
Les parties s'engagent mutuellement à la confidentialité des informations échangées.

ARTICLE 6 – RÉSILIATION
Le présent contrat peut être résilié par l'une ou l'autre des parties avec un préavis de [X] jours.

Fait à [VILLE], le [DATE]

Signature Prestataire                     Signature Client`,
  },
  {
    id: 'cdi',
    name: 'Contrat à durée indéterminée (CDI)',
    description: 'Embauche d\'un salarié en CDI conforme au Code du Travail du Cameroun',
    icon: '📋',
    color: 'border-blue-200 bg-blue-50',
    tags: ['RH', 'Emploi'],
    preview: 'Le présent contrat de travail à durée indéterminée est conclu conformément au Code du Travail du Cameroun...',
    body: `CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE

Conformément aux dispositions du Code du Travail du Cameroun (Loi n° 92/007 du 14 août 1992)

Entre les soussignés :

L'Employeur : [RAISON SOCIALE], dont le siège social est situé à [ADRESSE], représentée par [PRÉNOM NOM], [FONCTION] ;

Et :

Le Salarié : M./Mme [PRÉNOM NOM], né(e) le [DATE DE NAISSANCE] à [LIEU], de nationalité [NATIONALITÉ], demeurant à [ADRESSE] ;

Il a été convenu ce qui suit :

ARTICLE 1 – ENGAGEMENT
L'Employeur engage le Salarié à compter du [DATE DE PRISE DE POSTE] pour occuper le poste de [INTITULÉ DU POSTE], rattaché au département [DÉPARTEMENT].

ARTICLE 2 – PÉRIODE D'ESSAI
Le contrat est soumis à une période d'essai de [durée selon catégorie] renouvellable une fois, conformément aux dispositions légales.

ARTICLE 3 – RÉMUNÉRATION
Le Salarié percevra un salaire brut mensuel de [MONTANT] FCFA, comprenant :
- Salaire de base : [MONTANT] FCFA
- [Primes éventuelles]

ARTICLE 4 – LIEU DE TRAVAIL
Le lieu habituel d'exécution du contrat est [ADRESSE / VILLE].

ARTICLE 5 – DURÉE DU TRAVAIL
La durée hebdomadaire de travail est fixée à [40] heures, conformément à la législation en vigueur.

ARTICLE 6 – CONGÉS PAYÉS
Le Salarié bénéficie de [30] jours ouvrables de congés payés par an, conformément au Code du Travail.

ARTICLE 7 – OBLIGATIONS
Le Salarié s'engage à respecter les règles internes de l'entreprise et à exercer ses fonctions avec diligence.

Fait à [VILLE], le [DATE]

Signature de l'Employeur                  Signature du Salarié
(précédée de la mention « lu et approuvé »)`,
  },
  {
    id: 'cdd',
    name: 'Contrat à durée déterminée (CDD)',
    description: 'CDD pour mission temporaire, remplacement ou activité saisonnière',
    icon: '📄',
    color: 'border-orange-200 bg-orange-50',
    tags: ['RH', 'Emploi'],
    preview: 'Le présent contrat de travail à durée déterminée est conclu pour le motif suivant...',
    body: `CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE

Conformément au Code du Travail du Cameroun

Entre les soussignés :

L'Employeur : [RAISON SOCIALE], dont le siège social est situé à [ADRESSE], représentée par [PRÉNOM NOM], [FONCTION] ;

Et :

Le Salarié : M./Mme [PRÉNOM NOM], né(e) le [DATE DE NAISSANCE] à [LIEU], demeurant à [ADRESSE] ;

Il a été convenu ce qui suit :

ARTICLE 1 – MOTIF DU CDD
Le présent contrat est conclu pour le motif suivant (cocher) :
☐ Remplacement d'un salarié absent
☐ Accroissement temporaire d'activité
☐ Mission spécifique : [DESCRIPTION]
☐ Emploi saisonnier

ARTICLE 2 – DURÉE
Le contrat est conclu du [DATE DÉBUT] au [DATE FIN], soit une durée de [X] mois/semaines.

ARTICLE 3 – POSTE
Le Salarié est engagé pour occuper le poste de [INTITULÉ] au sein du département [DÉPARTEMENT].

ARTICLE 4 – RÉMUNÉRATION
Le Salarié percevra un salaire brut mensuel de [MONTANT] FCFA.

ARTICLE 5 – INDEMNITÉ DE FIN DE CONTRAT
À l'expiration du contrat, le Salarié percevra une indemnité de précarité égale à [%] du total des rémunérations brutes perçues.

ARTICLE 6 – RENOUVELLEMENT
Le présent contrat pourra être renouvelé [X] fois dans la limite de [durée totale maximale].

Fait à [VILLE], le [DATE]

Signature de l'Employeur                  Signature du Salarié`,
  },
  {
    id: 'bail',
    name: 'Bail commercial',
    description: 'Contrat de location de locaux à usage commercial ou professionnel',
    icon: '🏢',
    color: 'border-green-200 bg-green-50',
    tags: ['Immobilier', 'Commercial'],
    preview: 'Le présent bail commercial est conclu conformément aux règles applicables aux baux commerciaux...',
    body: `BAIL COMMERCIAL

Entre les soussignés :

Le Bailleur : [NOM / RAISON SOCIALE], demeurant / dont le siège est à [ADRESSE], représenté par [PRÉNOM NOM] ;

Le Preneur : [NOM / RAISON SOCIALE], demeurant / dont le siège est à [ADRESSE], représenté par [PRÉNOM NOM] ;

Il a été convenu ce qui suit :

ARTICLE 1 – OBJET
Le Bailleur donne à bail au Preneur, qui accepte, les locaux situés [ADRESSE COMPLÈTE DES LOCAUX], d'une superficie de [X] m², désignés ci-après « les Locaux ».

ARTICLE 2 – DESTINATION
Les Locaux sont destinés à l'usage exclusif de [ACTIVITÉ COMMERCIALE / PROFESSIONNELLE].

ARTICLE 3 – DURÉE
Le bail est consenti pour une durée de [X ans], à compter du [DATE DE DÉBUT].

ARTICLE 4 – LOYER
Le loyer mensuel est fixé à [MONTANT] FCFA, payable le [JOUR] de chaque mois.

ARTICLE 5 – DÉPÔT DE GARANTIE
Le Preneur verse ce jour un dépôt de garantie de [X mois de loyer] FCFA, remboursable en fin de bail sous déduction des sommes éventuellement dues.

ARTICLE 6 – CHARGES
Les charges communes sont réparties comme suit : [DÉTAILLER].

ARTICLE 7 – ENTRETIEN
Le Preneur s'engage à maintenir les Locaux en bon état d'entretien.

ARTICLE 8 – RÉSILIATION
En cas de manquement grave de l'une des parties à ses obligations, le bail pourra être résilié de plein droit.

Fait à [VILLE], le [DATE]

Signature du Bailleur                     Signature du Preneur`,
  },
  {
    id: 'partenariat',
    name: 'Accord de partenariat',
    description: 'Formalisez une relation de collaboration entre deux entités',
    icon: '🤝',
    color: 'border-teal-200 bg-teal-50',
    tags: ['Commercial', 'Stratégique'],
    preview: 'Le présent accord de partenariat est conclu dans le but d\'établir une coopération mutuellement bénéfique...',
    body: `ACCORD DE PARTENARIAT

Entre les soussignés :

Partenaire A : [NOM / RAISON SOCIALE], dont le siège social est à [ADRESSE], représentée par [PRÉNOM NOM], [FONCTION] ;

Partenaire B : [NOM / RAISON SOCIALE], dont le siège social est à [ADRESSE], représentée par [PRÉNOM NOM], [FONCTION] ;

Ci-après désignés collectivement « les Parties ».

Il a été convenu ce qui suit :

ARTICLE 1 – OBJET DU PARTENARIAT
Le présent accord a pour objet de définir les modalités du partenariat entre les Parties dans le domaine de [DÉCRIRE LE DOMAINE DE COLLABORATION].

ARTICLE 2 – OBLIGATIONS DES PARTIES

Partenaire A s'engage à :
- [OBLIGATION 1]
- [OBLIGATION 2]

Partenaire B s'engage à :
- [OBLIGATION 1]
- [OBLIGATION 2]

ARTICLE 3 – DURÉE
Le présent accord est conclu pour une durée de [X] ans, renouvelable par tacite reconduction.

ARTICLE 4 – PARTAGE DES REVENUS / COÛTS
[DÉCRIRE LES MODALITÉS FINANCIÈRES DU PARTENARIAT]

ARTICLE 5 – PROPRIÉTÉ INTELLECTUELLE
Chaque Partie conserve la propriété de ses apports intellectuels antérieurs.

ARTICLE 6 – EXCLUSIVITÉ
☐ Le présent accord est conclu à titre exclusif dans le domaine [X]
☐ Le présent accord n'est pas exclusif

ARTICLE 7 – RÉSOLUTION DES LITIGES
Tout différend relatif à l'exécution du présent accord sera soumis à [ARBITRAGE / JURIDICTION].

Fait à [VILLE], le [DATE]

Signature Partenaire A                    Signature Partenaire B`,
  },
]

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({ tpl, onClose }: { tpl: Template; onClose: () => void }) {
  function handleDownload() {
    const blob = new Blob([tpl.body], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Modele_${tpl.id}_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleCopy() {
    navigator.clipboard.writeText(tpl.body).catch(() => {})
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tpl.icon}</span>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{tpl.name}</h2>
              <p className="text-xs text-gray-500">{tpl.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <pre className="whitespace-pre-wrap font-mono text-xs text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-200">
            {tpl.body}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400 flex-1">
            💡 Remplacez les champs entre crochets [  ] par vos informations avant utilisation.
          </p>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            📋 Copier
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg bg-forest-900 text-white text-sm font-medium hover:bg-forest-800 transition-colors"
          >
            ⬇ Télécharger .txt
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ContratsModelesPage() {
  const [preview, setPreview] = useState<Template | null>(null)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modèles de contrats</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bibliothèque de {TEMPLATES.length} modèles personnalisables — téléchargez et adaptez à votre situation
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tpl) => (
          <div
            key={tpl.id}
            className={`rounded-xl border-2 ${tpl.color} p-5 flex flex-col gap-3 hover:shadow-md transition-all cursor-pointer group`}
            onClick={() => setPreview(tpl)}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl">{tpl.icon}</span>
              <div className="flex flex-wrap gap-1">
                {tpl.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 text-gray-600 border border-gray-200 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 leading-snug">{tpl.name}</h3>
              <p className="mt-1 text-xs text-gray-500 leading-snug">{tpl.description}</p>
            </div>

            <p className="text-xs text-gray-400 italic leading-snug line-clamp-2">{tpl.preview}</p>

            <div className="mt-auto pt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">Cliquez pour aperçu</span>
              <span className="text-xs text-forest-700 font-medium group-hover:underline">Voir →</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        * Ces modèles sont fournis à titre indicatif. Consultez un juriste pour valider leur conformité à votre situation spécifique.
      </p>

      {preview && <PreviewModal tpl={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
