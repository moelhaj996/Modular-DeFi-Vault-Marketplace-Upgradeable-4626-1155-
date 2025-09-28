import { useState, useEffect, useCallback } from 'react';
import { VaultData, ApiResponse, PaginatedResponse, FilterOptions } from '../types';
import { useToast } from './useToast';

interface UseVaultsReturn {
  vaults: VaultData[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  fetchVaults: (filters?: FilterOptions, page?: number) => Promise<void>;
  refetch: () => Promise<void>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useVaults = (initialFilters?: FilterOptions): UseVaultsReturn => {
  const [vaults, setVaults] = useState<VaultData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>(initialFilters || {});
  const [currentPage, setCurrentPage] = useState(1);

  const { showToast } = useToast();

  const fetchVaults = useCallback(
    async (filters: FilterOptions = {}, page = 1) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          ...filters,
        });

        const response = await fetch(`${API_BASE_URL}/api/vaults?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: ApiResponse<PaginatedResponse<VaultData>> = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch vaults');
        }

        if (result.data) {
          setVaults(result.data.data);
          setPagination(result.data.pagination);
          setCurrentFilters(filters);
          setCurrentPage(page);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        showToast({
          type: 'error',
          title: 'Failed to fetch vaults',
          message: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const refetch = useCallback(() => {
    return fetchVaults(currentFilters, currentPage);
  }, [fetchVaults, currentFilters, currentPage]);

  // Initial fetch
  useEffect(() => {
    fetchVaults(initialFilters);
  }, [fetchVaults, initialFilters]);

  return {
    vaults,
    loading,
    error,
    pagination,
    fetchVaults,
    refetch,
  };
};

// Hook for fetching a single vault
export const useVault = (vaultAddress: string | null) => {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchVault = useCallback(async () => {
    if (!vaultAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/vaults/${vaultAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<VaultData> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch vault');
      }

      setVault(result.data || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      showToast({
        type: 'error',
        title: 'Failed to fetch vault',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [vaultAddress, showToast]);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  return {
    vault,
    loading,
    error,
    refetch: fetchVault,
  };
};