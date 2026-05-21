import { createContext, useContext, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
export type ContractType   = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
export type ContractStatus = 'DRAFT' | 'SIGNED' | 'TERMINATED'

export interface EmploymentContract {
  id:            string
  employeeId:    string
  employeeName:  string
  employeeEmail: string
  contractType:  ContractType
  status:        ContractStatus
  startDate:     string
  endDate:       string | null
  grossSalary:   number
  poste:         string
  departement:   string
  lieuTravail:   string
  content:       string    // full contract text (editable)
  createdAt:     string
  signedAt:      string | null
}

interface ContractsContextValue {
  contracts:      EmploymentContract[]
  addContract(c: Omit<EmploymentContract, 'id' | 'createdAt'>): void
  updateContract(id: string, patch: Partial<EmploymentContract>): void
  deleteContract(id: string): void
}

const ContractsContext = createContext<ContractsContextValue | null>(null)

export function useContracts() {
  const ctx = useContext(ContractsContext)
  if (!ctx) throw new Error('useContracts must be within ContractsProvider')
  return ctx
}

// ── Template generators ───────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
const fmtSal = (n: number) => new Intl.NumberFormat('fr-CM').format(n)
const today  = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

type EmpBase = { firstName: string; lastName: string; poste: string; departement: string; startDate: string; endDate: string | null; grossSalary: number }

function headerBlock(emp: EmpBase, company: string): string {
  return `Entre les soussignés :

${company}, société de droit camerounais, dont le siège social est sis à Yaoundé, représentée par son Directeur Général,
ci-après dénommée « l'Employeur »,

D'une part,

Et :

${emp.firstName} ${emp.lastName}, ci-après dénommé(e) « le Salarié »,

D'autre part,

Il a été convenu et arrêté ce qui suit :`
}

export function generateCDI(emp: EmpBase, company = 'Nexoria SARL', lieu = 'Yaoundé'): string {
  return `CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE
═══════════════════════════════════════════════════

${headerBlock(emp, company)}


ARTICLE 1 — ENGAGEMENT
───────────────────────────────────────────────────
L'Employeur engage le Salarié à compter du ${fmtDate(emp.startDate)} pour occuper le poste de ${emp.poste} au sein du département ${emp.departement}.

Le présent contrat est conclu pour une durée indéterminée conformément à la Loi n° 92/007 du 14 août 1992 portant Code du Travail du Cameroun.


ARTICLE 2 — LIEU DE TRAVAIL
───────────────────────────────────────────────────
Le Salarié exercera ses fonctions à ${lieu}. Ce lieu pourra être modifié en accord avec les besoins de l'entreprise.


ARTICLE 3 — DURÉE DU TRAVAIL
───────────────────────────────────────────────────
La durée de travail est fixée à 40 heures par semaine, répartie du lundi au vendredi, conformément aux dispositions légales en vigueur.


ARTICLE 4 — PÉRIODE D'ESSAI
───────────────────────────────────────────────────
Le présent contrat est soumis à une période d'essai de trois (3) mois à compter de la date de prise de fonctions, renouvelable une (1) fois par accord écrit. Durant cette période, chaque partie peut mettre fin au contrat sans indemnité ni préavis.


ARTICLE 5 — RÉMUNÉRATION
───────────────────────────────────────────────────
En contrepartie de ses fonctions, le Salarié percevra une rémunération mensuelle brute de ${fmtSal(emp.grossSalary)} FCFA.

Les charges salariales obligatoires (cotisation CNPS : 4,2 % sur salaire plafonné à 750 000 FCFA, IRPP selon barème progressif) seront prélevées à la source.


ARTICLE 6 — CONGÉS ANNUELS
───────────────────────────────────────────────────
Le Salarié bénéficiera de 1,5 jour ouvrable de congé annuel payé par mois de service effectif, conformément au Code du Travail du Cameroun.


ARTICLE 7 — OBLIGATIONS DU SALARIÉ
───────────────────────────────────────────────────
Le Salarié s'engage à :
  • Exécuter ses fonctions avec diligence, loyauté et professionnalisme ;
  • Respecter le règlement intérieur et les directives de l'Employeur ;
  • Observer une stricte confidentialité sur toutes informations dont il aura connaissance dans l'exercice de ses fonctions ;
  • Ne pas exercer d'activité concurrente ou incompatible avec ses fonctions pendant la durée du contrat.


ARTICLE 8 — PROTECTION SOCIALE
───────────────────────────────────────────────────
Le Salarié sera affilié à la Caisse Nationale de Prévoyance Sociale (CNPS). Les cotisations patronales (15,75 %) et salariales (4,2 %) seront versées mensuellement par l'Employeur.


ARTICLE 9 — RÉSILIATION
───────────────────────────────────────────────────
Le présent contrat peut être rompu :
  • Par démission du Salarié, avec un préavis d'un (1) mois ;
  • Par licenciement de l'Employeur pour cause réelle et sérieuse, avec préavis et indemnités légales ;
  • Par accord mutuel écrit des parties.


ARTICLE 10 — CLAUSE DE NON-CONCURRENCE
───────────────────────────────────────────────────
Pendant douze (12) mois suivant la cessation du contrat, le Salarié s'engage à ne pas exercer d'activité concurrente directement ou indirectement dans le même secteur.


ARTICLE 11 — DROIT APPLICABLE
───────────────────────────────────────────────────
Le présent contrat est régi par la Loi n° 92/007 du 14 août 1992 portant Code du Travail du Cameroun. Tout litige sera soumis au Tribunal du Travail de ${lieu}.


Fait à ${lieu}, le ${today()}, en deux (2) exemplaires originaux.


Pour l'Employeur,                           Le Salarié,
                                            (Lu et approuvé)

___________________________                 ___________________________
`
}

export function generateCDD(emp: EmpBase, company = 'Nexoria SARL', lieu = 'Yaoundé'): string {
  const fin = emp.endDate ? fmtDate(emp.endDate) : 'à préciser'
  return `CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE
═══════════════════════════════════════════════════

${headerBlock(emp, company)}


ARTICLE 1 — OBJET ET MOTIF DU CONTRAT
───────────────────────────────────────────────────
Le présent contrat est conclu pour un accroissement temporaire d'activité, conformément à l'article 26 de la Loi n° 92/007 du 14 août 1992 portant Code du Travail du Cameroun.


ARTICLE 2 — DURÉE DU CONTRAT
───────────────────────────────────────────────────
Le présent contrat prend effet le ${fmtDate(emp.startDate)} et prend fin le ${fin}.

Il ne pourra être renouvelé que dans les conditions strictement prévues par le Code du Travail du Cameroun. À l'issue du contrat, le Salarié percevra une indemnité de fin de contrat égale à 10 % des rémunérations brutes perçues.


ARTICLE 3 — POSTE ET LIEU DE TRAVAIL
───────────────────────────────────────────────────
Le Salarié est engagé pour le poste de ${emp.poste} au sein du département ${emp.departement}, à ${lieu}.


ARTICLE 4 — PÉRIODE D'ESSAI
───────────────────────────────────────────────────
Le présent contrat est soumis à une période d'essai d'un (1) mois à compter de la date de prise de fonctions. Durant cette période, chaque partie peut résilier le contrat sans indemnité ni préavis.


ARTICLE 5 — DURÉE DU TRAVAIL
───────────────────────────────────────────────────
La durée de travail est fixée à 40 heures par semaine, répartie du lundi au vendredi.


ARTICLE 6 — RÉMUNÉRATION
───────────────────────────────────────────────────
En contrepartie de ses fonctions, le Salarié percevra une rémunération mensuelle brute de ${fmtSal(emp.grossSalary)} FCFA.

Les charges salariales obligatoires (CNPS 4,2 % et IRPP) seront prélevées à la source conformément à la réglementation.


ARTICLE 7 — CONGÉS ANNUELS
───────────────────────────────────────────────────
Le Salarié bénéficiera de 1,5 jour ouvrable de congé annuel par mois de service effectif.


ARTICLE 8 — OBLIGATIONS DU SALARIÉ
───────────────────────────────────────────────────
Le Salarié s'engage à exécuter ses fonctions avec diligence et loyauté, à respecter le règlement intérieur et à observer la confidentialité des informations de l'entreprise.


ARTICLE 9 — RÉSILIATION ANTICIPÉE
───────────────────────────────────────────────────
Le contrat ne peut être rompu avant son terme qu'en cas de faute grave, de force majeure ou d'accord mutuel écrit des parties.


ARTICLE 10 — PROTECTION SOCIALE
───────────────────────────────────────────────────
Le Salarié sera affilié à la CNPS. Les cotisations seront versées mensuellement par l'Employeur.


ARTICLE 11 — DROIT APPLICABLE
───────────────────────────────────────────────────
Le présent contrat est régi par la Loi n° 92/007 du 14 août 1992 portant Code du Travail du Cameroun.


Fait à ${lieu}, le ${today()}, en deux (2) exemplaires originaux.


Pour l'Employeur,                           Le Salarié,
                                            (Lu et approuvé)

___________________________                 ___________________________
`
}

export function generateStage(emp: EmpBase, company = 'Nexoria SARL', lieu = 'Yaoundé'): string {
  const fin = emp.endDate ? fmtDate(emp.endDate) : 'à préciser'
  return `CONVENTION DE STAGE
═══════════════════════════════════════════════════

Entre les soussignés :

${company}, société de droit camerounais, dont le siège social est sis à ${lieu}, représentée par son Directeur Général,
ci-après dénommée « la Structure d'Accueil »,

Et :

${emp.firstName} ${emp.lastName}, stagiaire, ci-après dénommé(e) « le Stagiaire »,

Il a été convenu et arrêté ce qui suit :


ARTICLE 1 — OBJET DE LA CONVENTION
───────────────────────────────────────────────────
La présente convention a pour objet de définir les conditions dans lesquelles le Stagiaire effectuera son stage au sein de la Structure d'Accueil, dans le cadre de sa formation professionnelle.


ARTICLE 2 — DURÉE ET DATES DU STAGE
───────────────────────────────────────────────────
Le stage se déroule du ${fmtDate(emp.startDate)} au ${fin}.

En cas de force majeure ou d'accord entre les parties, cette durée peut être modifiée.


ARTICLE 3 — LIEU ET MISSIONS
───────────────────────────────────────────────────
Le stage se déroule au sein du département ${emp.departement}, à ${lieu}.

Poste / mission : ${emp.poste}.

Le Stagiaire sera encadré par un tuteur désigné par la Structure d'Accueil, qui veillera au bon déroulement de la période de stage.


ARTICLE 4 — HORAIRES DE TRAVAIL
───────────────────────────────────────────────────
Le Stagiaire est présent du lundi au vendredi, selon les horaires de travail en vigueur dans l'entreprise.


ARTICLE 5 — INDEMNITÉ DE STAGE
───────────────────────────────────────────────────
En contrepartie de sa présence, le Stagiaire percevra une indemnité mensuelle de ${fmtSal(emp.grossSalary)} FCFA, versée en fin de mois. Cette indemnité n'a pas le caractère d'un salaire au sens du Code du Travail.


ARTICLE 6 — OBLIGATIONS DU STAGIAIRE
───────────────────────────────────────────────────
Le Stagiaire s'engage à :
  • Respecter le règlement intérieur de la Structure d'Accueil ;
  • Exécuter les tâches confiées avec diligence ;
  • Observer la confidentialité des informations dont il aura connaissance ;
  • Rédiger un rapport de stage à l'issue de sa période de stage.


ARTICLE 7 — OBLIGATIONS DE LA STRUCTURE D'ACCUEIL
───────────────────────────────────────────────────
La Structure d'Accueil s'engage à :
  • Accueillir le Stagiaire dans de bonnes conditions de travail ;
  • Lui confier des missions en rapport avec son domaine de formation ;
  • Lui désigner un tuteur référent ;
  • Lui délivrer une attestation de stage à l'issue de la période.


ARTICLE 8 — PROTECTION SOCIALE
───────────────────────────────────────────────────
Le Stagiaire bénéficie de la couverture maladie-accident de la Structure d'Accueil pendant la durée du stage. Il reste couvert par son propre régime d'assurance pour le trajet domicile-lieu de stage.


ARTICLE 9 — RÉSILIATION
───────────────────────────────────────────────────
La présente convention peut être résiliée avant son terme par accord mutuel ou en cas de manquement grave de l'une des parties, après mise en demeure restée sans effet.


ARTICLE 10 — DROIT APPLICABLE
───────────────────────────────────────────────────
La présente convention est soumise au droit camerounais.


Fait à ${lieu}, le ${today()}, en trois (3) exemplaires originaux.


La Structure d'Accueil,                     Le Stagiaire,
                                            (Lu et approuvé)

___________________________                 ___________________________
`
}

export function generatePartTime(emp: EmpBase, company = 'Nexoria SARL', lieu = 'Yaoundé'): string {
  return `CONTRAT DE TRAVAIL À TEMPS PARTIEL
═══════════════════════════════════════════════════

${headerBlock(emp, company)}


ARTICLE 1 — ENGAGEMENT
───────────────────────────────────────────────────
L'Employeur engage le Salarié à compter du ${fmtDate(emp.startDate)} pour occuper le poste de ${emp.poste} au sein du département ${emp.departement}, dans le cadre d'un contrat de travail à durée indéterminée à temps partiel.


ARTICLE 2 — LIEU DE TRAVAIL
───────────────────────────────────────────────────
Le Salarié exercera ses fonctions à ${lieu}.


ARTICLE 3 — DURÉE DU TRAVAIL
───────────────────────────────────────────────────
La durée de travail est fixée à 20 heures par semaine, selon le planning suivant :
  • Lundi et mardi : 8h00 – 13h00
  • Mercredi et jeudi : 8h00 – 13h00
  • Vendredi : 8h00 – 12h00

Ce planning pourra être aménagé par accord écrit entre les parties.


ARTICLE 4 — PÉRIODE D'ESSAI
───────────────────────────────────────────────────
Le présent contrat est soumis à une période d'essai d'un (1) mois à compter de la prise de fonctions.


ARTICLE 5 — RÉMUNÉRATION
───────────────────────────────────────────────────
En contrepartie de ses fonctions à temps partiel, le Salarié percevra une rémunération mensuelle brute de ${fmtSal(emp.grossSalary)} FCFA, calculée au prorata du temps de travail.

Les charges salariales obligatoires (CNPS 4,2 %, IRPP) seront prélevées à la source.


ARTICLE 6 — HEURES COMPLÉMENTAIRES
───────────────────────────────────────────────────
Des heures complémentaires pourront être effectuées dans la limite du tiers de la durée prévue au contrat. Elles seront majorées conformément à la réglementation en vigueur.


ARTICLE 7 — CONGÉS ANNUELS
───────────────────────────────────────────────────
Le Salarié bénéficiera de 1,5 jour ouvrable de congé annuel payé par mois de service effectif.


ARTICLE 8 — OBLIGATIONS DU SALARIÉ
───────────────────────────────────────────────────
Le Salarié s'engage à exécuter ses fonctions avec diligence, à respecter le règlement intérieur et à observer la confidentialité des informations de l'entreprise.


ARTICLE 9 — PROTECTION SOCIALE
───────────────────────────────────────────────────
Le Salarié sera affilié à la CNPS. Les cotisations seront versées mensuellement par l'Employeur.


ARTICLE 10 — RÉSILIATION
───────────────────────────────────────────────────
Le présent contrat peut être rompu dans les conditions prévues par le Code du Travail du Cameroun. Le préavis est fixé à un (1) mois.


ARTICLE 11 — DROIT APPLICABLE
───────────────────────────────────────────────────
Le présent contrat est régi par la Loi n° 92/007 du 14 août 1992 portant Code du Travail du Cameroun.


Fait à ${lieu}, le ${today()}, en deux (2) exemplaires originaux.


Pour l'Employeur,                           Le Salarié,
                                            (Lu et approuvé)

___________________________                 ___________________________
`
}

export function generateTemplate(
  contractType: ContractType,
  emp: EmpBase,
  company?: string,
  lieu?: string,
): string {
  switch (contractType) {
    case 'FULL_TIME': return generateCDI(emp, company, lieu)
    case 'CONTRACT':  return generateCDD(emp, company, lieu)
    case 'INTERN':    return generateStage(emp, company, lieu)
    case 'PART_TIME': return generatePartTime(emp, company, lieu)
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = useState<EmploymentContract[]>([])

  function addContract(c: Omit<EmploymentContract, 'id' | 'createdAt'>) {
    setContracts(prev => [...prev, { ...c, id: `ec-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) }])
  }

  function updateContract(id: string, patch: Partial<EmploymentContract>) {
    setContracts(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function deleteContract(id: string) {
    setContracts(prev => prev.filter(c => c.id !== id))
  }

  return (
    <ContractsContext.Provider value={{ contracts, addContract, updateContract, deleteContract }}>
      {children}
    </ContractsContext.Provider>
  )
}
