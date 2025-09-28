// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IRewards is IERC1155 {
    error RewardNotFound();
    error InsufficientRewards();
    error InvalidRewardType();
    error RewardExpired();
    error UnauthorizedClaim();

    event RewardCreated(uint256 indexed tokenId, string rewardType, uint256 multiplier);
    event RewardClaimed(address indexed user, uint256 indexed tokenId, uint256 amount);
    event RewardBurned(address indexed user, uint256 indexed tokenId, uint256 amount);
    event RewardTransferred(address indexed from, address indexed to, uint256 indexed tokenId, uint256 amount);

    enum RewardType {
        BADGE,
        BOOSTER,
        ACHIEVEMENT,
        LOYALTY
    }

    struct RewardInfo {
        RewardType rewardType;
        string name;
        string description;
        uint256 multiplier;
        uint256 duration;
        uint256 maxSupply;
        uint256 currentSupply;
        bool transferable;
        bool active;
    }

    function createReward(
        uint256 tokenId,
        RewardType rewardType,
        string memory name,
        string memory description,
        uint256 multiplier,
        uint256 duration,
        uint256 maxSupply,
        bool transferable
    ) external;

    function mintReward(address to, uint256 tokenId, uint256 amount) external;
    function burnReward(address from, uint256 tokenId, uint256 amount) external;
    function claimReward(uint256 tokenId, uint256 amount) external;
    function getRewardInfo(uint256 tokenId) external view returns (RewardInfo memory);
    function getUserRewards(address user) external view returns (uint256[] memory);
    function getUserRewardBalance(address user, uint256 tokenId) external view returns (uint256);
    function getActiveMultiplier(address user) external view returns (uint256);
    function isRewardActive(uint256 tokenId) external view returns (bool);
    function setRewardTransferability(uint256 tokenId, bool transferable) external;
    function setRewardActive(uint256 tokenId, bool active) external;
}