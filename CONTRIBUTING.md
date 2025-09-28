# Contributing to DeFi Vault Marketplace

Thank you for your interest in contributing to the DeFi Vault Marketplace! This document provides guidelines and information for contributors.

## 🌟 How to Contribute

We welcome contributions in many forms:

- 🐛 Bug reports and fixes
- ✨ Feature requests and implementations
- 📚 Documentation improvements
- 🔧 Code optimization and refactoring
- 🧪 Test coverage improvements
- 🛡️ Security enhancements
- 🎨 UI/UX improvements

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18+ and Yarn installed
- Python 3.9+ (for security tools)
- Git configured with your GitHub account
- Basic understanding of:
  - Solidity and smart contract development
  - TypeScript/JavaScript
  - React and Next.js
  - DeFi concepts and ERC standards

### Setting Up the Development Environment

1. **Fork the repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/defi-vault-marketplace.git
   cd defi-vault-marketplace
   ```

2. **Install dependencies**
   ```bash
   yarn install:all
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start local development**
   ```bash
   # Terminal 1: Local blockchain
   yarn hardhat node

   # Terminal 2: Deploy contracts
   yarn deploy:local

   # Terminal 3: API server
   yarn dev:api

   # Terminal 4: Frontend
   yarn dev:web
   ```

## 📋 Development Workflow

### 1. Create a Branch

Create a descriptive branch name:

```bash
git checkout -b feature/vault-rewards-integration
git checkout -b fix/gas-optimization-issue
git checkout -b docs/api-documentation-update
```

### 2. Make Your Changes

Follow our coding standards and best practices:

#### Smart Contracts
- Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Use custom errors instead of require strings
- Add comprehensive NatSpec documentation
- Optimize for gas efficiency
- Include security considerations

#### Frontend (TypeScript/React)
- Use TypeScript with strict type checking
- Follow React best practices and hooks patterns
- Use our established component structure
- Ensure responsive design
- Add proper error handling

#### Backend (Node.js/Express)
- Use TypeScript with proper typing
- Follow RESTful API design principles
- Add input validation and error handling
- Include comprehensive logging
- Write API documentation

### 3. Write Tests

All contributions must include appropriate tests:

#### Smart Contract Tests
```bash
# Run contract tests
yarn test:contracts

# Run specific test files
yarn hardhat test test/unit/Vault.test.ts

# Run with coverage
yarn test:coverage
```

#### API Tests
```bash
# Run API tests
cd api && yarn test

# Run with coverage
cd api && yarn test:coverage
```

#### Frontend Tests
```bash
# Run frontend tests
cd web && yarn test

# Run with coverage
cd web && yarn test:coverage
```

### 4. Run Quality Checks

Before submitting, ensure all checks pass:

```bash
# Lint all code
yarn lint

# Format all code
yarn format

# Run security audits
yarn audit:slither

# Run all tests
yarn test

# Check gas usage
REPORT_GAS=true yarn test:contracts
```

### 5. Commit Your Changes

Use conventional commit messages:

```bash
# Examples:
git commit -m "feat: add yield multiplier for reward tokens"
git commit -m "fix: resolve reentrancy issue in vault withdrawal"
git commit -m "docs: update API documentation for vault endpoints"
git commit -m "test: add comprehensive fuzz tests for strategy allocation"
git commit -m "refactor: optimize gas usage in batch operations"
```

#### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `security`: Security improvements

### 6. Push and Create Pull Request

```bash
git push origin feature/your-branch-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Reference any related issues
- Include testing instructions
- Add screenshots for UI changes

## 🔍 Code Review Process

### What We Look For

1. **Functionality**: Does the code work as intended?
2. **Security**: Are there any security vulnerabilities?
3. **Performance**: Is the code optimized for gas and execution?
4. **Maintainability**: Is the code clean and well-documented?
5. **Testing**: Are there adequate tests with good coverage?
6. **Standards**: Does it follow our coding standards?

### Review Criteria

#### Smart Contracts
- [ ] Security best practices followed
- [ ] Gas optimization considered
- [ ] Proper access controls implemented
- [ ] Events emitted for important state changes
- [ ] Custom errors used instead of require strings
- [ ] NatSpec documentation complete
- [ ] Test coverage >95%
- [ ] No high/critical Slither findings

#### Frontend
- [ ] TypeScript types properly defined
- [ ] Components are reusable and well-structured
- [ ] Error handling implemented
- [ ] Loading states managed
- [ ] Responsive design works
- [ ] Accessibility standards met
- [ ] No console errors or warnings

#### Backend
- [ ] Input validation implemented
- [ ] Error handling comprehensive
- [ ] API documentation updated
- [ ] Database queries optimized
- [ ] Logging implemented
- [ ] Security middleware used

## 🐛 Reporting Bugs

### Security Vulnerabilities

**Do NOT create public issues for security vulnerabilities.**

Please refer to our [Security Policy](./SECURITY.md) for responsible disclosure.

### Regular Bugs

Create a detailed bug report including:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Exact steps to trigger the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**:
   - Network (mainnet, testnet, local)
   - Browser (if frontend issue)
   - Node.js version
   - Contract addresses (if applicable)
6. **Screenshots**: If applicable
7. **Error Messages**: Full error messages and stack traces

### Bug Report Template

```markdown
## Bug Description
Brief description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear description of what you expected to happen.

