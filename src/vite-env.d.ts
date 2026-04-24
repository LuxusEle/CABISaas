/// <reference types="vite/client" />
import { ThreeElements } from '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

interface ImportMetaEnv {
  readonly VITE_PADDLE_CLIENT_TOKEN: string
  readonly VITE_PADDLE_PRO_PRICE_ID: string
  readonly VITE_PADDLE_ENV: 'sandbox' | 'production'
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
