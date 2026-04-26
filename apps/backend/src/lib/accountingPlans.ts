import type { AccountingZone, AccountPlanType } from '@prisma/client'

export interface PlanEntry {
  numero: string
  intitule: string
  classe: number
  type: AccountPlanType
}

// ── PCG France ────────────────────────────────────────────────────────────────

const PCG_FRANCE: PlanEntry[] = [
  // Classe 1 — Capitaux
  { numero: '10',   intitule: 'Capital et réserves',                          classe: 1, type: 'PASSIF' },
  { numero: '101',  intitule: 'Capital',                                       classe: 1, type: 'PASSIF' },
  { numero: '106',  intitule: 'Réserves',                                      classe: 1, type: 'PASSIF' },
  { numero: '110',  intitule: 'Report à nouveau (solde créditeur)',             classe: 1, type: 'PASSIF' },
  { numero: '119',  intitule: 'Report à nouveau (solde débiteur)',              classe: 1, type: 'ACTIF'  },
  { numero: '120',  intitule: "Résultat de l'exercice (bénéfice)",             classe: 1, type: 'PASSIF' },
  { numero: '129',  intitule: "Résultat de l'exercice (perte)",                classe: 1, type: 'ACTIF'  },
  { numero: '16',   intitule: 'Emprunts et dettes assimilées',                 classe: 1, type: 'PASSIF' },
  { numero: '164',  intitule: "Emprunts auprès d'établissements de crédit",   classe: 1, type: 'PASSIF' },
  // Classe 2 — Immobilisations
  { numero: '20',   intitule: 'Immobilisations incorporelles',                 classe: 2, type: 'ACTIF'  },
  { numero: '201',  intitule: "Frais d'établissement",                         classe: 2, type: 'ACTIF'  },
  { numero: '205',  intitule: 'Concessions, brevets, licences',                classe: 2, type: 'ACTIF'  },
  { numero: '211',  intitule: 'Terrains',                                       classe: 2, type: 'ACTIF'  },
  { numero: '213',  intitule: 'Constructions',                                  classe: 2, type: 'ACTIF'  },
  { numero: '215',  intitule: 'Installations techniques, matériel',            classe: 2, type: 'ACTIF'  },
  { numero: '218',  intitule: 'Autres immobilisations corporelles',            classe: 2, type: 'ACTIF'  },
  { numero: '28',   intitule: 'Amortissements des immobilisations',            classe: 2, type: 'ACTIF'  },
  // Classe 3 — Stocks
  { numero: '31',   intitule: 'Matières premières',                            classe: 3, type: 'ACTIF'  },
  { numero: '37',   intitule: 'Stocks de marchandises',                        classe: 3, type: 'ACTIF'  },
  { numero: '38',   intitule: "Stocks en voie d'acheminement",                 classe: 3, type: 'ACTIF'  },
  // Classe 4 — Tiers
  { numero: '401',  intitule: 'Fournisseurs',                                   classe: 4, type: 'PASSIF' },
  { numero: '404',  intitule: "Fournisseurs d'immobilisations",                 classe: 4, type: 'PASSIF' },
  { numero: '408',  intitule: 'Fournisseurs — factures non parvenues',         classe: 4, type: 'PASSIF' },
  { numero: '411',  intitule: 'Clients',                                         classe: 4, type: 'ACTIF'  },
  { numero: '413',  intitule: 'Clients — effets à recevoir',                   classe: 4, type: 'ACTIF'  },
  { numero: '416',  intitule: 'Clients douteux ou litigieux',                  classe: 4, type: 'ACTIF'  },
  { numero: '419',  intitule: 'Clients créditeurs',                             classe: 4, type: 'PASSIF' },
  { numero: '421',  intitule: 'Personnel — rémunérations dues',                classe: 4, type: 'PASSIF' },
  { numero: '431',  intitule: 'Sécurité sociale',                              classe: 4, type: 'PASSIF' },
  { numero: '437',  intitule: 'Autres organismes sociaux',                      classe: 4, type: 'PASSIF' },
  { numero: '441',  intitule: 'État — subventions à recevoir',                 classe: 4, type: 'ACTIF'  },
  { numero: '444',  intitule: 'État — impôt sur les bénéfices',               classe: 4, type: 'PASSIF' },
  { numero: '445',  intitule: "État — taxes sur le chiffre d'affaires",        classe: 4, type: 'PASSIF' },
  { numero: '4456', intitule: 'TVA déductible',                                 classe: 4, type: 'ACTIF'  },
  { numero: '4457', intitule: 'TVA collectée',                                   classe: 4, type: 'PASSIF' },
  { numero: '4458', intitule: 'TVA à régulariser',                              classe: 4, type: 'PASSIF' },
  { numero: '447',  intitule: 'Autres impôts, taxes et versements',            classe: 4, type: 'PASSIF' },
  { numero: '455',  intitule: 'Associés — comptes courants',                   classe: 4, type: 'PASSIF' },
  { numero: '481',  intitule: "Charges constatées d'avance",                   classe: 4, type: 'ACTIF'  },
  // Classe 5 — Financiers
  { numero: '512',  intitule: 'Banque',                                          classe: 5, type: 'ACTIF'  },
  { numero: '514',  intitule: 'Chèques postaux',                                classe: 5, type: 'ACTIF'  },
  { numero: '516',  intitule: 'Valeurs mobilières de placement',               classe: 5, type: 'ACTIF'  },
  { numero: '530',  intitule: 'Caisse',                                          classe: 5, type: 'ACTIF'  },
  { numero: '540',  intitule: "Régies d'avances",                               classe: 5, type: 'ACTIF'  },
  // Classe 6 — Charges
  { numero: '601',  intitule: 'Achats de matières premières',                  classe: 6, type: 'CHARGE' },
  { numero: '602',  intitule: "Achats d'autres approvisionnements",             classe: 6, type: 'CHARGE' },
  { numero: '604',  intitule: "Achats d'études et prestations de services",    classe: 6, type: 'CHARGE' },
  { numero: '606',  intitule: 'Achats non stockés de matières et fournitures', classe: 6, type: 'CHARGE' },
  { numero: '607',  intitule: 'Achats de marchandises',                         classe: 6, type: 'CHARGE' },
  { numero: '611',  intitule: 'Sous-traitance générale',                        classe: 6, type: 'CHARGE' },
  { numero: '612',  intitule: 'Redevances de crédit-bail',                     classe: 6, type: 'CHARGE' },
  { numero: '613',  intitule: 'Locations',                                       classe: 6, type: 'CHARGE' },
  { numero: '614',  intitule: 'Charges locatives et de copropriété',           classe: 6, type: 'CHARGE' },
  { numero: '615',  intitule: 'Entretien et réparations',                      classe: 6, type: 'CHARGE' },
  { numero: '616',  intitule: "Primes d'assurances",                            classe: 6, type: 'CHARGE' },
  { numero: '618',  intitule: 'Divers (charges)',                               classe: 6, type: 'CHARGE' },
  { numero: '621',  intitule: "Personnel extérieur à l'entreprise",            classe: 6, type: 'CHARGE' },
  { numero: '622',  intitule: "Rémunérations d'intermédiaires",                classe: 6, type: 'CHARGE' },
  { numero: '623',  intitule: 'Publicité, publications, relations publiques',  classe: 6, type: 'CHARGE' },
  { numero: '624',  intitule: 'Transports de biens et transports collectifs',  classe: 6, type: 'CHARGE' },
  { numero: '625',  intitule: 'Déplacements, missions et réceptions',          classe: 6, type: 'CHARGE' },
  { numero: '626',  intitule: 'Frais postaux et frais de télécommunications',  classe: 6, type: 'CHARGE' },
  { numero: '627',  intitule: 'Services bancaires et assimilés',               classe: 6, type: 'CHARGE' },
  { numero: '628',  intitule: 'Divers (services)',                              classe: 6, type: 'CHARGE' },
  { numero: '631',  intitule: 'Impôts, taxes sur rémunérations',              classe: 6, type: 'CHARGE' },
  { numero: '641',  intitule: 'Rémunérations du personnel',                    classe: 6, type: 'CHARGE' },
  { numero: '645',  intitule: 'Charges de sécurité sociale',                  classe: 6, type: 'CHARGE' },
  { numero: '648',  intitule: 'Autres charges de personnel',                   classe: 6, type: 'CHARGE' },
  { numero: '651',  intitule: 'Redevances pour concessions',                   classe: 6, type: 'CHARGE' },
  { numero: '661',  intitule: "Charges d'intérêts",                            classe: 6, type: 'CHARGE' },
  { numero: '671',  intitule: 'Charges exceptionnelles',                       classe: 6, type: 'CHARGE' },
  { numero: '681',  intitule: 'Dotations aux amortissements',                  classe: 6, type: 'CHARGE' },
  // Classe 7 — Produits
  { numero: '701',  intitule: 'Ventes de produits finis',                      classe: 7, type: 'PRODUIT' },
  { numero: '706',  intitule: 'Prestations de services',                       classe: 7, type: 'PRODUIT' },
  { numero: '707',  intitule: 'Ventes de marchandises',                        classe: 7, type: 'PRODUIT' },
  { numero: '708',  intitule: 'Produits des activités annexes',                classe: 7, type: 'PRODUIT' },
  { numero: '709',  intitule: 'Rabais, remises et ristournes accordés',       classe: 7, type: 'PRODUIT' },
  { numero: '720',  intitule: 'Production immobilisée',                        classe: 7, type: 'PRODUIT' },
  { numero: '740',  intitule: "Subventions d'exploitation",                    classe: 7, type: 'PRODUIT' },
  { numero: '751',  intitule: 'Redevances pour concessions',                   classe: 7, type: 'PRODUIT' },
  { numero: '761',  intitule: 'Produits de participations',                    classe: 7, type: 'PRODUIT' },
  { numero: '771',  intitule: 'Produits exceptionnels',                        classe: 7, type: 'PRODUIT' },
  { numero: '781',  intitule: 'Reprises sur amortissements',                   classe: 7, type: 'PRODUIT' },
]

