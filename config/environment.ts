export type AppEnvironment = 'local' | 'development' | 'production';
export type ApiMode = 'proxy' | 'direct';

const knownEnvironments = new Set<AppEnvironment>(['local', 'development', 'production']);

function resolveEnvironment(): AppEnvironment {
  const configured = import.meta.env.VITE_APP_ENV?.trim().toLowerCase();
  if (configured && knownEnvironments.has(configured as AppEnvironment)) {
    return configured as AppEnvironment;
  }
  throw new Error('VITE_APP_ENV must be local, development, or production.');
}

function resolveApiMode(): ApiMode {
  const configured = import.meta.env.VITE_API_MODE?.trim().toLowerCase();
  if (configured === 'proxy' || configured === 'direct') return configured;
  throw new Error("VITE_API_MODE must be either 'proxy' or 'direct'.");
}

function isLoopback(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname.toLowerCase());
}

function resolveApiBaseUrl(environment: AppEnvironment, apiMode: ApiMode): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configured) throw new Error('VITE_API_BASE_URL is required.');

  if (configured.startsWith('/')) {
    if (apiMode !== 'proxy') {
      throw new Error('A root-relative VITE_API_BASE_URL requires VITE_API_MODE=proxy.');
    }
    return configured.replace(/\/+$/, '');
  }

  if (apiMode !== 'direct') {
    throw new Error('An absolute VITE_API_BASE_URL requires VITE_API_MODE=direct.');
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute URL or a root-relative path.');
  }

  if (environment === 'production' && (url.protocol !== 'https:' || isLoopback(url.hostname))) {
    throw new Error('Production must use a non-local HTTPS API URL.');
  }
  if (environment === 'development' && url.hostname === 'api.moorehotelandsuites.com') {
    throw new Error('Development cannot target the Production Moore Hotels API.');
  }
  if (environment === 'local' && !isLoopback(url.hostname)) {
    throw new Error('Local can only target a localhost or loopback API.');
  }

  return url.toString().replace(/\/+$/, '');
}

function resolveRequestTimeout(): number {
  const value = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15_000);
  return Number.isFinite(value) ? Math.min(60_000, Math.max(3_000, value)) : 15_000;
}

const environment = resolveEnvironment();
const apiMode = resolveApiMode();

export const appConfig = Object.freeze({
  environment,
  apiMode,
  apiBaseUrl: resolveApiBaseUrl(environment, apiMode),
  requestTimeoutMs: resolveRequestTimeout(),
  isLocal: environment === 'local',
  isProduction: environment === 'production',
});
