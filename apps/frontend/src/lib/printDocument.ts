/**
 * Ouvre une nouvelle fenêtre avec le contenu d'un élément DOM,
 * déclenche automatiquement la boîte de dialogue Imprimer / Enregistrer en PDF,
 * puis ferme la fenêtre.
 *
 * Stratégie CSS : on extrait toutes les règles CSS de la page courante
 * (Tailwind + styles custom) via document.styleSheets afin qu'elles soient
 * disponibles dans la fenêtre de prévisualisation — fonctionne en dev (Vite)
 * comme en production (bundle).
 */
export function printDocument(
  el:    HTMLElement | null | undefined,
  title: string = 'Document',
): void {
  if (!el) return

  const win = window.open('', '_blank', 'width=940,height=1200')
  if (!win) {
    alert(
      'Autorisez les fenêtres contextuelles (popups) dans votre navigateur ' +
      'pour générer le PDF.',
    )
    return
  }

  // ── Extraction de tous les styles de la page (même ceux injectés par Vite) ──
  const allCss = Array.from(document.styleSheets)
    .flatMap(sheet => {
      try {
        return Array.from(sheet.cssRules).map(r => r.cssText)
      } catch {
        // Feuilles cross-origin bloquées par CORS — ignorées
        return []
      }
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <style>
${allCss}

/* ── Surcharges impression ─────────────────────────────── */
@page {
  margin: 14mm 12mm;
  size: A4 portrait;
}
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
/* Cache les éléments explicitement masqués à l'impression */
.print\\:hidden,
[class*=" print:hidden"],
[class*="print:hidden"] {
  display: none !important;
}
/* Supprime les ombres / coins arrondis inutiles sur papier */
.print\\:shadow-none  { box-shadow: none !important; }
.print\\:rounded-none { border-radius: 0 !important; }
/* Force les couleurs même en mode "économie d'encre" */
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
  </style>
</head>
<body>
  ${el.outerHTML}
  <script>
    window.addEventListener('load', function () {
      // Petit délai pour laisser les images/polices se charger
      setTimeout(function () {
        window.print()
        // Ferme la fenêtre après impression (ou annulation)
        setTimeout(function () { window.close() }, 800)
      }, 600)
    })
  <\/script>
</body>
</html>`

  win.document.write(html)
  win.document.close()
}

/** Échappe les caractères HTML dans une chaîne (utilisé pour le <title>) */
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
