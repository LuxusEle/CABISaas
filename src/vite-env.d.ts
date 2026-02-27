/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYPAL_CLIENT_ID: string
  readonly VITE_PAYPAL_CLIENT_SECRET: string
  readonly VITE_PAYPAL_WEBHOOK_ID: string
  readonly VITE_PAYPAL_PLAN_ID: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
