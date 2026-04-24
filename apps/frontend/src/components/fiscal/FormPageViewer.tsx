import { useEffect, type ReactNode } from 'react'

export interface FormPage {
  pageNumber: number
  title: string
  component: ReactNode
}

interface Props {
  formRef: string
  formTitle: string
  pages: FormPage[]
  currentPage: number
  onPageChange: (page: number) => void
  onDownloadPdf?: () => void
  onMarkDeclared?: () => void
  isDeclared?: boolean
  isPaid?: boolean
  periodLabel?: string
  extraControls?: ReactNode
}

const DGI_GREEN = '#006633'
const DGI_RED   = '#CE1126'

export function FormPageViewer({
  formRef,
  formTitle,
  pages,
  currentPage,
  onPageChange,
  onDownloadPdf,
  onMarkDeclared,
  isDeclared,
  isPaid,
  periodLabel,
  extraControls,
}: Props) {
  const total    = pages.length
  const canPrev  = currentPage > 1
  const canNext  = currentPage < total
  const page     = pages[currentPage - 1]

  // Keyboard navigation
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'ArrowLeft'  && canPrev) onPageChange(currentPage - 1)
      if (e.key === 'ArrowRight' && canNext) onPageChange(currentPage + 1)
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [currentPage, canPrev, canNext, onPageChange])

  return (
    <div className="flex flex-col gap-0">

      {/* ── Extra controls (period pickers etc.) ── */}
      {extraControls && (
        <div className="mb-2">
          {extraControls}
        </div>
      )}

      {/* ── Top action bar ── */}
      <div
        className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b px-3 py-2"
        style={{ background: 'white', borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        <span className="font-mono text-xs font-bold" style={{ color: DGI_GREEN }}>{formRef}</span>
        <span className="text-xs text-gray-500 hidden sm:inline">—</span>
        <span className="text-xs font-medium text-gray-700 hidden sm:inline">{formTitle}</span>
        {periodLabel && <span className="text-xs text-gray-400">| {periodLabel}</span>}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onDownloadPdf && (
            <button
              onClick={onDownloadPdf}
              className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: DGI_GREEN }}
            >
              🖨 PDF DGI
            </button>
          )}
          {onMarkDeclared && !isDeclared && !isPaid && (
            <button
              onClick={onMarkDeclared}
              className="rounded border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: DGI_GREEN, color: DGI_GREEN }}
            >
              ✅ Marquer déclarée
            </button>
          )}
          <a
            href="https://www.impots.cm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: DGI_RED }}
          >
            🔗 impots.cm
          </a>
        </div>
      </div>

      {/* ── Page navigation bar ── */}
      {total > 1 && (
        <div
          className="flex items-center gap-3 border-b px-3 py-1.5"
          style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}
        >
          {/* Prev button */}
          <button
            onClick={() => canPrev && onPageChange(currentPage - 1)}
            disabled={!canPrev}
            className="rounded border px-3 py-1 text-xs font-medium disabled:opacity-30"
            style={{ borderColor: canPrev ? DGI_GREEN : '#d1d5db', color: canPrev ? DGI_GREEN : '#9ca3af' }}
          >
            ← Précédent
          </button>

          {/* Dot progress */}
          <div className="flex items-center gap-1.5">
            {pages.map(p => (
              <button
                key={p.pageNumber}
                onClick={() => onPageChange(p.pageNumber)}
                title={`Page ${p.pageNumber} — ${p.title}`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: p.pageNumber === currentPage ? DGI_GREEN : p.pageNumber < currentPage ? '#C8E6C9' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Page info */}
          <span className="text-xs text-gray-500 whitespace-nowrap">
            Page <strong style={{ color: DGI_GREEN }}>{currentPage}</strong> / {total}
          </span>
          <span className="text-xs text-gray-400 hidden md:inline truncate max-w-xs">
            {page?.title}
          </span>

          {/* Keyboard hint */}
          <span className="ml-auto text-xs text-gray-300 hidden lg:inline">← → clavier</span>

          {/* Next button */}
          <button
            onClick={() => canNext && onPageChange(currentPage + 1)}
            disabled={!canNext}
            className="rounded border px-3 py-1 text-xs font-medium disabled:opacity-30"
            style={{ borderColor: canNext ? DGI_GREEN : '#d1d5db', color: canNext ? DGI_GREEN : '#9ca3af' }}
          >
            Suivant →
          </button>
        </div>
      )}

      {/* ── A4 page display area ── */}
      <div
        className="overflow-auto"
        style={{ background: '#d1d5db', padding: '24px 16px', minHeight: '80vh' }}
      >
        <div
          className="mx-auto bg-white"
          style={{
            width: 794,
            minHeight: 1123,
            padding: '20mm 15mm',
            boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: 9,
            color: '#000',
            position: 'relative',
          }}
        >
          {page?.component}
        </div>

        {/* Mobile scale notice */}
        <p className="mt-3 text-center text-xs text-gray-400 sm:hidden">
          Faites défiler horizontalement pour voir le formulaire complet
        </p>
      </div>

      {/* ── Bottom navigation ── */}
      {total > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-2" style={{ background: '#f9fafb' }}>
          <button
            onClick={() => canPrev && onPageChange(currentPage - 1)}
            disabled={!canPrev}
            className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-30"
            style={{ borderColor: canPrev ? DGI_GREEN : '#d1d5db', color: canPrev ? DGI_GREEN : '#9ca3af' }}
          >
            ← Page précédente
          </button>
          <span className="text-sm text-gray-500">
            {page?.title}
          </span>
          <button
            onClick={() => canNext && onPageChange(currentPage + 1)}
            disabled={!canNext}
            className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-30"
            style={{
              borderColor: canNext ? DGI_GREEN : '#d1d5db',
              background: canNext ? DGI_GREEN : 'transparent',
              color: canNext ? '#fff' : '#9ca3af',
            }}
          >
            Page suivante →
          </button>
        </div>
      )}

      <p className="py-1 text-center text-xs text-gray-400 italic">
        Ce document est une simulation. Dépôt officiel : portail GOVIN — www.impots.cm (DGI Cameroun)
      </p>
    </div>
  )
}
