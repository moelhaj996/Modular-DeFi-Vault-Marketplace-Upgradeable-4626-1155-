import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { mainnet, goerli, sepolia, hardhat } from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';

// Configure chains based on environment
const getChains = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1337');

  if (isDevelopment || chainId === 1337) {
    return [hardhat, goerli, sepolia];
  }

  return [mainnet, goerli, sepolia];
};

const chains = getChains();

// Configure providers
const providers = [
  // Alchemy provider (if API key is available)
  ...(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
    ? [alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY })]
    : []),

  // Custom RPC provider for local development
  ...(process.env.NEXT_PUBLIC_RPC_URL
    ? [
        jsonRpcProvider({
          rpc: (chain) => ({
            http: process.env.NEXT_PUBLIC_RPC_URL!,
          }),
        }),
      ]
    : []),

  // Fallback to public provider
  publicProvider(),
];

const { publicClient, webSocketPublicClient } = configureChains(chains, providers);

// Configure wallets
const { connectors } = getDefaultWallets({
  appName: 'DeFi Vault Marketplace',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'default-project-id',
  chains,
});

// Create wagmi config
export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export { chains };

// Contract addresses configuration
export const contractAddresses = {
  vaultFactory: process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS || '',
  // Add other contract addresses as needed
} as const;

// Chain-specific configurations
export const chainConfig = {
  1: {
    name: 'Ethereum Mainnet',
    blockExplorer: 'https://etherscan.io',
    rpcUrl: 'https://mainnet.infura.io/v3/',
  },
  5: {
    name: 'Goerli Testnet',
    blockExplorer: 'https://goerli.etherscan.io',
    rpcUrl: 'https://goerli.infura.io/v3/',
  },
  11155111: {
    name: 'Sepolia Testnet',
    blockExplorer: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://sepolia.infura.io/v3/',
  },
  1337: {
    name: 'Hardhat Local',
    blockExplorer: 'http://localhost:8545',
    rpcUrl: 'http://localhost:8545',
  },
} as const;

export type SupportedChainId = keyof typeof chainConfig;