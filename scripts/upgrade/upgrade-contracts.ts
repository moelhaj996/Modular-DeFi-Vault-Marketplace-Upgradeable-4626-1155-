import hre from "hardhat";
const { ethers, upgrades } = hre;

async function main() {
  console.log("Upgrading contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);

  // Get proxy addresses from deployment (you would load these from your deployment info)
  const VAULT_FACTORY_PROXY = process.env.VAULT_FACTORY_PROXY || "";
  const VAULT_PROXY = process.env.VAULT_PROXY || "";
  const REWARDS_PROXY = process.env.REWARDS_PROXY || "";
  const STRATEGY_PROXY = process.env.STRATEGY_PROXY || "";

  if (!VAULT_FACTORY_PROXY) {
    throw new Error("VAULT_FACTORY_PROXY address not provided");
  }

  // Upgrade VaultFactory
  if (VAULT_FACTORY_PROXY) {
    console.log("\n1. Upgrading VaultFactory...");
    const VaultFactoryV2 = await ethers.getContractFactory("VaultFactory");
    const upgradedFactory = await upgrades.upgradeProxy(VAULT_FACTORY_PROXY, VaultFactoryV2);
    await upgradedFactory.waitForDeployment();
    console.log("VaultFactory upgraded successfully");
  }

  // Upgrade individual Vault (if needed)
  if (VAULT_PROXY) {
    console.log("\n2. Upgrading Vault...");
    const VaultV2 = await ethers.getContractFactory("Vault");
    const upgradedVault = await upgrades.upgradeProxy(VAULT_PROXY, VaultV2);
    await upgradedVault.waitForDeployment();
    console.log("Vault upgraded successfully");
  }

  // Upgrade Rewards1155 (if needed)
  if (REWARDS_PROXY) {
    console.log("\n3. Upgrading Rewards1155...");
    const Rewards1155V2 = await ethers.getContractFactory("Rewards1155");
    const upgradedRewards = await upgrades.upgradeProxy(REWARDS_PROXY, Rewards1155V2);
    await upgradedRewards.waitForDeployment();
    console.log("Rewards1155 upgraded successfully");
  }

  // Upgrade Strategy (if needed)
  if (STRATEGY_PROXY) {
    console.log("\n4. Upgrading Strategy...");
    const StrategyV2 = await ethers.getContractFactory("Strategy");
    const upgradedStrategy = await upgrades.upgradeProxy(STRATEGY_PROXY, StrategyV2);
    await upgradedStrategy.waitForDeployment();
    console.log("Strategy upgraded successfully");
  }

  console.log("\n✅ All upgrades completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });