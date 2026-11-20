// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal read interface for the SPACE ID Agent ID contract on BNB Chain
///         (0x60b9262456de011f7d15a54cdd8c48baaa8b022f). Verified on-chain 2026-11-21:
///         ERC-721 + Metadata, NO ERC721Enumerable. tokenId = uint256(keccak256(name)).
interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}
