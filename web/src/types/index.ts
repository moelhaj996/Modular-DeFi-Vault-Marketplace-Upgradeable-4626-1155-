export interface VaultData {
  address: string;
  name: string;
  symbol: string;
  asset: string;
  totalAssets: string;
  totalSupply: string;
  sharePrice: string;
  apy: number;
  creator: string;
  createdAt: Date;
  active: boolean;
}

export interface StrategyData {
  address: string;
  name: string;
  symbol: string;
  allocation: number;
  totalAssets: string;
  active: boolean;
  apy: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface UserPosition {
  vault: string;
  shares: string;
  assets: string;
  depositedAt: Date;
  lastActivity: Date;
}

export interface RewardData {
  tokenId: string;
  rewardType: 'BADGE' | 'BOOSTER' | 'ACHIEVEMENT' | 'LOYALTY';
  name: string;
  description: string;
  multiplier: number;
  duration: number;
  transferable: boolean;
  balance: string;
  claimedAt?: Date;
  expiresAt?: Date;
}

export interface VaultMetrics {
  vault: string;
  tvl: string;
  volume24h: string;
  apy7d: number;
  apy30d: number;
  sharePriceHistory: Array<{
    timestamp: Date;
    price: string;
  }>;
  userCount: number;
  transactionCount: number;
}

export interface TransactionData {
  hash: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'HARVEST' | 'REWARD_CLAIM';
  vault: string;
  amount: string;
  timestamp: Date;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  connector: any;
}

export interface ContractAddresses {
  vaultFactory: string;
  [key: string]: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FilterOptions {
  active?: boolean;
  minTvl?: string;
  maxTvl?: string;
  creator?: string;
  asset?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}