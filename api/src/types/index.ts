export interface VaultInfo {
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

export interface StrategyInfo {
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
  user: string;
  vault: string;
  shares: string;
  assets: string;
  depositedAt: Date;
  lastActivity: Date;
}

export interface RewardInfo {
  tokenId: string;
  rewardType: 'BADGE' | 'BOOSTER' | 'ACHIEVEMENT' | 'LOYALTY';
  name: string;
  description: string;
  multiplier: number;
  duration: number;
  maxSupply: string;
  currentSupply: string;
  transferable: boolean;
  active: boolean;
}

export interface UserReward {
  user: string;
  tokenId: string;
  balance: string;
  claimedAt: Date;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  active?: boolean;
  minTvl?: string;
  maxTvl?: string;
  creator?: string;
  asset?: string;
}

export interface TransactionEvent {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'HARVEST' | 'REWARD_CLAIM';
  vault: string;
  user: string;
  amount: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  gasUsed: string;
  gasPrice: string;
}