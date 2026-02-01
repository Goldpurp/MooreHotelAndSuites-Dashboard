/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // add any other env variables you use
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
