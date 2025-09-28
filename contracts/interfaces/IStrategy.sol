// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStrategy {
    error StrategyPaused();
    error InvalidAsset();
    error InsufficientBalance();
    error StrategyNotActive();

    event Deposit(address indexed caller, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, uint256 assets, uint256 shares);
    event StrategyPausedStatus(bool paused);

    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function previewDeposit(uint256 assets) external view returns (uint256 shares);
    function previewWithdraw(uint256 assets) external view returns (uint256 shares);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
    function maxDeposit(address receiver) external view returns (uint256 maxAssets);
    function maxWithdraw(address owner) external view returns (uint256 maxAssets);
    function maxRedeem(address owner) external view returns (uint256 maxShares);
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
    function harvest() external returns (uint256 yield);
}