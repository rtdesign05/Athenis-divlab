// Taux fiscaux DGI Cameroun 2026 — CGI 2026 / Loi de finances 2026
// Ces taux sont NON MODIFIABLES par l'utilisateur.

export const CM_TAX = {
  // ── TVA ──────────────────────────────────────────────────────────────────
  vatRate:              0.1925,   // 17.5% base + 1.75% CAC
  vatRateBase:          0.175,
  vatCAC:               0.0175,
  vatThreshold:         50_000_000,  // seuil assujettissement CA annuel
  vatPenaltyBase:       0.10,     // 10% du montant dû
  vatPenaltyMonthly:    0.015,    // 1.5% par mois de retard
  vatPaymentThreshold:  100_000,  // virement bancaire obligatoire au-dessus

  // ── IS (Impôt sur les Sociétés) ──────────────────────────────────────────
  isRate:               0.33,     // 30% + 3% CAC (taux normal)
  isRateReduced:        0.308,    // 28% + 2.8% CAC (CA < 3 Mds F CFA)
  isThresholdReduced:   3_000_000_000,
  isAcompteRate:        0.022,    // 2.2% du CA mensuel (acompte mensuel)
  isMinimumAnnualRate:  0.01,     // 1% du CA annuel (IS minimum annuel)
  isDeficitYears:       4,        // report déficit sur 4 exercices
  isSoldeDate:          '15/03',  // dépôt DSF + solde IS

  // ── Patente ───────────────────────────────────────────────────────────────
  patenteTauxGrande:    0.00159,  // CA > 100 000 000 F CFA
  patenteTauxMoyenne:   0.00283,  // CA 50 000 000 – 100 000 000 F CFA
  patenteTauxPetite:    0.00494,  // CA < 50 000 000 F CFA (régime simplifié)
  patenteThresholdGrande:  100_000_000,
  patenteThresholdMoyenne:  50_000_000,
  patenteAddlRate:      0.10,     // centimes additionnels communaux

  // ── RAS (Retenues à la Source) ────────────────────────────────────────────
  rasServicesRate:      0.055,    // 5% + 0.5% CAC — prestataires locaux
  rasHonorairesRate:    0.11,     // 10% + 1% CAC — professions libérales
  rasLoyersRate:        0.10,     // loyers personnes physiques
  rasNonResidentsRate:  0.165,    // revenus non-résidents
  rasDividendesRate:    0.165,    // dividendes
  rasInteretsRate:      0.165,    // intérêts obligataires

  // ── CNPS ─────────────────────────────────────────────────────────────────
  cnpsVieillesse:       { patronal: 0.042, salarial: 0.028 },
  cnpsFamille:          { patronal: 0.07 },
  cnpsAT:               { patronal: 0.0175 },  // variable selon secteur
  cnpsPatronalRate:     0.162,    // total patronal CNPS (sans FDFP)
  cnpsSalarialRate:     0.028,    // total salarial CNPS
  fdfpPatronalRate:     0.015,    // FDFP formation professionnelle
  fdfpSalarialRate:     0.005,

  // ── IRPP ─────────────────────────────────────────────────────────────────
  irppExemptionMensuelle: 62_000, // seuil exonération salarié/mois
  irppAbattementForfaitaire: 500_000, // abattement annuel
  irppBareme: [
    { max: 2_000_000,  taux: 0.10 },
    { max: 3_000_000,  taux: 0.15 },
    { max: 5_000_000,  taux: 0.25 },
    { max: Infinity,   taux: 0.35 },
  ],
  irppCAC: 0.10,  // centimes additionnels communaux sur IRPP

  // ── IGS (nouveau 2025) ────────────────────────────────────────────────────
  igsThreshold: 50_000_000,  // CA < 50M → IGS (libère patente+TVA+IRPP BIC)

  // ── Pénalités générales ───────────────────────────────────────────────────
  dsfPenaliteRetard:    25_000,   // F CFA par mois de retard DSF
} as const
