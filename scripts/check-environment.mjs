import { readFile } from 'node:fs/promises';
import path from 'node:path';

const profile = process.argv[2];
const configOnly = process.argv.includes('--config-only');
const definitions = {
  local: { file: '.env.localhost', environment: 'local', apiMode: 'proxy', apiEnvironment: 'local' },
  development: { file: '.env.development', environment: 'development', apiMode: 'proxy', apiEnvironment: 'development' },
  cloud: { file: '.env.cloud', environment: 'development', apiMode: 'direct', apiEnvironment: 'development' },
  production: { file: '.env.production', environment: 'production', apiMode: 'direct', apiEnvironment: 'production' },
};

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }));
}

function isLoopback(hostname) {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
}

if (!Object.hasOwn(definitions, profile)) {
  console.error('Usage: node scripts/check-environment.mjs <local|development|cloud|production> [--config-only]');
  process.exitCode = 2;
} else {
  const definition = definitions[profile];
  let values;
  try {
    values = parseEnv(await readFile(path.resolve(definition.file), 'utf8'));
  } catch {
    console.error(profile === 'cloud'
      ? 'Missing .env.cloud. Copy .env.cloud.example and set the shared Development HTTPS API URL.'
      : `Missing ${definition.file}.`);
    process.exitCode = 1;
  }

  if (values) {
    const errors = [];
    if (values.VITE_APP_ENV !== definition.environment) errors.push(`VITE_APP_ENV must be ${definition.environment}`);
    if (values.VITE_API_MODE !== definition.apiMode) errors.push(`VITE_API_MODE must be ${definition.apiMode}`);

    const baseUrl = values.VITE_API_BASE_URL || '';
    const proxyTarget = values.API_PROXY_TARGET || '';
    let healthUrl;
    if (definition.apiMode === 'proxy') {
      if (!baseUrl.startsWith('/') || !proxyTarget) {
        errors.push('proxy profiles require a root-relative API base and API_PROXY_TARGET');
      } else {
        try {
          const target = new URL(proxyTarget);
          if (!isLoopback(target.hostname)) errors.push(`${profile} API target must be loopback-only`);
          healthUrl = `${target.toString().replace(/\/$/, '')}/api/health`;
        } catch {
          errors.push('API_PROXY_TARGET is not a valid URL');
        }
      }
    } else {
      try {
        const target = new URL(baseUrl);
        if (target.protocol !== 'https:' || isLoopback(target.hostname)) errors.push('direct API URLs must use non-local HTTPS');
        if (profile === 'cloud' && target.hostname === 'api.moorehotelandsuites.com') errors.push('cloud Development cannot target the Production API');
        if (proxyTarget) errors.push('direct profiles cannot define API_PROXY_TARGET');
        healthUrl = `${target.toString().replace(/\/$/, '')}/health`;
      } catch {
        errors.push('VITE_API_BASE_URL is not a valid absolute URL');
      }
    }

    if (errors.length) {
      console.error(`${profile} configuration is invalid: ${errors.join('; ')}.`);
      process.exitCode = 1;
    } else if (configOnly) {
      console.log(`${profile} environment configuration is valid.`);
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Number(values.VITE_API_TIMEOUT_MS || 15_000));
      try {
        const response = await fetch(healthUrl, {
          headers: { Accept: 'application/json', 'X-Moore-App-Environment': definition.apiEnvironment },
          signal: controller.signal,
          redirect: 'error',
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || String(payload?.status).toLowerCase() !== 'healthy') throw new Error(`health endpoint returned HTTP ${response.status}`);
        if (String(payload?.database).toLowerCase() !== 'connected') throw new Error(`database is ${payload?.database || 'unknown'}`);
        const responseEnvironment = response.headers.get('X-Moore-API-Environment') || payload?.environment;
        if (String(responseEnvironment).toLowerCase() !== definition.apiEnvironment) throw new Error(`expected ${definition.apiEnvironment} but reached ${responseEnvironment}`);
        console.log(`${profile} dashboard can reach a healthy ${definition.apiEnvironment} API.`);
      } catch (error) {
        const reason = error?.name === 'AbortError' ? 'request timed out' : error?.message;
        console.error(`${profile} API check failed at ${healthUrl}: ${reason}`);
        process.exitCode = 1;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }
}
