import hre from "hardhat";
const { ethers, upgrades } = hre;
import {
  Vault,
  Rewards1155,
  Strategy,
  VaultFactory,
  MockERC20,
  AccessRoles
} from "../../typechain-types";

export interface TestFixture {
  // Tokens
  mockToken: MockERC20;

  // Implementations
  vaultImplementation: Vault;
  rewardsImplementation: Rewards1155;
  strategyImplementation: Strategy;

  // Factory
  vaultFactory: VaultFactory;

  // Proxy instances
  vault: Vault;
  rewards: Rewards1155;
  strategy: Strategy;

  // Accounts
  owner: any;
  admin: any;
  user1: any;
  user2: any;
  feeRecipient: any;
}

export async function deployTestFixture(): Promise<TestFixture> {
  const [owner, admin, user1, user2, feeRecipient] = await ethers.getSigners();

  // Deploy mock ERC20 token
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20Factory.deploy(
    "Test USDC",
    "TUSDC",
    6,
    ethers.parseUnits("1000000", 6) // 1M tokens
  ) as MockERC20;

  // Deploy implementations
  const VaultFactory = await ethers.getContractFactory("Vault");
  const vaultImplementation = await VaultFactory.deploy() as Vault;

  const Rewards1155Factory = await ethers.getContractFactory("Rewards1155");
  const rewardsImplementation = await Rewards1155Factory.deploy() as Rewards1155;

  const StrategyFactory = await ethers.getContractFactory("Strategy");
  const strategyImplementation = await StrategyFactory.deploy() as Strategy;

  // Deploy VaultFactory with proxy
  const VaultFactoryContractFactory = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = await upgrades.deployProxy(
    VaultFactoryContractFactory,
    [
      await vaultImplementation.getAddress(),
      await rewardsImplementation.getAddress(),
      await strategyImplementation.getAddress(),
      admin.address,
      feeRecipient.address,
      ethers.parseEther("0.01")
    ],
    {
      initializer: "initialize",
      kind: "uups"
    }
  ) as unknown as VaultFactory;

  // Create a vault through factory
  const createVaultTx = await vaultFactory.connect(admin).createVault(
    await mockToken.getAddress(),
    "Test Vault",
    "TVAULT",
    "https://api.example.com/metadata/{id}.json",
    { value: ethers.parseEther("0.01") }
  );

  const receipt = await createVaultTx.wait();
  const vaultCreatedEvent = receipt?.logs.find(
    (log: any) => log.fragment?.name === "VaultCreated"
  );

  if (!vaultCreatedEvent) {
    throw new Error("VaultCreated event not found");
  }

  const vaultAddress = vaultCreatedEvent.args[0];
  const rewardsAddress = receipt?.logs.find(
    (log: any) => log.fragment?.name === "RewardsCreated"
  )?.args[0];

  // Get proxy instances
  const vault = VaultFactory.attach(vaultAddress) as Vault;
  const rewards = Rewards1155Factory.attach(rewardsAddress) as Rewards1155;

  // Create a strategy through factory
  const createStrategyTx = await vaultFactory.connect(admin).createStrategy(
    await mockToken.getAddress(),
    "Test Strategy",
    "TSTRAT",
    feeRecipient.address,
    1000, // 10% performance fee
    200   // 2% management fee
  );

  const strategyReceipt = await createStrategyTx.wait();
  const strategyCreatedEvent = strategyReceipt?.logs.find(
    (log: any) => log.fragment?.name === "StrategyCreated"
  );

  const strategyAddress = strategyCreatedEvent?.args[0];
  const strategy = StrategyFactory.attach(strategyAddress) as Strategy;

  // Mint tokens to users
  await mockToken.mint(user1.address, ethers.parseUnits("10000", 6));
  await mockToken.mint(user2.address, ethers.parseUnits("10000", 6));
  await mockToken.mint(owner.address, ethers.parseUnits("100000", 6));

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
    feeRecipient
  };
}

export async function setupVaultWithStrategy(
  vault: Vault,
  strategy: Strategy,
  admin: any
): Promise<void> {
  await vault.connect(admin).addStrategy(
    await strategy.getAddress(),
    5000 // 50% allocation
  );
}