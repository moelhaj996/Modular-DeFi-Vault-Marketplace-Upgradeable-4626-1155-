const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployTestFixture } = require("../fixtures/simple-deployments");

describe("Rewards1155", function () {
  let fixture: any;

  beforeEach(async function () {
    fixture = await loadFixture(deployTestFixture);
  });

  describe("Deployment and Initialization", function () {
    it("Should be initialized correctly", async function () {
      const { rewards, admin } = fixture;

      expect(await rewards.isAdmin(admin.address)).to.be.true;
      expect(await rewards.isRewardManager(admin.address)).to.be.true;
    });

    it("Should have correct URI", async function () {
      const { rewards } = fixture;

      expect(await rewards.uri(1)).to.equal("https://api.example.com/metadata/{id}.json");
    });
  });

  describe("Reward Creation", function () {
    it("Should create a badge reward", async function () {
      const { rewards, admin } = fixture;

      await rewards.connect(admin).createReward(
        1, // tokenId
        0, // RewardType.BADGE
        "Loyalty Badge",
        "Badge for loyal users",
        150, // 1.5x multiplier
        0,   // No duration (permanent)
        1000, // Max supply
        false // Not transferable
      );

      const rewardInfo = await rewards.getRewardInfo(1);
      expect(rewardInfo.name).to.equal("Loyalty Badge");
      expect(rewardInfo.rewardType).to.equal(0);
      expect(rewardInfo.multiplier).to.equal(150);
      expect(rewardInfo.maxSupply).to.equal(1000);
      expect(rewardInfo.transferable).to.be.false;
      expect(rewardInfo.active).to.be.true;
    });

    it("Should create a booster reward", async function () {
      const { rewards, admin } = fixture;

      await rewards.connect(admin).createReward(
        2, // tokenId
        1, // RewardType.BOOSTER
        "Yield Booster",
        "Temporary yield boost",
        200, // 2x multiplier
        86400, // 1 day duration
        500,   // Max supply
        true   // Transferable
      );

      const rewardInfo = await rewards.getRewardInfo(2);
      expect(rewardInfo.name).to.equal("Yield Booster");
      expect(rewardInfo.rewardType).to.equal(1);
      expect(rewardInfo.duration).to.equal(86400);
      expect(rewardInfo.transferable).to.be.true;
    });

    it("Should prevent creating reward with excessive multiplier", async function () {
      const { rewards, admin } = fixture;

      await expect(
        rewards.connect(admin).createReward(
          3,
          0,
          "Invalid Reward",
          "Too powerful",
          15000, // 150x multiplier (exceeds MAX_MULTIPLIER)
          0,
          100,
          false
        )
      ).to.be.revertedWithCustomError(rewards, "InvalidRewardType");
    });

    it("Should prevent non-reward-manager from creating rewards", async function () {
      const { rewards, user1 } = fixture;

      await expect(
        rewards.connect(user1).createReward(
          4,
          0,
          "Unauthorized",
          "Should fail",
          150,
          0,
          100,
          false
        )
      ).to.be.revertedWithCustomError(rewards, "UnauthorizedAccess");
    });
  });

  describe("Reward Minting and Burning", function () {
    beforeEach(async function () {
      const { rewards, admin } = fixture;

      // Create test rewards
      await rewards.connect(admin).createReward(
        1, 0, "Badge", "Test badge", 150, 0, 1000, false
      );
      await rewards.connect(admin).createReward(
        2, 1, "Booster", "Test booster", 200, 86400, 500, true
      );
    });

    it("Should mint rewards to user", async function () {
      const { rewards, admin, user1 } = fixture;

      await rewards.connect(admin).mintReward(user1.address, 1, 5);

      expect(await rewards.balanceOf(user1.address, 1)).to.equal(5);
      expect(await rewards.getUserRewardBalance(user1.address, 1)).to.equal(5);

      const userRewards = await rewards.getUserRewards(user1.address);
      expect(userRewards).to.contain(1n);
    });

    it("Should prevent minting beyond max supply", async function () {
      const { rewards, admin, user1 } = fixture;

      await expect(
        rewards.connect(admin).mintReward(user1.address, 1, 1001) // Exceeds max supply of 1000
      ).to.be.revertedWithCustomError(rewards, "InsufficientRewards");
    });

    it("Should burn rewards from user", async function () {
      const { rewards, admin, user1 } = fixture;

      // First mint
      await rewards.connect(admin).mintReward(user1.address, 1, 10);

      // Then burn
      await rewards.connect(admin).burnReward(user1.address, 1, 5);

      expect(await rewards.balanceOf(user1.address, 1)).to.equal(5);
    });

    it("Should remove token from user rewards list when balance reaches zero", async function () {
      const { rewards, admin, user1 } = fixture;

      await rewards.connect(admin).mintReward(user1.address, 1, 5);
      await rewards.connect(admin).burnReward(user1.address, 1, 5);

      const userRewards = await rewards.getUserRewards(user1.address);
      expect(userRewards).to.not.contain(1n);
    });

    it("Should allow users to claim rewards directly", async function () {
      const { rewards, admin, user1 } = fixture;

      await rewards.connect(user1).claimReward(1, 3);

      expect(await rewards.balanceOf(user1.address, 1)).to.equal(3);
    });
  });

  describe("Multiplier Calculation", function () {
    beforeEach(async function () {
      const { rewards, admin } = fixture;

      // Create different types of rewards
      await rewards.connect(admin).createReward(
        1, 0, "Badge", "Badge gives flat bonus", 50, 0, 1000, false
      );
      await rewards.connect(admin).createReward(
        2, 1, "Booster", "Booster multiplies per token", 25, 0, 1000, true
      );
    });

    it("Should calculate base multiplier for user with no rewards", async function () {
      const { rewards, user1 } = fixture;

      const multiplier = await rewards.getActiveMultiplier(user1.address);
      expect(multiplier).to.equal(100); // BASE_MULTIPLIER
    });

    it("Should calculate multiplier with badge rewards", async function () {
      const { rewards, admin, user1 } = fixture;

      await rewards.connect(admin).mintReward(user1.address, 1, 1);

      const multiplier = await rewards.getActiveMultiplier(user1.address);
      expect(multiplier).to.equal(150); // BASE_MULTIPLIER (100) + badge bonus (50)
    });

    it("Should calculate multiplier with booster rewards", async function () {
      const { rewards, admin, user1 } = fixture;

      await rewards.connect(admin).mintReward(user1.address, 2, 3);

      const multiplier = await rewards.getActiveMultiplier(user1.address);
      expect(multiplier).to.equal(175); // BASE_MULTIPLIER (100) + booster (25 * 3)
    });

    it("Should calculate combined multiplier with both badge and booster", async function () {
      const { rewards, admin, user1 } = fixture;

      await rewards.connect(admin).mintReward(user1.address, 1, 1); // Badge
      await rewards.connect(admin).mintReward(user1.address, 2, 2); // Booster

      const multiplier = await rewards.getActiveMultiplier(user1.address);
      expect(multiplier).to.equal(200); // BASE_MULTIPLIER (100) + badge (50) + booster (25 * 2)
    });

    it("Should cap multiplier at MAX_MULTIPLIER", async function () {
      const { rewards, admin, user1 } = fixture;

      // Create a very powerful reward
      await rewards.connect(admin).createReward(
        3, 1, "Mega Booster", "Very powerful", 2000, 0, 1000, true
      );

      await rewards.connect(admin).mintReward(user1.address, 3, 10);

      const multiplier = await rewards.getActiveMultiplier(user1.address);
      expect(multiplier).to.equal(10000); // Should be capped at MAX_MULTIPLIER
    });
  });

  describe("Transfer Restrictions", function () {
    beforeEach(async function () {
      const { rewards, admin } = fixture;

      await rewards.connect(admin).createReward(
        1, 0, "Non-transferable", "Cannot be transferred", 150, 0, 1000, false
      );
      await rewards.connect(admin).createReward(
        2, 1, "Transferable", "Can be transferred", 200, 0, 1000, true
      );
    });

    it("Should prevent transfer of non-transferable rewards", async function () {
      const { rewards, admin, user1, user2 } = fixture;

      await rewards.connect(admin).mintReward(user1.address, 1, 5);

      await expect(
        rewards.connect(user1).safeTransferFrom(
          user1.address,
          user2.address,
          1,
          1,
          "0x"
        )
      ).to.be.revertedWithCustomError(rewards, "InvalidRewardType");
    });

    it("Should allow transfer of transferable rewards", async function () {
      const { rewards, admin, user1, user2 } = fixture;

      await rewards.connect(admin).mintReward(user1.address, 2, 5);

      await rewards.connect(user1).safeTransferFrom(
        user1.address,
        user2.address,
        2,
        3,
        "0x"
      );

      expect(await rewards.balanceOf(user1.address, 2)).to.equal(2);
      expect(await rewards.balanceOf(user2.address, 2)).to.equal(3);
    });

    it("Should update user rewards lists on transfer", async function () {
      const { rewards, admin, user1, user2 } = fixture;

      await rewards.connect(admin).mintReward(user1.address, 2, 5);

      await rewards.connect(user1).safeTransferFrom(
        user1.address,
        user2.address,
        2,
        5, // Transfer all tokens
        "0x"
      );

      const user1Rewards = await rewards.getUserRewards(user1.address);
      const user2Rewards = await rewards.getUserRewards(user2.address);

      expect(user1Rewards).to.not.contain(2n);
      expect(user2Rewards).to.contain(2n);
    });
  });

  describe("Pause Functionality", function () {
    it("Should prevent minting when paused", async function () {
      const { rewards, admin, user1 } = fixture;

      await rewards.connect(admin).createReward(
        1, 0, "Test", "Test", 150, 0, 1000, false
      );

      await rewards.connect(admin).pause();

      await expect(
        rewards.connect(admin).mintReward(user1.address, 1, 1)
      ).to.be.revertedWithCustomError(rewards, "EnforcedPause");
    });

    it("Should prevent transfers when paused", async function () {
      const { rewards, admin, user1, user2 } = fixture;

      await rewards.connect(admin).createReward(
        1, 0, "Test", "Test", 150, 0, 1000, true
      );
      await rewards.connect(admin).mintReward(user1.address, 1, 5);

      await rewards.connect(admin).pause();

      await expect(
        rewards.connect(user1).safeTransferFrom(
          user1.address,
          user2.address,
          1,
          1,
          "0x"
        )
      ).to.be.revertedWithCustomError(rewards, "EnforcedPause");
    });
  });
});