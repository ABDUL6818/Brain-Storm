import { WalletError, type WalletAdapter, type WalletConnection } from '../types';

/**
 * Placeholder entry so WalletConnect is discoverable in the picker while the
 * QR-relay integration is still pending. `enabled: false` keeps the UI from
 * offering it as a working option.
 */
export const walletConnectAdapter: WalletAdapter = {
  id: 'walletconnect',
  name: 'WalletConnect',
  description: 'Connect mobile wallets via QR code',
  installUrl: 'https://walletconnect.com/',
  helpUrl: 'https://docs.walletconnect.com/',
  enabled: false,

  isInstalled: () => false,

  async connect(): Promise<WalletConnection> {
    throw new WalletError(
      'UNSUPPORTED_WALLET',
      'WalletConnect is not available yet.',
      'walletconnect'
    );
  },

  async sign(): Promise<string> {
    throw new WalletError(
      'UNSUPPORTED_WALLET',
      'WalletConnect is not available yet.',
      'walletconnect'
    );
  },
};

/**
 * Display state derived from a WalletConnect adapter connection result.
 */
export interface WalletConnectDisplayState {
  /** Shortened account address (e.g. `0x1234…abcd`), or `null` when disconnected. */
  shortAddress: string | null;
  /** Full account address, or `null` when disconnected. */
  address: string | null;
  /** Human-readable connection status. */
  status: WalletConnectStatus;
  /** Human-readable error message, or `null` when there is no error. */
  errorMessage: string | null;
}

export type WalletConnectStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

const DEFAULT_PREFIX_LENGTH = 6;
const DEFAULT_SUFFIX_LENGTH = 4;

/**
 * Shorten a wallet address for display. Returns `null` for empty input and
 * leaves already-short values untouched.
 */
export function shortenAddress(
  address: string | null | undefined,
  prefixLength: number = DEFAULT_PREFIX_LENGTH,
  suffixLength: number = DEFAULT_SUFFIX_LENGTH
): string | null {
  if (!address) {
    return null;
  }

  const trimmed = address.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const minLength = prefixLength + suffixLength + 1;
  if (trimmed.length <= minLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, prefixLength)}…${trimmed.slice(-suffixLength)}`;
}

/**
 * Map a connection result (or lack thereof) to a display status string.
 */
export function getConnectionStatus(
  connection: WalletConnection | null | undefined,
  isConnecting = false
): WalletConnectStatus {
  if (isConnecting) {
    return 'connecting';
  }
  if (connection) {
    return 'connected';
  }
  return 'disconnected';
}

/**
 * Normalize an unknown error into a user-facing message.
 */
export function getErrorMessage(error: unknown): string | null {
  if (error == null) {
    return null;
  }

  if (error instanceof WalletError) {
    return error.message || 'WalletConnect encountered an error.';
  }

  if (error instanceof Error) {
    return error.message || 'WalletConnect encountered an error.';
  }

  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : 'WalletConnect encountered an error.';
  }

  return 'WalletConnect encountered an error.';
}

/**
 * Build the full display state from a connection result and optional error.
 */
export function toDisplayState(
  connection: WalletConnection | null | undefined,
  options: { isConnecting?: boolean; error?: unknown } = {}
): WalletConnectDisplayState {
  const { isConnecting = false, error = null } = options;
  const errorMessage = getErrorMessage(error);
  const address = connection?.account ?? null;

  let status: WalletConnectStatus;
  if (errorMessage) {
    status = 'error';
  } else {
    status = getConnectionStatus(connection, isConnecting);
  }

  return {
    shortAddress: shortenAddress(address),
    address,
    status,
    errorMessage,
  };
}