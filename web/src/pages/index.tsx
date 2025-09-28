import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useVaults } from '../hooks/useVaults';
import VaultCard from '../components/vault/VaultCard';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const HomePage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { vaults, loading, error } = useVaults();

  // Show top 6 vaults for the homepage
  const featuredVaults = vaults.slice(0, 6);

  return (
    <>
      <Head>
        <title>DeFi Vault Marketplace - Earn with Confidence</title>
        <meta
          name="description"
          content="Access high-yield DeFi strategies through secure, upgradeable vaults. Earn rewards and manage your portfolio with confidence."
        />
        <meta name="keywords" content="DeFi, vault, yield farming, cryptocurrency, ethereum" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="relative px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                DeFi Vaults
                <span className="text-primary-600 block">Simplified</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Access institutional-grade DeFi strategies through secure, upgradeable vaults.
                Earn yield, collect rewards, and grow your portfolio with confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/vaults">
                  <Button size="lg" className="w-full sm:w-auto">
                    Explore Vaults
                  </Button>
                </Link>
                {!isConnected && (
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">$2.5M+</div>
                <div className="text-gray-600">Total Value Locked</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">{vaults.length}</div>
                <div className="text-gray-600">Active Vaults</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">15.8%</div>
                <div className="text-gray-600">Average APY</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">1,200+</div>
                <div className="text-gray-600">Active Users</div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Vaults */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Vaults</h2>
              <p className="text-lg text-gray-600">
                Discover high-performing vaults with proven track records
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <div className="text-center text-red-600">
                <p>Failed to load vaults: {error}</p>
                <Button variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredVaults.map((vault) => (
                  <VaultCard key={vault.address} vault={vault} />
                ))}
              </div>
            )}

            <div className="text-center mt-12">
              <Link href="/vaults">
                <Button variant="outline" size="lg">
                  View All Vaults
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Vaults?</h2>
              <p className="text-lg text-gray-600">
                Built with security, transparency, and user experience in mind
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Audited</h3>
                <p className="text-gray-600">
                  All contracts are thoroughly audited and follow best security practices
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Gas Optimized</h3>
                <p className="text-gray-600">
                  Efficient smart contracts minimize gas costs for all operations
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎁</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Reward System</h3>
                <p className="text-gray-600">
                  Earn NFT rewards and boosters that enhance your yield over time
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {isConnected && (
          <section className="py-16 bg-primary-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Earning?</h2>
              <p className="text-xl text-primary-100 mb-8">
                Connected as {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/vaults">
                  <Button variant="secondary" size="lg">
                    Browse Vaults
                  </Button>
                </Link>
                <Link href="/portfolio">
                  <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-primary-600">
                    View Portfolio
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default HomePage;