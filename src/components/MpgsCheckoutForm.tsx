import React, { useEffect, useRef, useState } from 'react'
import { mpgsService, type MpgsPaymentResult } from '../services/mpgsService'
import { MPGS_MERCHANT_ID } from '../services/mpgs'
import { Loader2, CreditCard, Lock } from 'lucide-react'

interface MpgsCheckoutFormProps {
  planId: string
  amount: number
  onSuccess: (result: MpgsPaymentResult) => void
  onError: (error: string) => void
  onCancel: () => void
}

const fieldBase: React.CSSProperties = {
  height: '44px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '10px 12px',
  transition: 'border-color 0.2s ease',
}

export const MpgsCheckoutForm: React.FC<MpgsCheckoutFormProps> = ({
  planId,
  amount,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const planRef = useRef(planId)
  const amountRef = useRef(amount)

  planRef.current = planId
  amountRef.current = amount

  useEffect(() => {
    let cancelled = false

    const configure = () => {
      if (cancelled) return
      if (typeof PaymentSession === 'undefined') {
        onError('Payment SDK failed to load')
        return
      }

      PaymentSession.configure({
        fields: {
          card: {
            number: '#mpgs-card-number',
            expiryMonth: '#mpgs-card-expiry-month',
            expiryYear: '#mpgs-card-expiry-year',
            securityCode: '#mpgs-card-cvv',
          },
        },
        order: {
          amount: amountRef.current,
          currency: 'USD',
          description: `CABEngine Pro ${planRef.current} Subscription`,
        },
        interaction: {
          operation: 'PURCHASE',
          merchant: { name: 'CABISaas' },
        },
        callbacks: {
          initialized: (response: any) => {
            if (cancelled) return
            if (response.status === 'ok') {
              setLoading(false)

              PaymentSession.setFocusStyle({
                number: { 'border-color': '#f59e0b' },
                expiryMonth: { 'border-color': '#f59e0b' },
                expiryYear: { 'border-color': '#f59e0b' },
                securityCode: { 'border-color': '#f59e0b' },
              })
              PaymentSession.setHoverStyle({
                number: { 'border-color': '#d97706' },
                expiryMonth: { 'border-color': '#d97706' },
                expiryYear: { 'border-color': '#d97706' },
                securityCode: { 'border-color': '#d97706' },
              })
            } else {
              onError(response.message || 'Payment form initialization failed')
            }
          },
          formSessionUpdate: async (response: any) => {
            if (cancelled) return
            if (response.status === 'ok') {
              setSubmitting(false)

              try {
                const paymentResult = await mpgsService.processPayment(
                  response.session.id,
                  planRef.current,
                )
                if (cancelled) return
                onSuccess(paymentResult)
              } catch (err: any) {
                if (cancelled) return
                onError(err.message || 'Failed to process payment')
              }
            } else {
              setSubmitting(false)
              onError(response?.error?.explanation || response?.errors?.message || 'Card processing failed')
            }
          },
        },
      })
    }

    if (typeof PaymentSession !== 'undefined') {
      configure()
    } else {
      const script = document.createElement('script')
      script.src = `${import.meta.env.VITE_MPGS_GATEWAY_URL || 'https://test-seylan.mtf.gateway.mastercard.com'}/form/version/100/merchant/${MPGS_MERCHANT_ID}/session.js`
      script.async = false
      script.onload = configure
      script.onerror = () => {
        if (cancelled) return
        console.error('MPGS: Failed to load session.js')
        onError('Failed to load payment form script')
      }
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      const scripts = document.querySelectorAll(`script[src*="${MPGS_MERCHANT_ID}/session.js"]`)
      scripts.forEach(s => s.remove())
      ;['mpgs-card-number', 'mpgs-card-expiry-month', 'mpgs-card-expiry-year', 'mpgs-card-cvv'].forEach((id) => {
        const el = document.getElementById(id)
        if (el) el.innerHTML = ''
      })
    }
  }, [])

  const handleSubmit = async () => {
    setSubmitting(true)
    PaymentSession.updateSessionFromForm('card')
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800/50 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <CreditCard size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Card Details
            </span>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Enter your card information securely
            </p>
          </div>
        </div>

        <div
          id="MerchantSessionId"
          data-merchant={MPGS_MERCHANT_ID}
          style={{ minHeight: '160px' }}
        >
          <div data-paymentmethod="card">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Card Number
            </label>
            <div
              id="mpgs-card-number"
              data-card="number"
              data-placeholder="1234 5678 9012 3456"
              readOnly
              style={{ ...fieldBase, marginBottom: '16px' }}
              {...{ placeholder: '1234 5678 9012 3456' } as any}
            />
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Expiry Date
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
              <div
                id="mpgs-card-expiry-month"
                data-card="expiryMonth"
                data-placeholder="MM"
                readOnly
                style={{ ...fieldBase, flex: 1 }}
                {...{ placeholder: 'MM' } as any}
              />
              <span className="text-lg text-slate-400 dark:text-slate-500 font-bold leading-none">/</span>
              <div
                id="mpgs-card-expiry-year"
                data-card="expiryYear"
                data-placeholder="YY"
                readOnly
                style={{ ...fieldBase, flex: 1 }}
                {...{ placeholder: 'YY' } as any}
              />
            </div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Security Code
            </label>
            <div
              id="mpgs-card-cvv"
              data-card="securityCode"
              data-placeholder="CVV"
              readOnly
              style={{ ...fieldBase, maxWidth: '140px' }}
              {...{ placeholder: 'CVV' } as any}
            />
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-4 mt-4">
            <Loader2 className="animate-spin text-amber-500" size={20} />
            <span className="ml-2 text-sm text-slate-500">Loading secure card fields...</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
        <Lock size={12} />
        <span>Secured by <strong>Mastercard Payment Gateway</strong></span>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 py-3 px-4 rounded-lg border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || loading}
          className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Processing...
            </>
          ) : (
            `Pay $${amount}`
          )}
        </button>
      </div>
    </div>
  )
}
