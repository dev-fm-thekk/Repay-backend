// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MaterialAuction.sol";

contract MaterialAuctionTest is Test {
    MaterialAuction public auction;
    CollectionReceiptNFT public receiptNFT;
    
    address public government;
    address public smartBin;
    address public recycler1;
    address public recycler2;
    address public bin1;

    event AuctionCreated(
        uint256 indexed batchId,
        string materialType,
        uint256 weight,
        uint256 minBid,
        uint256 deadline
    );
    event BidPlaced(uint256 indexed batchId, address indexed bidder, uint256 totalAmount);
    event BidRefunded(uint256 indexed batchId, address indexed bidder, uint256 amount);
    event AuctionFinalized(uint256 indexed batchId, address indexed winner, uint256 winningBid);
    event MaterialCollected(uint256 indexed batchId, address indexed recycler, uint256 receiptTokenId);
    event RecyclerRegistered(address indexed recycler);

    receive() external payable {}

    function setUp() public {
        government = address(this);
        smartBin = makeAddr("smartBin");
        recycler1 = makeAddr("recycler1");
        recycler2 = makeAddr("recycler2");
        bin1 = makeAddr("bin1");
        
        auction = new MaterialAuction(government, smartBin);
        receiptNFT = auction.receiptNFT();
        
        auction.registerRecycler(recycler1);
        auction.registerRecycler(recycler2);
        
        vm.deal(recycler1, 100 ether);
        vm.deal(recycler2, 100 ether);
    }

    function testInitialState() public view {
        assertEq(auction.governmentWallet(), government);
        assertEq(auction.smartBin(), smartBin);
        assertEq(auction.batchCounter(), 0);
        assertTrue(auction.verifiedRecyclers(recycler1));
        assertTrue(auction.verifiedRecyclers(recycler2));
    }

    function testRegisterRecycler() public {
        address newRecycler = makeAddr("newRecycler");
        
        vm.expectEmit(true, false, false, false);
        emit RecyclerRegistered(newRecycler);
        auction.registerRecycler(newRecycler);
        
        assertTrue(auction.verifiedRecyclers(newRecycler));
    }

    function testOnlyGovernmentCanRegisterRecycler() public {
        address newRecycler = makeAddr("newRecycler");
        
        vm.prank(recycler1);
        vm.expectRevert("Only government");
        auction.registerRecycler(newRecycler);
    }

    function testUnregisterRecycler() public {
        auction.unregisterRecycler(recycler1);
        assertFalse(auction.verifiedRecyclers(recycler1));
    }

    function testCreateAuction() public {
        vm.expectEmit(true, false, false, false);
        emit AuctionCreated(1, "plastic-PET", 50000, 1 ether, 0);
        
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        (uint256 batchId, address binAddress, string memory materialType, uint256 weight, uint256 minBid, uint256 deadline, MaterialAuction.AuctionStatus status, address winner, uint256 winningBid) = auction.batches(1);
        
        assertEq(batchId, 1);
        assertEq(binAddress, bin1);
        assertEq(materialType, "plastic-PET");
        assertEq(weight, 50000);
        assertEq(minBid, 1 ether);
        assertGt(deadline, block.timestamp);
        assertTrue(uint8(status) == uint8(MaterialAuction.AuctionStatus.OPEN));
        assertEq(winner, address(0));
        assertEq(winningBid, 0);
        assertEq(auction.batchCounter(), 1);
    }

    function testOnlyGovernmentCanCreateAuction() public {
        vm.prank(recycler1);
        vm.expectRevert("Only government");
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
    }

    function testCannotCreateAuctionWithZeroWeight() public {
        vm.expectRevert("Weight must be positive");
        auction.createAuction(bin1, "plastic-PET", 0, 1 ether, 86400);
    }

    function testCannotCreateAuctionWithZeroMinBid() public {
        vm.expectRevert("Min bid must be positive");
        auction.createAuction(bin1, "plastic-PET", 50000, 0, 86400);
    }

    function testPlaceBid() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        vm.expectEmit(true, true, false, true);
        emit BidPlaced(1, recycler1, 2 ether);
        auction.placeBid{value: 2 ether}(1);
        
        assertEq(auction.bidderAmounts(1, recycler1), 2 ether);
        
        (, , , , , , , address winner, uint256 winningBid) = auction.batches(1);
        assertEq(winner, recycler1);
        assertEq(winningBid, 2 ether);
    }

    function testPlaceMultipleBids() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        vm.prank(recycler2);
        auction.placeBid{value: 3 ether}(1);
        
        (, , , , , , , address winner, uint256 winningBid) = auction.batches(1);
        assertEq(winner, recycler2);
        assertEq(winningBid, 3 ether);
    }

    function testTopUpBid() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        vm.prank(recycler2);
        auction.placeBid{value: 3 ether}(1);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        assertEq(auction.bidderAmounts(1, recycler1), 4 ether);
        
        (, , , , , , , address winner, uint256 winningBid) = auction.batches(1);
        assertEq(winner, recycler1);
        assertEq(winningBid, 4 ether);
    }

    function testCannotBidBelowMinimum() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 2 ether, 86400);
        
        vm.prank(recycler1);
        vm.expectRevert("Bid below minimum");
        auction.placeBid{value: 1 ether}(1);
    }

    function testCannotBidOnClosedAuction() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        auction.finalizeAuction(1);
        
        vm.prank(recycler2);
        vm.expectRevert("Auction not open");
        auction.placeBid{value: 3 ether}(1);
    }

    function testCannotBidAfterDeadline() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.warp(block.timestamp + 86401);
        
        vm.prank(recycler1);
        vm.expectRevert("Auction ended");
        auction.placeBid{value: 2 ether}(1);
    }

    function testOnlyVerifiedRecyclerCanBid() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        address unverified = makeAddr("unverified");
        vm.deal(unverified, 10 ether);
        
        vm.prank(unverified);
        vm.expectRevert("Not verified recycler");
        auction.placeBid{value: 2 ether}(1);
    }

    function testFinalizeAuction() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        vm.prank(recycler2);
        auction.placeBid{value: 3 ether}(1);
        
        uint256 govBalanceBefore = government.balance;
        
        vm.expectEmit(true, true, false, false);
        emit AuctionFinalized(1, recycler2, 3 ether);
        auction.finalizeAuction(1);
        
        assertEq(government.balance, govBalanceBefore + 3 ether);
        
        (, , , , , , MaterialAuction.AuctionStatus status, , ) = auction.batches(1);
        assertTrue(uint8(status) == uint8(MaterialAuction.AuctionStatus.CLOSED));
        
        assertEq(receiptNFT.totalSupply(), 1);
        assertEq(receiptNFT.ownerOf(1), recycler2);
    }

    function testFinalizeAuctionRefundsLosers() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        vm.prank(recycler2);
        auction.placeBid{value: 3 ether}(1);
        
        uint256 recycler1BalanceBefore = recycler1.balance;
        
        auction.finalizeAuction(1);
        
        assertEq(recycler1.balance, recycler1BalanceBefore + 2 ether);
        assertEq(auction.bidderAmounts(1, recycler1), 0);
    }

    function testCannotFinalizeAuctionWithNoBids() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.expectRevert("No bids placed");
        auction.finalizeAuction(1);
    }

    function testCannotFinalizeAlreadyClosedAuction() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        auction.finalizeAuction(1);
        
        vm.expectRevert("Auction not open");
        auction.finalizeAuction(1);
    }

    function testOnlyGovernmentCanFinalizeAuction() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        vm.prank(recycler1);
        vm.expectRevert("Only government");
        auction.finalizeAuction(1);
    }

    function testCollectMaterial() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        auction.finalizeAuction(1);
        
        vm.prank(recycler1);
        vm.expectEmit(true, true, false, true);
        emit MaterialCollected(1, recycler1, 1);
        auction.collectMaterial(1, 1);
        
        (, , , , , , MaterialAuction.AuctionStatus status, , ) = auction.batches(1);
        assertTrue(uint8(status) == uint8(MaterialAuction.AuctionStatus.COLLECTED));
    }

    function testCannotCollectAsNonWinner() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        auction.finalizeAuction(1);
        
        vm.prank(recycler2);
        vm.expectRevert("Not the winner");
        auction.collectMaterial(1, 1);
    }

    function testCannotCollectWithoutReceipt() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        auction.finalizeAuction(1);
        
        vm.prank(recycler1);
        vm.expectRevert();
        auction.collectMaterial(1, 999);
    }

    function testCannotCollectBeforeFinalization() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        vm.prank(recycler1);
        vm.expectRevert("Auction not closed");
        auction.collectMaterial(1, 1);
    }

    function testGetBatchBids() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        vm.prank(recycler2);
        auction.placeBid{value: 3 ether}(1);
        
        vm.prank(recycler1);
        auction.placeBid{value: 1 ether}(1);
        
        MaterialAuction.Bid[] memory allBids = auction.getBatchBids(1);
        assertEq(allBids.length, 3);
        assertEq(allBids[0].bidder, recycler1);
        assertEq(allBids[0].amount, 2 ether);
        assertEq(allBids[1].bidder, recycler2);
        assertEq(allBids[1].amount, 3 ether);
        assertEq(allBids[2].bidder, recycler1);
        assertEq(allBids[2].amount, 1 ether);
    }

    function testGetActiveBatches() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        auction.createAuction(bin1, "glass", 30000, 0.5 ether, 86400);
        auction.createAuction(bin1, "metal-aluminum", 20000, 2 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        auction.finalizeAuction(1);
        
        uint256[] memory activeBatches = auction.getActiveBatches();
        assertEq(activeBatches.length, 2);
        assertEq(activeBatches[0], 2);
        assertEq(activeBatches[1], 3);
    }

    function testReceiptNFTMetadata() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        auction.finalizeAuction(1);
        
        (uint256 tokenId, address owner, uint256 batchId, string memory materialType, uint256 weight, uint256 pricePaid, uint256 collectedAt) = receiptNFT.receipts(1);
        
        assertEq(tokenId, 1);
        assertEq(owner, recycler1);
        assertEq(batchId, 1);
        assertEq(materialType, "plastic-PET");
        assertEq(weight, 50000);
        assertEq(pricePaid, 2 ether);
        assertGt(collectedAt, 0);
    }

    function testUpdateGovernmentWallet() public {
        address newGov = makeAddr("newGov");
        auction.updateGovernmentWallet(newGov);
        assertEq(auction.governmentWallet(), newGov);
    }

    function testOnlyGovernmentCanUpdateWallet() public {
        address newGov = makeAddr("newGov");
        
        vm.prank(recycler1);
        vm.expectRevert("Only government");
        auction.updateGovernmentWallet(newGov);
    }

    function testMultipleAuctionsIndependent() public {
        auction.createAuction(bin1, "plastic-PET", 50000, 1 ether, 86400);
        auction.createAuction(bin1, "glass", 30000, 0.5 ether, 86400);
        
        vm.prank(recycler1);
        auction.placeBid{value: 2 ether}(1);
        
        vm.prank(recycler2);
        auction.placeBid{value: 1 ether}(2);
        
        (, , , , , , , address winner1, uint256 winningBid1) = auction.batches(1);
        (, , , , , , , address winner2, uint256 winningBid2) = auction.batches(2);
        
        assertEq(winner1, recycler1);
        assertEq(winningBid1, 2 ether);
        assertEq(winner2, recycler2);
        assertEq(winningBid2, 1 ether);
    }
}
