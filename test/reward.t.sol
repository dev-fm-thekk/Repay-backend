// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/src/Test.sol";
import "../contracts/reward.sol";

contract RewardTest is Test {
    RewardToken public rewardToken;
    address public owner;
    address public user;

    function setUp() public {
        owner = address(this);
        user = address(0x123);
        rewardToken = new RewardToken();
    }

    function test_InitialRates() public {
        assertEq(
            rewardToken.rates(RewardToken.WasteType.PLASTIC),
            10 * 10 ** 18
        );
        assertEq(
            rewardToken.rates(RewardToken.WasteType.E_WASTE),
            50 * 10 ** 18
        );
        assertEq(rewardToken.rates(RewardToken.WasteType.PAPER), 5 * 10 ** 18);
    }

    function test_MintPlasticFullConfidence() public {
        uint256 weight = 1000; // 1 kg
        uint256 confidence = 100; // 100%
        bytes32 proofHash = keccak256("plastic_proof");

        rewardToken.mintReward(
            user,
            "PET Bottle",
            confidence,
            RewardToken.WasteType.PLASTIC,
            weight,
            proofHash
        );

        // Expected: (1000 * 10 * 1e18 * 100) / 100000 = 10 * 1e18
        assertEq(rewardToken.balanceOf(user), 10 * 10 ** 18);
    }

    function test_MintEWastePartialConfidence() public {
        uint256 weight = 200; // 200g
        uint256 confidence = 80; // 80%
        bytes32 proofHash = keccak256("ewaste_proof");

        rewardToken.mintReward(
            user,
            "Circuit Board",
            confidence,
            RewardToken.WasteType.E_WASTE,
            weight,
            proofHash
        );

        // Expected: (200 * 50 * 1e18 * 80) / 100000 = 8 * 1e18
        assertEq(rewardToken.balanceOf(user), 8 * 10 ** 18);
    }

    function test_MintPaperLowWeight() public {
        uint256 weight = 500; // 500g
        uint256 confidence = 100; // 100%
        bytes32 proofHash = keccak256("paper_proof");

        rewardToken.mintReward(
            user,
            "Newspaper",
            confidence,
            RewardToken.WasteType.PAPER,
            weight,
            proofHash
        );

        // Expected: (500 * 5 * 1e18 * 100) / 100000 = 2.5 * 1e18
        assertEq(rewardToken.balanceOf(user), 2.5 * 10 ** 18);
    }

    function test_UnauthorizedMint() public {
        uint256 weight = 1000;
        uint256 confidence = 100;
        bytes32 proofHash = keccak256("fake_proof");

        vm.prank(user);
        vm.expectRevert();
        rewardToken.mintReward(
            user,
            "False Claim",
            confidence,
            RewardToken.WasteType.PLASTIC,
            weight,
            proofHash
        );
    }

    function test_RecordStorage() public {
        uint256 weight = 100;
        uint256 confidence = 95;
        bytes32 proofHash = keccak256("audit_proof");

        rewardToken.mintReward(
            user,
            "Plastic Cup",
            confidence,
            RewardToken.WasteType.PLASTIC,
            weight,
            proofHash
        );

        assertEq(rewardToken.getRecordCount(user), 1);
        (
            string memory classification,
            uint256 storedConfidence,
            RewardToken.WasteType storedType,
            uint256 storedWeight,
            ,

        ) = rewardToken.userRecords(user, 0);

        assertEq(classification, "Plastic Cup");
        assertEq(storedConfidence, confidence);
        assertEq(uint(storedType), uint(RewardToken.WasteType.PLASTIC));
        assertEq(storedWeight, weight);
    }

    function test_UpdateRate() public {
        rewardToken.setRate(RewardToken.WasteType.PLASTIC, 20 * 10 ** 18);
        assertEq(
            rewardToken.rates(RewardToken.WasteType.PLASTIC),
            20 * 10 ** 18
        );
    }
}
