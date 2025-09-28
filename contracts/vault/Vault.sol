// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC4626Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {AccessRoles} from "../access/AccessRoles.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";
import {IRewards} from "../interfaces/IRewards.sol";

contract Vault is
    IVault,
    ERC4626Upgradeable,
    AccessRoles,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;
    using Math for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 public constant MAX_BPS = 10000;
    uint256 public constant MAX_STRATEGIES = 20;
    uint256 public constant MIN_ALLOCATION = 100; // 1%
    uint256 public constant REBALANCE_THRESHOLD = 500; // 5%

    mapping(address => StrategyInfo) private _strategies;
    EnumerableSet.AddressSet private _strategyList;

    uint256 public totalAllocations;
    uint256 public depositLimit;
    uint256 public withdrawLimit;
    uint256 public performanceFee;
    uint256 public managementFee;
    address public feeRecipient;
    IRewards public rewardsContract;

    mapping(address => uint256) private _userLastAction;
    mapping(address => uint256) private _userTotalDeposits;

    event RewardsContractUpdated(address indexed newRewards);
    event PerformanceFeeUpdated(uint256 newFee);
    event ManagementFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address newRecipient);

    function initialize(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _admin,
        address _feeRecipient
    ) external initializer {
        __ERC4626_init(_asset);
        __ERC20_init(_name, _symbol);
        __AccessRoles_init(_admin);
        __Pausable_init();
        __ReentrancyGuard_init();

        feeRecipient = _feeRecipient;
        depositLimit = type(uint256).max;
        withdrawLimit = type(uint256).max;
        performanceFee = 1000; // 10%
        managementFee = 200;   // 2%
    }

    function deposit(uint256 assets, address receiver)
        public
        override(ERC4626Upgradeable)
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        if (assets > depositLimit) revert DepositLimitExceeded();
        if (receiver == address(0)) revert InvalidReceiver();

        uint256 shares = super.deposit(assets, receiver);

        _userLastAction[receiver] = block.timestamp;
        _userTotalDeposits[receiver] += assets;

        _deployToStrategies(assets);
        _updateRewards(receiver, assets, true);

        return shares;
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public
        override(ERC4626Upgradeable)
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        if (assets > withdrawLimit) revert WithdrawLimitExceeded();
        if (receiver == address(0)) revert InvalidReceiver();

        _withdrawFromStrategies(assets);
        uint256 shares = super.withdraw(assets, receiver, owner);

        _userLastAction[owner] = block.timestamp;
        _updateRewards(owner, assets, false);

        return shares;
    }

    function redeem(uint256 shares, address receiver, address owner)
        public
        override(ERC4626Upgradeable)
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        if (receiver == address(0)) revert InvalidReceiver();

        uint256 assets = previewRedeem(shares);
        if (assets > withdrawLimit) revert WithdrawLimitExceeded();

        _withdrawFromStrategies(assets);
        assets = super.redeem(shares, receiver, owner);

        _userLastAction[owner] = block.timestamp;
        _updateRewards(owner, assets, false);

        return assets;
    }

    function addStrategy(IStrategy strategy, uint256 allocation) external onlyStrategyManager {
        if (address(strategy) == address(0)) revert InvalidStrategy();
        if (allocation < MIN_ALLOCATION) revert InvalidStrategy();
        if (_strategyList.length() >= MAX_STRATEGIES) revert InvalidStrategy();
        if (_strategies[address(strategy)].active) revert StrategyAlreadyExists();
        if (address(strategy.asset()) != asset()) revert InvalidStrategy();

        if (totalAllocations + allocation > MAX_BPS) revert InvalidStrategy();

        _strategies[address(strategy)] = StrategyInfo({
            strategy: strategy,
            allocation: allocation,
            totalAssets: 0,
            active: true
        });

        _strategyList.add(address(strategy));
        totalAllocations += allocation;

        emit StrategyAdded(address(strategy), allocation);
    }

    function removeStrategy(address strategy) external onlyStrategyManager {
        if (!_strategies[strategy].active) revert InvalidStrategy();

        _emergencyWithdrawFromStrategy(strategy);

        totalAllocations -= _strategies[strategy].allocation;
        delete _strategies[strategy];
        _strategyList.remove(strategy);

        emit StrategyRemoved(strategy);
    }

    function updateStrategyAllocation(address strategy, uint256 newAllocation)
        external
        onlyStrategyManager
    {
        if (!_strategies[strategy].active) revert InvalidStrategy();
        if (newAllocation < MIN_ALLOCATION) revert InvalidStrategy();

        uint256 oldAllocation = _strategies[strategy].allocation;
        uint256 allocationDiff;

        if (newAllocation > oldAllocation) {
            allocationDiff = newAllocation - oldAllocation;
            if (totalAllocations + allocationDiff > MAX_BPS) revert InvalidStrategy();
            totalAllocations += allocationDiff;
        } else {
            allocationDiff = oldAllocation - newAllocation;
            totalAllocations -= allocationDiff;
        }

        _strategies[strategy].allocation = newAllocation;
        emit StrategyUpdated(strategy, newAllocation);
    }

    function harvest(address strategy) public onlyStrategyManager returns (uint256 yield) {
        if (!_strategies[strategy].active) revert InvalidStrategy();

        yield = _strategies[strategy].strategy.harvest();
        if (yield > 0) {
            _strategies[strategy].totalAssets += yield;

            uint256 feeAmount = (yield * performanceFee) / MAX_BPS;
            if (feeAmount > 0) {
                IERC20(asset()).safeTransfer(feeRecipient, feeAmount);
                yield -= feeAmount;
            }
        }

        emit Harvest(strategy, yield);
        return yield;
    }

    function harvestAll() external onlyStrategyManager returns (uint256 totalYield) {
        address[] memory strategies = _strategyList.values();

        for (uint256 i = 0; i < strategies.length; i++) {
            if (_strategies[strategies[i]].active) {
                totalYield += harvest(strategies[i]);
            }
        }

        return totalYield;
    }

    function emergencyWithdraw(address strategy) external onlyEmergency {
        _emergencyWithdrawFromStrategy(strategy);
        emit EmergencyWithdraw(strategy, _strategies[strategy].totalAssets);
    }

    function rebalance() external onlyStrategyManager {
        uint256 totalVaultAssets = totalAssets();
        address[] memory strategies = _strategyList.values();

        for (uint256 i = 0; i < strategies.length; i++) {
            address strategyAddr = strategies[i];
            if (!_strategies[strategyAddr].active) continue;

            uint256 targetAssets = (totalVaultAssets * _strategies[strategyAddr].allocation) / MAX_BPS;
            uint256 currentAssets = _strategies[strategyAddr].totalAssets;

            if (targetAssets > currentAssets) {
                uint256 deficit = targetAssets - currentAssets;
                if (deficit > IERC20(asset()).balanceOf(address(this))) {
                    deficit = IERC20(asset()).balanceOf(address(this));
                }

                if (deficit > 0) {
                    IERC20(asset()).safeTransfer(strategyAddr, deficit);
                    _strategies[strategyAddr].totalAssets += deficit;
                }
            } else if (currentAssets > targetAssets) {
                uint256 excess = currentAssets - targetAssets;
                if (excess > (currentAssets * REBALANCE_THRESHOLD) / MAX_BPS) {
                    try _strategies[strategyAddr].strategy.withdraw(excess, address(this), address(this)) {
                        _strategies[strategyAddr].totalAssets -= excess;
                    } catch {
                        // If withdrawal fails, skip rebalancing for this strategy
                    }
                }
            }
        }
    }

    function totalAssets() public view override(ERC4626Upgradeable) returns (uint256) {
        uint256 total = IERC20(asset()).balanceOf(address(this));
        address[] memory strategies = _strategyList.values();

        for (uint256 i = 0; i < strategies.length; i++) {
            if (_strategies[strategies[i]].active) {
                total += _strategies[strategies[i]].totalAssets;
            }
        }

        return total;
    }

    function _deployToStrategies(uint256 assets) internal {
        if (_strategyList.length() == 0) return;

        address[] memory strategies = _strategyList.values();
        uint256 remaining = assets;

        for (uint256 i = 0; i < strategies.length && remaining > 0; i++) {
            address strategyAddr = strategies[i];
            if (!_strategies[strategyAddr].active) continue;

            uint256 allocation = (assets * _strategies[strategyAddr].allocation) / totalAllocations;
            if (allocation > remaining) allocation = remaining;

            if (allocation > 0) {
                IERC20(asset()).safeTransfer(strategyAddr, allocation);
                _strategies[strategyAddr].totalAssets += allocation;
                remaining -= allocation;
            }
        }
    }

    function _withdrawFromStrategies(uint256 assets) internal {
        uint256 availableInVault = IERC20(asset()).balanceOf(address(this));

        if (availableInVault >= assets) return;

        uint256 needed = assets - availableInVault;
        address[] memory strategies = _strategyList.values();

        for (uint256 i = 0; i < strategies.length && needed > 0; i++) {
            address strategyAddr = strategies[i];
            if (!_strategies[strategyAddr].active) continue;

            uint256 strategyAssets = _strategies[strategyAddr].totalAssets;
            uint256 toWithdraw = needed > strategyAssets ? strategyAssets : needed;

            if (toWithdraw > 0) {
                try _strategies[strategyAddr].strategy.withdraw(toWithdraw, address(this), address(this)) {
                    _strategies[strategyAddr].totalAssets -= toWithdraw;
                    needed -= toWithdraw;
                } catch {
                    // If withdrawal fails, try next strategy
                }
            }
        }

        if (needed > 0) revert InsufficientAssets();
    }

    function _emergencyWithdrawFromStrategy(address strategy) internal {
        if (_strategies[strategy].totalAssets > 0) {
            try _strategies[strategy].strategy.withdraw(
                _strategies[strategy].totalAssets,
                address(this),
                address(this)
            ) {
                _strategies[strategy].totalAssets = 0;
            } catch {
                // Emergency withdrawal failed - mark strategy as inactive
                _strategies[strategy].active = false;
            }
        }
    }

    function _updateRewards(address user, uint256 amount, bool isDeposit) internal {
        if (address(rewardsContract) == address(0)) return;

        // Award loyalty points based on deposit amount
        if (isDeposit && amount >= 1000 * 10**IERC20Metadata(asset()).decimals()) {
            try rewardsContract.mintReward(user, 1, 1) {} catch {}
        }

        // Award achievement badge for large deposits
        if (isDeposit && amount >= 10000 * 10**IERC20Metadata(asset()).decimals()) {
            try rewardsContract.mintReward(user, 2, 1) {} catch {}
        }
    }

    // Admin functions
    function setRewardsContract(IRewards _rewardsContract) external onlyAdmin {
        rewardsContract = _rewardsContract;
        emit RewardsContractUpdated(address(_rewardsContract));
    }

    function setDepositLimit(uint256 newLimit) external onlyAdmin {
        depositLimit = newLimit;
        emit DepositLimitUpdated(newLimit);
    }

    function setWithdrawLimit(uint256 newLimit) external onlyAdmin {
        withdrawLimit = newLimit;
        emit WithdrawLimitUpdated(newLimit);
    }

    function setPerformanceFee(uint256 newFee) external onlyAdmin {
        if (newFee > 2000) revert InvalidStrategy(); // Max 20%
        performanceFee = newFee;
        emit PerformanceFeeUpdated(newFee);
    }

    function setManagementFee(uint256 newFee) external onlyAdmin {
        if (newFee > 500) revert InvalidStrategy(); // Max 5%
        managementFee = newFee;
        emit ManagementFeeUpdated(newFee);
    }

    function setFeeRecipient(address newRecipient) external onlyAdmin {
        if (newRecipient == address(0)) revert InvalidReceiver();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function pause() external onlyPauser {
        _pause();
    }

    function unpause() external onlyPauser {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyUpgrader {}

    // View functions
    function getStrategy(address strategy) external view returns (StrategyInfo memory) {
        return _strategies[strategy];
    }

    function getAllStrategies() external view returns (address[] memory) {
        return _strategyList.values();
    }

    function totalStrategies() external view returns (uint256) {
        return _strategyList.length();
    }

    function getStrategyAssets(address strategy) external view returns (uint256) {
        return _strategies[strategy].totalAssets;
    }

    function getDepositLimit() external view returns (uint256) {
        return depositLimit;
    }

    function getWithdrawLimit() external view returns (uint256) {
        return withdrawLimit;
    }

    function getUserLastAction(address user) external view returns (uint256) {
        return _userLastAction[user];
    }

    function getUserTotalDeposits(address user) external view returns (uint256) {
        return _userTotalDeposits[user];
    }

    uint256[40] private __gap;
}