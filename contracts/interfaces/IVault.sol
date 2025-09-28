// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IStrategy} from "./IStrategy.sol";

interface IVault is IERC4626 {
    error VaultPaused();
    error InvalidStrategy();
    error StrategyAlreadyExists();
    error InsufficientAssets();
    error ExcessiveSlippage();
    error InvalidReceiver();
    error DepositLimitExceeded();
    error WithdrawLimitExceeded();

    event StrategyAdded(address indexed strategy, uint256 allocation);
    event StrategyRemoved(address indexed strategy);
    event StrategyUpdated(address indexed strategy, uint256 newAllocation);
    event Harvest(address indexed strategy, uint256 yield);
    event EmergencyWithdraw(address indexed strategy, uint256 amount);
    event DepositLimitUpdated(uint256 newLimit);
    event WithdrawLimitUpdated(uint256 newLimit);

    struct StrategyInfo {
        IStrategy strategy;
        uint256 allocation;
        uint256 totalAssets;
        bool active;
    }

    function addStrategy(IStrategy strategy, uint256 allocation) external;
    function removeStrategy(address strategy) external;
    function updateStrategyAllocation(address strategy, uint256 newAllocation) external;
    function harvest(address strategy) external returns (uint256 yield);
    function harvestAll() external returns (uint256 totalYield);
    function emergencyWithdraw(address strategy) external;
    function rebalance() external;
    function getStrategy(address strategy) external view returns (StrategyInfo memory);
    function getAllStrategies() external view returns (address[] memory);
    function totalStrategies() external view returns (uint256);
    function getStrategyAssets(address strategy) external view returns (uint256);
    function setDepositLimit(uint256 newLimit) external;
    function setWithdrawLimit(uint256 newLimit) external;
    function getDepositLimit() external view returns (uint256);
    function getWithdrawLimit() external view returns (uint256);
    function pause() external;
    function unpause() external;
}