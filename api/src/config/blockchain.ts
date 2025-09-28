import { ethers } from 'ethers';
import { logger } from './logger';

export interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  blockConfirmations: number;
  gasLimit: string;
  gasPrice?: string;
  contracts: {
    vaultFactory: string;
    [key: string]: string;
  };
}

const config: BlockchainConfig = {
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  chainId: parseInt(process.env.CHAIN_ID || '1337'),
  blockConfirmations: parseInt(process.env.BLOCK_CONFIRMATIONS || '1'),
  gasLimit: process.env.GAS_LIMIT || '8000000',
  gasPrice: process.env.GAS_PRICE,
  contracts: {
    vaultFactory: process.env.VAULT_FACTORY_ADDRESS || '',
  }
};

export class BlockchainService {
  private static instance: BlockchainService;
  private provider: ethers.Provider;
  private isConnected = false;

  private constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  public async connect(): Promise<void> {
    try {
      const network = await this.provider.getNetwork();
      logger.info(`Connected to blockchain network: ${network.name} (Chain ID: ${network.chainId})`);

      if (Number(network.chainId) !== config.chainId) {
        throw new Error(`Chain ID mismatch. Expected: ${config.chainId}, Got: ${network.chainId}`);
      }

      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to connect to blockchain:', error);
      throw error;
    }
  }

  public getProvider(): ethers.Provider {
    if (!this.isConnected) {
      throw new Error('Blockchain service not connected');
    }
    return this.provider;
  }

  public async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  public async getBlock(blockNumber: number): Promise<ethers.Block | null> {
    return await this.provider.getBlock(blockNumber);
  }

  public async getTransaction(txHash: string): Promise<ethers.TransactionResponse | null> {
    return await this.provider.getTransaction(txHash);
  }

  public async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash);
  }

  public async waitForTransaction(txHash: string, confirmations = config.blockConfirmations): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.waitForTransaction(txHash, confirmations);
  }

  public getContract(address: string, abi: any): ethers.Contract {
    return new ethers.Contract(address, abi, this.provider);
  }

  public async isHealthy(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }

  public getConfig(): BlockchainConfig {
    return { ...config };
  }
}

export default BlockchainService.getInstance();