// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

/**
 * @title EcoToken
 * @dev ERC20 token for recycling rewards. 
 * Resolves "Stack too deep" by using a MintRequest struct.
 */
contract EcoToken is ERC20, ERC20Burnable, AccessControlEnumerable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public totalMinted;
    uint256 public totalBurned;

    struct RecycleReward {
        uint256 productId;
        address user;
        uint256 tokensAwarded;
        bytes32 proofHash;
        uint256 timestamp;
    }

    // Struct used to resolve EVM stack limits (Stack too deep error)
    struct MintRequest {
        address userWallet;
        uint256 productId;
        uint256 weight;
        string materialType;
        uint256 confidenceScore;
        bytes32 proofHash;
    }

    mapping(uint256 => RecycleReward) public rewardHistory;
    mapping(string => uint256) public rewardRates;

    event RecycleMint(address indexed user, uint256 indexed productId, uint256 amount, bytes32 proofHash);
    event TokensBurned(address indexed user, uint256 amount);
    event RewardRateUpdated(string materialType, uint256 rate);

    constructor() ERC20("EcoToken", "ECO") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Default rates (Example: 0.1 tokens per unit)
        rewardRates["plastic-PET"] = 10 * 10**18 / 100;
        rewardRates["plastic-HDPE"] = 8 * 10**18 / 100;
        rewardRates["glass"] = 5 * 10**18 / 100;
        rewardRates["metal-aluminum"] = 15 * 10**18 / 100;
        rewardRates["metal-can"] = 12 * 10**18 / 100; // Added for "caned" items
        rewardRates["e-waste"] = 25 * 10**18 / 100;
        rewardRates["paper"] = 3 * 10**18 / 100;
        rewardRates["default"] = 2 * 10**18 / 100;
    }

    /**
     * @dev Calculates reward based on weight, type, and AI confidence.
     */
    function calculateReward(
        uint256 weight,
        string memory materialType,
        uint256 confidenceScore
    ) public view returns (uint256) {
        require(confidenceScore <= 100, "Confidence must be <= 100");
        uint256 rate = rewardRates[materialType];
        if (rate == 0) rate = rewardRates["default"];
        
        // Calculation: (weight * rate * confidence%) / 100
        return (weight * rate * confidenceScore) / 10000;
    }

    /**
     * @dev Mints tokens for recycling. Uses MintRequest struct to avoid Stack too deep.
     */
    function mintProofOfRecycle(MintRequest calldata req) external onlyRole(MINTER_ROLE) {
        require(rewardHistory[req.productId].tokensAwarded == 0, "Already rewarded");
        
        uint256 amount = calculateReward(req.weight, req.materialType, req.confidenceScore);
        require(amount > 0, "Reward amount is 0");
        
        _mint(req.userWallet, amount);
        totalMinted += amount;
        
        rewardHistory[req.productId] = RecycleReward({
            productId: req.productId,
            user: req.userWallet,
            tokensAwarded: amount,
            proofHash: req.proofHash,
            timestamp: block.timestamp
        });
        
        emit RecycleMint(req.userWallet, req.productId, amount, req.proofHash);
    }

    // --- Admin Functions ---

    function admin() public view returns (address) {
        if (getRoleMemberCount(ADMIN_ROLE) == 0) return address(0);
        return getRoleMember(ADMIN_ROLE, 0);
    }

    function addMinter(address minter) external onlyRole(ADMIN_ROLE) {
        grantRole(MINTER_ROLE, minter);
    }

    function mint(address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        _mint(to, amount);
    }

    function updateRewardRate(string calldata materialType, uint256 rate) external onlyRole(ADMIN_ROLE) {
        rewardRates[materialType] = rate;
        emit RewardRateUpdated(materialType, rate);
    }

    // --- Overrides ---

    function burn(uint256 amount) public override {
        super.burn(amount);
        totalBurned += amount;
        emit TokensBurned(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        totalBurned += amount;
        emit TokensBurned(account, amount);
    }
}