// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice TEST / TESTNET MOCK ONLY — not for production use.
///         Minimal stand-in for the SPACE ID Agent ID contract implementing
///         only the two reads AgentShieldRegistry needs (balanceOf, ownerOf),
///         plus a permissionless mint so tests and a BSC-testnet deployment
///         can assign Agent IDs freely. The real Agent ID contract is
///         non-transferable and mints only inside the Binance App; this mock
///         deliberately does NOT model that — it exists so the registry's
///         ownership checks can be exercised.
contract MockAgentID {
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;

    function mint(address to, uint256 tokenId) external {
        require(to != address(0), "zero address");
        require(_owners[tokenId] == address(0), "already minted");
        _owners[tokenId] = to;
        _balances[to] += 1;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "zero address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "nonexistent token");
        return o;
    }
}
