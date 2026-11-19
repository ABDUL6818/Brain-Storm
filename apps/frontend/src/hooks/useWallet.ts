'use client';

import { useCallback, useMemo } from 'react';
import { BrainStormClient } from '@brain-storm/sdk';

import { useWallet as useCoreWallet, type WalletContextValue } from '@/lib/wallet';
import { config } from '@/lib/config';

/**
 * Minimal typed surface for Stellar wallet operations.
 * All SDK calls are isolated behind this interface so they can be mocked in tests.
 */
export interface WalletAdapter {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getPublicKey: () => Promise<string | null>;
  signTransaction: (transactionXdr: string) => Promise<string>;
  submitTransaction: (transactionXdr: string) => Promise<{ hash: string }>;
  getBalance: (
    publicKey: string
  ) => Promise<{ balances: Array<{ asset_type: string; balance: string; asset_code?: string }> }>;
}

export interface WalletService {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getPublicKey: () => Promise<string | null>;
  signTransaction: (transactionXdr: string) => Promise<string>;
  submitTransaction: (transactionXdr: string) => Promise<{ hash: string }>;
  getBalance: (
    publicKey: string
  ) => Promise<{ balances: Array<{ asset_type: string; balance: string; asset_code?: string }> }>;
}

/**
 * Create a wallet service backed by the given adapter.
 * The service is a thin pass-through that keeps the SDK surface mockable.
 */
export function createWalletService(adapter: WalletAdapter): WalletService {
  return {
    connect: () => adapter.connect(),
    disconnect: () => adapter.disconnect(),
    getPublicKey: () => adapter.getPublicKey(),
    signTransaction: (transactionXdr: string) => adapter.signTransaction(transactionXdr),
    submitTransaction: (transactionXdr: string) => adapter.submitTransaction(transactionXdr),
    getBalance: (publicKey: string) => adapter.getBalance(publicKey),
  };
}

/**
 * Default adapter backed by @brain-storm/sdk.
 * The client is constructed lazily so the config module is the single source of truth.
 */
export function createSdkWalletAdapter(client?: BrainStormClient): WalletAdapter {
  const getClient = () => client ?? new BrainStormClient({ baseURL: config.apiUrl });

  return {
    async connect() {
      // Connection is handled by the core wallet provider; no-op here.
    },
    async disconnect() {
      // Disconnection is handled by the core wallet provider; no-op here.
    },
    async getPublicKey() {
      return null;
    },
    async signTransaction(transactionXdr: string) {
      return transactionXdr;
    },
    async submitTransaction(transactionXdr: string) {
      return getClient().stellar.submitTransaction(transactionXdr);
    },
    async getBalance(publicKey: string) {
      return getClient().stellar.getBalance(publicKey);
    },
  };
}

export interface ExtendedWalletValue extends WalletContextValue {
  /** SDK instance backed methods */
  fetchSdkStellarBalance: (
    publicKey: string
  ) => Promise<{ balances: Array<{ asset_type: string; balance: string; asset_code?: string }> }>;
  /** Isolated wallet service for SDK operations */
  walletService: WalletService;
}

export interface UseWalletOptions {
  /** Optional adapter override for tests */
  adapter?: WalletAdapter;
  /** Optional SDK client override for tests */
  client?: BrainStormClient;
}

/**
 * Unified useWallet hook providing Stellar wallet connection state,
 * network selection, signing, and balance operations backed by @brain-storm/sdk.
 */
export function useWallet(options: UseWalletOptions = {}): ExtendedWalletValue {
  const { adapter, client } = options;
  const coreWallet = useCoreWallet();

  const walletService = useMemo(
    () => createWalletService(adapter ?? createSdkWalletAdapter(client)),
    [adapter, client]
  );

  const fetchSdkStellarBalance = useCallback(
    async (publicKey: string) => {
      return walletService.getBalance(publicKey);
    },
    [walletService]
  );

  return useMemo(
    () => ({
      ...coreWallet,
      fetchSdkStellarBalance,
      walletService,
    }),
    [coreWallet, fetchSdkStellarBalance, walletService]
  );
}

export default useWallet;