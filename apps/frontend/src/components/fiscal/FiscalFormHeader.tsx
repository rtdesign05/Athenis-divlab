interface FiscalFormHeaderProps {
  title: string
  formRef?: string
  cdi?: string
  niu?: string
  period?: string
}

export function FiscalFormHeader({ title, formRef, cdi, niu, period }: FiscalFormHeaderProps) {
  return (
    <div className="rounded-lg border-2 border-gray-600 bg-white p-5 print:border-black">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-800">République du Cameroun</p>
        <p className="text-xs italic text-gray-500">Paix — Travail — Patrie</p>
        <div className="mx-auto my-2 w-24 border-t border-gray-400" />
        <p className="text-xs font-semibold uppercase text-gray-700">Ministère des Finances</p>
        <p className="text-xs font-semibold text-gray-700">Direction Générale des Impôts</p>
      </div>

      {(cdi || niu) && (
        <div className="mt-3 flex flex-wrap gap-6 border-t border-gray-200 pt-3 text-xs text-gray-600">
          {cdi && (
            <span>
              CDI / CSI / CIME :{' '}
              <strong className="font-semibold text-gray-900">{cdi}</strong>
            </span>
          )}
          {niu && (
            <span>
              NIU :{' '}
              <strong className="font-mono font-semibold tracking-wide text-gray-900">{niu}</strong>
            </span>
          )}
        </div>
      )}

      <div className="mt-3 rounded border border-gray-400 bg-gray-50 px-4 py-3 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-gray-900">{title}</p>
        {formRef && (
          <p className="mt-0.5 font-mono text-xs text-gray-500">Formulaire {formRef}</p>
        )}
        {period && (
          <p className="mt-1.5 text-sm font-semibold text-blue-700">Période : {period}</p>
        )}
      </div>
    </div>
  )
}
