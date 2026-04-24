import { useLocation } from 'react-router-dom'

export function Placeholder() {
  const { pathname } = useLocation()
  const name = pathname.split('/').filter(Boolean).pop() ?? 'page'

  return (
    <div className="p-6 flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200">
      <p className="text-lg font-semibold capitalize text-gray-400">{name}</p>
      <p className="mt-1 text-sm text-gray-400">Module à implémenter</p>
    </div>
  )
}
