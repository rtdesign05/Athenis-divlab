import { StyleSheet } from '@react-pdf/renderer'

export const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },

  // ── Header bands ─────────────────────────────────────────────────────────────
  headerBand: {
    backgroundColor: '#006633',
    color: 'white',
    padding: '3 8',
    fontSize: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: '5 8',
    borderBottomWidth: 1,
    borderBottomColor: '#006633',
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  headerTitleGreen: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#006633',
    letterSpacing: 0.3,
  },
  headerSubItalic: {
    fontSize: 7,
    color: '#555555',
    fontFamily: 'Helvetica-Oblique',
  },
  headerDgi: {
    fontSize: 7,
    color: '#006633',
    fontFamily: 'Helvetica-Bold',
  },
  cdiRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000000',
    fontSize: 7,
  },
  cdiCell: {
    flex: 1,
    padding: '2 4',
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  cdiCellLast: {
    flex: 1,
    padding: '2 4',
  },
  niuRow: {
    padding: '2 6',
    backgroundColor: '#F5F5F5',
    fontSize: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  formTitle: {
    backgroundColor: '#006633',
    color: 'white',
    textAlign: 'center',
    padding: '6 8',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  formSubtitle: {
    backgroundColor: '#E8F5E9',
    textAlign: 'center',
    padding: '2 6',
    fontSize: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#006633',
  },

  // ── Section headers ───────────────────────────────────────────────────────────
  sectionHeader: {
    backgroundColor: '#006633',
    color: 'white',
    padding: '3 6',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginTop: 6,
  },

  // ── Tables ────────────────────────────────────────────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: '#000000',
    marginTop: 0,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
  },
  rowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    backgroundColor: '#F1F8E9',
  },
  rowSection: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    backgroundColor: '#E8F5E9',
  },
  rowSubtotal: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    backgroundColor: '#C8E6C9',
  },
  rowResult: {
    flexDirection: 'row',
    backgroundColor: '#006633',
  },
  rowWarn: {
    flexDirection: 'row',
    backgroundColor: '#FFF9C4',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
  },

  // ── Cells ─────────────────────────────────────────────────────────────────────
  cellRef: {
    width: 22,
    padding: '2 3',
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    fontSize: 7,
    color: '#666666',
    textAlign: 'center',
  },
  cellLabel: {
    flex: 1,
    padding: '2 4',
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    fontSize: 7,
  },
  cellLabelBold: {
    flex: 1,
    padding: '2 4',
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  cellLabelWhite: {
    flex: 1,
    padding: '2 4',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(255,255,255,0.3)',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: 'white',
  },
  cellLabelWhiteLg: {
    flex: 1,
    padding: '2 4',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: 'white',
  },
  cellAmt: {
    width: 90,
    padding: '2 4',
    textAlign: 'right',
    fontSize: 7,
  },
  cellAmtBold: {
    width: 90,
    padding: '2 4',
    textAlign: 'right',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  cellAmtWhite: {
    width: 90,
    padding: '2 4',
    textAlign: 'right',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: 'white',
  },
  cellAmtWhiteLg: {
    width: 90,
    padding: '2 4',
    textAlign: 'right',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: 'white',
  },
  cellBase2: {
    width: 90,
    padding: '2 4',
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    textAlign: 'right',
    fontSize: 7,
  },
  cellBase2Bold: {
    width: 90,
    padding: '2 4',
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    textAlign: 'right',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Identification rows ───────────────────────────────────────────────────────
  identRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
  },
  identLabel: {
    width: 140,
    padding: '2 4',
    borderRightWidth: 1,
    borderRightColor: '#000000',
    backgroundColor: '#E8F5E9',
    fontSize: 7,
  },
  identValue: {
    flex: 1,
    padding: '2 4',
    fontSize: 7,
  },

  // ── Signature / footer ────────────────────────────────────────────────────────
  signatureBlock: {
    marginTop: 10,
    padding: '6 8',
    borderWidth: 1,
    borderColor: '#000000',
  },
  signatureArea: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  watermark: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 6,
    color: '#AAAAAA',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 12,
    right: 20,
    fontSize: 6,
    color: '#666666',
  },

  // ── Notice box ────────────────────────────────────────────────────────────────
  noticeBox: {
    marginTop: 4,
    padding: '3 6',
    backgroundColor: '#FFF9C4',
    borderWidth: 0.5,
    borderColor: '#F57F17',
  },
  noticeText: {
    fontSize: 6,
    color: '#5D4037',
  },
  greenNotice: {
    marginTop: 4,
    padding: '3 6',
    backgroundColor: '#E8F5E9',
    borderWidth: 0.5,
    borderColor: '#006633',
  },
  greenNoticeText: {
    fontSize: 6,
    color: '#006633',
    fontFamily: 'Helvetica-Bold',
  },

  // ── Column header row ─────────────────────────────────────────────────────────
  colHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    backgroundColor: '#E8F5E9',
  },
  colHeaderCell: {
    padding: '2 4',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
  },
})
