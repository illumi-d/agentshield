// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {AgentShieldRegistry} from "../src/AgentShieldRegistry.sol";

/// @notice BSC MAINNET deploy: registry wired to the real SPACE ID Agent ID
///         contract. DO NOT broadcast without the operator's explicit
///         confirmation and a fresh review of the deployer, chain, and
///         constructor argument below.
///         Run: forge script script/DeployMainnet.s.sol --rpc-url bsc --broadcast
contract DeployMainnet is Script {
    // SPACE ID Agent ID (BNB Chain mainnet) — from the official Binance
    // hackathon announcement, verified on-chain 2026-11-21 (D0-REPORT.md).
    address internal constant AGENT_ID = 0x60b9262456de011f7d15a54cdd8c48baaa8b022f;

    function run() external returns (AgentShieldRegistry registry) {
        vm.startBroadcast();
        registry = new AgentShieldRegistry(AGENT_ID);
        vm.stopBroadcast();
    }
}
