// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC4626Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {AccessRoles} from "../access/AccessRoles.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";

contract Strategy is
    IStrategy,
    ERC4626Upgradeable,
    AccessRoles,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    uint256 public constant MAX_BPS = 10000;
    uint256 public constant MIN_DEPOSIT = 1e6;

    uint256 private _totalAssets;
    uint256 public performanceFee;
    uint256 public managementFee;
    uint256 public maxTotalAssets;
    address public feeRecipient;

    mapping(address => uint256) private _userLastDeposit;
    uint256 public withdrawalDelay;

    event PerformanceFeeUpdated(uint256 oldFee, uint256 newFee);
    event ManagementFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event MaxTotalAssetsUpdated(uint256 oldMax, uint256 newMax);
    event WithdrawalDelayUpdated(uint256 oldDelay, uint256 newDelay);

    function initialize(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _admin,
        address _feeRecipient,
        uint256 _performanceFee,
        uint256 _managementFee
    ) external initializer {
        __ERC4626_init(_asset);
        __ERC20_init(_name, _symbol);
        __AccessRoles_init(_admin);
        __Pausable_init();
        __ReentrancyGuard_init();

        feeRecipient = _feeRecipient;
        performanceFee = _performanceFee;
        managementFee = _managementFee;
        maxTotalAssets = type(uint256).max;
        withdrawalDelay = 0;

        emit PerformanceFeeUpdated(0, _performanceFee);
        emit ManagementFeeUpdated(0, _managementFee);
        emit FeeRecipientUpdated(address(0), _feeRecipient);
    }

    function deposit(uint256 assets, address receiver)
        public
        override(ERC4626Upgradeable, IStrategy)
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        if (assets < MIN_DEPOSIT) revert InsufficientBalance();
        if (receiver == address(0)) revert InvalidAsset();
        if (_totalAssets + assets > maxTotalAssets) revert InsufficientBalance();

        uint256 shares = super.deposit(assets, receiver);
        _userLastDeposit[receiver] = block.timestamp;
        _totalAssets += assets;

        emit Deposit(msg.sender, assets, shares);
        return shares;
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public
        override(ERC4626Upgradeable, IStrategy)
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        if (assets == 0) revert InsufficientBalance();
        if (receiver == address(0)) revert InvalidAsset();
        if (block.timestamp < _userLastDeposit[owner] + withdrawalDelay) {
            revert InsufficientBalance();
        }

        uint256 shares = super.withdraw(assets, receiver, owner);
        _totalAssets -= assets;

        emit Withdraw(msg.sender, assets, shares);
        return shares;
    }

    function redeem(uint256 shares, address receiver, address owner)
        public
        override(ERC4626Upgradeable, IStrategy)
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        if (shares == 0) revert InsufficientBalance();
        if (receiver == address(0)) revert InvalidAsset();
        if (block.timestamp < _userLastDeposit[owner] + withdrawalDelay) {
            revert InsufficientBalance();
        }

        uint256 assets = super.redeem(shares, receiver, owner);
        _totalAssets -= assets;

        emit Withdraw(msg.sender, assets, shares);
        return assets;
    }

    function totalAssets() public view override(ERC4626Upgradeable, IStrategy) returns (uint256) {
        return _totalAssets;
    }

    function maxDeposit(address) public view override(ERC4626Upgradeable, IStrategy) returns (uint256) {
        if (paused()) return 0;
        return maxTotalAssets - _totalAssets;
    }

    function maxWithdraw(address owner) public view override(ERC4626Upgradeable, IStrategy) returns (uint256) {
        if (paused()) return 0;
        if (block.timestamp < _userLastDeposit[owner] + withdrawalDelay) return 0;
        return _convertToAssets(balanceOf(owner), Math.Rounding.Floor);
    }

    function maxRedeem(address owner) public view override(ERC4626Upgradeable, IStrategy) returns (uint256) {
        if (paused()) return 0;
        if (block.timestamp < _userLastDeposit[owner] + withdrawalDelay) return 0;
        return balanceOf(owner);
    }

    function asset() public view override(ERC4626Upgradeable, IStrategy) returns (address) {
        return super.asset();
    }

    function previewDeposit(uint256 assets) public view override(ERC4626Upgradeable, IStrategy) returns (uint256) {
        return super.previewDeposit(assets);
    }

    function previewWithdraw(uint256 assets) public view override(ERC4626Upgradeable, IStrategy) returns (uint256) {
        return super.previewWithdraw(assets);
    }

    function previewRedeem(uint256 shares) public view override(ERC4626Upgradeable, IStrategy) returns (uint256) {
        return super.previewRedeem(shares);
    }

    function harvest() external onlyStrategyManager returns (uint256 yield) {
        uint256 currentBalance = IERC20(asset()).balanceOf(address(this));
        if (currentBalance > _totalAssets) {
            yield = currentBalance - _totalAssets;

            uint256 performanceFeeAmount = (yield * performanceFee) / MAX_BPS;
            if (performanceFeeAmount > 0) {
                IERC20(asset()).safeTransfer(feeRecipient, performanceFeeAmount);
                yield -= performanceFeeAmount;
            }

            _totalAssets += yield;
        }
    }

    function setPerformanceFee(uint256 _performanceFee) external onlyAdmin {
        if (_performanceFee > 2000) revert InvalidAsset(); // Max 20%
        uint256 oldFee = performanceFee;
        performanceFee = _performanceFee;
        emit PerformanceFeeUpdated(oldFee, _performanceFee);
    }

    function setManagementFee(uint256 _managementFee) external onlyAdmin {
        if (_managementFee > 500) revert InvalidAsset(); // Max 5%
        uint256 oldFee = managementFee;
        managementFee = _managementFee;
        emit ManagementFeeUpdated(oldFee, _managementFee);
    }

    function setFeeRecipient(address _feeRecipient) external onlyAdmin {
        if (_feeRecipient == address(0)) revert InvalidAsset();
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(oldRecipient, _feeRecipient);
    }

    function setMaxTotalAssets(uint256 _maxTotalAssets) external onlyAdmin {
        uint256 oldMax = maxTotalAssets;
        maxTotalAssets = _maxTotalAssets;
        emit MaxTotalAssetsUpdated(oldMax, _maxTotalAssets);
    }

    function setWithdrawalDelay(uint256 _withdrawalDelay) external onlyAdmin {
        if (_withdrawalDelay > 7 days) revert InvalidAsset();
        uint256 oldDelay = withdrawalDelay;
        withdrawalDelay = _withdrawalDelay;
        emit WithdrawalDelayUpdated(oldDelay, _withdrawalDelay);
    }

    function pause() external override onlyPauser {
        _pause();
        emit StrategyPausedStatus(true);
    }

    function unpause() external override onlyPauser {
        _unpause();
        emit StrategyPausedStatus(false);
    }

    function paused() public view override(PausableUpgradeable, IStrategy) returns (bool) {
        return super.paused();
    }

    function emergencyWithdraw() external onlyEmergency {
        uint256 balance = IERC20(asset()).balanceOf(address(this));
        if (balance > 0) {
            IERC20(asset()).safeTransfer(feeRecipient, balance);
        }
    }

    function getUserLastDeposit(address user) external view returns (uint256) {
        return _userLastDeposit[user];
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyUpgrader {}

    uint256[44] private __gap;
}