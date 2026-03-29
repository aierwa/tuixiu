/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_TENCENT_ASR_APP_ID: string;
  readonly VITE_TENCENT_ASR_SECRET_ID: string;
  readonly VITE_TENCENT_ASR_SECRET_KEY: string;
  readonly VITE_ZHIPU_API_KEY: string;
  readonly VITE_ZHIPU_MODEL: string;
}

declare module '*.svg';