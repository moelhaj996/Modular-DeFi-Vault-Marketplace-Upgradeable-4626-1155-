import { ethers, upgrades } from "hardhat";
import { Vault, Rewards1155, Strategy, VaultFactory } from "../../typechain-types";

async function main() {
  console.log("Deploying contract implementations...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy Vault implementation
  console.log("\n1. Deploying Vault implementation...");
  const VaultFactory = await ethers.getContractFactory("Vault");
  const vaultImplementation = await VaultFactory.deploy();
  await vaultImplementation.waitForDeployment();
  const vaultAddress = await vaultImplementation.getAddress();
  console.log("Vault implementation deployed to:", vaultAddress);

  // Deploy Rewards1155 implementation
  console.log("\n2. Deploying Rewards1155 implementation...");
  const Rewards1155Factory = await ethers.getContractFactory("Rewards1155");
  const rewardsImplementation = await Rewards1155Factory.deploy();
  await rewardsImplementation.waitForDeployment();
  const rewardsAddress = await rewardsImplementation.getAddress();
  console.log("Rewards1155 implementation deployed to:", rewardsAddress);

  // Deploy Strategy implementation
  console.log("\n3. Deploying Strategy implementation...");
  const StrategyFactory = await ethers.getContractFactory("Strategy");
  const strategyImplementation = await StrategyFactory.deploy();
  await strategyImplementation.waitForDeployment();
  const strategyAddress = await strategyImplementation.getAddress();
  console.log("Strategy implementation deployed to:", strategyAddress);

  // Deploy VaultFactory with UUPS proxy
  console.log("\n4. Deploying VaultFactory with proxy...");
  const VaultFactoryContractFactory = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = await upgrades.deployProxy(
    VaultFactoryContractFactory,
    [
      vaultAddress,
      rewardsAddress,
      strategyAddress,
      deployer.address,
      deployer.address,
      ethers.parseEther("0.01") // 0.01 ETH creation fee
    ],
    {
      initializer: "initialize",
      kind: "uups"
    }
  ) as unknown as VaultFactory;

  await vaultFactory.waitForDeployment();
  const factoryAddress = await vaultFactory.getAddress();
  console.log("VaultFactory proxy deployed to:", factoryAddress);

  // Verify deployment
  console.log("\n5. Verifying deployment...");
  const factoryVaultImpl = await vaultFactory.vaultImplementation();
  const factoryRewardsImpl = await vaultFactory.rewardsImplementation();
  const factoryStrategyImpl = await vaultFactory.strategyImplementation();

  console.log("Factory vault implementation:", factoryVaultImpl);
  console.log("Factory rewards implementation:", factoryRewardsImpl);
  console.log("Factory strategy implementation:", factoryStrategyImpl);

  // Save deployment addresses
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      vaultImplementation: vaultAddress,
      rewardsImplementation: rewardsAddress,
      strategyImplementation: strategyAddress,
      vaultFactory: factoryAddress
    }
  };

  console.log("\n✅ Deployment completed successfully!");
  console.log("\nDeployment Summary:");
  console.log("==================");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });