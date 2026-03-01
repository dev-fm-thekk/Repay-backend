// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SmartBin.sol";
import "../contracts/ProductRegistry.sol";
import "../contracts/EcoToken.sol";

contract SmartBinTest is Test {
    SmartBin public smartBin;
    ProductRegistry public registry;
    EcoToken public token;

    address public admin;
    address public oracle;
    address public government;
    address public bin1;
    address public user1;

    function setUp() public {
        admin = address(this);
        oracle = makeAddr("oracle");
        government = makeAddr("government");
        bin1 = makeAddr("bin1");
        user1 = makeAddr("user1");

        // 1. Deploy Registry and Token
        registry = new ProductRegistry();
        token = new EcoToken();

        // 2. Deploy SmartBin
        smartBin = new SmartBin(
            address(registry),
            address(token),
            oracle,
            government
        );

        // 3. Setup Permissions
        registry.registerBin(address(smartBin));
        token.addMinter(address(smartBin));

        // Register the bin instance in the SmartBin contract
        smartBin.registerBin(bin1, "New York Sector 4", makeAddr("operator"));
    }

    function testFullDropProcess() public {
        // Register a dummy product in Registry
        vm.prank(admin);
        registry.registerCompany("Coca Corp", address(0x123));
        registry.verifyCompany(address(0x123));
        vm.prank(address(0x123));
        uint256 productId = registry.registerProduct(
            address(0x123),
            "Coke Can",
            "metal",
            "ipfs://uri"
        );

        uint256 weight = 350;
        string memory material = "metal-can";
        uint256 confidence = 98;
        bytes32 proof = keccak256("valid-proof");

        // Register the oracle as a bin as well so it can report drops
        smartBin.registerBin(oracle, "AI Oracle Hub", makeAddr("oracle-operator"));

        // AI Oracle triggers the process from the bin's address context
        vm.prank(oracle);
        // Note: In your SmartBin.sol, the sender MUST be the bin's address
        // to pass the bins[msg.sender].isActive check.
        // Cleanup any previous pranks before setting balance
        vm.stopPrank(); 
        vm.deal(bin1, 1 ether);

        // Simulate call coming from bin via Oracle
        vm.expectEmit(true, true, false, false);
        emit SmartBin.MaterialDropped(1, productId, user1, material, 0);

        vm.prank(oracle);
        smartBin.processDrop(
            productId,
            user1,
            weight,
            material,
            confidence,
            proof
        );
        // Verify state
        (, , , , uint256 totalWeight, uint256 totalTokens) = smartBin.bins(
            oracle
        );
        // Note: Based on your code, bins[msg.sender] uses the oracle address as key if oracle calls it.
        // You might want to change SmartBin.sol to pass binAddress as an argument if oracle calls it.

        assertGt(token.balanceOf(user1), 0);
    }
    function test_RevertIf_InactiveBin() public {
        // Match the exact string from your contract error
        vm.expectRevert("Bin inactive");

        vm.prank(oracle);
        smartBin.processDrop(101, user1, 100, "glass", 100, bytes32(0));
    }
}
