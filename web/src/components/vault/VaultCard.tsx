import React from 'react';
import Link from 'next/link';
import { VaultData } from '../../types';
import { formatEther, formatUnits } from 'viem';
import { clsx } from 'clsx';

interface VaultCardProps {
  vault: VaultData;
  className?: string;
}

const VaultCard: React.FC<VaultCardProps> = ({ vault, className }) => {
  const formatNumber = (value: string, decimals = 6, showDecimals = 2) => {
    try {
      const formatted = formatUnits(BigInt(value), decimals);
      const num = parseFloat(formatted);
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: showDecimals,
      }).format(num);
    } catch {
      return '0';
    }
  };

  const getRiskColor = (apy: number) => {
    if (apy < 5) return 'text-green-600 bg-green-50';
    if (apy < 15) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusColor = (active: boolean) => {
    return active
      ? 'text-green-600 bg-green-50'
      : 'text-gray-600 bg-gray-50';
  };

  return (
    <Link href={`/vaults/${vault.address}`}>
      <div
        className={clsx(
          'bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {vault.name}
            </h3>
            <p className="text-sm text-gray-500">{vault.symbol}</p>
          </div>
          <div className="flex space-x-2">
            <span
              className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                getStatusColor(vault.active)
              )}
            >
              {vault.active ? 'Active' : 'Inactive'}
            </span>
            <span
              className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                getRiskColor(vault.apy)
              )}
            >
              {vault.apy.toFixed(2)}% APY
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Total Value Locked</p>
            <p className="text-lg font-medium text-gray-900">
              ${formatNumber(vault.totalAssets, 6, 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Share Price</p>
            <p className="text-lg font-medium text-gray-900">
              ${parseFloat(vault.sharePrice).toFixed(4)}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="text-gray-500">Total Supply</p>
            <p>{formatNumber(vault.totalSupply, 18, 2)}</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p>{new Date(vault.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Asset Info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                Asset: {vault.asset.slice(0, 6)}...{vault.asset.slice(-4)}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              by {vault.creator.slice(0, 6)}...{vault.creator.slice(-4)}
            </div>
          </div>
        </div>

        {/* Hover Effect Arrow */}
        <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-5 h-5 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
};

export default VaultCard;