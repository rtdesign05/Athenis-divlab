import { api } from '@/lib/api'

export interface SendDocumentPayload {
  to:      string
  subject: string
  html:    string
  text?:   string
}

export const mailApi = {
  /** Envoie un document commercial (facture, BL, …) par e-mail au client. */
  async sendDocument(payload: SendDocumentPayload): Promise<void> {
    await api.post('/mail/send-document', payload)
  },
}
