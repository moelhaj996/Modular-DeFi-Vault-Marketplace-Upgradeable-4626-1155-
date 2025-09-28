import { Request, Response } from 'express';
import { VaultService } from '../services/VaultService';
import { logger } from '../config/logger';
import { ApiResponse, PaginationOptions, FilterOptions } from '../types';

export class VaultController {
  private vaultService: VaultService;

  constructor() {
    this.vaultService = new VaultService();
  }

  public async initialize(): Promise<void> {
    await this.vaultService.initialize();
  }

  public getAllVaults = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        active,
        minTvl,
        maxTvl,
        creator,
        asset
      } = req.query;

      const pagination: PaginationOptions = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const filters: FilterOptions = {
        active: active ? active === 'true' : undefined,
        minTvl: minTvl as string,
        maxTvl: maxTvl as string,
        creator: creator as string,
        asset: asset as string
      };

      const vaults = await this.vaultService.getAllVaults();

      // Apply filters
      let filteredVaults = vaults;

      if (filters.active !== undefined) {
        filteredVaults = filteredVaults.filter(vault => vault.active === filters.active);
      }

      if (filters.creator) {
        filteredVaults = filteredVaults.filter(vault =>
          vault.creator.toLowerCase() === filters.creator!.toLowerCase()
        );
      }

      if (filters.asset) {
        filteredVaults = filteredVaults.filter(vault =>
          vault.asset.toLowerCase() === filters.asset!.toLowerCase()
        );
      }

      if (filters.minTvl) {
        filteredVaults = filteredVaults.filter(vault =>
          BigInt(vault.totalAssets) >= BigInt(filters.minTvl!)
        );
      }

      if (filters.maxTvl) {
        filteredVaults = filteredVaults.filter(vault =>
          BigInt(vault.totalAssets) <= BigInt(filters.maxTvl!)
        );
      }

      // Apply sorting
      filteredVaults.sort((a, b) => {
        let aValue: any = a[pagination.sortBy as keyof typeof a];
        let bValue: any = b[pagination.sortBy as keyof typeof b];

        if (pagination.sortBy === 'totalAssets' || pagination.sortBy === 'totalSupply') {
          aValue = BigInt(aValue);
          bValue = BigInt(bValue);
        }

        if (aValue < bValue) return pagination.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return pagination.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      // Apply pagination
      const startIndex = (pagination.page! - 1) * pagination.limit!;
      const endIndex = startIndex + pagination.limit!;
      const paginatedVaults = filteredVaults.slice(startIndex, endIndex);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          vaults: paginatedVaults,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: filteredVaults.length,
            pages: Math.ceil(filteredVaults.length / pagination.limit!)
          }
        },
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting all vaults:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to fetch vaults',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  };

  public getVaultById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vaultAddress } = req.params;

      if (!vaultAddress || !/^0x[a-fA-F0-9]{40}$/.test(vaultAddress)) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'Invalid vault address',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      const vault = await this.vaultService.getVaultInfo(vaultAddress);

      const response: ApiResponse<typeof vault> = {
        success: true,
        data: vault,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      logger.error(`Error getting vault ${req.params.vaultAddress}:`, error);
      const response: ApiResponse<never> = {
        success: false,
        error: 'Vault not found or error fetching vault data',
        timestamp: new Date()
      };
      res.status(404).json(response);
    }
  };

  public getVaultStrategies = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vaultAddress } = req.params;

      if (!vaultAddress || !/^0x[a-fA-F0-9]{40}$/.test(vaultAddress)) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'Invalid vault address',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      const strategies = await this.vaultService.getVaultStrategies(vaultAddress);

      const response: ApiResponse<typeof strategies> = {
        success: true,
        data: strategies,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      logger.error(`Error getting strategies for vault ${req.params.vaultAddress}:`, error);
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to fetch vault strategies',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  };

  public getVaultMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vaultAddress } = req.params;

      if (!vaultAddress || !/^0x[a-fA-F0-9]{40}$/.test(vaultAddress)) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'Invalid vault address',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      const metrics = await this.vaultService.getVaultMetrics(vaultAddress);

      const response: ApiResponse<typeof metrics> = {
        success: true,
        data: metrics,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      logger.error(`Error getting metrics for vault ${req.params.vaultAddress}:`, error);
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to fetch vault metrics',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  };

  public getVaultHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vaultAddress } = req.params;

      if (!vaultAddress || !/^0x[a-fA-F0-9]{40}$/.test(vaultAddress)) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'Invalid vault address',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      const isHealthy = await this.vaultService.isVaultHealthy(vaultAddress);

      const response: ApiResponse<{ healthy: boolean }> = {
        success: true,
        data: { healthy: isHealthy },
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      logger.error(`Error checking health for vault ${req.params.vaultAddress}:`, error);
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to check vault health',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  };

  public getAssetInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetAddress } = req.params;

      if (!assetAddress || !/^0x[a-fA-F0-9]{40}$/.test(assetAddress)) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'Invalid asset address',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      const assetInfo = await this.vaultService.getAssetInfo(assetAddress);

      const response: ApiResponse<typeof assetInfo> = {
        success: true,
        data: assetInfo,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      logger.error(`Error getting asset info for ${req.params.assetAddress}:`, error);
      const response: ApiResponse<never> = {
        success: false,
        error: 'Asset not found or error fetching asset data',
        timestamp: new Date()
      };
      res.status(404).json(response);
    }
  };
}

export default VaultController;