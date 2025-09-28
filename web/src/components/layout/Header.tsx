import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { clsx } from 'clsx';

const Header: React.FC = () => {
  const router = useRouter();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '🏠' },
    { name: 'Vaults', href: '/vaults', icon: '🏦' },
    { name: 'Rewards', href: '/rewards', icon: '🎁' },
    { name: 'Portfolio', href: '/portfolio', icon: '💼' },
    { name: 'Analytics', href: '/analytics', icon: '📊' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">V</span>
              </div>
              <span className="text-xl font-bold text-gray-900">DeFi Vault</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors duration-200',
                  router.pathname === item.href
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            <ConnectButton
              chainStatus="icon"
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
              showBalance={{
                smallScreen: false,
                largeScreen: true,
              }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200',
                router.pathname === item.href
                  ? 'bg-primary-50 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;