import { useRef, useState } from 'react'
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '@/hooks/useAttachments'
import { attachmentsApi, type Attachment } from '@/services/attachmentsApi'
import { FilePreviewModal } from './FilePreviewModal'

type ResourceType = 'invoice' | 'expense'

interface AttachmentPanelProps {
  resourceType: ResourceType
  resourceId:   string
}

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.heic'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`
  if (n < 1_048_576) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / 1_048_576).toFixed(1)} Mo`
}

function fileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.startsWith('image/')) return '🖼'
  return '📎'
}

function AttachmentRow({
  att,
  onPreview,
  onDelete,
  isConfirming,
  onCancelDelete,
  isDeleting,
}: {
  att:           Attachment
  onPreview:     () => void
  onDelete:      () => void
  isConfirming:  boolean
  onCancelDelete: () => void
  isDeleting:    boolean
}) {
  const date = new Date(att.uploadedAt).toLocaleDateString('fr-FR')
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 rounded-lg group">
      <span className="text-xl shrink-0">{fileIcon(att.mimeType)}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-800">{att.fileName}</p>
        <p className="text-xs text-gray-400">{formatBytes(att.fileSize)} · {date}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onPreview}
          title="Prévisualiser"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clipRule="evenodd" />
          </svg>
        </button>
        <a
          href={attachmentsApi.downloadUrl(att.id)}
          download={att.fileName}
          title="Télécharger"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
        </a>
        {isConfirming ? (
          <>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="text-xs text-red-600 font-semibold px-1.5 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isDeleting ? '…' : 'Confirmer'}
            </button>
            <button
              onClick={onCancelDelete}
              className="text-xs text-gray-400 px-1.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
          </>
        ) : (
          <button
            onClick={onDelete}
            title="Supprimer"
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export function AttachmentPanel({ resourceType, resourceId }: AttachmentPanelProps) {
  const { data: attachments = [], isLoading } = useAttachments(resourceType, resourceId)
  const { mutate: upload, isPending: uploading, progress } = useUploadAttachment(resourceType, resourceId)
  const { requestDelete, cancelDelete, confirmId, isPending: deleting } = useDeleteAttachment(resourceType, resourceId)

  const [dragging, setDragging] = useState(false)
  const [preview, setPreview]   = useState<{ attachments: Attachment[]; index: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files?.length) return
    upload(Array.from(files))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-semibold text-gray-600">
          📎 Pièces justificatives {attachments.length > 0 && `(${attachments.length})`}
        </span>
      </div>

      {/* Attachment list */}
      {isLoading ? (
        <div className="px-3 py-4 text-xs text-gray-400 text-center">Chargement…</div>
      ) : attachments.length === 0 ? (
        <div className="px-3 py-4 text-xs text-gray-400 text-center">Aucune pièce attachée</div>
      ) : (
        <div className="divide-y divide-gray-50 px-1">
          {attachments.map((att, i) => (
            <AttachmentRow
              key={att.id}
              att={att}
              onPreview={() => setPreview({ attachments, index: i })}
              onDelete={() => requestDelete(att.id)}
              isConfirming={confirmId === att.id}
              onCancelDelete={cancelDelete}
              isDeleting={deleting && confirmId === att.id}
            />
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div className="border-t border-gray-100 p-3">
        {uploading && progress ? (
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-forest-500 transition-all duration-150"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-center">Upload {progress.percent}%</p>
          </div>
        ) : uploading ? (
          <p className="text-xs text-gray-400 text-center">Envoi en cours…</p>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
              dragging ? 'border-forest-400 bg-forest-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-3 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              📎 Ajouter une pièce
              <span className="block text-xs text-gray-400 mt-0.5">PDF, JPG, PNG, WEBP, HEIC · max 10 Mo</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <FilePreviewModal
          attachments={preview.attachments}
          initialIndex={preview.index}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
