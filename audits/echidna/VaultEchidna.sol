// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../../contracts/vault/Vault.sol";
import "../../contracts/mocks/MockERC20.sol";
import "../../contracts/strategy/Strategy.sol";
import "../../contracts/rewards/Rewards1155.sol";
import "../../contracts/proxy/VaultFactory.sol";

contract VaultEchidna {
    Vault public vault;
    MockERC20 public token;
    Strategy public strategy;
    Rewards1155 public rewards;
    VaultFactory public factory;

    address public echidnaAddress = address(0x00a329c0648769A73afAc7F9381E08FB43dBEA72);
    uint256 public constant INITIAL_BALANCE = 1000000 * 10**6; // 1M tokens

    constructor() {
        // Deploy mock token
        token = new MockERC20("Test Token", "TEST", 6, INITIAL_BALANCE);

        // For fuzzing, we'll use implementation contracts directly
        vault = new Vault();
        strategy = new Strategy();
        rewards = new Rewards1155();

        // Initialize contracts
        vault.initialize(
            IERC20(address(token)),
            "Test Vault",
            "TVAULT",
            echidnaAddress,
            echidnaAddress
        );

        strategy.initialize(
            IERC20(address(token)),
            "Test Strategy",
            "TSTRAT",
            echidnaAddress,
            echidnaAddress,
            1000, // 10% performance fee
            200   // 2% management fee
        );

        rewards.initialize(
            "https://api.example.com/{id}.json",
            echidnaAddress
        );

        // Set up vault with strategy
        vault.addStrategy(IStrategy(address(strategy)), 5000); // 50% allocation
        vault.setRewardsContract(rewards);

        // Mint tokens to echidna for testing
        token.mint(echidnaAddress, INITIAL_BALANCE);
        token.approve(address(vault), type(uint256).max);
    }

    // INVARIANT: Total assets should equal vault balance + strategy assets
    function echidna_total_assets_consistency() public view returns (bool) {
        uint256 vaultBalance = token.balanceOf(address(vault));
        uint256 strategyAssets = vault.getStrategyAssets(address(strategy));
        uint256 totalAssets = vault.totalAssets();

        return totalAssets == vaultBalance + strategyAssets;
    }

    // INVARIANT: Share price should never decrease without withdrawals
    function echidna_share_price_monotonic() public view returns (bool) {
        uint256 totalSupply = vault.totalSupply();
        uint256 totalAssets = vault.totalAssets();

        if (totalSupply == 0) return true;

        uint256 sharePrice = (totalAssets * 1e18) / totalSupply;
        return sharePrice >= 1e18; // At least 1:1 ratio
    }

    // INVARIANT: Total strategy allocations should not exceed 100%
    function echidna_allocation_bounds() public view returns (bool) {
        return vault.totalAllocations() <= 10000; // MAX_BPS
    }

    // INVARIANT: User balances should be consistent
    function echidna_user_balance_consistency() public view returns (bool) {
        uint256 userShares = vault.balanceOf(echidnaAddress);
        uint256 totalSupply = vault.totalSupply();

        return userShares <= totalSupply;
    }

    // INVARIANT: Vault should not hold more tokens than deposited
    function echidna_no_token_creation() public view returns (bool) {
        uint256 vaultBalance = token.balanceOf(address(vault));
        uint256 strategyBalance = token.balanceOf(address(strategy));
        uint256 totalManaged = vaultBalance + strategyBalance;

        // Should not exceed initial supply minus user balance
        uint256 userBalance = token.balanceOf(echidnaAddress);
        return totalManaged <= INITIAL_BALANCE - userBalance;
    }

    // INVARIANT: Performance fees should be within bounds
    function echidna_fee_bounds() public view returns (bool) {
        return vault.performanceFee() <= 2000 && vault.managementFee() <= 500;
    }

    // Fuzz function: Random deposits
    function deposit(uint256 amount) public {
        amount = amount % (token.balanceOf(echidnaAddress) / 10); // Limit to reasonable amount
        if (amount == 0) return;

        try vault.deposit(amount, echidnaAddress) {} catch {}
    }

    // Fuzz function: Random withdrawals
    function withdraw(uint256 amount) public {
        uint256 maxWithdraw = vault.maxWithdraw(echidnaAddress);
        if (maxWithdraw == 0) return;

        amount = amount % maxWithdraw;
        if (amount == 0) return;

        try vault.withdraw(amount, echidnaAddress, echidnaAddress) {} catch {}
    }

    // Fuzz function: Random redeems
    function redeem(uint256 shares) public {
        uint256 userShares = vault.balanceOf(echidnaAddress);
        if (userShares == 0) return;

        shares = shares % userShares;
        if (shares == 0) return;

        try vault.redeem(shares, echidnaAddress, echidnaAddress) {} catch {}
    }

    // Fuzz function: Harvest strategy
    function harvest() public {
        // Add some yield first
        uint256 yieldAmount = 1000 * 10**6; // 1000 tokens
        token.mint(address(strategy), yieldAmount);

        try vault.harvest(address(strategy)) {} catch {}
    }

    // Fuzz function: Rebalance
    function rebalance() public {
        try vault.rebalance() {} catch {}
    }
}