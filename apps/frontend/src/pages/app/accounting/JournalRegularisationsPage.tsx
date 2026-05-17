/**
 * JournalRegularisationsPage
 *
 * Page autonome au même niveau que /journal/lettrage et /journal/extournes
 * dans la navigation contextuelle "Journal".
 *
 * Affiche le panneau RegularizationsPanel pour l'exercice sélectionné.
 */
import { useSelectedFiscalYearData } from '@/hooks/useFiscalYear'
import { RegularizationsPanel } from './RegularizationsPanel'

export function JournalRegularisationsPage() {
  const fy = useSelectedFiscalYearData()

  if (!fy) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500">
        <p className="text-sm">Sélectionnez un exercice comptable dans le menu en haut.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Régularisations d'inventaire</h1>
        <p className="mt-1 text-sm text-gray-500">
          Génération automatique des écritures CCA, PCA, FNP, FAE avec contre-passation au début de l'exercice suivant
        </p>
      </div>

      <RegularizationsPanel
        fiscalYearId={fy.id}
        fyYear={fy.year}
        fyStartDate={fy.startDate}
        fyEndDate={fy.endDate}
        fyStatus={fy.status}
      />
    </div>
  )
}
