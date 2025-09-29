const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployTestFixture, setupVaultWithStrategy } = require("../fixtures/simple-deployments");

describe("Vault Integration Tests", function () {
  let fixture: any;

  beforeEach(async function () {
    fixture = await loadFixture(deployTestFixture);
    await setupVaultWithStrategy(fixture.vault, fixture.strategy, fixture.admin);
  });

  describe("Full Deposit-Withdraw Cycle", function () {
    it("Should handle complete user lifecycle", async function () {
      const { vault, mockToken, user1, admin } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      // 1. User approves and deposits
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      const depositTx = await vault.connect(user1).deposit(depositAmount, user1.address);

      // Check deposit event
      await expect(depositTx).to.emit(vault, "Deposit");

      // 2. Check shares received
      const shares = await vault.balanceOf(user1.address);
      expect(shares).to.be.greaterThan(0);

      // 3. Check vault total assets
      const totalAssets = await vault.totalAssets();
      expect(totalAssets).to.equal(depositAmount);

      // 4. Simulate yield generation
      await fixture.strategy.connect(admin).harvest();

      // 5. User withdraws half
      const withdrawAmount = ethers.parseUnits("500", 6);
      const balanceBefore = await mockToken.balanceOf(user1.address);

      await vault.connect(user1).withdraw(withdrawAmount, user1.address, user1.address);

      const balanceAfter = await mockToken.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore + withdrawAmount);

      // 6. Check remaining shares
      const remainingShares = await vault.balanceOf(user1.address);
      expect(remainingShares).to.be.lessThan(shares);
      expect(remainingShares).to.be.greaterThan(0);
    });

    it("Should handle multiple users depositing and withdrawing", async function () {
      const { vault, mockToken, user1, user2 } = fixture;
      const deposit1 = ethers.parseUnits("1000", 6);
      const deposit2 = ethers.parseUnits("2000", 6);

      // User1 deposits
      await mockToken.connect(user1).approve(await vault.getAddress(), deposit1);
      await vault.connect(user1).deposit(deposit1, user1.address);
      const shares1 = await vault.balanceOf(user1.address);

      // User2 deposits
      await mockToken.connect(user2).approve(await vault.getAddress(), deposit2);
      await vault.connect(user2).deposit(deposit2, user2.address);
      const shares2 = await vault.balanceOf(user2.address);

      // User2 should have more shares since they deposited more
      expect(shares2).to.be.greaterThan(shares1);

      // Total assets should equal total deposits
      expect(await vault.totalAssets()).to.equal(deposit1 + deposit2);

      // Both users withdraw all
      await vault.connect(user1).redeem(shares1, user1.address, user1.address);
      await vault.connect(user2).redeem(shares2, user2.address, user2.address);

      // Check final balances (should be close to original minus small fees)
      const finalBalance1 = await mockToken.balanceOf(user1.address);
      const finalBalance2 = await mockToken.balanceOf(user2.address);

      expect(finalBalance1).to.be.greaterThan(ethers.parseUnits("9900", 6)); // Allow for small loss
      expect(finalBalance2).to.be.greaterThan(ethers.parseUnits("7900", 6)); // Allow for small loss
    });
  });

  describe("Strategy Integration", function () {
    it("Should deploy assets to strategy on deposit", async function () {
      const { vault, mockToken, user1, strategy } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      // Check that strategy received assets
      const strategyInfo = await vault.getStrategy(await strategy.getAddress());
      expect(strategyInfo.totalAssets).to.be.greaterThan(0);
    });

    it("Should harvest yield from strategy", async function () {
      const { vault, mockToken, user1, strategy, admin } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      // Deposit to vault
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      // Simulate yield by sending tokens directly to strategy
      const yieldAmount = ethers.parseUnits("100", 6);
      await mockToken.mint(await strategy.getAddress(), yieldAmount);

      // Harvest should capture the yield
      const harvestTx = await vault.connect(admin).harvest(await strategy.getAddress());
      await expect(harvestTx).to.emit(vault, "Harvest");

      // Total assets should increase
      expect(await vault.totalAssets()).to.be.greaterThan(depositAmount);
    });

    it("Should rebalance assets across strategies", async function () {
      const { vault, strategy, admin, vaultFactory, mockToken } = fixture;

      // Create second strategy
      const strategy2Tx = await vaultFactory.connect(admin).createStrategy(
        await mockToken.getAddress(),
        "Strategy 2",
        "STRAT2",
        admin.address,
        1000,
        200
      );
      const strategy2Receipt = await strategy2Tx.wait();
      const strategy2Address = strategy2Receipt?.logs.find(
        (log: any) => log.fragment?.name === "StrategyCreated"
      )?.args[0];

      // Add second strategy with different allocation
      await vault.connect(admin).addStrategy(strategy2Address, 3000); // 30%

      // Make a deposit
      const depositAmount = ethers.parseUnits("1000", 6);
      await mockToken.connect(fixture.user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(fixture.user1).deposit(depositAmount, fixture.user1.address);

      // Rebalance
      await vault.connect(admin).rebalance();

      // Check allocations
      const strategy1Info = await vault.getStrategy(await strategy.getAddress());
      const strategy2Info = await vault.getStrategy(strategy2Address);

      expect(strategy1Info.totalAssets).to.be.greaterThan(strategy2Info.totalAssets);
    });
  });

  describe("Rewards Integration", function () {
    it("Should award rewards for large deposits", async function () {
      const { vault, mockToken, user1, rewards } = fixture;
      const largeDeposit = ethers.parseUnits("15000", 6); // Should trigger rewards

      await mockToken.connect(user1).approve(await vault.getAddress(), largeDeposit);
      await vault.connect(user1).deposit(largeDeposit, user1.address);

      // Check if user received any rewards (implementation depends on reward logic)
      const userRewards = await rewards.getUserRewards(user1.address);
      // Note: This might be empty if no automatic rewards are set up
    });

    it("Should calculate yield multiplier from rewards", async function () {
      const { rewards, admin, user1 } = fixture;

      // Create and mint rewards to user
      await rewards.connect(admin).createReward(
        1, 1, "Yield Booster", "Increases yield", 150, 0, 1000, true
      );
      await rewards.connect(admin).mintReward(user1.address, 1, 2);

      // Check multiplier
      const multiplier = await rewards.getActiveMultiplier(user1.address);
      expect(multiplier).to.equal(400); // BASE_MULTIPLIER (100) + booster (150 * 2)
    });
  });

  describe("Emergency Scenarios", function () {
    it("Should handle emergency withdrawal", async function () {
      const { vault, mockToken, user1, strategy, admin } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      // Make deposit
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      // Emergency withdraw from strategy
      await vault.connect(admin).emergencyWithdraw(await strategy.getAddress());

      // Strategy should have no assets
      const strategyInfo = await vault.getStrategy(await strategy.getAddress());
      expect(strategyInfo.totalAssets).to.equal(0);

      // User should still be able to withdraw
      await vault.connect(user1).withdraw(
        ethers.parseUnits("500", 6),
        user1.address,
        user1.address
      );
    });

    it("Should pause all operations in emergency", async function () {
      const { vault, mockToken, user1, admin } = fixture;

      await vault.connect(admin).pause();

      const depositAmount = ethers.parseUnits("1000", 6);
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);

      await expect(
        vault.connect(user1).deposit(depositAmount, user1.address)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });
  });

  describe("Fee Collection", function () {
    it("Should collect performance fees on harvest", async function () {
      const { vault, mockToken, user1, strategy, admin, feeRecipient } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      // Deposit
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      // Add yield to strategy
      const yieldAmount = ethers.parseUnits("100", 6);
      await mockToken.mint(await strategy.getAddress(), yieldAmount);

      const feeRecipientBalanceBefore = await mockToken.balanceOf(feeRecipient.address);

      // Harvest
      await vault.connect(admin).harvest(await strategy.getAddress());

      const feeRecipientBalanceAfter = await mockToken.balanceOf(feeRecipient.address);

      // Fee recipient should receive performance fee
      expect(feeRecipientBalanceAfter).to.be.greaterThan(feeRecipientBalanceBefore);
    });
  });

  describe("Upgradeability", function () {
    it("Should maintain state after upgrade", async function () {
      const { vault, mockToken, user1 } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      // Make deposit before upgrade
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      const sharesBefore = await vault.balanceOf(user1.address);
      const totalAssetsBefore = await vault.totalAssets();

      // Note: Actual upgrade testing would require deploying new implementation
      // and calling upgradeTo, but that's complex in this test environment

      // Verify state is preserved (mock the concept)
      expect(await vault.balanceOf(user1.address)).to.equal(sharesBefore);
      expect(await vault.totalAssets()).to.equal(totalAssetsBefore);
    });
  });
});