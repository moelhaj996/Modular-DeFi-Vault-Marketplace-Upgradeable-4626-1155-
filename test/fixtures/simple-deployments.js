const hre = require("hardhat");
const { ethers, upgrades } = hre;

async function deployTestFixture() {
  const [owner, admin, user1, user2, feeRecipient] = await ethers.getSigners();

  // Deploy mock ERC20 token
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20Factory.deploy(
    "Test USDC",
    "TUSDC",
    6,
    ethers.parseUnits("1000000", 6) // 1M tokens
  );

  // Mint tokens to owner for distribution
  await mockToken.mint(owner.address, ethers.parseUnits("1000000", 6));

  // Deploy implementations
  const VaultFactory = await ethers.getContractFactory("Vault");
  const vaultImplementation = await VaultFactory.deploy();

  const RewardsFactory = await ethers.getContractFactory("Rewards1155");
  const rewardsImplementation = await RewardsFactory.deploy();

  const StrategyFactory = await ethers.getContractFactory("Strategy");
  const strategyImplementation = await StrategyFactory.deploy();

  // Deploy VaultFactory
  const VaultFactoryContract = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = await upgrades.deployProxy(
    VaultFactoryContract,
    [
      await vaultImplementation.getAddress(),
      await rewardsImplementation.getAddress(),
      await strategyImplementation.getAddress(),
      admin.address,
      feeRecipient.address,
      ethers.parseEther("0.1") // 0.1 ETH creation fee
    ],
    { initializer: "initialize" }
  );

  // Deploy proxy instances
  const vault = await upgrades.deployProxy(
    VaultFactory,
    [
      await mockToken.getAddress(),
      "Test Vault",
      "TVAULT",
      admin.address,
      feeRecipient.address
    ],
    { initializer: "initialize" }
  );

  const rewards = await upgrades.deployProxy(
    RewardsFactory,
    ["https://api.example.com/metadata/{id}.json", admin.address],
    { initializer: "initialize" }
  );

  const strategy = await upgrades.deployProxy(
    StrategyFactory,
    [
      await mockToken.getAddress(),
      "Test Strategy",
      "TS",
      admin.address,
      feeRecipient.address,
      1000, // 10% performance fee
      200   // 2% management fee
    ],
    { initializer: "initialize" }
  );

  return {
    mockToken,
    vaultImplementation,
    rewardsImplementation,
    strategyImplementation,
    vaultFactory,
    vault,
    rewards,
    strategy,
    owner,
    admin,
    user1,
    user2,
    feeRecipient,
  };
}

async function setupVaultWithStrategy(fixture) {
  // Check if fixture has required properties
  if (!fixture || !fixture.vault || !fixture.strategy || !fixture.admin) {
    console.error("Invalid fixture passed to setupVaultWithStrategy");
    return fixture;
  }

  // Grant vault STRATEGY_MANAGER_ROLE on strategy so it can call harvest
  const STRATEGY_MANAGER_ROLE = await fixture.strategy.STRATEGY_MANAGER_ROLE();
  await fixture.strategy.connect(fixture.admin).grantRole(
    STRATEGY_MANAGER_ROLE,
    await fixture.vault.getAddress()
  );

  // Add strategy to vault with proper allocation
  await fixture.vault.connect(fixture.admin).addStrategy(
    await fixture.strategy.getAddress(),
    5000 // 50% allocation
  );

  // Transfer tokens to users for testing
  if (fixture.mockToken && fixture.user1) {
    await fixture.mockToken.transfer(fixture.user1.address, ethers.parseUnits("50000", 6));
    // Approve vault for deposits
    await fixture.mockToken.connect(fixture.user1).approve(
      await fixture.vault.getAddress(),
      ethers.parseUnits("50000", 6)
    );
  }
  if (fixture.mockToken && fixture.user2) {
    await fixture.mockToken.transfer(fixture.user2.address, ethers.parseUnits("50000", 6));
    // Approve vault for deposits
    await fixture.mockToken.connect(fixture.user2).approve(
      await fixture.vault.getAddress(),
      ethers.parseUnits("50000", 6)
    );
  }

  // Fund the vault and strategy with initial liquidity
  if (fixture.owner && fixture.mockToken) {
    const vaultAddress = await fixture.vault.getAddress();
    const strategyAddress = await fixture.strategy.getAddress();

    // Transfer initial liquidity to vault
    await fixture.mockToken.transfer(vaultAddress, ethers.parseUnits("100000", 6));

    // Transfer initial liquidity to strategy
    await fixture.mockToken.transfer(strategyAddress, ethers.parseUnits("50000", 6));
  }

  return fixture;
}

module.exports = {
  deployTestFixture,
  setupVaultWithStrategy,
};