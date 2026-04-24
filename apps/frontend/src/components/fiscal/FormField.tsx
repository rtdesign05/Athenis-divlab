import { useCurrency } from '@/hooks/useCurrency'

interface FormFieldProps {
  label: string
  lineNumber?: string
  value: number
  onChange?: (v: number) => void
  auto?: boolean
  readOnly?: boolean
  bold?: boolean
  total?: boolean
  negative?: boolean
}

export function FormField({
  label, lineNumber, value, onChange, auto, readOnly, bold, total, negative,
}: FormFieldProps) {
  const { fmt } = useCurrency()
  const isEditable = !!onChange && !readOnly

  return (
    <div
      className={[
        'flex items-center gap-3 py-2 text-sm',
        total
          ? 'border-t-2 border-gray-400 bg-blue-50 pt-3 font-bold'
          : 'border-b border-gray-100',
      ].join(' ')}
    >
      {lineNumber && (
        <span className="w-14 shrink-0 font-mono text-xs text-gray-400">{lineNumber}</span>
      )}
      <span className={`flex-1 ${bold || total ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {label}
      </span>
      {auto && isEditable && (
        <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
          📊 auto
        </span>
      )}
      {isEditable ? (
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={[
            'w-40 rounded border px-2 py-1 text-right text-sm font-medium focus:outline-none focus:ring-1',
            auto
              ? 'border-blue-200 bg-blue-50 text-blue-800 focus:ring-blue-300'
              : 'border-gray-300 bg-white text-gray-900 focus:ring-gray-400',
          ].join(' ')}
        />
      ) : (
        <span
          className={[
            'w-40 text-right tabular-nums',
            total ? 'text-base font-bold text-blue-900' : bold ? 'font-semibold text-gray-900' : 'text-gray-700',
            negative ? 'text-red-700' : '',
          ].join(' ')}
        >
          {negative ? `(${fmt(value)})` : fmt(value)}
        </span>
      )}
      <span className="w-14 shrink-0 text-right text-xs text-gray-400">F CFA</span>
    </div>
  )
}
