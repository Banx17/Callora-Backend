import { Networks } from '@stellar/stellar-sdk';

export type StellarNetwork = 'testnet' | 'mainnet';

export interface StellarNetworkConfig {
  network: StellarNetwork;
  networkPassphrase: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  vaultContractId?: string;
  settlementContractId?: string;
}

function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeNetwork(value?: string): StellarNetwork | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'testnet' || normalized === 'mainnet') {
    return normalized;
  }

  return undefined;
}

function getConfiguredNetwork(): StellarNetwork {
  const rawNetwork = readEnv('STELLAR_NETWORK') ?? readEnv('SOROBAN_NETWORK');
  if (!rawNetwork) {
    return 'testnet';
  }

  const network = normalizeNetwork(rawNetwork);
  if (!network) {
    throw new Error('STELLAR_NETWORK (or SOROBAN_NETWORK) must be either "testnet" or "mainnet"');
  }

  return network;
}

function readPerNetworkContractId(
  network: StellarNetwork,
  contractType: 'VAULT' | 'SETTLEMENT'
): string | undefined {
  const prefix = network === 'testnet' ? 'TESTNET' : 'MAINNET';

  return (
    readEnv(`STELLAR_${prefix}_${contractType}_CONTRACT_ID`) ??
    readEnv(`SOROBAN_${prefix}_${contractType}_CONTRACT_ID`)
  );
}

function getNetworkConfig(network: StellarNetwork): StellarNetworkConfig {
  const prefix = network === 'testnet' ? 'TESTNET' : 'MAINNET';

  const defaultHorizonUrl =
    network === 'testnet'
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org';
  const defaultSorobanRpcUrl =
    network === 'testnet'
      ? 'https://soroban-testnet.stellar.org'
      : 'https://soroban-mainnet.stellar.org';

  return {
    network,
    networkPassphrase: network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
    horizonUrl: readEnv(`STELLAR_${prefix}_HORIZON_URL`) ?? defaultHorizonUrl,
    sorobanRpcUrl: readEnv(`SOROBAN_${prefix}_RPC_URL`) ?? defaultSorobanRpcUrl,
    vaultContractId: readPerNetworkContractId(network, 'VAULT'),
    settlementContractId: readPerNetworkContractId(network, 'SETTLEMENT'),
  };
}

const configuredNetwork = getConfiguredNetwork();
const testnetConfig = getNetworkConfig('testnet');
const mainnetConfig = getNetworkConfig('mainnet');
const activeConfig = configuredNetwork === 'testnet' ? testnetConfig : mainnetConfig;

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  /**
   * Primary PostgreSQL connection string used by the shared pg.Pool.
   * Example (matches docker-compose): postgresql://postgres:postgres@postgres:5432/callora?schema=public
   */
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/callora?schema=public',
  /**
   * Connection pool tuning. These can be overridden via environment variables
   * but have sensible defaults for local development.
   */
  dbPool: {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30_000),
    connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS ?? 2_000),
  },
  stellar: {
    ...activeConfig,
    networks: {
      testnet: testnetConfig,
      mainnet: mainnetConfig,
    },
  },
};
