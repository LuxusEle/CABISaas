import { supabase } from './supabaseClient'

export interface MpgsPaymentResult {
  success: boolean
  transactionId?: string
  orderId?: string
  cardToken?: string
}

export const mpgsService = {
  async processPayment(sessionId: string, planId: string): Promise<MpgsPaymentResult> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('User not logged in')

    const { data, error } = await supabase.functions.invoke('mpgs-payment', {
      body: {
        action: 'process_payment',
        userId: userData.user.id,
        planId,
        sessionId,
      },
    })

    if (error) {
      console.error('MPGS process payment error:', error)
      throw new Error(error.message || 'Failed to process payment')
    }

    return data as MpgsPaymentResult
  },
}
