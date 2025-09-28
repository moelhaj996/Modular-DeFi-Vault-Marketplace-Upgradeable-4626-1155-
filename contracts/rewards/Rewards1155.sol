// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {AccessRoles} from "../access/AccessRoles.sol";
import {IRewards} from "../interfaces/IRewards.sol";

contract Rewards1155 is
    IRewards,
    ERC1155Upgradeable,
    AccessRoles,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 public constant MAX_MULTIPLIER = 10000; // 100x
    uint256 public constant BASE_MULTIPLIER = 100; // 1x

    mapping(uint256 => RewardInfo) private _rewards;
    mapping(address => EnumerableSet.UintSet) private _userRewards;
    mapping(address => mapping(uint256 => uint256)) private _userRewardTimestamps;

    uint256 private _currentTokenId;


    function initialize(string memory uri, address admin) external initializer {
        __ERC1155_init(uri);
        __AccessRoles_init(admin);
        __Pausable_init();
        __ReentrancyGuard_init();

        _currentTokenId = 1;
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
    ) external onlyRewardManager {
        if (tokenId == 0) revert InvalidRewardType();
        if (_rewards[tokenId].active) revert InvalidRewardType();
        if (multiplier > MAX_MULTIPLIER) revert InvalidRewardType();

        _rewards[tokenId] = RewardInfo({
            rewardType: rewardType,
            name: name,
            description: description,
            multiplier: multiplier,
            duration: duration,
            maxSupply: maxSupply,
            currentSupply: 0,
            transferable: transferable,
            active: true
        });

        if (tokenId >= _currentTokenId) {
            _currentTokenId = tokenId + 1;
        }

        emit RewardCreated(tokenId, _getRewardTypeString(rewardType), multiplier);
    }

    function mintReward(address to, uint256 tokenId, uint256 amount)
        external
        onlyRewardManager
        whenNotPaused
        nonReentrant
    {
        RewardInfo storage reward = _rewards[tokenId];
        if (!reward.active) revert RewardNotFound();
        if (reward.currentSupply + amount > reward.maxSupply) revert InsufficientRewards();

        reward.currentSupply += amount;
        _mint(to, tokenId, amount, "");
        _userRewards[to].add(tokenId);
        _userRewardTimestamps[to][tokenId] = block.timestamp;

        emit RewardClaimed(to, tokenId, amount);
    }

    function burnReward(address from, uint256 tokenId, uint256 amount)
        external
        onlyRewardManager
        whenNotPaused
        nonReentrant
    {
        if (balanceOf(from, tokenId) < amount) revert InsufficientRewards();

        RewardInfo storage reward = _rewards[tokenId];
        reward.currentSupply -= amount;

        _burn(from, tokenId, amount);

        if (balanceOf(from, tokenId) == 0) {
            _userRewards[from].remove(tokenId);
            delete _userRewardTimestamps[from][tokenId];
        }

        emit RewardBurned(from, tokenId, amount);
    }

    function claimReward(uint256 tokenId, uint256 amount) external whenNotPaused nonReentrant {
        RewardInfo storage reward = _rewards[tokenId];
        if (!reward.active) revert RewardNotFound();
        if (reward.currentSupply + amount > reward.maxSupply) revert InsufficientRewards();

        reward.currentSupply += amount;
        _mint(msg.sender, tokenId, amount, "");
        _userRewards[msg.sender].add(tokenId);
        _userRewardTimestamps[msg.sender][tokenId] = block.timestamp;

        emit RewardClaimed(msg.sender, tokenId, amount);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override(ERC1155Upgradeable) whenNotPaused {
        RewardInfo memory reward = _rewards[id];
        if (!reward.transferable) revert InvalidRewardType();

        super.safeTransferFrom(from, to, id, amount, data);

        _userRewards[to].add(id);
        if (balanceOf(from, id) == 0) {
            _userRewards[from].remove(id);
            delete _userRewardTimestamps[from][id];
        }

        emit RewardTransferred(from, to, id, amount);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override(ERC1155Upgradeable) whenNotPaused {
        for (uint256 i = 0; i < ids.length; i++) {
            RewardInfo memory reward = _rewards[ids[i]];
            if (!reward.transferable) revert InvalidRewardType();
        }

        super.safeBatchTransferFrom(from, to, ids, amounts, data);

        for (uint256 i = 0; i < ids.length; i++) {
            _userRewards[to].add(ids[i]);
            if (balanceOf(from, ids[i]) == 0) {
                _userRewards[from].remove(ids[i]);
                delete _userRewardTimestamps[from][ids[i]];
            }
            emit RewardTransferred(from, to, ids[i], amounts[i]);
        }
    }

    function getRewardInfo(uint256 tokenId) external view returns (RewardInfo memory) {
        RewardInfo memory reward = _rewards[tokenId];
        if (!reward.active) revert RewardNotFound();
        return reward;
    }

    function getUserRewards(address user) external view returns (uint256[] memory) {
        return _userRewards[user].values();
    }

    function getUserRewardBalance(address user, uint256 tokenId) external view returns (uint256) {
        return balanceOf(user, tokenId);
    }

    function getActiveMultiplier(address user) external view returns (uint256) {
        uint256[] memory userTokens = _userRewards[user].values();
        uint256 totalMultiplier = BASE_MULTIPLIER;

        for (uint256 i = 0; i < userTokens.length; i++) {
            uint256 tokenId = userTokens[i];
            RewardInfo memory reward = _rewards[tokenId];

            if (!reward.active) continue;

            uint256 timestamp = _userRewardTimestamps[user][tokenId];
            if (reward.duration > 0 && block.timestamp > timestamp + reward.duration) {
                continue;
            }

            uint256 balance = balanceOf(user, tokenId);
            if (balance > 0) {
                if (reward.rewardType == RewardType.BOOSTER) {
                    totalMultiplier += (reward.multiplier * balance);
                } else if (reward.rewardType == RewardType.BADGE) {
                    totalMultiplier += reward.multiplier;
                }
            }
        }

        return totalMultiplier > MAX_MULTIPLIER ? MAX_MULTIPLIER : totalMultiplier;
    }

    function isRewardActive(uint256 tokenId) external view returns (bool) {
        return _rewards[tokenId].active;
    }

    function setRewardTransferability(uint256 tokenId, bool transferable) external onlyRewardManager {
        if (!_rewards[tokenId].active) revert RewardNotFound();
        _rewards[tokenId].transferable = transferable;
    }

    function setRewardActive(uint256 tokenId, bool active) external onlyRewardManager {
        if (_rewards[tokenId].multiplier == 0) revert RewardNotFound();
        _rewards[tokenId].active = active;
    }

    function setURI(string memory newuri) external onlyAdmin {
        _setURI(newuri);
    }

    function pause() external onlyPauser {
        _pause();
    }

    function unpause() external onlyPauser {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyUpgrader {}

    function _getRewardTypeString(RewardType rewardType) internal pure returns (string memory) {
        if (rewardType == RewardType.BADGE) return "BADGE";
        if (rewardType == RewardType.BOOSTER) return "BOOSTER";
        if (rewardType == RewardType.ACHIEVEMENT) return "ACHIEVEMENT";
        if (rewardType == RewardType.LOYALTY) return "LOYALTY";
        return "UNKNOWN";
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    uint256[45] private __gap;
}