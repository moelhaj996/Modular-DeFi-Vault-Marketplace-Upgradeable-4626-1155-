// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {Vault} from "../vault/Vault.sol";
import {Rewards1155} from "../rewards/Rewards1155.sol";
import {Strategy} from "../strategy/Strategy.sol";

contract VaultFactory is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    error InvalidImplementation();
    error InvalidAsset();
    error ZeroAddress();

    event VaultCreated(
        address indexed vault,
        address indexed asset,
        address indexed creator,
        string name,
        string symbol
    );
    event RewardsCreated(address indexed rewards, address indexed vault, string uri);
    event StrategyCreated(address indexed strategy, address indexed asset, string name);
    event ImplementationUpdated(string contractType, address indexed newImplementation);

    struct VaultInfo {
        address vault;
        address asset;
        address rewards;
        address creator;
        uint256 createdAt;
        bool active;
    }

    address public vaultImplementation;
    address public rewardsImplementation;
    address public strategyImplementation;

    mapping(address => VaultInfo) public vaults;
    mapping(address => address[]) public userVaults;
    address[] public allVaults;

    uint256 public totalVaults;
    uint256 public creationFee;
    address public feeRecipient;

    function initialize(
        address _vaultImplementation,
        address _rewardsImplementation,
        address _strategyImplementation,
        address _owner,
        address _feeRecipient,
        uint256 _creationFee
    ) external initializer {
        if (_vaultImplementation == address(0)) revert ZeroAddress();
        if (_rewardsImplementation == address(0)) revert ZeroAddress();
        if (_strategyImplementation == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();

        __UUPSUpgradeable_init();
        __Ownable_init(_owner);

        vaultImplementation = _vaultImplementation;
        rewardsImplementation = _rewardsImplementation;
        strategyImplementation = _strategyImplementation;
        feeRecipient = _feeRecipient;
        creationFee = _creationFee;
    }

    function createVault(
        IERC20 asset,
        string memory name,
        string memory symbol,
        string memory rewardsUri
    ) external payable returns (address vault, address rewards) {
        if (address(asset) == address(0)) revert InvalidAsset();
        if (msg.value < creationFee) revert InvalidAsset();

        // Deploy vault proxy
        bytes memory vaultInitData = abi.encodeWithSelector(
            Vault.initialize.selector,
            asset,
            name,
            symbol,
            msg.sender,
            msg.sender
        );

        vault = address(new ERC1967Proxy(vaultImplementation, vaultInitData));

        // Deploy rewards proxy
        bytes memory rewardsInitData = abi.encodeWithSelector(
            Rewards1155.initialize.selector,
            rewardsUri,
            msg.sender
        );

        rewards = address(new ERC1967Proxy(rewardsImplementation, rewardsInitData));

        // Set rewards contract in vault
        Vault(vault).setRewardsContract(Rewards1155(rewards));

        // Store vault info
        vaults[vault] = VaultInfo({
            vault: vault,
            asset: address(asset),
            rewards: rewards,
            creator: msg.sender,
            createdAt: block.timestamp,
            active: true
        });

        userVaults[msg.sender].push(vault);
        allVaults.push(vault);
        totalVaults++;

        // Transfer creation fee
        if (creationFee > 0 && feeRecipient != address(0)) {
            payable(feeRecipient).transfer(creationFee);
        }

        emit VaultCreated(vault, address(asset), msg.sender, name, symbol);
        emit RewardsCreated(rewards, vault, rewardsUri);

        return (vault, rewards);
    }

    function createStrategy(
        IERC20 asset,
        string memory name,
        string memory symbol,
        address feeRecipient_,
        uint256 performanceFee,
        uint256 managementFee
    ) external returns (address strategy) {
        if (address(asset) == address(0)) revert InvalidAsset();
        if (feeRecipient_ == address(0)) revert ZeroAddress();

        bytes memory initData = abi.encodeWithSelector(
            Strategy.initialize.selector,
            asset,
            name,
            symbol,
            msg.sender,
            feeRecipient_,
            performanceFee,
            managementFee
        );

        strategy = address(new ERC1967Proxy(strategyImplementation, initData));

        emit StrategyCreated(strategy, address(asset), name);
        return strategy;
    }

    function setVaultImplementation(address _implementation) external onlyOwner {
        if (_implementation == address(0)) revert ZeroAddress();
        vaultImplementation = _implementation;
        emit ImplementationUpdated("Vault", _implementation);
    }

    function setRewardsImplementation(address _implementation) external onlyOwner {
        if (_implementation == address(0)) revert ZeroAddress();
        rewardsImplementation = _implementation;
        emit ImplementationUpdated("Rewards", _implementation);
    }

    function setStrategyImplementation(address _implementation) external onlyOwner {
        if (_implementation == address(0)) revert ZeroAddress();
        strategyImplementation = _implementation;
        emit ImplementationUpdated("Strategy", _implementation);
    }

    function setCreationFee(uint256 _fee) external onlyOwner {
        creationFee = _fee;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        feeRecipient = _recipient;
    }

    function getVaultInfo(address vault) external view returns (VaultInfo memory) {
        return vaults[vault];
    }

    function getUserVaults(address user) external view returns (address[] memory) {
        return userVaults[user];
    }

    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }

    function isVaultActive(address vault) external view returns (bool) {
        return vaults[vault].active;
    }

    function deactivateVault(address vault) external onlyOwner {
        vaults[vault].active = false;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    uint256[45] private __gap;
}