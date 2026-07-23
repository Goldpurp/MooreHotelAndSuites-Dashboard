import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

type AppEnvironment = 'local' | 'development' | 'production';
type ApiMode = 'proxy' | 'direct';

const expectedProfileByMode: Record<string, { environment: AppEnvironment; apiMode: ApiMode }> = {
  localhost: { environment: 'local', apiMode: 'proxy' },
  development: { environment: 'development', apiMode: 'proxy' },
  cloud: { environment: 'development', apiMode: 'direct' },
  production: { environment: 'production', apiMode: 'direct' },
};

function parseHttpUrl(value: string, label: string): URL {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url;
  } catch {
    throw new Error(`${label} must be a valid HTTP or HTTPS URL.`);
  }
}

function parsePort(value: string | undefined, fallback: number, label: string): number {
  const port = Number(value || fallback);
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error(`${label} must be an integer between 1024 and 65535.`);
  }
  return port;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const expected = expectedProfileByMode[mode];
  const appEnvironment = env.VITE_APP_ENV?.trim() as AppEnvironment | undefined;
  const apiMode = env.VITE_API_MODE?.trim() as ApiMode | undefined;
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim();
  const apiProxyTarget = env.API_PROXY_TARGET?.trim();

  if (!expected) throw new Error(`Unsupported Vite environment mode '${mode}'.`);
  if (appEnvironment !== expected.environment || apiMode !== expected.apiMode) {
    throw new Error(
      `Mode '${mode}' requires VITE_APP_ENV=${expected.environment} and VITE_API_MODE=${expected.apiMode}.`,
    );
  }
  if (!apiBaseUrl) throw new Error(`VITE_API_BASE_URL is required for ${mode}.`);

  const isRelativeApi = apiBaseUrl.startsWith('/');
  if (apiMode === 'proxy') {
    if (!isRelativeApi || !apiProxyTarget) {
      throw new Error(`${mode} requires a same-origin API path and API_PROXY_TARGET.`);
    }
    const target = parseHttpUrl(apiProxyTarget, 'API_PROXY_TARGET');
    if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(target.hostname)) {
      throw new Error(`${mode} uses a workstation proxy and must target a loopback API.`);
    }
  } else {
    if (isRelativeApi || apiProxyTarget) {
      throw new Error(`${mode} must call an absolute API URL without API_PROXY_TARGET.`);
    }
    const directApi = parseHttpUrl(apiBaseUrl, 'VITE_API_BASE_URL');
    if (
      directApi.protocol !== 'https:' ||
      ['localhost', '127.0.0.1', '::1', '[::1]'].includes(directApi.hostname)
    ) {
      throw new Error(`${mode} requires a non-local HTTPS API URL.`);
    }
    if (mode === 'cloud' && directApi.hostname === 'api.moorehotelandsuites.com') {
      throw new Error('The shared Development cloud profile cannot target the Production API.');
    }
  }

  const proxy: Record<string, string | ProxyOptions> | undefined =
    apiMode === 'proxy' && apiProxyTarget
      ? {
          '/api': {
            target: apiProxyTarget,
            changeOrigin: true,
            secure: new URL(apiProxyTarget).protocol === 'https:',
          },
        }
      : undefined;

  return {
    plugins: [react({ jsxRuntime: 'automatic' }), tailwindcss()],
    resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client', 'lucide-react', 'recharts'],
    },
    server: {
      port: parsePort(env.VITE_DEV_PORT, 3000, 'VITE_DEV_PORT'),
      host: '127.0.0.1',
      strictPort: true,
      proxy,
    },
    preview: {
      port: parsePort(env.VITE_PREVIEW_PORT, 4173, 'VITE_PREVIEW_PORT'),
      host: '127.0.0.1',
      strictPort: true,
      proxy,
    },
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssCodeSplit: true,
      sourcemap: false,
    },
  };
});
