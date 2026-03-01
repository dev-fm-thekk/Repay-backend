// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/EcoToken.sol";

contract EcoTokenTest is Test {
    EcoToken public token;
    address public admin;
    address public minter;
    address public user1;

    event RecycleMint(
        address indexed user,
        uint256 indexed productId,
        uint256 amount,
        bytes32 proofHash
    );
    event MinterAdded(address indexed minter);

    function setUp() public {
        admin = address(this);
        minter = makeAddr("minter");
        user1 = makeAddr("user1");

        token = new EcoToken();
        token.addMinter(minter);
    }

    function testMintWithStruct() public {
        uint256 productId = 101;
        uint256 weight = 500; // 500g
        string memory material = "metal-can";
        uint256 confidence = 95;
        bytes32 proof = keccak256("ai-proof-data");

        // Calculate expected reward: (500 * 0.12 ether * 95) / 10000
        uint256 expectedAmount = token.calculateReward(
            weight,
            material,
            confidence
        );

        EcoToken.MintRequest memory request = EcoToken.MintRequest({
            userWallet: user1,
            productId: productId,
            weight: weight,
            materialType: material,
            confidenceScore: confidence,
            proofHash: proof
        });

        vm.prank(minter);
        vm.expectEmit(true, true, false, true);
        emit RecycleMint(user1, productId, expectedAmount, proof);

        token.mintProofOfRecycle(request);

        assertEq(token.balanceOf(user1), expectedAmount);
        assertEq(token.totalMinted(), expectedAmount);
    }

    function test_RevertIf_DoubleMint() public {
        EcoToken.MintRequest memory request = EcoToken.MintRequest({
            userWallet: user1,
            productId: 101,
            weight: 100,
            materialType: "glass",
            confidenceScore: 100,
            proofHash: keccak256("1")
        });

        vm.startPrank(minter);

        // 1. First mint should succeed
        token.mintProofOfRecycle(request);

        // 2. Expect the next call to fail
        // Replace "Already rewarded" with your actual error message or Custom Error
        vm.expectRevert("Already rewarded");
        token.mintProofOfRecycle(request);

        vm.stopPrank();
    }

    function testUpdateRate() public {
        string memory material = "new-plastic";
        uint256 newRate = 0.5 ether;

        token.updateRewardRate(material, newRate);
        assertEq(token.rewardRates(material), newRate);

        uint256 reward = token.calculateReward(100, material, 100);
        assertEq(reward, (100 * newRate * 100) / 10000);
    }
}