## Actual Behavior
A clear description of what actually happened.

## Environment
- Network: [mainnet/goerli/local]
- Browser: [Chrome 91, Safari 14, etc.]
- Node.js version: [16.14.0]
- Contract address: [0x...]

## Screenshots
If applicable, add screenshots to help explain your problem.

## Additional Context
Add any other context about the problem here.
```

## 💡 Feature Requests

We welcome feature requests! Please:

1. **Check existing issues** to avoid duplicates
2. **Provide detailed description** of the feature
3. **Explain the use case** and business value
4. **Consider implementation complexity** and backwards compatibility
5. **Suggest potential solutions** if you have ideas

### Feature Request Template

```markdown
## Feature Description
A clear and concise description of what you want to happen.

## Problem Statement
What problem does this feature solve?

## Proposed Solution
Describe the solution you'd like.

## Alternative Solutions
Describe alternatives you've considered.

## Use Cases
Provide specific examples of how this would be used.

## Implementation Notes
Any technical considerations or constraints.

## Priority
How important is this feature to you?
```

## 📚 Documentation

Help us maintain excellent documentation:

### Types of Documentation
- **Code comments**: Inline explanations for complex logic
- **API documentation**: Comprehensive endpoint documentation
- **User guides**: Step-by-step instructions for users
- **Developer guides**: Technical implementation details
- **Architecture docs**: System design and component interactions

### Documentation Standards
- Use clear, concise language
- Include code examples where applicable
- Keep documentation up-to-date with code changes
- Add diagrams for complex concepts
- Ensure proper grammar and spelling

## 🎯 Development Best Practices

### Smart Contract Development

1. **Security First**
   - Follow SWC Registry and OWASP guidelines
   - Use established patterns (OpenZeppelin)
   - Implement proper access controls
   - Add reentrancy guards where needed

2. **Gas Optimization**
   - Use custom errors
   - Pack struct variables efficiently
   - Minimize storage operations
   - Use events for data that doesn't need to be stored

3. **Testing**
   - Write unit tests for all functions
   - Include edge cases and error conditions
   - Use fuzz testing for complex logic
   - Test upgrade scenarios

### Frontend Development

1. **User Experience**
   - Provide clear loading states
   - Handle errors gracefully
   - Make UI responsive
   - Add proper accessibility

2. **Performance**
   - Minimize bundle size
   - Optimize re-renders
   - Use proper caching strategies
   - Implement lazy loading

3. **Web3 Integration**
   - Handle wallet connection states
   - Provide transaction feedback
   - Cache blockchain data appropriately
   - Handle network switching

### Backend Development

1. **API Design**
   - Follow RESTful principles
   - Use proper HTTP status codes
   - Implement rate limiting
   - Add comprehensive logging

2. **Data Management**
   - Validate all inputs
   - Use proper database indexing
   - Implement caching strategies
   - Handle concurrent requests

## 🏆 Recognition

Contributors will be recognized in:
- Project README
- Release notes
- Hall of Fame (for significant contributions)
- Special Discord role (for ongoing contributors)

## 📞 Getting Help

Need help with your contribution?

- **Discord**: Join our [Discord server](https://discord.gg/your-discord)
- **Discussions**: Use [GitHub Discussions](https://github.com/your-username/defi-vault-marketplace/discussions)
- **Issues**: Create an issue with the `question` label

## 📜 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code.

### Our Standards

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome people of all backgrounds and experience levels
- **Be collaborative**: Work together and help each other learn
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone is learning

### Unacceptable Behavior

- Harassment or discrimination of any kind
- Trolling, insulting, or derogatory comments
- Publishing private information without permission
- Other conduct which could reasonably be considered inappropriate

## ✅ Contribution Checklist

Before submitting your contribution:

- [ ] Code follows project conventions
- [ ] Tests pass and coverage is maintained
- [ ] Documentation is updated
- [ ] Security checks pass
- [ ] Commit messages follow convention
- [ ] Pull request description is complete
- [ ] No merge conflicts exist
- [ ] CI/CD pipeline passes

## 🚀 What Happens Next?

1. **Initial Review**: Maintainers will review your PR within 2-3 business days
2. **Feedback**: You may receive feedback or requests for changes
3. **Iteration**: Work with reviewers to address any concerns
4. **Approval**: Once approved, your contribution will be merged
5. **Recognition**: You'll be added to our contributors list!

Thank you for contributing to the DeFi Vault Marketplace! Your contributions help make DeFi more accessible and secure for everyone. 🎉