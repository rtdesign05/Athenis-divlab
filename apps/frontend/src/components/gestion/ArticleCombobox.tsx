/**
 * ArticleCombobox — autocomplete article picker for invoice lines
 *
 * Tape les premières lettres → suggestion par référence ou nom.
 * Sélection d'un article :
 *   - définit articleId
 *   - propage nom, unite, prixVenteHT
 *
 * Validation visuelle :
 *   - si articleId vide  → bordure rouge + message "Article inconnu"
 *   - si stock insuffisant → bordure orange + message "Stock = X"
 */

import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Article } from '@/contexts/GestionContext'

interface ArticleComboboxProps {
  /** Liste complète des articles disponibles */
  articles:         Article[]
  /** ID de l'article actuellement sélectionné (vide = non sélectionné) */
  selectedId:       string
  /** Texte libre saisi (description ou recherche) */
  text:             string
  /** Quantité demandée (pour validation stock) */
  quantite:         number
  /** Filtre optionnel — n'afficher que les articles actifs et stockés */
  onlyAvailable?:   boolean
  /** Appelée quand un article est sélectionné dans le dropdown */
  onSelect:         (article: Article) => void
  /** Appelée à chaque frappe libre (description non liée à un article) */
  onTextChange:     (text: string) => void
  /** Placeholder du champ */
  placeholder?:     string
  /** Désactive le composant */
  disabled?:        boolean
  /** Compact mode (utilisé dans les tableaux) */
  compact?:         boolean
}

