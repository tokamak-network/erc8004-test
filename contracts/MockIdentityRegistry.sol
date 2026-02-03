// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Mock for ERC-8004 Identity Registry. Used in tests so addresses can be "registered".
contract MockIdentityRegistry {
    mapping(address => uint256) private _balance;

    function balanceOf(address owner) external view returns (uint256) {
        return _balance[owner];
    }

    /// @dev Mark an address as having one registered identity (for tests).
    function register(address account) external {
        _balance[account] = 1;
    }

    /// @dev Set balance to 0 (for testing unregistered behavior).
    function unregister(address account) external {
        _balance[account] = 0;
    }
}
