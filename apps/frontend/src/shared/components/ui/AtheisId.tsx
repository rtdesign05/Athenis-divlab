interface Props {
  number: string
  size?: 'sm' | 'md' | 'lg'
  dark?: boolean
}

export function AtheisId({ number, size = 'sm', dark = false }: Props) {
  const sizeClass = size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm'
  const colorClass = dark ? 'text-forest-300' : 'text-forest-600'
  return (
    <span className={`font-mono font-medium tracking-wide ${sizeClass} ${colorClass}`}>
      {number}
    </span>
  )
}
