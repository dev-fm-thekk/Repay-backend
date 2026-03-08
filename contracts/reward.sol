// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RewardToken
 * @dev ERC20 token for rewarding waste recycling.
 */
contract RewardToken is ERC20, Ownable {
    enum WasteType {
        PLASTIC,
        E_WASTE,
        PAPER
    }

    struct WasteRecord {
        string classification;
        uint256 confidenceScore;
        WasteType wasteType;
        uint256 weight; // in grams
        bytes32 proofHash;
        uint256 timestamp;
    }

    // Mapping from WasteType to Reward Rate (tokens per kg, with 18 decimals)
    mapping(WasteType => uint256) public rates;

    // Mapping of unit to their waste records for auditability
    mapping(address => WasteRecord[]) public userRecords;

    event WasteMinted(
        address indexed user,
        WasteType wasteType,
        uint256 weight,
        uint256 tokensMinted,
        string classification,
        bytes32 proofHash
    );

    constructor() ERC20("Recycle Reward", "RWDR") Ownable(msg.sender) {
        // Initial fixed rates (tokens per kg)
        // Plastic: 10 RWDR/kg
        // E-Waste: 50 RWDR/kg
        // Paper: 5 RWDR/kg
        rates[WasteType.PLASTIC] = 10 * 10 ** 18;
        rates[WasteType.E_WASTE] = 50 * 10 ** 18;
        rates[WasteType.PAPER] = 5 * 10 ** 18;
    }

    /**
     * @dev Mint rewards for recycling.
     * @param to The recipient of the minted tokens.
     * @param classification AI classified waste type (e.g., "Clear PET").
     * @param confidenceScore AI confidence score (0-100).
     * @param wasteType Category of waste (0: Plastic, 1: E-Waste, 2: Paper).
     * @param weight Weight of the waste in grams.
     * @param proofHash Hash representing the evidence of recycling (e.g., image hash).
     *
     * Formula:
     * Reward = (Weight_g * Rate_tokensPerKg * Confidence_pct) / (1000 g/kg * 100 pct)
     */
    function mintReward(
        address to,
        string calldata classification,
        uint256 confidenceScore,
        WasteType wasteType,
        uint256 weight,
        bytes32 proofHash
    ) external onlyOwner {
        require(confidenceScore <= 100, "Confidence must be <= 100");
        require(weight > 0, "Weight must be greater than zero");

        uint256 rewardRate = rates[wasteType];

        // Calculate amount: (grams * (tokens per kg) * confidence) / 100,000
        // We divide by 1000 to convert grams to kg, and by 100 to convert confidence pct to decimal.
        uint256 rewardAmount = (weight * rewardRate * confidenceScore) / 100000;

        _mint(to, rewardAmount);

        userRecords[to].push(
            WasteRecord({
                classification: classification,
                confidenceScore: confidenceScore,
                wasteType: wasteType,
                weight: weight,
                proofHash: proofHash,
                timestamp: block.timestamp
            })
        );

        emit WasteMinted(
            to,
            wasteType,
            weight,
            rewardAmount,
            classification,
            proofHash
        );
    }

    /**
     * @dev Update the reward rate for a specific waste type.
     */
    function setRate(WasteType wasteType, uint256 newRate) external onlyOwner {
        rates[wasteType] = newRate;
    }

    /**
     * @dev Get the number of records for a user.
     */
    function getRecordCount(address user) external view returns (uint256) {
        return userRecords[user].length;
    }
}