// ── SYSCOHADA (OHADA) ─────────────────────────────────────────────────────────

const SYSCOHADA: PlanEntry[] = [
  // Classe 1 — Ressources durables
  { numero: '10',  intitule: 'Capital',                                               classe: 1, type: 'PASSIF' },
  { numero: '101', intitule: 'Capital social',                                        classe: 1, type: 'PASSIF' },
  { numero: '102', intitule: 'Capital par dotation',                                  classe: 1, type: 'PASSIF' },
  { numero: '106', intitule: 'Réserves',                                              classe: 1, type: 'PASSIF' },
  { numero: '11',  intitule: 'Réserves',                                              classe: 1, type: 'PASSIF' },
  { numero: '12',  intitule: 'Report à nouveau',                                      classe: 1, type: 'PASSIF' },
  { numero: '13',  intitule: "Résultat net de l'exercice",                           classe: 1, type: 'PASSIF' },
  { numero: '14',  intitule: "Subventions d'investissement",                          classe: 1, type: 'PASSIF' },
  { numero: '15',  intitule: 'Provisions réglementées',                              classe: 1, type: 'PASSIF' },
  { numero: '16',  intitule: 'Dettes financières et ressources assimilées',          classe: 1, type: 'PASSIF' },
  { numero: '161', intitule: 'Emprunts obligataires',                                 classe: 1, type: 'PASSIF' },
  { numero: '162', intitule: "Emprunts et dettes auprès des établissements de crédit", classe: 1, type: 'PASSIF' },
  { numero: '17',  intitule: 'Dettes de location-acquisition',                       classe: 1, type: 'PASSIF' },
  { numero: '18',  intitule: 'Dettes liées à des participations',                    classe: 1, type: 'PASSIF' },
  // Classe 2 — Actif immobilisé
  { numero: '20',  intitule: 'Charges immobilisées',                                  classe: 2, type: 'ACTIF'  },
  { numero: '21',  intitule: 'Immobilisations incorporelles',                         classe: 2, type: 'ACTIF'  },
  { numero: '211', intitule: 'Frais de développement',                                classe: 2, type: 'ACTIF'  },
  { numero: '212', intitule: 'Brevets, licences, logiciels',                          classe: 2, type: 'ACTIF'  },
  { numero: '22',  intitule: 'Terrains',                                               classe: 2, type: 'ACTIF'  },
  { numero: '23',  intitule: 'Bâtiments',                                              classe: 2, type: 'ACTIF'  },
  { numero: '24',  intitule: 'Matériel',                                               classe: 2, type: 'ACTIF'  },
  { numero: '241', intitule: 'Matériel et outillage industriel',                      classe: 2, type: 'ACTIF'  },
  { numero: '244', intitule: 'Matériel de transport',                                  classe: 2, type: 'ACTIF'  },
  { numero: '245', intitule: 'Matériel de bureau, matériel informatique',            classe: 2, type: 'ACTIF'  },
  { numero: '25',  intitule: 'Avances et acomptes sur immobilisations',              classe: 2, type: 'ACTIF'  },
  { numero: '26',  intitule: 'Titres de participation',                               classe: 2, type: 'ACTIF'  },
  { numero: '27',  intitule: 'Autres immobilisations financières',                   classe: 2, type: 'ACTIF'  },
  { numero: '28',  intitule: 'Amortissements',                                         classe: 2, type: 'ACTIF'  },
  // Classe 3 — Actif circulant (stocks)
  { numero: '31',  intitule: 'Marchandises',                                           classe: 3, type: 'ACTIF'  },
  { numero: '32',  intitule: 'Matières premières',                                    classe: 3, type: 'ACTIF'  },
  { numero: '33',  intitule: 'Autres approvisionnements',                             classe: 3, type: 'ACTIF'  },
  { numero: '36',  intitule: 'Produits finis',                                         classe: 3, type: 'ACTIF'  },
  { numero: '37',  intitule: 'Produits en cours',                                      classe: 3, type: 'ACTIF'  },
  // Classe 4 — Actif circulant (créances)
  { numero: '40',  intitule: 'Fournisseurs et comptes rattachés',                    classe: 4, type: 'PASSIF' },
  { numero: '401', intitule: 'Fournisseurs',                                           classe: 4, type: 'PASSIF' },
  { numero: '408', intitule: 'Fournisseurs — factures non parvenues',               classe: 4, type: 'PASSIF' },
  { numero: '41',  intitule: 'Clients et comptes rattachés',                         classe: 4, type: 'ACTIF'  },
  { numero: '411', intitule: 'Clients',                                                classe: 4, type: 'ACTIF'  },
  { numero: '416', intitule: 'Créances litigieuses',                                  classe: 4, type: 'ACTIF'  },
  { numero: '42',  intitule: 'Personnel',                                              classe: 4, type: 'PASSIF' },
  { numero: '421', intitule: 'Personnel — avances et acomptes',                      classe: 4, type: 'ACTIF'  },
  { numero: '43',  intitule: 'Organismes sociaux',                                    classe: 4, type: 'PASSIF' },
  { numero: '44',  intitule: 'État et collectivités publiques',                      classe: 4, type: 'PASSIF' },
  { numero: '441', intitule: 'État — impôts sur résultats',                         classe: 4, type: 'PASSIF' },
  { numero: '4434',intitule: 'TVA déductible',                                        classe: 4, type: 'ACTIF'  },
  { numero: '4435',intitule: 'TVA collectée',                                          classe: 4, type: 'PASSIF' },
  { numero: '445', intitule: 'État — autres impôts et taxes',                       classe: 4, type: 'PASSIF' },
  { numero: '46',  intitule: 'Associés et groupe',                                    classe: 4, type: 'PASSIF' },
  { numero: '47',  intitule: 'Débiteurs et créditeurs divers',                       classe: 4, type: 'ACTIF'  },
  { numero: '48',  intitule: 'Créances et dettes hors activités ordinaires',        classe: 4, type: 'ACTIF'  },
  { numero: '49',  intitule: 'Dépréciations et provisions',                          classe: 4, type: 'ACTIF'  },
  // Classe 5 — Trésorerie
  { numero: '51',  intitule: 'Valeurs mobilières de placement',                      classe: 5, type: 'ACTIF'  },
  { numero: '52',  intitule: 'Banques',                                                classe: 5, type: 'ACTIF'  },
  { numero: '521', intitule: 'Banques locales',                                        classe: 5, type: 'ACTIF'  },
  { numero: '57',  intitule: 'Caisse',                                                 classe: 5, type: 'ACTIF'  },
  { numero: '570', intitule: 'Caisse siège social',                                    classe: 5, type: 'ACTIF'  },
  { numero: '58',  intitule: 'Virements internes',                                    classe: 5, type: 'ACTIF'  },
  // Classe 6 — Charges des activités ordinaires
  { numero: '60',  intitule: 'Achats et variations de stocks',                       classe: 6, type: 'CHARGE' },
  { numero: '601', intitule: 'Achats de marchandises',                                classe: 6, type: 'CHARGE' },
  { numero: '602', intitule: 'Achats de matières premières',                          classe: 6, type: 'CHARGE' },
  { numero: '604', intitule: 'Achats de matières et fournitures consommables',       classe: 6, type: 'CHARGE' },
  { numero: '61',  intitule: 'Transports',                                             classe: 6, type: 'CHARGE' },
  { numero: '62',  intitule: 'Services extérieurs A',                                 classe: 6, type: 'CHARGE' },
  { numero: '621', intitule: 'Sous-traitance générale',                               classe: 6, type: 'CHARGE' },
  { numero: '622', intitule: 'Locations et charges locatives',                        classe: 6, type: 'CHARGE' },
  { numero: '623', intitule: 'Redevances de crédit-bail',                            classe: 6, type: 'CHARGE' },
  { numero: '624', intitule: 'Entretien, réparations et maintenance',               classe: 6, type: 'CHARGE' },
  { numero: '625', intitule: "Primes d'assurance",                                    classe: 6, type: 'CHARGE' },
  { numero: '63',  intitule: 'Services extérieurs B',                                 classe: 6, type: 'CHARGE' },
  { numero: '631', intitule: "Rémunérations d'intermédiaires",                       classe: 6, type: 'CHARGE' },
  { numero: '632', intitule: 'Honoraires',                                             classe: 6, type: 'CHARGE' },
  { numero: '633', intitule: 'Publicité, publications',                               classe: 6, type: 'CHARGE' },
  { numero: '634', intitule: 'Transports du personnel',                               classe: 6, type: 'CHARGE' },
  { numero: '635', intitule: 'Déplacements, missions et réceptions',                 classe: 6, type: 'CHARGE' },
  { numero: '636', intitule: 'Frais postaux et télécommunications',                  classe: 6, type: 'CHARGE' },
  { numero: '64',  intitule: 'Impôts et taxes',                                       classe: 6, type: 'CHARGE' },
  { numero: '641', intitule: 'Impôts et taxes directs',                               classe: 6, type: 'CHARGE' },
  { numero: '642', intitule: "Taxes sur le chiffre d'affaires récupérables",         classe: 6, type: 'CHARGE' },
  { numero: '65',  intitule: 'Autres charges',                                         classe: 6, type: 'CHARGE' },
  { numero: '66',  intitule: 'Charges de personnel',                                  classe: 6, type: 'CHARGE' },
  { numero: '661', intitule: 'Rémunérations directes versées au personnel',          classe: 6, type: 'CHARGE' },
  { numero: '663', intitule: 'Indemnités forfaitaires versées au personnel',         classe: 6, type: 'CHARGE' },
  { numero: '664', intitule: 'Charges sociales',                                       classe: 6, type: 'CHARGE' },
  { numero: '67',  intitule: 'Frais financiers',                                       classe: 6, type: 'CHARGE' },
  { numero: '68',  intitule: 'Dotations aux amortissements',                          classe: 6, type: 'CHARGE' },
  { numero: '69',  intitule: 'Impôts sur résultat',                                   classe: 6, type: 'CHARGE' },
  // Classe 7 — Produits des activités ordinaires
  { numero: '70',  intitule: 'Ventes',                                                 classe: 7, type: 'PRODUIT' },
  { numero: '701', intitule: 'Ventes de marchandises',                                classe: 7, type: 'PRODUIT' },
  { numero: '702', intitule: 'Ventes de produits finis',                              classe: 7, type: 'PRODUIT' },
  { numero: '706', intitule: 'Prestations de services',                               classe: 7, type: 'PRODUIT' },
  { numero: '707', intitule: 'Produits accessoires',                                   classe: 7, type: 'PRODUIT' },
  { numero: '71',  intitule: "Subventions d'exploitation",                            classe: 7, type: 'PRODUIT' },
  { numero: '72',  intitule: 'Production immobilisée',                                classe: 7, type: 'PRODUIT' },
  { numero: '75',  intitule: 'Autres produits',                                        classe: 7, type: 'PRODUIT' },
  { numero: '77',  intitule: 'Revenus financiers',                                    classe: 7, type: 'PRODUIT' },
  { numero: '78',  intitule: 'Reprises de provisions',                                classe: 7, type: 'PRODUIT' },
  { numero: '79',  intitule: 'Transferts de charges',                                 classe: 7, type: 'PRODUIT' },
  // Classe 8 — Hors activités ordinaires
  { numero: '81',  intitule: 'Valeurs comptables cessions immobilisations',          classe: 8, type: 'CHARGE' },
  { numero: '82',  intitule: 'Produits de cessions immobilisations',                 classe: 8, type: 'PRODUIT' },
  { numero: '83',  intitule: 'Charges hors activités ordinaires',                    classe: 8, type: 'CHARGE' },
  { numero: '84',  intitule: 'Produits hors activités ordinaires',                   classe: 8, type: 'PRODUIT' },
  { numero: '85',  intitule: 'Dotations HAO',                                          classe: 8, type: 'CHARGE' },
  { numero: '86',  intitule: 'Reprises HAO',                                           classe: 8, type: 'PRODUIT' },
  { numero: '87',  intitule: 'Participation des travailleurs',                        classe: 8, type: 'CHARGE' },
  { numero: '88',  intitule: "Subventions d'équilibre",                               classe: 8, type: 'PRODUIT' },
  { numero: '89',  intitule: 'Impôts sur résultat HAO',                              classe: 8, type: 'CHARGE' },
  // Classe 9 — Comptes analytiques
  { numero: '91',  intitule: 'Comptes de reflets',                                    classe: 9, type: 'CHARGE' },
  { numero: '92',  intitule: "Centres d'analyse",                                     classe: 9, type: 'CHARGE' },
  { numero: '93',  intitule: 'Coûts de production',                                  classe: 9, type: 'CHARGE' },
  { numero: '94',  intitule: 'Coûts de revient',                                      classe: 9, type: 'CHARGE' },
  { numero: '95',  intitule: 'Méthodes de valorisation',                             classe: 9, type: 'CHARGE' },
]

