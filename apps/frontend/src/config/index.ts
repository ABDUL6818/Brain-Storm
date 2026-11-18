/**
 * Centralized application configuration.
 *
 * This is the ONLY module in the frontend that reads `process.env`.
 * Components, hooks and utilities must import values from here instead of
 * accessing `process.env` directly. This keeps environment handling in one
 * place, makes values typed and validated, and allows tests to override the
 * configuration without mutating the global environment.
 */

export type StellarNetwork = 'testnet' | 'mainnet' | 'futurenet' | 'standalone';

export interface AppConfig {
  /** Base URL of the backend API. */
  apiUrl: string;
  /** Stellar network the app is configured to talk to. */
  stellarNetwork: StellarNetwork;
  /** Sentry DSN, or `null` when error reporting is disabled. */
  sentryDsn: string | null;
  /** Git commit SHA of the running build, or `null` when unknown. */
  gitCommitSha: string | null;
  /** Current Node environment. */
  nodeEnv: 'development' | 'test' | 'production';
  /** Whether the app is running in production. */
  isProduction: boolean;
  /** Whether the app is running in development. */
  isDevelopment: boolean;
  /** Whether the app is running under test. */
  isTest: boolean;
}

export interface FeatureFlags {
  /** Enable Sentry error reporting (requires a DSN). */
  sentry: boolean;
  /** Enable wallet connectivity features. */
  wallet: boolean;
  /** Enable verbose debug logging. */
  debugLogging: boolean;
}

const DEFAULT_API_URL = 'http://localhost:3001';
const VALID_NETWORKS: readonly StellarNetwork[] = [
  'testnet',
  'mainnet',
  'futurenet',
  'standalone',
];
const VALID_NODE_ENVS = ['development', 'test', 'production'] as const;

type NodeEnv = (typeof VALID_NODE_ENVS)[number];

function readEnv(key: string): string | undefined {
  // Access process.env defensively so this module also works in environments
  // where `process` is not defined (e.g. some bundler edge cases).
  if (typeof process === 'undefined' || !process.env) {
    return undefined;
  }
  const value = process.env[key];
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseNodeEnv(raw: string | undefined): NodeEnv {
  if (raw && (VALID_NODE_ENVS as readonly string[]).includes(raw)) {
    return raw as NodeEnv;
  }
  return 'development';
}

function parseStellarNetwork(raw: string | undefined): StellarNetwork {
  if (raw && (VALID_NETWORKS as readonly string[]).includes(raw)) {
    return raw as StellarNetwork;
  }
  if (raw) {
    // Surface misconfiguration without crashing the app.
    // eslint-disable-next-line no-console
    console.warn(
      `[config] Invalid NEXT_PUBLIC_STELLAR_NETWORK "${raw}". ` +
        `Falling back to "testnet". Valid values: ${VALID_NETWORKS.join(', ')}.`,
    );
  }
  return 'testnet';
}

function parseApiUrl(raw: string | undefined): string {
  if (!raw) {
    return DEFAULT_API_URL;
  }
  try {
    // Validate that the URL is well-formed.
    // eslint-disable-next-line no-new
    new URL(raw);
    return raw;
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      `[config] Invalid NEXT_PUBLIC_API_URL "${raw}". ` +
        `Falling back to "${DEFAULT_API_URL}".`,
    );
    return DEFAULT_API_URL;
  }
}

function buildConfig(): AppConfig {
  const nodeEnv = parseNodeEnv(readEnv('NODE_ENV'));
  const apiUrl = parseApiUrl(readEnv('NEXT_PUBLIC_API_URL'));
  const stellarNetwork = parseStellarNetwork(
    readEnv('NEXT_PUBLIC_STELLAR_NETWORK'),
  );
  const sentryDsn = readEnv('NEXT_PUBLIC_SENTRY_DSN') ?? null;
  const gitCommitSha = readEnv('NEXT_PUBLIC_GIT_COMMIT_SHA') ?? null;

  return {
    apiUrl,
    stellarNetwork,
    sentryDsn,
    gitCommitSha,
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
  };
}

function buildFeatureFlags(config: AppConfig): FeatureFlags {
  return {
    sentry: config.sentryDsn !== null,
    wallet: true,
    debugLogging: !config.isProduction,
  };
}

let currentConfig: AppConfig = buildConfig();
let currentFeatureFlags: FeatureFlags = buildFeatureFlags(currentConfig);

/**
 * Returns the current application configuration.
 *
 * The returned object is frozen; use {@link overrideConfig} in tests to
 * replace it.
 */
export function getConfig(): AppConfig {
  return currentConfig;
}

/**
 * Returns the current feature flags.
 */
export function getFeatureFlags(): FeatureFlags {
  return currentFeatureFlags;
}

/**
 * Test-friendly override. Replaces the active configuration and feature
 * flags. Passing `null` resets the configuration by re-reading the
 * environment.
 *
 * Intended for use in tests only.
 */
export function overrideConfig(
  overrides: Partial<AppConfig> | null,
): AppConfig {
  if (overrides === null) {
    currentConfig = buildConfig();
  } else {
    currentConfig = Object.freeze({ ...currentConfig, ...overrides });
  }
  currentFeatureFlags = buildFeatureFlags(currentConfig);
  return currentConfig;
}

/**
 * Test-friendly override for feature flags only.
 */
export function overrideFeatureFlags(
  overrides: Partial<FeatureFlags> | null,
): FeatureFlags {
  if (overrides === null) {
    currentFeatureFlags = buildFeatureFlags(currentConfig);
  } else {
    currentFeatureFlags = Object.freeze({
      ...currentFeatureFlags,
      ...overrides,
    });
  }
  return currentFeatureFlags;
}

/**
 * Resets configuration to the values read from the environment.
 * Intended for use in tests.
 */
export function resetConfig(): AppConfig {
  return overrideConfig(null);
}

// Freeze the initial objects so accidental mutation is caught early.
currentConfig = Object.freeze(currentConfig);
currentFeatureFlags = Object.freeze(currentFeatureFlags);

/**
 * The active application configuration.
 *
 * Prefer importing this constant for read access. In tests, use
 * {@link overrideConfig} / {@link resetConfig} to control values.
 */
export const config: AppConfig = currentConfig;

/**
 * The active feature flags.
 */
export const featureFlags: FeatureFlags = currentFeatureFlags;

export default config;