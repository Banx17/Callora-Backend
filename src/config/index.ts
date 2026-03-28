import 'dotenv/config';
import { z } from 'zod';

export type StellarNetwork = 'testnet' | 'mainnet';

const mask = (value: string) => `${value.slice(0, 2)}****${value.slice(-2)}`;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgresql://postgres:postgres@localhost:5432/callora?schema=public'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters').optional(),
  METRICS_API_KEY: z.string().optional(),
  DB_POOL_MAX: z.coerce.number().default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  DB_CONN_TIMEOUT_MS: z.coerce.number().default(2000),
  UPSTREAM_URL: z.string().url().default('http://localhost:4000'),
  PROXY_TIMEOUT_MS: z.coerce.number().default(30000),
  STELLAR_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  SOROBAN_RPC_URL: z.string().url().optional(),
  HORIZON_URL: z.string().url().optional(),
  STELLAR_TESTNET_SOROBAN_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
  STELLAR_TESTNET_HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  STELLAR_TESTNET_NETWORK_PASSPHRASE: z.string().default('Test SDF Network ; September 2015'),
  STELLAR_TESTNET_VAULT_CONTRACT_ID: z.string().optional(),
  STELLAR_TESTNET_SETTLEMENT_CONTRACT_ID: z.string().optional(),
  STELLAR_MAINNET_SOROBAN_RPC_URL: z.string().url().default('https://mainnet.sorobanrpc.com'),
  STELLAR_MAINNET_HORIZON_URL: z.string().url().default('https://horizon.stellar.org'),
  STELLAR_MAINNET_NETWORK_PASSPHRASE: z.string().default('Public Global Stellar Network ; September 2015'),
  STELLAR_MAINNET_VAULT_CONTRACT_ID: z.string().optional(),
  STELLAR_MAINNET_SETTLEMENT_CONTRACT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

const testnetConfig = {
  sorobanRpcUrl: env.STELLAR_TESTNET_SOROBAN_RPC_URL,
  horizonUrl: env.STELLAR_TESTNET_HORIZON_URL,
  networkPassphrase: env.STELLAR_TESTNET_NETWORK_PASSPHRASE,
  vaultContractId: env.STELLAR_TESTNET_VAULT_CONTRACT_ID,
  settlementContractId: env.STELLAR_TESTNET_SETTLEMENT_CONTRACT_ID,
};

const mainnetConfig = {
  sorobanRpcUrl: env.STELLAR_MAINNET_SOROBAN_RPC_URL,
  horizonUrl: env.STELLAR_MAINNET_HORIZON_URL,
  networkPassphrase: env.STELLAR_MAINNET_NETWORK_PASSPHRASE,
  vaultContractId: env.STELLAR_MAINNET_VAULT_CONTRACT_ID,
  settlementContractId: env.STELLAR_MAINNET_SETTLEMENT_CONTRACT_ID,
};

const activeNetwork = env.STELLAR_NETWORK;
const activeConfig = activeNetwork === 'mainnet' ? mainnetConfig : testnetConfig;

if (env.NODE_ENV === 'production') {
  if (!env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is required in production');
    process.exit(1);
  }

  if (!activeConfig.sorobanRpcUrl) {
    console.error('❌ SOROBAN RPC URL is required in production');
    process.exit(1);
  }

  if (!activeConfig.horizonUrl) {
    console.error('❌ HORIZON URL is required in production');
    process.exit(1);
  }
}

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  dbPool: {
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DB_CONN_TIMEOUT_MS,
  },
  jwt: {
    secret: env.JWT_SECRET ?? 'dev-secret-change-me',
  },
  metrics: {
    apiKey: env.METRICS_API_KEY,
  },
  proxy: {
    upstreamUrl: env.UPSTREAM_URL,
    timeoutMs: env.PROXY_TIMEOUT_MS,
  },
  stellar: {
    network: activeNetwork,
    sorobanRpcUrl: env.SOROBAN_RPC_URL ?? activeConfig.sorobanRpcUrl,
    horizonUrl: env.HORIZON_URL ?? activeConfig.horizonUrl,
    networkPassphrase: activeConfig.networkPassphrase,
    vaultContractId: activeConfig.vaultContractId,
    settlementContractId: activeConfig.settlementContractId,
    networks: {
      testnet: testnetConfig,
      mainnet: mainnetConfig,
    },
  },
};

if (env.NODE_ENV !== 'test') {
  console.log('✅ Config loaded:');
  console.log({
    nodeEnv: config.nodeEnv,
    port: config.port,
    databaseUrl: config.databaseUrl,
    jwtSecret: config.jwt.secret ? mask(config.jwt.secret) : undefined,
    metricsEnabled: Boolean(config.metrics.apiKey),
    stellarNetwork: config.stellar.network,
  });
}
