// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/reward.sol";

contract RewardTokenTest is Test {

    RewardToken token;
    address owner = address(1);
    address user = address(2);

    function setUp() public {
        vm.prank(owner);
        token = new RewardToken();
    }

    function testMintReward() public {

        vm.prank(owner);

        token.mintReward(
            user,
            "Clear PET",
            90,
            RewardToken.WasteType.PLASTIC,
            1000,
            keccak256("proof")
        );

        assertGt(token.balanceOf(user), 0);
    }

    function testSetRate() public {

        vm.prank(owner);

        token.setRate(
            RewardToken.WasteType.PLASTIC,
            20 * 10 ** 18
        );

        uint256 rate = token.rates(RewardToken.WasteType.PLASTIC);

        assertEq(rate, 20 * 10 ** 18);
    }

    function testRecordStored() public {

        vm.prank(owner);

        token.mintReward(
            user,
            "Paper",
            100,
            RewardToken.WasteType.PAPER,
            500,
            keccak256("hash")
        );

        uint256 count = token.getRecordCount(user);

        assertEq(count, 1);
    }
}