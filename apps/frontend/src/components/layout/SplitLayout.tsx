import { useEffect, useRef, type ReactNode } from 'react'

interface SplitLayoutProps {
  listContent:   ReactNode
  detailContent: ReactNode | null
  isOpen:        boolean
  onClose:       () => void
}

export function SplitLayout({ listContent, detailContent, isOpen, onClose }: SplitLayoutProps) {
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {/* List pane */}
      <div
        className={`min-w-0 flex-shrink-0 transition-all duration-250 ease-in-out ${
          isOpen ? 'hidden sm:block sm:w-1/2' : 'w-full'
        }`}
      >
        {listContent}
      </div>

      {/* Detail pane — mobile: full overlay, desktop: right half */}
      <div
        ref={detailRef}
        className={`
          fixed inset-0 z-40 bg-white sm:static sm:z-auto sm:inset-auto
          sm:flex-1 sm:min-w-0 sm:border-l sm:border-gray-200 sm:overflow-y-auto
          transition-transform duration-250 ease-in-out
          ${isOpen
            ? 'translate-x-0'
            : 'translate-x-full sm:translate-x-full sm:hidden'}
        `}
      >
        {detailContent}
      </div>
    </div>
  )
}
