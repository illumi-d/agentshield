// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentID} from "./interfaces/IAgentID.sol";

/// @title AgentShield Registry
/// @notice On-chain security-policy registry for Agent ID holders (BNB Chain).
///         Each holder registers the safety rules their agent operates under —
///         bound to their Agent ID token — proves liveness with periodic
///         check-ins, and builds a public Shield Score that any dApp can read.
///
///         Safety by construction:
///         - This contract holds NO funds: there is no payable, deposit,
///           transfer, or withdraw function anywhere in it.
///         - It never requests token approvals.
///         - The owner can ONLY pause/unpause new registrations (disclosed in
///           the README). The owner cannot change any user's policy.
///
///         Agent ID facts (verified on-chain 2026-11-21, see D0-REPORT.md):
///         the Agent ID contract is ERC-721 without Enumerable, and
///         tokenId = uint256(keccak256(name)). The frontend derives the
///         tokenId from the user's own .ai name; this contract verifies
///         ownership with ownerOf(agentTokenId) == msg.sender.
contract AgentShieldRegistry {
    // ── Policy flags (bitmask) ─────────────────────────────────────────────
    uint8 public constant FLAG_MANUAL_CONFIRM = 1; // bit0: always confirm manually
    uint8 public constant FLAG_NO_UNLIMITED_APPROVALS = 2; // bit1: never approve uint256.max
    uint8 public constant FLAG_SIMULATE_BEFORE_SIGN = 4; // bit2: simulate before signing
    uint8 private constant MAX_FLAGS = 7;

    // ── Timing ─────────────────────────────────────────────────────────────
    uint256 public constant CHECKIN_MIN_INTERVAL = 20 hours;
    uint256 public constant STREAK_WINDOW = 48 hours;
    uint256 public constant ACTIVE_WINDOW = 7 days;

    // ── State ──────────────────────────────────────────────────────────────
    IAgentID public immutable agentId;
    address public owner;
    bool public registrationsPaused;

    struct Policy {
        uint256 agentTokenId;
        uint8 flags;
        uint256 maxTxValueWei;
        uint64 registeredAt;
        uint64 updatedAt;
        uint64 lastCheckInAt;
        uint32 currentStreak;
        uint32 bestStreak;
        uint32 totalCheckIns;
        bool exists;
    }

    mapping(address => Policy) private _policies;
    uint256 public totalRegistered;
    uint256 public totalCheckIns;

    // ── Events ─────────────────────────────────────────────────────────────
    event PolicySet(address indexed user, uint256 indexed agentTokenId, uint8 flags, uint256 maxTxValueWei);
    event CheckedIn(address indexed user, uint32 streak);
    event RegistrationsPaused();
    event RegistrationsUnpaused();
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ── Errors ─────────────────────────────────────────────────────────────
    error NotOwner();
    error ZeroAddress();
    error InvalidFlags();
    error NotAgentIdHolder();
    error AgentTokenNotOwned();
    error AgentTokenMismatch();
    error RegistrationsArePaused();
    error NotRegistered();
    error CheckInTooSoon(uint256 nextAllowedAt);

    constructor(address agentIdContract) {
        if (agentIdContract == address(0)) revert ZeroAddress();
        agentId = IAgentID(agentIdContract);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Writes ─────────────────────────────────────────────────────────────

    /// @notice Create or update the caller's security policy.
    /// @param flags Bitmask of FLAG_* rules the agent operates under.
    /// @param maxTxValueWei Max value the agent may execute without extra
    ///        confirmation (0 = not set). Informational; never enforced here
    ///        because this contract never moves assets.
    /// @param agentTokenId The caller's Agent ID tokenId. Verified on-chain:
    ///        the caller must hold an Agent ID and own this exact token.
    function setPolicy(uint8 flags, uint256 maxTxValueWei, uint256 agentTokenId) external {
        if (flags > MAX_FLAGS) revert InvalidFlags();
        if (agentId.balanceOf(msg.sender) == 0) revert NotAgentIdHolder();
        // ownerOf reverts for a nonexistent tokenId, which also fails closed.
        if (agentId.ownerOf(agentTokenId) != msg.sender) revert AgentTokenNotOwned();

        Policy storage p = _policies[msg.sender];
        if (p.exists) {
            if (p.agentTokenId != agentTokenId) revert AgentTokenMismatch();
            p.flags = flags;
            p.maxTxValueWei = maxTxValueWei;
            p.updatedAt = uint64(block.timestamp);
        } else {
            if (registrationsPaused) revert RegistrationsArePaused();
            _policies[msg.sender] = Policy({
                agentTokenId: agentTokenId,
                flags: flags,
                maxTxValueWei: maxTxValueWei,
                registeredAt: uint64(block.timestamp),
                updatedAt: uint64(block.timestamp),
                lastCheckInAt: 0,
                currentStreak: 0,
                bestStreak: 0,
                totalCheckIns: 0,
                exists: true
            });
            totalRegistered += 1;
        }
        emit PolicySet(msg.sender, agentTokenId, flags, maxTxValueWei);
    }

    /// @notice Prove the agent is still active and under its owner's control.
    ///         At most one check-in per 20 hours; a check-in within 48 hours
    ///         of the previous one extends the streak, otherwise it restarts.
    function checkIn() external {
        Policy storage p = _policies[msg.sender];
        if (!p.exists) revert NotRegistered();

        if (p.lastCheckInAt != 0) {
            uint256 nextAllowed = uint256(p.lastCheckInAt) + CHECKIN_MIN_INTERVAL;
            if (block.timestamp < nextAllowed) revert CheckInTooSoon(nextAllowed);
            if (block.timestamp <= uint256(p.lastCheckInAt) + STREAK_WINDOW) {
                p.currentStreak += 1;
            } else {
                p.currentStreak = 1;
            }
        } else {
            p.currentStreak = 1;
        }
        if (p.currentStreak > p.bestStreak) p.bestStreak = p.currentStreak;
        p.lastCheckInAt = uint64(block.timestamp);
        p.totalCheckIns += 1;
        totalCheckIns += 1;
        emit CheckedIn(msg.sender, p.currentStreak);
    }

    // ── Owner (pause new registrations only — see contract notice) ─────────
    function pauseRegistrations() external onlyOwner {
        registrationsPaused = true;
        emit RegistrationsPaused();
    }

    function unpauseRegistrations() external onlyOwner {
        registrationsPaused = false;
        emit RegistrationsUnpaused();
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ── Reads for users and other dApps ────────────────────────────────────
    function isRegistered(address user) external view returns (bool) {
        return _policies[user].exists;
    }

    function getPolicy(address user) external view returns (Policy memory) {
        return _policies[user];
    }

    /// @notice True if the agent checked in within the last 7 days.
    function isActive(address user) public view returns (bool) {
        Policy storage p = _policies[user];
        return p.exists && p.lastCheckInAt != 0 && block.timestamp <= uint256(p.lastCheckInAt) + ACTIVE_WINDOW;
    }

    /// @notice Badge tier derived from the live streak (no claim, no NFT):
    ///         0 none · 1 Member · 2 Bronze (3) · 3 Silver (5) · 4 Gold (7).
    function badgeTier(address user) public view returns (uint8) {
        Policy storage p = _policies[user];
        if (!p.exists) return 0;
        if (_streakAlive(p)) {
            if (p.currentStreak >= 7) return 4;
            if (p.currentStreak >= 5) return 3;
            if (p.currentStreak >= 3) return 2;
        }
        return 1;
    }

    /// @notice Shield Score 0–100, computed on-chain:
    ///         40 registered · up to 30 for policy completeness (10 per rule)
    ///         · up to 30 for activity (15 active within 7 days + up to 15
    ///         for a live streak, 3 per day capped at 5 days).
    function shieldScore(address user) public view returns (uint256) {
        Policy storage p = _policies[user];
        if (!p.exists) return 0;
        uint256 score = 40;
        uint8 f = p.flags;
        if (f & FLAG_MANUAL_CONFIRM != 0) score += 10;
        if (f & FLAG_NO_UNLIMITED_APPROVALS != 0) score += 10;
        if (f & FLAG_SIMULATE_BEFORE_SIGN != 0) score += 10;
        if (isActive(user)) score += 15;
        if (_streakAlive(p)) {
            uint256 streakBonus = uint256(p.currentStreak) * 3;
            if (streakBonus > 15) streakBonus = 15;
            score += streakBonus;
        }
        return score;
    }

    function _streakAlive(Policy storage p) internal view returns (bool) {
        return p.lastCheckInAt != 0 && block.timestamp <= uint256(p.lastCheckInAt) + STREAK_WINDOW;
    }
}
