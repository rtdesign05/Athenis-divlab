// Official DGI Cameroun form header — colors strictly from impots.cm official forms

interface DgiFormHeaderProps {
  formRef: string
  title: string
  subtitle?: string
  centerImpots?: string
  dgeRef?: string
  niu?: string
}

const CameroonFlag = () => (
  <svg width="45" height="30" viewBox="0 0 3 2" style={{ flexShrink: 0, border: '1px solid #ccc' }}>
    <rect width="1" height="2" fill="#006633" />
    <rect x="1" width="1" height="2" fill="#CE1126" />
    <rect x="2" width="1" height="2" fill="#FCD116" />
    <polygon
      points="1.5,0.45 1.61,0.80 1.97,0.80 1.68,1.01 1.79,1.36 1.5,1.15 1.21,1.36 1.32,1.01 1.03,0.80 1.39,0.80"
      fill="#FCD116"
    />
  </svg>
)

export function DgiFormHeader({ formRef, title, subtitle, centerImpots, dgeRef, niu }: DgiFormHeaderProps) {
  return (
    <div style={{ border: '2px solid #006633', fontFamily: 'Arial, Helvetica, sans-serif', background: '#fff' }}>

      {/* Top band */}
      <div style={{
        background: '#006633', color: '#fff', padding: '3px 8px', fontSize: 9,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontWeight: 'bold' }}>Réf : {formRef}</span>
        <span>MINISTERE DES FINANCES — DIRECTION GÉNÉRALE DES IMPÔTS</span>
        <span style={{ fontSize: 8, opacity: 0.8 }}>Formulaire DGI CM</span>
      </div>

      {/* Main header: flag | text | coat of arms */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #006633', gap: 8 }}>
        <CameroonFlag />

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: '#006633', letterSpacing: 0.5 }}>
            REPUBLIQUE DU CAMEROUN
          </div>
          <div style={{ fontSize: 9, fontStyle: 'italic', color: '#444', marginTop: 1 }}>
            Paix &mdash; Travail &mdash; Patrie
          </div>
          <div style={{ borderTop: '1px solid #006633', margin: '3px 30px' }} />
          <div style={{ fontSize: 10, color: '#006633' }}>MINISTERE DES FINANCES</div>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#006633' }}>
            DIRECTION GENERALE DES IMPOTS
          </div>
        </div>

        {/* Coat of arms placeholder */}
        <div style={{ width: 45, textAlign: 'center', fontSize: 26, lineHeight: 1 }}>🦁</div>
      </div>

      {/* DGE ref / CDI row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: 9, borderBottom: '1px solid #000' }}>
        <div style={{ padding: '3px 8px', borderRight: '1px solid #000' }}>
          D.G.E. / C.R.I. : <span style={{ fontWeight: 'bold' }}>{dgeRef ?? '_______________'}</span>
        </div>
        <div style={{ padding: '3px 8px' }}>
          CDI / CSI / CIME : <span style={{ fontWeight: 'bold' }}>{centerImpots ?? '_______________'}</span>
        </div>
      </div>

      {niu && (
        <div style={{ padding: '2px 8px', fontSize: 9, borderBottom: '1px solid #ccc', background: '#f5f5f5' }}>
          NIU : <strong style={{ fontFamily: 'monospace' }}>{niu}</strong>
        </div>
      )}

      {/* Form title bar */}
      <div style={{
        background: '#006633', color: '#fff', textAlign: 'center',
        padding: '7px 8px', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5,
      }}>
        {title}
      </div>

      {subtitle && (
        <div style={{
          background: '#E8F5E9', textAlign: 'center', padding: '3px 8px',
          fontSize: 10, borderBottom: '1px solid #006633', color: '#1a5c2a',
        }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