// ── IFRS (génériques) ─────────────────────────────────────────────────────────

const IFRS: PlanEntry[] = [
  // Actifs
  { numero: '1000', intitule: 'Cash and cash equivalents',                     classe: 1, type: 'ACTIF'  },
  { numero: '1100', intitule: 'Trade receivables',                              classe: 1, type: 'ACTIF'  },
  { numero: '1200', intitule: 'Inventories',                                    classe: 1, type: 'ACTIF'  },
  { numero: '1300', intitule: 'Prepaid expenses',                               classe: 1, type: 'ACTIF'  },
  { numero: '1400', intitule: 'Other current assets',                           classe: 1, type: 'ACTIF'  },
  { numero: '2000', intitule: 'Property, plant & equipment (PPE)',             classe: 2, type: 'ACTIF'  },
  { numero: '2100', intitule: 'Intangible assets',                              classe: 2, type: 'ACTIF'  },
  { numero: '2200', intitule: 'Right-of-use assets (IFRS 16)',                 classe: 2, type: 'ACTIF'  },
  { numero: '2300', intitule: 'Investment in associates',                       classe: 2, type: 'ACTIF'  },
  { numero: '2400', intitule: 'Financial assets at fair value',                 classe: 2, type: 'ACTIF'  },
  { numero: '2500', intitule: 'Deferred tax assets',                            classe: 2, type: 'ACTIF'  },
  { numero: '2900', intitule: 'Accumulated depreciation',                       classe: 2, type: 'ACTIF'  },
  // Passifs
  { numero: '3000', intitule: 'Trade payables',                                 classe: 3, type: 'PASSIF' },
  { numero: '3100', intitule: 'Accrued liabilities',                            classe: 3, type: 'PASSIF' },
  { numero: '3200', intitule: 'Current tax liabilities',                        classe: 3, type: 'PASSIF' },
  { numero: '3300', intitule: 'Short-term borrowings',                          classe: 3, type: 'PASSIF' },
  { numero: '3400', intitule: 'Current portion of lease liabilities',          classe: 3, type: 'PASSIF' },
  { numero: '4000', intitule: 'Long-term borrowings',                           classe: 4, type: 'PASSIF' },
  { numero: '4100', intitule: 'Lease liabilities (IFRS 16)',                    classe: 4, type: 'PASSIF' },
  { numero: '4200', intitule: 'Deferred tax liabilities',                       classe: 4, type: 'PASSIF' },
  { numero: '4300', intitule: 'Employee benefit obligations',                   classe: 4, type: 'PASSIF' },
  { numero: '4400', intitule: 'Provisions',                                      classe: 4, type: 'PASSIF' },
  // Capitaux propres
  { numero: '5000', intitule: 'Share capital',                                   classe: 5, type: 'PASSIF' },
  { numero: '5100', intitule: 'Share premium',                                   classe: 5, type: 'PASSIF' },
  { numero: '5200', intitule: 'Retained earnings',                               classe: 5, type: 'PASSIF' },
  { numero: '5300', intitule: 'Other comprehensive income (OCI)',               classe: 5, type: 'PASSIF' },
  { numero: '5400', intitule: 'Treasury shares',                                 classe: 5, type: 'ACTIF'  },
  // Produits
  { numero: '7000', intitule: 'Revenue from contracts with customers (IFRS 15)', classe: 7, type: 'PRODUIT' },
  { numero: '7100', intitule: 'Rental income',                                   classe: 7, type: 'PRODUIT' },
  { numero: '7200', intitule: 'Finance income',                                   classe: 7, type: 'PRODUIT' },
  { numero: '7300', intitule: 'Gain on disposal of assets',                      classe: 7, type: 'PRODUIT' },
  { numero: '7400', intitule: 'Government grants',                                classe: 7, type: 'PRODUIT' },
  { numero: '7900', intitule: 'Other income',                                     classe: 7, type: 'PRODUIT' },
  // Charges
  { numero: '6000', intitule: 'Cost of sales',                                   classe: 6, type: 'CHARGE' },
  { numero: '6100', intitule: 'Employee benefits expense',                       classe: 6, type: 'CHARGE' },
  { numero: '6200', intitule: 'Depreciation and amortisation',                  classe: 6, type: 'CHARGE' },
  { numero: '6300', intitule: 'Marketing and distribution costs',               classe: 6, type: 'CHARGE' },
  { numero: '6400', intitule: 'General and administrative expenses',            classe: 6, type: 'CHARGE' },
  { numero: '6500', intitule: 'Research and development costs',                 classe: 6, type: 'CHARGE' },
  { numero: '6600', intitule: 'Finance costs',                                   classe: 6, type: 'CHARGE' },
  { numero: '6700', intitule: 'Income tax expense',                              classe: 6, type: 'CHARGE' },
  { numero: '6800', intitule: 'Impairment losses',                               classe: 6, type: 'CHARGE' },
  { numero: '6900', intitule: 'Other expenses',                                   classe: 6, type: 'CHARGE' },
]

