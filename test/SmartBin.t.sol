// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SmartBin.sol";
import "../contracts/ProductRegistry.sol";
import "../contracts/EcoToken.sol";

/**
 * @title SmartBinDebug
 * @dev Replicates the production-like scenario for user wallet 0x18422192C052F4b70D1303FA4E5E3d84B9805556
 *      to debug why processDrop reverts.
 */
contract SmartBinDebug is Test {
    SmartBin public smartBin;
    ProductRegistry public registry;
    EcoToken public token;

    // YOUR WALLET
    address public userWallet = 0x18422192C052F4b70D1303FA4E5E3d84B9805556;

    // SYSTEM ROLES
    address public admin = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // Hardhat 0
    address public oracle = address(this); // The test contract will act as Oracle
    address public government = address(0xDEAD);
    address public company = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // Admin address acting as company

    function setUp() public {
        vm.label(userWallet, "USER_WALLET");
        vm.label(admin, "ADMIN");
        vm.label(company, "COMPANY");

        // 1. Deploy contracts (as admin)
        vm.startPrank(admin);
        registry = new ProductRegistry();
        token = new EcoToken();
        smartBin = new SmartBin(
            address(registry),
            address(token),
            oracle,
            government
        );

        // 2. Setup Permissions (System-Level)
        // A. SmartBin must be allowed to update registry
        registry.registerBin(address(smartBin));

        // B. SmartBin must be allowed to mint EcoTokens
        token.addMinter(address(smartBin));

        // C. The Oracle address must be registered as a Bin Node itself
        // because SmartBin checks bins[msg.sender].isActive in processDrop
        smartBin.registerBin(oracle, "Primary Node", address(this));

        // D. Setup Company
        registry.registerCompany("Soda Corp", company);
        registry.verifyCompany(company);
        vm.stopPrank();

        // 3. Register Product (as verified company)
        vm.prank(company);
        registry.registerProduct(
            company,
            "Real Soda Can",
            "metal-can",
            "ipfs://real-soda-metadata"
        );
    }

    /**
     * @notice Test a full drop process with real data
     */
    function testSuccessfulDropForUser() public {
        uint256 productId = 1; // First product registered
        uint256 weight = 2500; // 2.5kg
        string memory classification = "metal-can"; // Valid rate from EcoToken
        uint256 confidence = 100;
        bytes32 proofHash = keccak256(
            abi.encodePacked("DROP-PROOF-123", block.timestamp)
        );

        // Initial Balance
        uint256 balanceBefore = token.balanceOf(userWallet);
        console.log("Initial Balance: %s", balanceBefore);

        // Act - Call from Oracle
        vm.prank(oracle);
        smartBin.processDrop(
            productId,
            userWallet,
            weight,
            classification,
            confidence,
            proofHash
        );

        // Assert
        uint256 balanceAfter = token.balanceOf(userWallet);
        console.log("Final Balance: %s", balanceAfter);

        assertGt(
            balanceAfter,
            balanceBefore,
            "User should have received tokens"
        );

        // Calculate Expected Reward: (weight * rate * confidence%) / 10000
        // rate for "metal-can" = 12 * 10**18 / 100 (from EcoToken.sol)
        // weight = 2500
        // confidence = 100
        // reward = (2500 * (0.12 * 10**18) * 100) / 10000
        // reward = 3 * 10**18 (3 ECO)
        assertEq(
            balanceAfter,
            3 * 10 ** 18,
            "Should have received exactly 3 ECO"
        );
    }

    /**
     * @notice This will fail if the registry isn't configured
     */
    function testDuplicateDrop() public {
        vm.startPrank(oracle);
        smartBin.processDrop(1, userWallet, 1000, "metal-can", 100, bytes32(0));

        vm.expectRevert("Already recycled");
        smartBin.processDrop(1, userWallet, 1000, "metal-can", 100, bytes32(0));
        vm.stopPrank();
    }
}
