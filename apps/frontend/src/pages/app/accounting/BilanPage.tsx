import { useCurrency } from '@/hooks/useCurrency'
import { PdfButton } from '@/shared/components/ui/PdfButton'
import { usePdf } from '@/shared/hooks/usePdf'

export function BilanPage() {
  const { fmt } = useCurrency()
  const { downloadBilan } = usePdf()

  const actif = [
    { label: 'Immobilisations incorporelles', montant: 12_400 },
    { label: 'Immobilisations corporelles',   montant: 38_600 },
    { label: 'Stocks',                         montant:  8_200 },
    { label: 'Créances clients',               montant: 42_800 },
    { label: 'Disponibilités',                 montant: 48_250 },
    { label: 'Charges constatées d\'avance',   montant:  2_100 },
  ]

  const passif = [
    { label: 'Capital social',               montant: 50_000 },
    { label: 'Réserves',                     montant: 28_400 },
    { label: 'Résultat de l\'exercice',      montant: 64_700 },
    { label: 'Emprunts bancaires',           montant: 18_600 },
    { label: 'Dettes fournisseurs',          montant: 14_250 },
    { label: 'Dettes fiscales et sociales',  montant:  6_400 },
  ]

  const totalActif  = actif.reduce((s, r)  => s + r.montant, 0)
  const totalPassif = passif.reduce((s, r) => s + r.montant, 0)

  const bilanData = {
    year: 2025,
    actif: {
      immobilisations: String(12_400 + 38_600),
      creances:        String(8_200 + 42_800),
      tresorerie:      String(48_250 + 2_100),
      total:           String(totalActif),
    },
    passif: {
      capitaux: String(50_000 + 28_400 + 64_700),
      dettes:   String(18_600 + 14_250 + 6_400),
      total:    String(totalPassif),
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bilan comptable</h1>
          <p className="mt-1 text-sm text-gray-500">Au 31 décembre 2025</p>
        </div>
        <PdfButton onDownload={() => downloadBilan(bilanData)} label="Exporter PDF" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Actif */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">ACTIF</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {actif.map((r) => (
              <div key={r.label} className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-600">{r.label}</span>
                <span className="font-medium text-gray-900">{fmt(r.montant)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 bg-forest-50 flex justify-between px-5 py-3">
            <span className="text-sm font-semibold text-forest-900">Total Actif</span>
            <span className="text-sm font-bold text-forest-900">{fmt(totalActif)}</span>
          </div>
        </div>

        {/* Passif */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">PASSIF</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {passif.map((r) => (
              <div key={r.label} className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-600">{r.label}</span>
                <span className="font-medium text-gray-900">{fmt(r.montant)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 bg-forest-50 flex justify-between px-5 py-3">
            <span className="text-sm font-semibold text-forest-900">Total Passif</span>
            <span className="text-sm font-bold text-forest-900">{fmt(totalPassif)}</span>
          </div>
        </div>
      </div>

      {totalActif === totalPassif && (
        <p className="text-center text-sm font-medium text-green-600">✓ Bilan équilibré</p>
      )}
    </div>
  )
}
