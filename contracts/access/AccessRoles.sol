// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract AccessRoles is Initializable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant STRATEGY_MANAGER_ROLE = keccak256("STRATEGY_MANAGER_ROLE");
    bytes32 public constant REWARD_MANAGER_ROLE = keccak256("REWARD_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    error InvalidRole();
    error UnauthorizedAccess();

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    modifier onlyAdmin() {
        if (!hasRole(ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        _;
    }

    modifier onlyUpgrader() {
        if (!hasRole(UPGRADER_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        _;
    }

    modifier onlyPauser() {
        if (!hasRole(PAUSER_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        _;
    }

    modifier onlyStrategyManager() {
        if (!hasRole(STRATEGY_MANAGER_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        _;
    }

    modifier onlyRewardManager() {
        if (!hasRole(REWARD_MANAGER_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        _;
    }

    modifier onlyEmergency() {
        if (!hasRole(EMERGENCY_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        _;
    }

    function __AccessRoles_init(address admin) internal onlyInitializing {
        __AccessRoles_init_unchained(admin);
    }

    function __AccessRoles_init_unchained(address admin) internal onlyInitializing {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(STRATEGY_MANAGER_ROLE, admin);
        _grantRole(REWARD_MANAGER_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);

        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(UPGRADER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(STRATEGY_MANAGER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(REWARD_MANAGER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(EMERGENCY_ROLE, ADMIN_ROLE);
    }

    function grantRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
        emit RoleGranted(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
        emit RoleRevoked(role, account, msg.sender);
    }

    function renounceRole(bytes32 role, address account) public override {
        if (account != msg.sender) {
            revert UnauthorizedAccess();
        }
        _revokeRole(role, account);
        emit RoleRevoked(role, account, msg.sender);
    }

    function isAdmin(address account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }

    function isUpgrader(address account) external view returns (bool) {
        return hasRole(UPGRADER_ROLE, account);
    }

    function isPauser(address account) external view returns (bool) {
        return hasRole(PAUSER_ROLE, account);
    }

    function isStrategyManager(address account) external view returns (bool) {
        return hasRole(STRATEGY_MANAGER_ROLE, account);
    }

    function isRewardManager(address account) external view returns (bool) {
        return hasRole(REWARD_MANAGER_ROLE, account);
    }

    function isEmergencyRole(address account) external view returns (bool) {
        return hasRole(EMERGENCY_ROLE, account);
    }

    uint256[50] private __gap;
}