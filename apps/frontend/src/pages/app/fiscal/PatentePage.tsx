import { useState } from 'react'
import { usePatente, useTaxConfig } from '@/hooks/useFiscal'
import { DgiFormHeader } from '@/components/fiscal/DgiFormHeader'
import { FormPageViewer } from '@/components/fiscal/FormPageViewer'

const YEARS = [2024, 2025, 2026]

const DGI_GREEN      = '#006633'
const DGI_SECTION_BG = '#E8F5E9'
const DGI_TOTAL_BG   = '#C8E6C9'
const DGI_ROW_ALT    = '#F1F8E9'
const DGI_BORDER     = '1px solid #000'

const cellBase: React.CSSProperties     = { border: DGI_BORDER, padding: '3px 6px', fontSize: 9, fontFamily: 'Arial, sans-serif' }
const sectionHdr: React.CSSProperties   = { ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const resultCell: React.CSSProperties   = { ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const tblStyle: React.CSSProperties     = { borderCollapse: 'collapse', width: '100%', fontSize: 9, fontFamily: 'Arial, sans-serif' }

function fmt(n: number | undefined | null) { return (n ?? 0).toLocaleString('fr-FR') }

export function PatentePage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading } = usePatente(year)
  const { data: config }    = useTaxConfig()

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
  if (!data) return null

  const isPaid = data.status === 'PAID'
  const isLate = !isPaid && new Date(data.dueDate) < new Date()
  const periodLabel = `Exercice ${year} | Échéance 28/02/${year}`

  const yearSelector = (
    <div className="flex flex-wrap items-center gap-2">
      {YEARS.map(y => (
        <button key={y} onClick={() => setYear(y)}
          className={`rounded border px-3 py-1.5 text-sm font-medium ${y === year ? 'border-[#006633] bg-[#E8F5E9] text-[#006633]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          {y}
        </button>
      ))}
      <span className={`ml-auto self-center rounded-full px-3 py-1 text-xs font-semibold ${isPaid ? 'bg-green-100 text-green-700' : isLate ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
        {isPaid ? '✓ Payée' : isLate ? '🔴 En retard' : '⏳ À payer'}
      </span>
    </div>
  )

  const page1 = (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <DgiFormHeader
        formRef="P/CM-DGI"
        title={`PATENTE ${year} — CONTRIBUTION DES PATENTES (CGI Art. 576 à 601)`}
        subtitle={`Exercice ${year} — Échéance 28/02/${year} | Régime : Réel Normal`}
        {...(config?.centerImpots ? { centerImpots: config.centerImpots } : {})}
        {...(config?.niu ? { niu: config.niu } : {})}
      />

      {/* Retard alert */}
      {isLate && (
        <div style={{ border: '1px solid #CE1126', background: '#FFEBEE', padding: '6px 10px', fontSize: 9, fontFamily: 'Arial', marginBottom: 8 }}>
          ⚠ Patente {year} — En retard. Pénalités de 10% + 1,5%/mois applicables depuis le {new Date(data.dueDate).toLocaleDateString('fr-FR')}
        </div>
      )}

      {/* Section A — Identification */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION A — IDENTIFICATION DU REDEVABLE
          </th></tr>
        </thead>
        <tbody>
          {[
            ['NIU',                 config?.niu ?? '—'],
            ['RCCM',                config?.rccm ?? '—'],
            ['Centre des impôts',   config?.centerImpots ?? '—'],
            ["Code d'activité",     config?.codeActivite ?? '—'],
            ['Catégorie entreprise', data.categorie],
            ['Exercice',            String(year)],
          ].map(([label, value], i) => (
            <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={{ ...cellBase, width: '40%', background: DGI_SECTION_BG, fontWeight: 600 }}>{label}</td>
              <td style={{ ...cellBase, fontFamily: label === 'NIU' || label === 'RCCM' ? 'monospace' : undefined }}>
                {label === 'Catégorie entreprise' ? <strong style={{ color: DGI_GREEN }}>{value}</strong> : value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section B — Calcul patente */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={3} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION B — CALCUL DE LA PATENTE (CGI Art. 576 à 601)
          </th></tr>
          <tr style={{ background: DGI_SECTION_BG }}>
            <th style={{ ...cellBase, width: 28, textAlign: 'center', fontSize: 8 }}>N°</th>
            <th style={{ ...cellBase, textAlign: 'left' }}>LIBELLÉ</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 180 }}>MONTANT (F CFA)</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['1', `Chiffre d'affaires N-1 (${year - 1})`, fmt(data.caN1)],
            ['2', 'Droit fixe (selon catégorie)',          fmt(data.droitFixe)],
            ['3', `Droit proportionnel (${data.tauxProportionnel.toFixed(3)}% × CA N-1) — taux ${data.categorie}`, fmt(data.droitProportionnel)],
            ['4', 'Sous-total (Droit fixe + Droit proportionnel)', fmt(data.droitFixe + data.droitProportionnel)],
            ['5', 'Centimes additionnels communaux (10%)', fmt(data.centimes)],
            ['6', 'Total calculé', fmt(data.total)],
          ].map(([num, label, value], i) => (
            <tr key={num} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={{ ...cellBase, color: '#666', fontSize: 8, width: 28, textAlign: 'center' }}>{num}</td>
              <td style={cellBase}>{label}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{value}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cellBase, color: '#fff', background: DGI_GREEN, textAlign: 'center', fontWeight: 'bold' }}></td>
            <td style={{ ...resultCell, fontSize: 11 }}>PATENTE TOTALE (arrondi millier supérieur DGI)</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{fmt(data.totalRounded)}</td>
          </tr>
        </tbody>
      </table>

      {/* Section C — Barème */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={4} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION C — BARÈME — CATÉGORIES ET TAUX CGI {year}
          </th></tr>
          <tr style={{ background: DGI_SECTION_BG }}>
            <th style={cellBase}>Catégorie</th>
            <th style={cellBase}>Seuil CA</th>
            <th style={{ ...cellBase, textAlign: 'right' }}>Droit fixe</th>
            <th style={{ ...cellBase, textAlign: 'right' }}>Taux proportionnel</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Grande entreprise',  'CA > 100M',       '500 000', '0,159%'],
            ['Moyenne entreprise', '50M ≤ CA ≤ 100M', '200 000', '0,283%'],
            ['Petite entreprise',  'CA < 50M',        '100 000', '0,494%'],
          ].map(([cat, seuil, fixe, taux], i) => (
            <tr key={i} style={{ background: data.categorie.includes((cat ?? '').split(' ')[0] ?? '') ? DGI_TOTAL_BG : i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={cellBase}>{cat}</td>
              <td style={cellBase}>{seuil}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fixe}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', color: DGI_GREEN }}>{taux}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} style={{ ...cellBase, fontSize: 8, color: '#666', fontStyle: 'italic' }}>
              + 10% centimes additionnels communaux sur le total — Art. 576 à 601 CGI Cameroun
            </td>
          </tr>
        </tbody>
      </table>

      {/* Section D — Paiement */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION D — MODE DE PAIEMENT ET STATUT
          </th></tr>
        </thead>
        <tbody>
          {[
            ['Montant à payer', `${fmt(data.totalRounded)} F CFA`],
            ['Échéance légale',  new Date(data.dueDate).toLocaleDateString('fr-FR')],
            ['Statut', isPaid ? '✅ Payée' : isLate ? '🔴 En retard' : '⏳ À payer avant le 28/02'],
            ...(data.paidAt ? [['Date de paiement', new Date(data.paidAt).toLocaleDateString('fr-FR')]] : []),
            ...(data.reference ? [['Référence / Reçu DGI', data.reference]] : []),
          ].map(([label, value], i) => (
            <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={{ ...cellBase, width: '45%', background: DGI_SECTION_BG, fontWeight: 600 }}>{label}</td>
              <td style={{ ...cellBase, fontWeight: label === 'Montant à payer' ? 'bold' : 'normal', color: label === 'Statut' ? (isPaid ? DGI_GREEN : isLate ? '#CE1126' : '#b45309') : '#000' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signature */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={{ ...cellBase, padding: '14px 10px', fontSize: 9, lineHeight: 2.2 }}>
              Je soussigné(e) <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 200 }}>&nbsp;</span> certifie l'exactitude des renseignements portés dans la présente déclaration.<br/>
              Fait à <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 120 }}>&nbsp;</span>, le <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 100 }}>&nbsp;</span><br/><br/>
              <div style={{ marginTop: 8, textAlign: 'center', border: '1px dashed #999', padding: 28, color: '#aaa', fontSize: 10 }}>
                Signature et cachet du redevable
              </div>
            </td>
            <td style={{ ...cellBase, width: 180, verticalAlign: 'top', padding: 10, fontSize: 8.5, color: '#555' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4, color: DGI_GREEN }}>Réservé à l'administration</div>
              <div>Date de réception : ___________</div>
              <div style={{ marginTop: 6 }}>Visa DGI : ___________</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 6, padding: '4px 8px', fontSize: 8, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#666' }}>
        ⚠ Non-paiement dans les délais légaux : pénalité de 10% du montant + intérêts de retard de 1,5% par mois — CGI Art. 579
      </div>
    </div>
  )

  return (
    <FormPageViewer
      formRef="P/CM-DGI"
      formTitle="Contribution des Patentes"
      periodLabel={periodLabel}
      pages={[{ pageNumber: 1, title: 'Identification, Calcul & Paiement', component: page1 }]}
      currentPage={1}
      onPageChange={() => {}}
      extraControls={yearSelector}
    />
  )
}
