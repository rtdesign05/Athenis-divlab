import { useState, useEffect } from 'react'
import type { Attachment } from '@/services/attachmentsApi'
import { attachmentsApi } from '@/services/attachmentsApi'

interface FilePreviewModalProps {
  attachments: Attachment[]
  initialIndex?: number
  onClose: () => void
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`
  if (n < 1_048_576) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / 1_048_576).toFixed(1)} Mo`
}

export function FilePreviewModal({ attachments, initialIndex = 0, onClose }: FilePreviewModalProps) {
  const [idx, setIdx] = useState(initialIndex)
  const att = attachments[idx]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && idx < attachments.length - 1) setIdx(i => i + 1)
      if (e.key === 'ArrowLeft' && idx > 0) setIdx(i => i - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [attachments.length, idx, onClose])

  if (!att) return null

  const isImage = att.mimeType.startsWith('image/')
  const isPdf   = att.mimeType === 'application/pdf'
  const fileUrl = attachmentsApi.fileUrl(att.id)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="truncate text-sm font-medium">{att.fileName}</span>
          <span className="shrink-0 text-xs text-white/50">{formatBytes(att.fileSize)}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {attachments.length > 1 && (
            <span className="text-xs text-white/60">{idx + 1} / {attachments.length}</span>
          )}
          <a
            href={attachmentsApi.downloadUrl(att.id)}
            download={att.fileName}
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Télécharger
          </a>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation prev */}
      {idx > 0 && (
        <button
          onClick={() => setIdx(i => i - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-12 pb-4">
        {isImage && (
          <img
            src={fileUrl}
            alt={att.fileName}
            className="max-h-full max-w-full object-contain rounded shadow-2xl"
          />
        )}
        {isPdf && (
          <iframe
            src={`${fileUrl}#toolbar=0`}
            className="h-full w-full rounded shadow-2xl bg-white"
            title={att.fileName}
          />
        )}
        {!isImage && !isPdf && (
          <div className="text-center text-white/60">
            <p className="text-5xl mb-4">📄</p>
            <p className="text-sm">{att.fileName}</p>
            <a
              href={attachmentsApi.downloadUrl(att.id)}
              download={att.fileName}
              className="mt-4 inline-block rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 transition-colors"
            >
              Télécharger
            </a>
          </div>
        )}
      </div>

      {/* Navigation next */}
      {idx < attachments.length - 1 && (
        <button
          onClick={() => setIdx(i => i + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Thumbnails strip */}
      {attachments.length > 1 && (
        <div className="flex justify-center gap-2 py-3 px-4">
          {attachments.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setIdx(i)}
              className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === idx ? 'border-white scale-110' : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              {a.mimeType.startsWith('image/') ? (
                <img src={attachmentsApi.fileUrl(a.id)} alt={a.fileName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-white/10 text-white text-lg">
                  📄
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
