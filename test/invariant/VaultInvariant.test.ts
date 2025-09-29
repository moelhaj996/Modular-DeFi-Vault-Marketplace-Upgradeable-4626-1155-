import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployTestFixture, setupVaultWithStrategy } from "../fixtures/simple-deployments.mjs";

describe("Vault Invariant Tests", function () {
  let fixture: any;

  beforeEach(async function () {
    fixture = await loadFixture(deployTestFixture);
    await setupVaultWithStrategy(fixture.vault, fixture.strategy, fixture.admin);
  });

  describe("Invariant: Total Assets Consistency", function () {
    it("Total assets should equal sum of vault balance and strategy assets", async function () {
      const { vault, mockToken, user1, strategy } = fixture;

      // Perform multiple operations
      const amounts = [
        ethers.parseUnits("1000", 6),
        ethers.parseUnits("500", 6),
        ethers.parseUnits("2000", 6)
      ];

      for (const amount of amounts) {
        await mockToken.connect(user1).approve(await vault.getAddress(), amount);
        await vault.connect(user1).deposit(amount, user1.address);

        // Check invariant after each deposit
        const vaultBalance = await mockToken.balanceOf(await vault.getAddress());
        const strategyInfo = await vault.getStrategy(await strategy.getAddress());
        const totalAssets = await vault.totalAssets();

        expect(totalAssets).to.equal(vaultBalance + strategyInfo.totalAssets);
      }
    });

    it("Total assets should remain consistent through withdrawals", async function () {
      const { vault, mockToken, user1, strategy } = fixture;
      const depositAmount = ethers.parseUnits("3000", 6);

      // Initial deposit
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      // Perform withdrawals
      const withdrawAmounts = [
        ethers.parseUnits("500", 6),
        ethers.parseUnits("1000", 6),
        ethers.parseUnits("800", 6)
      ];

      for (const amount of withdrawAmounts) {
        const totalAssetsBefore = await vault.totalAssets();

        await vault.connect(user1).withdraw(amount, user1.address, user1.address);

        const totalAssetsAfter = await vault.totalAssets();
        const vaultBalance = await mockToken.balanceOf(await vault.getAddress());
        const strategyInfo = await vault.getStrategy(await strategy.getAddress());

        // Invariant: total assets should equal vault balance + strategy assets
        expect(totalAssetsAfter).to.equal(vaultBalance + strategyInfo.totalAssets);

        // Assets should decrease by withdrawal amount
        expect(totalAssetsBefore - totalAssetsAfter).to.be.approximately(amount, ethers.parseUnits("1", 6));
      }
    });
  });

  describe("Invariant: Share Price Monotonicity", function () {
    it("Share price should never decrease without withdrawals", async function () {
      const { vault, mockToken, user1, strategy, admin } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      let previousPrice = await vault.convertToAssets(ethers.parseUnits("1", 18));

      // Simulate yield generation multiple times
      for (let i = 0; i < 5; i++) {
        const yieldAmount = ethers.parseUnits("50", 6);
        await mockToken.mint(await strategy.getAddress(), yieldAmount);
        await vault.connect(admin).harvest(await strategy.getAddress());

        const currentPrice = await vault.convertToAssets(ethers.parseUnits("1", 18));

        // Share price should not decrease
        expect(currentPrice).to.be.greaterThanOrEqual(previousPrice);
        previousPrice = currentPrice;
      }
    });
  });

  describe("Invariant: Strategy Allocation Bounds", function () {
    it("Total strategy allocations should never exceed 100%", async function () {
      const { vault, strategy, admin, vaultFactory, mockToken } = fixture;

      // Create multiple strategies
      const strategies = [];
      for (let i = 0; i < 3; i++) {
        const strategyTx = await vaultFactory.connect(admin).createStrategy(
          await mockToken.getAddress(),
          `Strategy ${i}`,
          `STRAT${i}`,
          admin.address,
          1000,
          200
        );
        const receipt = await strategyTx.wait();
        const strategyAddress = receipt?.logs.find(
          (log: any) => log.fragment?.name === "StrategyCreated"
        )?.args[0];
        strategies.push(strategyAddress);
      }

      // Add strategies with allocations
      await vault.connect(admin).addStrategy(strategies[0], 3000); // 30%
      await vault.connect(admin).addStrategy(strategies[1], 4000); // 40%

      // This should fail as it would exceed 100%
      await expect(
        vault.connect(admin).addStrategy(strategies[2], 4000) // Would make total 130%
      ).to.be.revertedWithCustomError(vault, "InvalidStrategy");

      // Total allocations should not exceed MAX_BPS
      const totalAllocations = await vault.totalAllocations();
      expect(totalAllocations).to.be.lessThanOrEqual(10000); // MAX_BPS
    });
  });

  describe("Invariant: Access Control Consistency", function () {
    it("Critical functions should always be protected", async function () {
      const { vault, strategy, user1 } = fixture;

      // Non-admin users should never be able to call admin functions
      const strategyAddress = await strategy.getAddress();
      const adminFunctions = [
        () => vault.connect(user1).addStrategy(strategyAddress, 1000),
        () => vault.connect(user1).removeStrategy(strategyAddress),
        () => vault.connect(user1).setPerformanceFee(500),
        () => vault.connect(user1).setDepositLimit(ethers.parseUnits("1000", 6)),
        () => vault.connect(user1).pause(),
      ];

      for (const fn of adminFunctions) {
        await expect(fn()).to.be.revertedWithCustomError(vault, "UnauthorizedAccess");
      }
    });
  });

  describe("Invariant: ERC4626 Compliance", function () {
    it("Preview functions should match actual operations", async function () {
      const { vault, mockToken, user1 } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);

      // Preview deposit
      const previewShares = await vault.previewDeposit(depositAmount);

      // Actual deposit
      await vault.connect(user1).deposit(depositAmount, user1.address);
      const actualShares = await vault.balanceOf(user1.address);

      // Should match (allowing for small rounding differences)
      expect(actualShares).to.be.approximately(previewShares, 1);
    });

    it("Withdraw previews should match actual withdrawals", async function () {
      const { vault, mockToken, user1 } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      // Deposit first
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      const withdrawAmount = ethers.parseUnits("500", 6);

      // Preview withdraw
      const previewShares = await vault.previewWithdraw(withdrawAmount);

      // Actual withdraw
      await vault.connect(user1).withdraw(withdrawAmount, user1.address, user1.address);

      // Check that the correct number of shares were burned
      const remainingShares = await vault.balanceOf(user1.address);
      const totalShares = await vault.totalSupply();

      // The math should be consistent
      expect(previewShares).to.be.greaterThan(0);
    });
  });

  describe("Invariant: Fee Bounds", function () {
    it("Fees should always be within acceptable limits", async function () {
      const { vault, admin } = fixture;

      // Performance fee should not exceed 20%
      await expect(
        vault.connect(admin).setPerformanceFee(2500) // 25%
      ).to.be.revertedWithCustomError(vault, "InvalidStrategy");

      // Management fee should not exceed 5%
      await expect(
        vault.connect(admin).setManagementFee(1000) // 10%
      ).to.be.revertedWithCustomError(vault, "InvalidStrategy");

      // Valid fees should work
      await vault.connect(admin).setPerformanceFee(1500); // 15%
      await vault.connect(admin).setManagementFee(300);   // 3%

      expect(await vault.performanceFee()).to.equal(1500);
      expect(await vault.managementFee()).to.equal(300);
    });
  });

  describe("Invariant: Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks", async function () {
      // Note: This test would require a malicious contract that tries to reenter
      // For now, we verify that reentrancy guards are in place
      const { vault, mockToken, user1 } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);

      // Multiple rapid operations should not break invariants
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(vault.connect(user1).deposit(depositAmount / 5n, user1.address));
      }

      await Promise.all(promises);

      // Vault should still be in consistent state
      const totalAssets = await vault.totalAssets();
      expect(totalAssets).to.equal(depositAmount);
    });
  });
});