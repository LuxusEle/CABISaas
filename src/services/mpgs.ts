export const MPGS_MERCHANT_ID = import.meta.env.VITE_MPGS_MERCHANT_ID || ''
export const MPGS_GATEWAY_URL = import.meta.env.VITE_MPGS_GATEWAY_URL || 'https://seylan.gateway.mastercard.com'

declare global {
  interface Window {
    Checkout: Checkout
  }
  var Checkout: Checkout
}

interface Checkout {
  configure: (config: { session: { id: string } }) => void
  showPaymentPage: () => void
  showEmbeddedPage: (target: string) => void
}
