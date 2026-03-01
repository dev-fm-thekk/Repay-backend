// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/NFTMarketPlace.sol";
import "../contracts/EcoToken.sol";

contract NFTMarketPlaceTest is Test {
    NFTMarketPlace public marketplace;
    EcoToken public token;
    GovtServiceNFT public serviceNFT;
    
    address public government;
    address public seller;
    address public buyer;
    address public user1;

    event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 amount, uint256 price);
    event ListingSold(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 ethReceived);
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event ServiceRedeemed(uint256 indexed voucherId, address indexed user, string serviceType, uint256 ecoBurned);
    event ServiceAdded(string serviceType, uint256 cost, uint256 expiryDuration);

    receive() external payable {}

    function setUp() public {
        government = address(this);
        seller = makeAddr("seller");
        buyer = makeAddr("buyer");
        user1 = makeAddr("user1");
        
        token = new EcoToken();
        marketplace = new NFTMarketPlace(address(token), government, 2);
        serviceNFT = marketplace.govtServiceNFT();
        
        token.addMinter(government);

        // Update these calls to use the MintRequest struct
        token.mintProofOfRecycle(EcoToken.MintRequest({
            userWallet: seller,
            productId: 1,
            weight: 1000000,
            materialType: "plastic-PET",
            confidenceScore: 100,
            proofHash: keccak256("proof1")
        }));
        
        token.mintProofOfRecycle(EcoToken.MintRequest({
            userWallet: buyer,
            productId: 2,
            weight: 1000000,
            materialType: "plastic-PET",
            confidenceScore: 100,
            proofHash: keccak256("proof2")
        }));
        
        token.mintProofOfRecycle(EcoToken.MintRequest({
            userWallet: user1,
            productId: 3,
            weight: 1000000,
            materialType: "plastic-PET",
            confidenceScore: 100,
            proofHash: keccak256("proof3")
        }));
        
        vm.deal(buyer, 100 ether);
        vm.deal(user1, 100 ether);
    }

    function testInitialState() public view {
        assertEq(marketplace.governmentWallet(), government);
        assertEq(marketplace.ecoToken(), address(token));
        assertEq(marketplace.platformFeePercent(), 2);
        assertEq(marketplace.listingCounter(), 0);
        assertEq(marketplace.voucherCounter(), 0);
    }

    function testServicesInitialized() public view {
        assertTrue(marketplace.validServices("BUS_PASS_DAILY"));
        assertTrue(marketplace.validServices("BUS_PASS_MONTHLY"));
        assertTrue(marketplace.validServices("METRO_PASS_DAILY"));
        assertTrue(marketplace.validServices("METRO_PASS_MONTHLY"));
        assertTrue(marketplace.validServices("WATER_SUBSIDY"));
        assertTrue(marketplace.validServices("ELECTRICITY_CREDIT"));
        
        assertEq(marketplace.serviceEcoCost("BUS_PASS_DAILY"), 50 * 10**18);
        assertEq(marketplace.serviceEcoCost("BUS_PASS_MONTHLY"), 800 * 10**18);
    }

    function testAddService() public {
        vm.expectEmit(false, false, false, true);
        emit ServiceAdded("NEW_SERVICE", 100 * 10**18, 30 days);
        
        marketplace.addService("NEW_SERVICE", 100 * 10**18, 30 days);
        
        assertTrue(marketplace.validServices("NEW_SERVICE"));
        assertEq(marketplace.serviceEcoCost("NEW_SERVICE"), 100 * 10**18);
        assertEq(marketplace.serviceExpiryDuration("NEW_SERVICE"), 30 days);
    }

    function testOnlyGovernmentCanAddService() public {
        vm.prank(user1);
        vm.expectRevert("Only government");
        marketplace.addService("NEW_SERVICE", 100 * 10**18, 30 days);
    }

    function testListTokensForSale() public {
        uint256 listAmount = 100 * 10**18;
        uint256 askPrice = 1 ether;
        
        vm.startPrank(seller);
        token.approve(address(marketplace), listAmount);
        
        vm.expectEmit(true, true, false, false);
        emit ListingCreated(1, seller, listAmount, askPrice);
        
        uint256 listingId = marketplace.listTokensForSale(listAmount, askPrice);
        vm.stopPrank();
        
        assertEq(listingId, 1);
        assertEq(marketplace.listingCounter(), 1);
        
        (uint256 lid, address sellerAddr, uint256 ecoAmount, uint256 askPriceETH, uint256 pricePerToken, NFTMarketPlace.ListingType listingType, , NFTMarketPlace.ListingStatus status, uint256 createdAt) = marketplace.listings(1);
        
        assertEq(lid, 1);
        assertEq(sellerAddr, seller);
        assertEq(ecoAmount, listAmount);
        assertEq(askPriceETH, askPrice);
        assertGt(pricePerToken, 0);
        assertTrue(uint8(listingType) == uint8(NFTMarketPlace.ListingType.ECO_FOR_ETH));
        assertTrue(uint8(status) == uint8(NFTMarketPlace.ListingStatus.ACTIVE));
        assertGt(createdAt, 0);
        
        assertEq(token.balanceOf(address(marketplace)), listAmount);
    }

    function testCannotListWithZeroAmount() public {
        vm.prank(seller);
        vm.expectRevert("Amount must be positive");
        marketplace.listTokensForSale(0, 1 ether);
    }

    function testCannotListWithZeroPrice() public {
        vm.startPrank(seller);
        token.approve(address(marketplace), 100 * 10**18);
        
        vm.expectRevert("Price must be positive");
        marketplace.listTokensForSale(100 * 10**18, 0);
        vm.stopPrank();
    }

    function testCannotListWithInsufficientBalance() public {
        vm.prank(buyer);
        vm.expectRevert("Insufficient balance");
        marketplace.listTokensForSale(1000000 * 10**18, 1 ether);
    }

    function testCannotListWithoutApproval() public {
        vm.prank(seller);
        vm.expectRevert("Insufficient allowance");
        marketplace.listTokensForSale(100 * 10**18, 1 ether);
    }

    function testBuyListing() public {
        uint256 listAmount = 100 * 10**18;
        uint256 askPrice = 1 ether;
        
        vm.startPrank(seller);
        token.approve(address(marketplace), listAmount);
        marketplace.listTokensForSale(listAmount, askPrice);
        vm.stopPrank();
        
        uint256 sellerBalanceBefore = seller.balance;
        uint256 govBalanceBefore = government.balance;
        uint256 buyerTokensBefore = token.balanceOf(buyer);
        
        uint256 expectedFee = (askPrice * 2) / 100;
        uint256 expectedSellerProceeds = askPrice - expectedFee;
        
        vm.prank(buyer);
        vm.expectEmit(true, true, false, false);
        emit ListingSold(1, buyer, listAmount, expectedSellerProceeds);
        marketplace.buyListing{value: askPrice}(1);
        
        assertEq(seller.balance, sellerBalanceBefore + expectedSellerProceeds);
        assertEq(government.balance, govBalanceBefore + expectedFee);
        assertEq(token.balanceOf(buyer), buyerTokensBefore + listAmount);
        
        (, , , , , , , NFTMarketPlace.ListingStatus status, ) = marketplace.listings(1);
        assertTrue(uint8(status) == uint8(NFTMarketPlace.ListingStatus.SOLD));
    }

    function testBuyListingWithOverpayment() public {
        uint256 listAmount = 100 * 10**18;
        uint256 askPrice = 1 ether;
        
        vm.startPrank(seller);
        token.approve(address(marketplace), listAmount);
        marketplace.listTokensForSale(listAmount, askPrice);
        vm.stopPrank();
        
        uint256 buyerBalanceBefore = buyer.balance;
        uint256 overpayment = 0.5 ether;
        
        vm.prank(buyer);
        marketplace.buyListing{value: askPrice + overpayment}(1);
        
        assertEq(buyer.balance, buyerBalanceBefore - askPrice);
    }

    function testCannotBuyInactiveListing() public {
        uint256 listAmount = 100 * 10**18;
        
        vm.startPrank(seller);
        token.approve(address(marketplace), listAmount);
        uint256 listingId = marketplace.listTokensForSale(listAmount, 1 ether);
        marketplace.cancelListing(listingId);
        vm.stopPrank();
        
        vm.prank(buyer);
        vm.expectRevert("Listing not active");
        marketplace.buyListing{value: 1 ether}(listingId);
    }

    function testCannotBuyWithInsufficientETH() public {
        uint256 listAmount = 100 * 10**18;
        
        vm.startPrank(seller);
        token.approve(address(marketplace), listAmount);
        marketplace.listTokensForSale(listAmount, 1 ether);
        vm.stopPrank();
        
        vm.prank(buyer);
        vm.expectRevert("Insufficient ETH");
        marketplace.buyListing{value: 0.5 ether}(1);
    }

    function testCannotBuyOwnListing() public {
        uint256 listAmount = 100 * 10**18;
        
        vm.startPrank(seller);
        token.approve(address(marketplace), listAmount);
        marketplace.listTokensForSale(listAmount, 1 ether);
        
        vm.deal(seller, 10 ether);
        vm.expectRevert("Cannot buy own listing");
        marketplace.buyListing{value: 1 ether}(1);
        vm.stopPrank();
    }

    function testCancelListing() public {
        uint256 listAmount = 100 * 10**18;
        
        vm.startPrank(seller);
        uint256 tokenBalanceBefore = token.balanceOf(seller);
        token.approve(address(marketplace), listAmount);
        uint256 listingId = marketplace.listTokensForSale(listAmount, 1 ether);
        
        vm.expectEmit(true, true, false, false);
        emit ListingCancelled(listingId, seller);
        marketplace.cancelListing(listingId);
        vm.stopPrank();
        
        assertEq(token.balanceOf(seller), tokenBalanceBefore);
        
        (, , , , , , , NFTMarketPlace.ListingStatus status, ) = marketplace.listings(listingId);
        assertTrue(uint8(status) == uint8(NFTMarketPlace.ListingStatus.CANCELLED));
    }

    function testCannotCancelOthersListing() public {
        uint256 listAmount = 100 * 10**18;
        
        vm.startPrank(seller);
        token.approve(address(marketplace), listAmount);
        uint256 listingId = marketplace.listTokensForSale(listAmount, 1 ether);
        vm.stopPrank();
        
        vm.prank(buyer);
        vm.expectRevert("Not the seller");
        marketplace.cancelListing(listingId);
    }

    function testCannotCancelAlreadyCancelledListing() public {
        uint256 listAmount = 100 * 10**18;
        
        vm.startPrank(seller);
        token.approve(address(marketplace), listAmount);
        uint256 listingId = marketplace.listTokensForSale(listAmount, 1 ether);
        marketplace.cancelListing(listingId);
        
        vm.expectRevert("Listing not active");
        marketplace.cancelListing(listingId);
        vm.stopPrank();
    }

    function testRedeemForGovtService() public {
        uint256 cost = marketplace.serviceEcoCost("BUS_PASS_DAILY");
        
        vm.startPrank(user1);
        token.approve(address(marketplace), cost);
        
        uint256 tokenBalanceBefore = token.balanceOf(user1);
        
        vm.expectEmit(true, true, false, true);
        emit ServiceRedeemed(1, user1, "BUS_PASS_DAILY", cost);
        
        uint256 voucherId = marketplace.redeemForGovtService("BUS_PASS_DAILY", cost);
        vm.stopPrank();
        
        assertEq(voucherId, 1);
        assertEq(marketplace.voucherCounter(), 1);
        assertEq(token.balanceOf(user1), tokenBalanceBefore - cost);
        
        (uint256 vid, address recipient, string memory serviceType, uint256 ecoRedeemed, uint256 issuedAt, uint256 expiresAt) = marketplace.vouchers(voucherId);
        
        assertEq(vid, voucherId);
        assertEq(recipient, user1);
        assertEq(serviceType, "BUS_PASS_DAILY");
        assertEq(ecoRedeemed, cost);
        assertGt(issuedAt, 0);
        assertGt(expiresAt, issuedAt);
        
        assertEq(serviceNFT.totalSupply(), 1);
        assertEq(serviceNFT.ownerOf(1), user1);
    }

    function testRedeemMultipleServices() public {
        uint256 cost1 = marketplace.serviceEcoCost("BUS_PASS_DAILY");
        uint256 cost2 = marketplace.serviceEcoCost("METRO_PASS_DAILY");
        
        vm.startPrank(user1);
        token.approve(address(marketplace), cost1 + cost2);
        
        marketplace.redeemForGovtService("BUS_PASS_DAILY", cost1);
        marketplace.redeemForGovtService("METRO_PASS_DAILY", cost2);
        vm.stopPrank();
        
        assertEq(marketplace.voucherCounter(), 2);
        assertEq(serviceNFT.balanceOf(user1), 2);
    }

    function testCannotRedeemInvalidService() public {
        vm.startPrank(user1);
        token.approve(address(marketplace), 1000 * 10**18);
        
        vm.expectRevert("Invalid service");
        marketplace.redeemForGovtService("INVALID_SERVICE", 1000 * 10**18);
        vm.stopPrank();
    }

    function testCannotRedeemWithInsufficientEco() public {
        uint256 cost = marketplace.serviceEcoCost("BUS_PASS_DAILY");
        
        vm.startPrank(user1);
        token.approve(address(marketplace), cost - 1);
        
        vm.expectRevert("Insufficient ECO");
        marketplace.redeemForGovtService("BUS_PASS_DAILY", cost - 1);
        vm.stopPrank();
    }

    function testGetActiveListings() public {
        vm.startPrank(seller);
        token.approve(address(marketplace), 300 * 10**18);
        
        marketplace.listTokensForSale(100 * 10**18, 1 ether);
        marketplace.listTokensForSale(100 * 10**18, 2 ether);
        marketplace.listTokensForSale(100 * 10**18, 3 ether);
        
        marketplace.cancelListing(2);
        vm.stopPrank();
        
        uint256[] memory activeListings = marketplace.getActiveListings();
        assertEq(activeListings.length, 2);
        assertEq(activeListings[0], 1);
        assertEq(activeListings[1], 3);
    }

    function testSetPlatformFee() public {
        marketplace.setPlatformFee(5);
        assertEq(marketplace.platformFeePercent(), 5);
    }

    function testCannotSetPlatformFeeTooHigh() public {
        vm.expectRevert("Fee too high");
        marketplace.setPlatformFee(101);
    }

    function testOnlyGovernmentCanSetPlatformFee() public {
        vm.prank(user1);
        vm.expectRevert("Only government");
        marketplace.setPlatformFee(5);
    }

    function testUpdateGovernmentWallet() public {
        address newGov = makeAddr("newGov");
        marketplace.updateGovernmentWallet(newGov);
        assertEq(marketplace.governmentWallet(), newGov);
    }

    function testOnlyGovernmentCanUpdateWallet() public {
        address newGov = makeAddr("newGov");
        
        vm.prank(user1);
        vm.expectRevert("Only government");
        marketplace.updateGovernmentWallet(newGov);
    }

    function testDeactivateService() public {
        marketplace.deactivateService("BUS_PASS_DAILY");
        assertFalse(marketplace.validServices("BUS_PASS_DAILY"));
    }

    function testCannotRedeemDeactivatedService() public {
        marketplace.deactivateService("BUS_PASS_DAILY");
        
        uint256 cost = marketplace.serviceEcoCost("BUS_PASS_DAILY");
        
        vm.startPrank(user1);
        token.approve(address(marketplace), cost);
        
        vm.expectRevert("Invalid service");
        marketplace.redeemForGovtService("BUS_PASS_DAILY", cost);
        vm.stopPrank();
    }

    function testPlatformFeeCalculation() public {
        marketplace.setPlatformFee(10);
        
        uint256 listAmount = 100 * 10**18;
        uint256 askPrice = 1 ether;
        
        vm.startPrank(seller);
        token.approve(address(marketplace), listAmount);
        marketplace.listTokensForSale(listAmount, askPrice);
        vm.stopPrank();
        
        uint256 sellerBalanceBefore = seller.balance;
        uint256 govBalanceBefore = government.balance;
        
        uint256 expectedFee = (askPrice * 10) / 100;
        uint256 expectedSellerProceeds = askPrice - expectedFee;
        
        vm.prank(buyer);
        marketplace.buyListing{value: askPrice}(1);
        
        assertEq(seller.balance, sellerBalanceBefore + expectedSellerProceeds);
        assertEq(government.balance, govBalanceBefore + expectedFee);
    }

    function testZeroPlatformFee() public {
        marketplace.setPlatformFee(0);
        
        uint256 listAmount = 100 * 10**18;
        uint256 askPrice = 1 ether;
        
        vm.startPrank(seller);
        token.approve(address(marketplace), listAmount);
        marketplace.listTokensForSale(listAmount, askPrice);
        vm.stopPrank();
        
        uint256 sellerBalanceBefore = seller.balance;
        
        vm.prank(buyer);
        marketplace.buyListing{value: askPrice}(1);
        
        assertEq(seller.balance, sellerBalanceBefore + askPrice);
    }

    function testServiceVoucherExpiry() public {
        uint256 cost = marketplace.serviceEcoCost("BUS_PASS_DAILY");
        uint256 duration = marketplace.serviceExpiryDuration("BUS_PASS_DAILY");
        
        vm.startPrank(user1);
        token.approve(address(marketplace), cost);
        uint256 voucherId = marketplace.redeemForGovtService("BUS_PASS_DAILY", cost);
        vm.stopPrank();
        
        (, , , , uint256 issuedAt, uint256 expiresAt) = marketplace.vouchers(voucherId);
        assertEq(expiresAt, issuedAt + duration);
    }
}
