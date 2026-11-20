// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentShieldRegistry} from "../src/AgentShieldRegistry.sol";
import {MockAgentID} from "../src/mocks/MockAgentID.sol";

contract AgentShieldRegistryTest is Test {
    MockAgentID internal mock;
    AgentShieldRegistry internal registry;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol"); // holds no Agent ID

    // tokenId derivation mirrors the real contract: uint256(keccak256(name))
    uint256 internal aliceToken = uint256(keccak256("aliceagent"));
    uint256 internal bobToken = uint256(keccak256("bobagent"));

    uint8 internal constant ALL_FLAGS = 7;

    function setUp() public {
        mock = new MockAgentID();
        registry = new AgentShieldRegistry(address(mock));
        mock.mint(alice, aliceToken);
        mock.mint(bob, bobToken);
    }

    function _registerAlice() internal {
        vm.prank(alice);
        registry.setPolicy(ALL_FLAGS, 0.1 ether, aliceToken);
    }

    // ── Registration ───────────────────────────────────────────────────────
    function test_RegisterSuccess() public {
        _registerAlice();
        assertTrue(registry.isRegistered(alice));
        assertEq(registry.totalRegistered(), 1);
        AgentShieldRegistry.Policy memory p = registry.getPolicy(alice);
        assertEq(p.agentTokenId, aliceToken);
        assertEq(p.flags, ALL_FLAGS);
        assertEq(p.maxTxValueWei, 0.1 ether);
        assertEq(p.currentStreak, 0);
    }

    function test_RegisterRevertsWithoutAgentId() public {
        vm.prank(carol);
        vm.expectRevert(AgentShieldRegistry.NotAgentIdHolder.selector);
        registry.setPolicy(ALL_FLAGS, 0, 12345);
    }

    function test_RegisterRevertsWithSomeoneElsesToken() public {
        vm.prank(alice);
        vm.expectRevert(AgentShieldRegistry.AgentTokenNotOwned.selector);
        registry.setPolicy(ALL_FLAGS, 0, bobToken);
    }

    function test_RegisterRevertsWithNonexistentToken() public {
        vm.prank(alice);
        vm.expectRevert(); // ownerOf reverts inside the Agent ID contract
        registry.setPolicy(ALL_FLAGS, 0, 999999);
    }

    function test_RegisterRevertsInvalidFlags() public {
        vm.prank(alice);
        vm.expectRevert(AgentShieldRegistry.InvalidFlags.selector);
        registry.setPolicy(8, 0, aliceToken);
    }

    function test_UpdatePolicySameToken() public {
        _registerAlice();
        vm.prank(alice);
        registry.setPolicy(1, 0, aliceToken);
        AgentShieldRegistry.Policy memory p = registry.getPolicy(alice);
        assertEq(p.flags, 1);
        assertEq(p.maxTxValueWei, 0);
        assertEq(registry.totalRegistered(), 1); // update is not a new registration
    }

    function test_UpdateRevertsWithDifferentToken() public {
        _registerAlice();
        mock.mint(alice, uint256(keccak256("second")));
        vm.prank(alice);
        vm.expectRevert(AgentShieldRegistry.AgentTokenMismatch.selector);
        registry.setPolicy(1, 0, uint256(keccak256("second")));
    }

    // ── Check-in & streaks ─────────────────────────────────────────────────
    function test_CheckInRevertsWhenNotRegistered() public {
        vm.prank(alice);
        vm.expectRevert(AgentShieldRegistry.NotRegistered.selector);
        registry.checkIn();
    }

    function test_FirstCheckInStartsStreak() public {
        _registerAlice();
        vm.prank(alice);
        registry.checkIn();
        AgentShieldRegistry.Policy memory p = registry.getPolicy(alice);
        assertEq(p.currentStreak, 1);
        assertEq(p.bestStreak, 1);
        assertEq(p.totalCheckIns, 1);
        assertTrue(registry.isActive(alice));
    }

    function test_CheckInTooSoonReverts() public {
        _registerAlice();
        vm.prank(alice);
        registry.checkIn();
        vm.warp(block.timestamp + 19 hours);
        vm.prank(alice);
        vm.expectRevert();
        registry.checkIn();
    }

    function test_StreakContinuesWithinWindow() public {
        _registerAlice();
        vm.prank(alice);
        registry.checkIn();
        vm.warp(block.timestamp + 24 hours);
        vm.prank(alice);
        registry.checkIn();
        assertEq(registry.getPolicy(alice).currentStreak, 2);
    }

    function test_StreakResetsAfterWindow() public {
        _registerAlice();
        vm.prank(alice);
        registry.checkIn();
        vm.warp(block.timestamp + 49 hours);
        vm.prank(alice);
        registry.checkIn();
        AgentShieldRegistry.Policy memory p = registry.getPolicy(alice);
        assertEq(p.currentStreak, 1);
        assertEq(p.bestStreak, 1);
        assertEq(p.totalCheckIns, 2);
    }

    function test_IsActiveExpiresAfter7Days() public {
        _registerAlice();
        vm.prank(alice);
        registry.checkIn();
        vm.warp(block.timestamp + 7 days + 1);
        assertFalse(registry.isActive(alice));
    }

    // ── Score & badge ──────────────────────────────────────────────────────
    function test_ShieldScoreUnregisteredIsZero() public view {
        assertEq(registry.shieldScore(carol), 0);
        assertEq(registry.badgeTier(carol), 0);
    }

    function test_ShieldScoreRegisteredNoCheckIn() public {
        _registerAlice(); // all 3 flags
        assertEq(registry.shieldScore(alice), 70); // 40 + 30, no activity yet
        assertEq(registry.badgeTier(alice), 1); // Member
    }

    function test_ShieldScorePartialFlags() public {
        vm.prank(bob);
        registry.setPolicy(1, 0, bobToken); // 1 of 3 flags
        assertEq(registry.shieldScore(bob), 50); // 40 + 10
    }

    function test_BadgeProgressionAndScoreCap() public {
        _registerAlice();
        // 7 daily check-ins -> streak 7 -> Gold, score 40+30+15+15 = 100
        for (uint256 i = 0; i < 7; i++) {
            vm.prank(alice);
            registry.checkIn();
            vm.warp(block.timestamp + 24 hours);
        }
        assertEq(registry.getPolicy(alice).currentStreak, 7);
        assertEq(registry.badgeTier(alice), 4);
        assertEq(registry.shieldScore(alice), 100);
    }

    function test_BadgeFallsBackToMemberWhenStreakDies() public {
        _registerAlice();
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(alice);
            registry.checkIn();
            vm.warp(block.timestamp + 24 hours);
        }
        assertEq(registry.badgeTier(alice), 2); // Bronze while streak alive
        vm.warp(block.timestamp + 49 hours);
        assertEq(registry.badgeTier(alice), 1); // back to Member
    }

    // ── Owner / pause ──────────────────────────────────────────────────────
    function test_PauseBlocksNewRegistrationButNotUpdate() public {
        _registerAlice();
        registry.pauseRegistrations(); // test contract is the owner
        vm.prank(bob);
        vm.expectRevert(AgentShieldRegistry.RegistrationsArePaused.selector);
        registry.setPolicy(ALL_FLAGS, 0, bobToken);
        // existing user can still update while paused
        vm.prank(alice);
        registry.setPolicy(3, 0, aliceToken);
        assertEq(registry.getPolicy(alice).flags, 3);
    }

    function test_NonOwnerCannotPause() public {
        vm.prank(alice);
        vm.expectRevert(AgentShieldRegistry.NotOwner.selector);
        registry.pauseRegistrations();
    }

    // ── Safety: the contract cannot receive funds ──────────────────────────
    function test_ContractRejectsPlainEther() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool ok,) = address(registry).call{value: 0.5 ether}("");
        assertFalse(ok);
        assertEq(address(registry).balance, 0);
    }
}