export function ArticleCombobox({
  articles, selectedId, text, quantite, onlyAvailable,
  onSelect, onTextChange, placeholder, disabled, compact,
}: ArticleComboboxProps) {
  const [open,        setOpen]        = useState(false)
  const [highlight,   setHighlight]   = useState(0)
  const [coords,      setCoords]      = useState<{ top: number; left: number; width: number } | null>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Recalcule la position du dropdown (portail) selon la position de l'input
  useLayoutEffect(() => {
    if (!open) return
    function updatePosition() {
      const el = inputRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setCoords({
        top:   rect.bottom + window.scrollY + 4,
        left:  rect.left   + window.scrollX,
        width: Math.max(rect.width, 640),
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, text])

  const selected = useMemo(
    () => articles.find(a => a.id === selectedId) ?? null,
    [articles, selectedId],
  )

  // Filtre les articles selon le texte (insensible à la casse)
  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase()
    const candidates = onlyAvailable ? articles.filter(a => a.actif) : articles
    if (!q) return candidates.slice(0, 12)
    return candidates
      .filter(a =>
        a.nom.toLowerCase().includes(q) ||
        a.reference.toLowerCase().includes(q),
      )
      .slice(0, 12)
  }, [articles, text, onlyAvailable])

  // Détecte les clics extérieurs pour fermer le dropdown
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleSelect(article: Article) {
    onSelect(article)
    setOpen(false)
    setHighlight(0)
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const art = filtered[highlight]
      if (art) handleSelect(art)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  // Le contrôle de stock ne s'applique qu'aux articles suivis (marchandises).
  // Services et prestations (stockTracking=false) : vente illimitée.
  const isTracked      = !!selected && selected.stockTracking !== false && selected.categorie !== 'Service'
  const hasText        = text.trim().length > 0
  const isUnknown      = hasText && !selected
  const stockShortage  = isTracked && quantite > (selected?.stock ?? 0)
  const baseClass      = compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
  const borderColor    =
    isUnknown     ? 'border-red-300 focus:ring-red-300/40' :
    stockShortage ? 'border-amber-300 focus:ring-amber-300/40' :
    'border-gray-200 focus:ring-green-500/30'

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={text}
        disabled={disabled}
        onChange={e => { onTextChange(e.target.value); setOpen(true); setHighlight(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder ?? 'Rechercher un article (réf. ou nom)…'}
        className={`w-full rounded border ${borderColor} ${baseClass} focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400`}
      />
      {selected && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5 text-[10px]">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-500">{selected.reference}</span>
          {isTracked ? (
            <span className={`rounded px-1.5 py-0.5 font-semibold ${
              stockShortage ? 'bg-amber-100 text-amber-700' :
              selected.stock <= selected.stockMin ? 'bg-yellow-50 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              Stock {selected.stock}
            </span>
          ) : (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">
              ∞ illimité
            </span>
          )}
        </div>
      )}
      {isUnknown && (
        <p className="absolute left-0 -bottom-4 text-[10px] text-red-600">
          ⚠ Article inconnu — sélectionnez un article existant
        </p>
      )}
      {stockShortage && (
        <p className="absolute left-0 -bottom-4 text-[10px] text-amber-700">
          ⚠ Stock insuffisant ({selected.stock} disponible{selected.stock > 1 ? 's' : ''})
        </p>
      )}

      {open && filtered.length > 0 && !disabled && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top:      coords.top,
            left:     coords.left,
            width:    coords.width,
            maxWidth: '92vw',
          }}
          className="z-[100] max-h-[480px] overflow-auto rounded-xl border-2 border-green-300 bg-white shadow-2xl"
        >
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Articles disponibles
            </span>
            <span className="text-[11px] text-gray-400">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </span>
          </div>
          {filtered.map((art, i) => {
            const artTracked = art.stockTracking !== false && art.categorie !== 'Service'
            const isShort = artTracked && quantite > art.stock
            return (
              <button
                key={art.id}
                type="button"
                onClick={() => handleSelect(art)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                  i === highlight ? 'bg-green-50 ring-1 ring-inset ring-green-200' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] text-gray-600 bg-gray-100 rounded px-2 py-0.5 font-semibold shrink-0">
                        {art.reference}
                      </span>
                      <span className="inline-block rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-medium shrink-0">
                        {art.categorie}
                      </span>
                    </div>
                    {/* Nom complet de l'article — pas de truncate */}
                    <p className="text-sm font-semibold text-gray-900 leading-snug break-words">
                      {art.nom}
                    </p>
                    {art.description && (
                      <p className="mt-1 text-xs text-gray-500 leading-snug break-words">
                        {art.description}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{art.prixVenteHT.toLocaleString('fr-FR')} XAF HT</span>
                      <span className="text-gray-400"> / {art.unite}</span>
                      {art.agence && <span className="text-gray-400"> · {art.agence}</span>}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {artTracked ? (
                      <>
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                          art.stock === 0  ? 'bg-red-100 text-red-700' :
                          isShort          ? 'bg-amber-100 text-amber-700' :
                          art.stock <= art.stockMin ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {art.stock === 0 ? 'Rupture' : `${art.stock} dispo.`}
                        </span>
                        {art.stockMin > 0 && (
                          <p className="mt-1 text-[10px] text-gray-400">Seuil : {art.stockMin}</p>
                        )}
                      </>
                    ) : (
                      <span className="inline-block rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                        ∞ illimité
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>,
        document.body,
      )}
      {open && filtered.length === 0 && hasText && !disabled && coords && createPortal(
        <div
          style={{
            position: 'fixed',
            top:      coords.top,
            left:     coords.left,
            width:    coords.width,
            maxWidth: '92vw',
          }}
          className="z-[100] rounded-xl border-2 border-gray-200 bg-white shadow-2xl p-6 text-center"
        >
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm font-medium text-gray-600">Aucun article trouvé</p>
          <p className="mt-1 text-xs text-gray-400">
            Aucun résultat pour <span className="font-mono">"{text}"</span>
          </p>
          <p className="mt-2 text-[11px] text-gray-400">
            Créez d'abord l'article dans <span className="font-medium">Gestion › Articles</span>
          </p>
        </div>,
        document.body,
      )}
    </div>
  )
}
