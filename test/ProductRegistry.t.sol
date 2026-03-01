// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/ProductRegistry.sol";

contract ProductRegistryTest is Test {
    ProductRegistry public registry;
    address public admin;
    address public company1;
    address public company2;
    address public bin1;
    address public user1;

    event CompanyRegistered(address indexed wallet, string name);
    event CompanyVerified(address indexed wallet);
    event ProductRegistered(
        uint256 indexed productId,
        address indexed company,
        string name,
        string category
    );
    event ProductRecycled(
        uint256 indexed productId,
        address indexed bin,
        uint256 weight,
        string classification
    );
    event BinRegistered(address indexed binAddress);

    function setUp() public {
        admin = address(this);
        company1 = makeAddr("company1");
        company2 = makeAddr("company2");
        bin1 = makeAddr("bin1");
        user1 = makeAddr("user1");
        
        registry = new ProductRegistry();
        registry.registerBin(bin1);
    }

    function testInitialState() public view {
        assertEq(registry.admin(), admin);
        assertEq(registry.productCounter(), 0);
        assertTrue(registry.registeredBins(bin1));
    }

    function testRegisterCompany() public {
        vm.expectEmit(true, false, false, true);
        emit CompanyRegistered(company1, "Test Company");
        
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        
        (address wallet, string memory name, bool isVerified, uint256 registeredAt) = registry.companies(company1);
        assertEq(wallet, company1);
        assertEq(name, "Test Company");
        assertFalse(isVerified);
        assertGt(registeredAt, 0);
    }

    function testCannotRegisterCompanyTwice() public {
        vm.startPrank(user1);
        registry.registerCompany("Test Company", company1);
        
        vm.expectRevert("Company already registered");
        registry.registerCompany("Test Company Again", company1);
        vm.stopPrank();
    }

    function testCannotRegisterZeroAddress() public {
        vm.prank(user1);
        vm.expectRevert("Invalid wallet address");
        registry.registerCompany("Test Company", address(0));
    }

    function testVerifyCompany() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        
        vm.expectEmit(true, false, false, false);
        emit CompanyVerified(company1);
        registry.verifyCompany(company1);
        
        (, , bool isVerified, ) = registry.companies(company1);
        assertTrue(isVerified);
    }

    function testOnlyAdminCanVerifyCompany() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        
        vm.prank(user1);
        vm.expectRevert("Only admin");
        registry.verifyCompany(company1);
    }

    function testCannotVerifyNonExistentCompany() public {
        vm.expectRevert("Company not registered");
        registry.verifyCompany(company1);
    }

    function testRegisterProduct() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        registry.verifyCompany(company1);
        
        vm.prank(company1);
        vm.expectEmit(true, true, false, true);
        emit ProductRegistered(1, company1, "Product 1", "electronics");
        
        uint256 productId = registry.registerProduct(
            company1,
            "Product 1",
            "electronics",
            "ipfs://metadata"
        );
        
        assertEq(productId, 1);
        assertEq(registry.productCounter(), 1);
        
        (uint256 pid, address companyWallet, string memory name, string memory category, string memory metadataURI, bool isRecycled, uint256 createdAt) = registry.products(1);
        assertEq(pid, 1);
        assertEq(companyWallet, company1);
        assertEq(name, "Product 1");
        assertEq(category, "electronics");
        assertEq(metadataURI, "ipfs://metadata");
        assertFalse(isRecycled);
        assertGt(createdAt, 0);
        
        assertEq(registry.productOwner(1), company1);
    }

    function testAdminCanRegisterProductForCompany() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        registry.verifyCompany(company1);
        
        uint256 productId = registry.registerProduct(
            company1,
            "Product 1",
            "electronics",
            "ipfs://metadata"
        );
        
        assertEq(productId, 1);
    }

    function testCannotRegisterProductForUnverifiedCompany() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        
        vm.prank(company1);
        vm.expectRevert("Company not verified");
        registry.registerProduct(
            company1,
            "Product 1",
            "electronics",
            "ipfs://metadata"
        );
    }

    function testUnauthorizedCannotRegisterProduct() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        registry.verifyCompany(company1);
        
        vm.prank(user1);
        vm.expectRevert("Not authorized");
        registry.registerProduct(
            company1,
            "Product 1",
            "electronics",
            "ipfs://metadata"
        );
    }

    function testGetProductInfo() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        registry.verifyCompany(company1);
        
        vm.prank(company1);
        uint256 productId = registry.registerProduct(
            company1,
            "Product 1",
            "electronics",
            "ipfs://metadata"
        );
        
        (
            ProductRegistry.Product memory product,
            ProductRegistry.Company memory company,
            ProductRegistry.RecycleRecord memory recycleRecord,
            bool hasRecycleRecord
        ) = registry.getProductInfo(productId);
        
        assertEq(product.productId, productId);
        assertEq(product.name, "Product 1");
        assertEq(company.wallet, company1);
        assertEq(company.name, "Test Company");
        assertFalse(hasRecycleRecord);
    }

    function testGetProductInfoNonExistent() public {
        vm.expectRevert("Product does not exist");
        registry.getProductInfo(999);
    }

    function testUpdateRecycleStatus() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        registry.verifyCompany(company1);
        
        vm.prank(company1);
        uint256 productId = registry.registerProduct(
            company1,
            "Product 1",
            "electronics",
            "ipfs://metadata"
        );
        
        vm.prank(bin1);
        vm.expectEmit(true, true, false, true);
        emit ProductRecycled(productId, bin1, 1000, "plastic-PET");
        registry.updateRecycleStatus(productId, bin1, 1000, "plastic-PET");
        
        (, , , , , bool isRecycled, ) = registry.products(productId);
        assertTrue(isRecycled);
        
        (uint256 pid, address binAddress, uint256 weight, string memory classification, uint256 timestamp) = registry.recycleRecords(productId);
        assertEq(pid, productId);
        assertEq(binAddress, bin1);
        assertEq(weight, 1000);
        assertEq(classification, "plastic-PET");
        assertGt(timestamp, 0);
    }

    function testCannotUpdateRecycleStatusTwice() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        registry.verifyCompany(company1);
        
        vm.prank(company1);
        uint256 productId = registry.registerProduct(
            company1,
            "Product 1",
            "electronics",
            "ipfs://metadata"
        );
        
        vm.startPrank(bin1);
        registry.updateRecycleStatus(productId, bin1, 1000, "plastic-PET");
        
        vm.expectRevert("Already recycled");
        registry.updateRecycleStatus(productId, bin1, 1000, "plastic-PET");
        vm.stopPrank();
    }

    function testOnlyRegisteredBinCanUpdateRecycleStatus() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        registry.verifyCompany(company1);
        
        vm.prank(company1);
        uint256 productId = registry.registerProduct(
            company1,
            "Product 1",
            "electronics",
            "ipfs://metadata"
        );
        
        vm.prank(user1);
        vm.expectRevert("Not a registered bin");
        registry.updateRecycleStatus(productId, user1, 1000, "plastic-PET");
    }

    function testVerifyProduct() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        registry.verifyCompany(company1);
        
        vm.prank(company1);
        uint256 productId = registry.registerProduct(
            company1,
            "Product 1",
            "electronics",
            "ipfs://metadata"
        );
        
        ProductRegistry.Product memory product = registry.verifyProduct(productId);
        assertEq(product.productId, productId);
        assertEq(product.name, "Product 1");
    }

    function testVerifyNonExistentProduct() public {
        vm.expectRevert("Product does not exist");
        registry.verifyProduct(999);
    }

    function testRegisterBin() public {
        address newBin = makeAddr("newBin");
        
        vm.expectEmit(true, false, false, false);
        emit BinRegistered(newBin);
        registry.registerBin(newBin);
        
        assertTrue(registry.registeredBins(newBin));
    }

    function testOnlyAdminCanRegisterBin() public {
        address newBin = makeAddr("newBin");
        
        vm.prank(user1);
        vm.expectRevert("Only admin");
        registry.registerBin(newBin);
    }

    function testUnregisterBin() public {
        registry.unregisterBin(bin1);
        assertFalse(registry.registeredBins(bin1));
    }

    function testMultipleProductsRegistration() public {
        vm.prank(user1);
        registry.registerCompany("Test Company", company1);
        registry.verifyCompany(company1);
        
        vm.startPrank(company1);
        uint256 productId1 = registry.registerProduct(company1, "Product 1", "electronics", "ipfs://1");
        uint256 productId2 = registry.registerProduct(company1, "Product 2", "plastic", "ipfs://2");
        uint256 productId3 = registry.registerProduct(company1, "Product 3", "glass", "ipfs://3");
        vm.stopPrank();
        
        assertEq(productId1, 1);
        assertEq(productId2, 2);
        assertEq(productId3, 3);
        assertEq(registry.productCounter(), 3);
    }
}
