// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentShieldRegistry} from "../src/AgentShieldRegistry.sol";
import {MockAgentID} from "../src/mocks/MockAgentID.sol";

/// @notice Smoke test against a deployed MockAgentID + registry (Anvil or BSC
///         testnet). The broadcaster mints itself a mock Agent ID, registers a
///         full policy, checks in, and logs the resulting score/tier.
///         Env: MOCK_ADDRESS, REGISTRY_ADDRESS.
contract SmokeTestnet is Script {
    function run() external {
        MockAgentID mock = MockAgentID(vm.envAddress("MOCK_ADDRESS"));
        AgentShieldRegistry registry = AgentShieldRegistry(vm.envAddress("REGISTRY_ADDRESS"));
        uint256 tokenId = uint256(keccak256("smoketester"));

        vm.startBroadcast();
        mock.mint(msg.sender, tokenId);
        registry.setPolicy(7, 0.1 ether, tokenId);
        registry.checkIn();
        vm.stopBroadcast();

        console.log("isRegistered:", registry.isRegistered(msg.sender));
        console.log("shieldScore:", registry.shieldScore(msg.sender));
        console.log("badgeTier:", registry.badgeTier(msg.sender));
        console.log("isActive:", registry.isActive(msg.sender));
    }
}
