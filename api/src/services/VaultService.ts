import { ethers } from 'ethers';
import { BlockchainService } from '../config/blockchain';
import { logger } from '../config/logger';
import { VaultInfo, StrategyInfo, VaultMetrics } from '../types';

// Import contract ABIs (these would come from your compiled contracts)
const VAULT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function asset() view returns (address)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function getAllStrategies() view returns (address[])",
  "function getStrategy(address strategy) view returns (tuple(address strategy, uint256 allocation, uint256 totalAssets, bool active))",
  "function performanceFee() view returns (uint256)",
  "function managementFee() view returns (uint256)",
  "function feeRecipient() view returns (address)",
  "function paused() view returns (bool)"
];

const VAULT_FACTORY_ABI = [
  "function getAllVaults() view returns (address[])",
  "function getVaultInfo(address vault) view returns (tuple(address vault, address asset, address rewards, address creator, uint256 createdAt, bool active))",
  "function totalVaults() view returns (uint256)"
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

export class VaultService {
  private blockchain: BlockchainService;
  private vaultFactoryContract: ethers.Contract | null = null;

  constructor() {
    this.blockchain = BlockchainService.getInstance();
  }

  public async initialize(): Promise<void> {
    try {
      const config = this.blockchain.getConfig();
      if (!config.contracts.vaultFactory) {
        throw new Error('Vault Factory address not configured');
      }

      this.vaultFactoryContract = this.blockchain.getContract(
        config.contracts.vaultFactory,
        VAULT_FACTORY_ABI
      );

      logger.info('VaultService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize VaultService:', error);
      throw error;
    }
  }

  public async getAllVaults(): Promise<VaultInfo[]> {
    try {
      if (!this.vaultFactoryContract) {
        throw new Error('VaultService not initialized');
      }

      const vaultAddresses: string[] = await this.vaultFactoryContract.getAllVaults();
      const vaults: VaultInfo[] = [];

      for (const address of vaultAddresses) {
        try {
          const vaultInfo = await this.getVaultInfo(address);
          vaults.push(vaultInfo);
        } catch (error) {
          logger.warn(`Failed to get info for vault ${address}:`, error);
        }
      }

      return vaults;
    } catch (error) {
      logger.error('Failed to get all vaults:', error);
      throw error;
    }
  }

  public async getVaultInfo(vaultAddress: string): Promise<VaultInfo> {
    try {
      if (!this.vaultFactoryContract) {
        throw new Error('VaultService not initialized');
      }

      const [factoryInfo, vaultContract] = await Promise.all([
        this.vaultFactoryContract.getVaultInfo(vaultAddress),
        this.blockchain.getContract(vaultAddress, VAULT_ABI)
      ]);

      const [name, symbol, asset, totalAssets, totalSupply] = await Promise.all([
        vaultContract.name(),
        vaultContract.symbol(),
        vaultContract.asset(),
        vaultContract.totalAssets(),
        vaultContract.totalSupply()
      ]);

      // Calculate share price (1 share = ? assets)
      const sharePrice = totalSupply > 0n
        ? await vaultContract.convertToAssets(ethers.parseEther("1"))
        : ethers.parseEther("1");

      // Calculate APY (placeholder - would need historical data)
      const apy = await this.calculateAPY(vaultAddress);

      return {
        address: vaultAddress,
        name,
        symbol,
        asset,
        totalAssets: totalAssets.toString(),
        totalSupply: totalSupply.toString(),
        sharePrice: ethers.formatEther(sharePrice),
        apy,
        creator: factoryInfo.creator,
        createdAt: new Date(Number(factoryInfo.createdAt) * 1000),
        active: factoryInfo.active
      };
    } catch (error) {
      logger.error(`Failed to get vault info for ${vaultAddress}:`, error);
      throw error;
    }
  }

  public async getVaultStrategies(vaultAddress: string): Promise<StrategyInfo[]> {
    try {
      const vaultContract = this.blockchain.getContract(vaultAddress, VAULT_ABI);
      const strategyAddresses: string[] = await vaultContract.getAllStrategies();
      const strategies: StrategyInfo[] = [];

      for (const strategyAddress of strategyAddresses) {
        try {
          const strategyInfo = await vaultContract.getStrategy(strategyAddress);
          const strategyContract = this.blockchain.getContract(strategyAddress, VAULT_ABI);

          const [name, symbol] = await Promise.all([
            strategyContract.name(),
            strategyContract.symbol()
          ]);

          // Calculate strategy APY and risk level (placeholder)
          const apy = await this.calculateStrategyAPY(strategyAddress);
          const riskLevel = this.determineRiskLevel(strategyAddress);

          strategies.push({
            address: strategyAddress,
            name,
            symbol,
            allocation: Number(strategyInfo.allocation),
            totalAssets: strategyInfo.totalAssets.toString(),
            active: strategyInfo.active,
            apy,
            riskLevel
          });
        } catch (error) {
          logger.warn(`Failed to get strategy info for ${strategyAddress}:`, error);
        }
      }

      return strategies;
    } catch (error) {
      logger.error(`Failed to get strategies for vault ${vaultAddress}:`, error);
      throw error;
    }
  }

  public async getVaultMetrics(vaultAddress: string): Promise<VaultMetrics> {
    try {
      const vaultContract = this.blockchain.getContract(vaultAddress, VAULT_ABI);
      const totalAssets = await vaultContract.totalAssets();

      // These would typically come from historical data in the database
      const volume24h = "0"; // Placeholder
      const apy7d = await this.calculateAPY(vaultAddress, 7);
      const apy30d = await this.calculateAPY(vaultAddress, 30);
      const userCount = 0; // Would query from database
      const transactionCount = 0; // Would query from database

      return {
        vault: vaultAddress,
        tvl: totalAssets.toString(),
        volume24h,
        apy7d,
        apy30d,
        sharePriceHistory: [], // Would query from database
        userCount,
        transactionCount
      };
    } catch (error) {
      logger.error(`Failed to get metrics for vault ${vaultAddress}:`, error);
      throw error;
    }
  }

  public async getAssetInfo(assetAddress: string): Promise<{name: string, symbol: string, decimals: number}> {
    try {
      const assetContract = this.blockchain.getContract(assetAddress, ERC20_ABI);

      const [name, symbol, decimals] = await Promise.all([
        assetContract.name(),
        assetContract.symbol(),
        assetContract.decimals()
      ]);

      return { name, symbol, decimals };
    } catch (error) {
      logger.error(`Failed to get asset info for ${assetAddress}:`, error);
      throw error;
    }
  }

  public async isVaultHealthy(vaultAddress: string): Promise<boolean> {
    try {
      const vaultContract = this.blockchain.getContract(vaultAddress, VAULT_ABI);

      // Check if vault is paused
      const isPaused = await vaultContract.paused();
      if (isPaused) return false;

      // Check if vault has reasonable total assets
      const totalAssets = await vaultContract.totalAssets();
      const totalSupply = await vaultContract.totalSupply();

      // Basic sanity checks
      if (totalSupply > 0n && totalAssets === 0n) return false;
      if (totalAssets > 0n && totalSupply === 0n) return false;

      return true;
    } catch (error) {
      logger.error(`Failed to check vault health for ${vaultAddress}:`, error);
      return false;
    }
  }

  private async calculateAPY(vaultAddress: string, days = 365): Promise<number> {
    // Placeholder implementation
    // In a real implementation, this would:
    // 1. Query historical share price data from database
    // 2. Calculate compound returns over the specified period
    // 3. Annualize the return

    try {
      // Mock calculation - return random APY between 0-20%
      return Math.random() * 20;
    } catch {
      return 0;
    }
  }

  private async calculateStrategyAPY(strategyAddress: string): Promise<number> {
    // Placeholder implementation
    // Would calculate based on strategy's historical performance
    return Math.random() * 15;
  }

  private determineRiskLevel(strategyAddress: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Placeholder implementation
    // Would analyze strategy code, historical volatility, etc.
    const risk = Math.random();
    if (risk < 0.33) return 'LOW';
    if (risk < 0.66) return 'MEDIUM';
    return 'HIGH';
  }
}

export default VaultService;