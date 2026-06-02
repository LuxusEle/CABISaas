import { supabase } from './supabaseClient'

export interface MpgsPaymentResult {
  success: boolean
  transactionId?: string
  orderId?: string
  cardToken?: string
  gatewayCode?: string
}

export interface MpgsInitiateCheckoutResult {
  sessionId: string
  orderId: string
  successIndicator: string
  version: string
}

export const mpgsService = {
  async initiateCheckout(planId: string, amount: number, returnUrl: string): Promise<MpgsInitiateCheckoutResult> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('User not logged in')

    const orderId = `ord_${Date.now()}_${userData.user.id.substring(0, 8)}`

    const { data, error } = await supabase.functions.invoke('mpgs-payment', {
      body: {
        action: 'initiate_checkout',
        orderId,
        amount,
        currency: 'USD',
        returnUrl,
      },
    })

    if (error || !data?.success) {
      throw new Error(error?.message || data?.error || 'Failed to initiate checkout')
    }

    return {
      sessionId: data.sessionId,
      orderId: data.orderId,
      successIndicator: data.successIndicator,
      version: data.version,
    }
  },

  async completeCheckout(sessionId: string, orderId: string, planId: string): Promise<MpgsPaymentResult> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('User not logged in')

    const { data, error } = await supabase.functions.invoke('mpgs-payment', {
      body: {
        action: 'complete_checkout',
        sessionId,
        orderId,
        userId: userData.user.id,
        planId,
      },
    })

    if (error) {
      const detail = data?.error || data?.details?.error?.explanation || ''
      throw new Error(detail || error.message || 'Failed to complete checkout')
    }

    return data as MpgsPaymentResult
  },
}
