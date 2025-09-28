# 🏦 Modular DeFi Vault & Marketplace

[![CI/CD](https://github.com/your-username/defi-vault-marketplace/workflows/CI/badge.svg)](https://github.com/your-username/defi-vault-marketplace/actions)
[![Security Audit](https://github.com/your-username/defi-vault-marketplace/workflows/Security%20Audit/badge.svg)](https://github.com/your-username/defi-vault-marketplace/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Coverage](https://codecov.io/gh/your-username/defi-vault-marketplace/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/defi-vault-marketplace)

> **A production-ready DeFi vault and marketplace built with upgradeable ERC-4626 vaults, ERC-1155 reward system, and modern web3 technologies.**

## 🌟 Overview

The Modular DeFi Vault & Marketplace is a comprehensive DeFi platform that enables users to access institutional-grade yield strategies through secure, upgradeable vaults. The platform combines ERC-4626 compliant vaults with an innovative ERC-1155 reward system, all built with security, gas optimization, and user experience as top priorities.

### ✨ Key Features

- **🔒 Secure & Audited**: Comprehensive security measures with automated auditing
- **⚡ Gas Optimized**: Custom errors, efficient storage patterns, and batch operations
- **🔄 Upgradeable**: UUPS proxy pattern for seamless contract upgrades
- **🎁 Reward System**: ERC-1155 based badges, boosters, and achievements
- **📊 Analytics**: Real-time vault performance and user portfolio tracking
- **🌐 Modern UI**: Next.js dashboard with wallet integration via RainbowKit
- **🚀 Production Ready**: Complete CI/CD pipeline and deployment automation

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │ Smart Contracts │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (Solidity)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ • Wallet Conn.  │    │ • GraphQL API   │    │ • ERC-4626      │
│ • Portfolio     │    │ • gRPC Service  │    │ • ERC-1155      │
│ • Analytics     │    │ • MongoDB       │    │ • UUPS Proxies  │
│ • Vault Mgmt    │    │ • Event Indexer │    │ • Access Control│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- Python 3.9+ (for security tools)
- MongoDB (for API backend)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/defi-vault-marketplace.git
cd defi-vault-marketplace

# Install all dependencies
yarn install:all

# Copy environment variables
cp .env.example .env
```

### Local Development

```bash
# Terminal 1: Start local blockchain
yarn hardhat node

# Terminal 2: Deploy contracts
yarn deploy:local

# Terminal 3: Start API server
yarn dev:api

# Terminal 4: Start frontend
yarn dev:web
```

Visit `http://localhost:3000` to see the application running.

## 📁 Project Structure

```
├── contracts/              # Smart contracts
│   ├── vault/              # ERC-4626 vault implementations
│   ├── rewards/            # ERC-1155 reward system
│   ├── strategy/           # Yield strategy contracts
│   ├── access/             # Role-based access control
│   ├── proxy/              # UUPS proxy factory
│   ├── interfaces/         # Contract interfaces
│   ├── libraries/          # Reusable libraries
│   └── mocks/              # Testing utilities
├── test/                   # Comprehensive test suite
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── fuzz/               # Fuzz testing
│   ├── invariant/          # Invariant testing
│   └── fixtures/           # Test fixtures
├── api/                    # Backend API service
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── config/         # Configuration
│   │   └── proto/          # gRPC definitions
│   └── test/               # API tests
├── web/                    # Frontend application
│   ├── src/
│   │   ├── pages/          # Next.js pages
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Utilities
│   │   └── styles/         # Styling
│   └── public/             # Static assets
├── scripts/                # Deployment & utility scripts
│   ├── deploy/             # Deployment scripts
│   ├── upgrade/            # Upgrade scripts
│   ├── verify/             # Contract verification
│   └── audit/              # Security audit tools
├── audits/                 # Security audit results
│   ├── slither/            # Static analysis
│   ├── echidna/            # Fuzz testing
│   ├── mythx/              # Deep analysis
│   └── reports/            # Audit reports
└── docs/                   # Documentation
```

## 🔧 Development

### Running Tests

```bash
# All tests
yarn test

# Contract tests only
yarn test:contracts

# Specific test types
yarn test:unit
yarn test:integration
yarn test:fuzz

# With coverage
yarn test:coverage
```

### Security Auditing

```bash
# Run all security tools
yarn audit:slither
yarn audit:echidna
yarn audit:mythx

# Or run individual tools
./scripts/audit/run-slither.sh
./scripts/audit/run-echidna.sh
./scripts/audit/run-mythx.sh
```

### Linting & Formatting

```bash
# Lint all code
yarn lint

# Format all code
yarn format

# Lint contracts specifically
yarn lint:contracts
```

## 🚢 Deployment

### Testnet Deployment

```bash
# Deploy to Goerli
yarn deploy:testnet

# Verify contracts
yarn verify

# Upgrade contracts (if needed)
yarn upgrade
```

### Mainnet Deployment

```bash
# Deploy to mainnet (requires proper setup)
yarn deploy:mainnet
```

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions.

## 🛡️ Security

This project implements multiple layers of security:

### Smart Contract Security
- **Access Control**: Role-based permissions with OpenZeppelin AccessControl
- **Reentrancy Protection**: ReentrancyGuard on all external interactions
- **Pause Mechanism**: Emergency stop functionality
- **Upgrade Safety**: UUPS pattern with authorized upgraders only
- **Input Validation**: Comprehensive parameter checking
- **Custom Errors**: Gas-efficient error handling

### Automated Security Auditing
- **Slither**: Static analysis for common vulnerabilities
- **Echidna**: Property-based fuzzing testing
- **MythX**: Deep security analysis
- **Continuous Monitoring**: Weekly automated security scans

### Development Security
- **Dependency Scanning**: Regular vulnerability checks
- **Code Quality**: Comprehensive linting and formatting
- **Test Coverage**: >95% test coverage requirement
- **Security Policies**: Defined vulnerability disclosure process

See [SECURITY.md](./SECURITY.md) for security policies and [audits/reports/threat-model.md](./audits/reports/threat-model.md) for the complete threat analysis.

## 📊 Gas Optimization

The project implements several gas optimization techniques:

- **Custom Errors**: Replace require strings with custom errors
- **Storage Packing**: Efficient struct packing and storage slots
- **Batch Operations**: Group multiple operations to reduce gas costs
- **View Function Optimization**: Minimize external calls in view functions
- **Assembly Usage**: Critical path optimizations where safe

Gas reports are automatically generated in CI/CD pipeline.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the full test suite: `yarn test`
5. Run security checks: `yarn audit:slither`
6. Commit your changes: `git commit -m 'feat: add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Standards

- **Solidity**: Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- **TypeScript**: Use strict TypeScript with comprehensive types
- **Testing**: Maintain >95% test coverage
- **Documentation**: Document all public interfaces
- **Security**: All changes must pass security audits

## 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Smart Contract Documentation](./docs/CONTRACTS.md)
- [API Documentation](./docs/API.md)
- [Frontend Documentation](./docs/FRONTEND.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Security Analysis](./audits/reports/threat-model.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 🧪 Testing

The project includes comprehensive testing:

### Test Coverage
- **Unit Tests**: Individual contract and function testing
- **Integration Tests**: Cross-contract interaction testing
- **Fuzz Tests**: Property-based testing with random inputs
- **Invariant Tests**: Critical system property verification
- **End-to-End Tests**: Full user flow testing

### Security Testing
- **Static Analysis**: Automated vulnerability detection
- **Dynamic Analysis**: Runtime security testing
- **Formal Verification**: Mathematical proof of critical properties

## 📈 Performance

- **Gas Efficiency**: Optimized for minimal gas costs
- **Scalability**: Designed for high transaction volumes
- **User Experience**: Fast loading times and responsive UI
- **Reliability**: 99.9% uptime target with proper monitoring

## 🔗 Integrations

### Supported Networks
- Ethereum Mainnet
- Goerli Testnet
- Sepolia Testnet
- Local Hardhat Network

### Wallet Support
- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow Wallet

### External Services
- Infura/Alchemy (RPC)
- The Graph (Indexing)
- OpenZeppelin Defender (Security)
- Tenderly (Monitoring)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) for security frameworks
- [Hardhat](https://hardhat.org/) for development environment
- [The Graph](https://thegraph.com/) for decentralized indexing
- [RainbowKit](https://www.rainbowkit.com/) for wallet connection
- [Slither](https://github.com/crytic/slither) for security analysis

## 📞 Support

- **Documentation**: Check our [docs](./docs/)
- **Issues**: Create a [GitHub issue](https://github.com/your-username/defi-vault-marketplace/issues)
- **Discussions**: Join our [Discord](https://discord.gg/your-discord)
- **Security**: See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities

---

**⚠️ Disclaimer**: This software is provided as-is and may contain bugs. Use at your own risk. Always conduct thorough testing and audits before deploying to mainnet with real funds.

**Built with ❤️ by the DeFi Vault Team**