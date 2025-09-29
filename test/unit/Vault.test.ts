const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployTestFixture, setupVaultWithStrategy } = require("../fixtures/simple-deployments");

describe("Vault", function () {
  let fixture: any;

  beforeEach(async function () {
    fixture = await loadFixture(deployTestFixture);
  });

  describe("Deployment and Initialization", function () {
    it("Should be initialized correctly", async function () {
      const { vault, mockToken, admin } = fixture;

      expect(await vault.asset()).to.equal(await mockToken.getAddress());
      expect(await vault.name()).to.equal("Test Vault");
      expect(await vault.symbol()).to.equal("TVAULT");
      expect(await vault.isAdmin(admin.address)).to.be.true;
    });

    it("Should have correct initial limits", async function () {
      const { vault } = fixture;

      expect(await vault.getDepositLimit()).to.equal(ethers.MaxUint256);
      expect(await vault.getWithdrawLimit()).to.equal(ethers.MaxUint256);
      expect(await vault.performanceFee()).to.equal(1000); // 10%
      expect(await vault.managementFee()).to.equal(200);   // 2%
    });
  });

  describe("Strategy Management", function () {
    it("Should add a strategy successfully", async function () {
      const { vault, strategy, admin } = fixture;

      await vault.connect(admin).addStrategy(
        await strategy.getAddress(),
        5000 // 50% allocation
      );

      const strategyInfo = await vault.getStrategy(await strategy.getAddress());
      expect(strategyInfo.active).to.be.true;
      expect(strategyInfo.allocation).to.equal(5000);
      expect(await vault.totalStrategies()).to.equal(1);
    });

    it("Should prevent adding invalid strategy", async function () {
      const { vault, admin } = fixture;

      await expect(
        vault.connect(admin).addStrategy(
          ethers.ZeroAddress,
          5000
        )
      ).to.be.revertedWithCustomError(vault, "InvalidStrategy");
    });

    it("Should prevent adding strategy with low allocation", async function () {
      const { vault, strategy, admin } = fixture;

      await expect(
        vault.connect(admin).addStrategy(
          await strategy.getAddress(),
          50 // Less than MIN_ALLOCATION (100)
        )
      ).to.be.revertedWithCustomError(vault, "InvalidStrategy");
    });

    it("Should remove strategy successfully", async function () {
      const { vault, strategy, admin } = fixture;

      await setupVaultWithStrategy(vault, strategy, admin);

      await vault.connect(admin).removeStrategy(await strategy.getAddress());

      const strategyInfo = await vault.getStrategy(await strategy.getAddress());
      expect(strategyInfo.active).to.be.false;
      expect(await vault.totalStrategies()).to.equal(0);
    });

    it("Should update strategy allocation", async function () {
      const { vault, strategy, admin } = fixture;

      await setupVaultWithStrategy(vault, strategy, admin);

      await vault.connect(admin).updateStrategyAllocation(
        await strategy.getAddress(),
        3000 // Change from 50% to 30%
      );

      const strategyInfo = await vault.getStrategy(await strategy.getAddress());
      expect(strategyInfo.allocation).to.equal(3000);
    });
  });

  describe("Deposits and Withdrawals", function () {
    beforeEach(async function () {
      await setupVaultWithStrategy(fixture.vault, fixture.strategy, fixture.admin);
    });

    it("Should deposit assets successfully", async function () {
      const { vault, mockToken, user1 } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);

      const sharesBefore = await vault.balanceOf(user1.address);
      await vault.connect(user1).deposit(depositAmount, user1.address);
      const sharesAfter = await vault.balanceOf(user1.address);

      expect(sharesAfter).to.be.greaterThan(sharesBefore);
      expect(await vault.totalAssets()).to.be.greaterThan(0);
    });

    it("Should withdraw assets successfully", async function () {
      const { vault, mockToken, user1 } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);
      const withdrawAmount = ethers.parseUnits("500", 6);

      // First deposit
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      // Then withdraw
      const balanceBefore = await mockToken.balanceOf(user1.address);
      await vault.connect(user1).withdraw(withdrawAmount, user1.address, user1.address);
      const balanceAfter = await mockToken.balanceOf(user1.address);

      expect(balanceAfter).to.equal(balanceBefore + withdrawAmount);
    });

    it("Should redeem shares successfully", async function () {
      const { vault, mockToken, user1 } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      // First deposit
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      const shares = await vault.balanceOf(user1.address);
      const redeemShares = shares / 2n;

      const balanceBefore = await mockToken.balanceOf(user1.address);
      await vault.connect(user1).redeem(redeemShares, user1.address, user1.address);
      const balanceAfter = await mockToken.balanceOf(user1.address);

      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });

    it("Should prevent deposits when paused", async function () {
      const { vault, mockToken, user1, admin } = fixture;
      const depositAmount = ethers.parseUnits("1000", 6);

      await vault.connect(admin).pause();

      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await expect(
        vault.connect(user1).deposit(depositAmount, user1.address)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("Should respect deposit limits", async function () {
      const { vault, mockToken, user1, admin } = fixture;
      const depositLimit = ethers.parseUnits("500", 6);
      const depositAmount = ethers.parseUnits("1000", 6);

      await vault.connect(admin).setDepositLimit(depositLimit);

      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await expect(
        vault.connect(user1).deposit(depositAmount, user1.address)
      ).to.be.revertedWithCustomError(vault, "DepositLimitExceeded");
    });
  });

  describe("Access Control", function () {
    it("Should prevent non-admin from managing strategies", async function () {
      const { vault, strategy, user1 } = fixture;

      await expect(
        vault.connect(user1).addStrategy(await strategy.getAddress(), 5000)
      ).to.be.revertedWithCustomError(vault, "UnauthorizedAccess");
    });

    it("Should prevent non-pauser from pausing", async function () {
      const { vault, user1 } = fixture;

      await expect(
        vault.connect(user1).pause()
      ).to.be.revertedWithCustomError(vault, "UnauthorizedAccess");
    });

    it("Should allow upgrader to authorize upgrades", async function () {
      const { vault, admin } = fixture;

      // This should not revert since admin has upgrader role
      await expect(
        vault.connect(admin)._authorizeUpgrade(ethers.ZeroAddress)
      ).to.not.be.reverted;
    });
  });

  describe("Fee Management", function () {
    it("Should set performance fee correctly", async function () {
      const { vault, admin } = fixture;
      const newFee = 1500; // 15%

      await vault.connect(admin).setPerformanceFee(newFee);
      expect(await vault.performanceFee()).to.equal(newFee);
    });

    it("Should prevent excessive performance fee", async function () {
      const { vault, admin } = fixture;
      const excessiveFee = 2500; // 25% (max is 20%)

      await expect(
        vault.connect(admin).setPerformanceFee(excessiveFee)
      ).to.be.revertedWithCustomError(vault, "InvalidStrategy");
    });

    it("Should set management fee correctly", async function () {
      const { vault, admin } = fixture;
      const newFee = 300; // 3%

      await vault.connect(admin).setManagementFee(newFee);
      expect(await vault.managementFee()).to.equal(newFee);
    });

    it("Should set fee recipient", async function () {
      const { vault, admin, user1 } = fixture;

      await vault.connect(admin).setFeeRecipient(user1.address);
      expect(await vault.feeRecipient()).to.equal(user1.address);
    });
  });

  describe("Emergency Functions", function () {
    beforeEach(async function () {
      await setupVaultWithStrategy(fixture.vault, fixture.strategy, fixture.admin);
    });

    it("Should emergency withdraw from strategy", async function () {
      const { vault, strategy, admin, mockToken, user1 } = fixture;

      // First make a deposit to have assets in strategy
      const depositAmount = ethers.parseUnits("1000", 6);
      await mockToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      await vault.connect(admin).emergencyWithdraw(await strategy.getAddress());

      // Strategy assets should be withdrawn back to vault
      const strategyInfo = await vault.getStrategy(await strategy.getAddress());
      expect(strategyInfo.totalAssets).to.equal(0);
    });
  });
});