// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {AgentShieldRegistry} from "../src/AgentShieldRegistry.sol";
import {MockAgentID} from "../src/mocks/MockAgentID.sol";

/// @notice BSC TESTNET deploy: MockAgentID + registry wired to the mock.
///         Run (deployer key supplied by the operator at run time, never
///         committed):  forge script script/DeployTestnet.s.sol --rpc-url bsc_testnet --broadcast
contract DeployTestnet is Script {
    function run() external returns (MockAgentID mock, AgentShieldRegistry registry) {
        vm.startBroadcast();
        mock = new MockAgentID();
        registry = new AgentShieldRegistry(address(mock));
        vm.stopBroadcast();
    }
}
