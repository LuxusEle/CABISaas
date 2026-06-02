export const MPGS_MERCHANT_ID = import.meta.env.VITE_MPGS_MERCHANT_ID || ''
export const MPGS_GATEWAY_URL = import.meta.env.VITE_MPGS_GATEWAY_URL || 'https://test-seylan.mtf.gateway.mastercard.com'

declare global {
  interface Window {
    PaymentSession: PaymentSession
  }
  var PaymentSession: PaymentSession
}

interface PaymentSession {
  configure: (config: any) => void
  updateSessionFromForm: (type: string) => void
  setFocusStyle: (fields: Record<string, Record<string, string>>) => void
  setHoverStyle: (fields: Record<string, Record<string, string>>) => void
  setPlaceholderStyle: (fields: Record<string, Record<string, string>>) => void
}

let scriptLoaded = false
let scriptLoading: Promise<void> | null = null

export function loadSessionScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()
  if (scriptLoading) return scriptLoading

  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src*="session.js"]`)
    if (existing) {
      scriptLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `${MPGS_GATEWAY_URL}/form/version/100/merchant/${MPGS_MERCHANT_ID}/session.js`
    script.async = true
    script.onload = () => {
      scriptLoaded = true
      resolve()
    }
    script.onerror = () => {
      scriptLoading = null
      reject(new Error('Failed to load MPGS Session.js'))
    }
    document.head.appendChild(script)
  })

  return scriptLoading
}