// ── Comptes par défaut à importer au seed ─────────────────────────────────────

export const DEFAULT_ACCOUNTS: Record<AccountingZone, string[]> = {
  FRANCE: ['411', '401', '512', '606', '707', '4456', '4457', '641', '681', '701', '706'],
  OHADA:  ['411', '401', '521', '604', '701', '706', '4434', '4435', '661', '68', '70'],
  IFRS:   ['1000', '1100', '3000', '7000', '6000', '6100', '6200', '6400'],
}

// ── Accessor ──────────────────────────────────────────────────────────────────

export function getPlanByZone(zone: AccountingZone): PlanEntry[] {
  if (zone === 'FRANCE') return PCG_FRANCE
  if (zone === 'OHADA')  return SYSCOHADA
  return IFRS
}

export function getPlanClasses(zone: AccountingZone): number[] {
  const entries = getPlanByZone(zone)
  return [...new Set(entries.map(e => e.classe))].sort((a, b) => a - b)
}

export const ZONE_LABELS: Record<AccountingZone, { flag: string; label: string }> = {
  FRANCE: { flag: '🇫🇷', label: 'France — Plan Comptable Général (PCG)' },
  OHADA:  { flag: '🌍', label: 'Espace OHADA — SYSCOHADA Révisé 2017' },
  IFRS:   { flag: '🌐', label: 'International — Normes IFRS' },
}
