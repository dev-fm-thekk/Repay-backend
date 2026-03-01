// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract CollectionReceiptNFT is ERC721 {
    struct Receipt {
        uint256 tokenId;
        address owner;
        uint256 batchId;
        string materialType;
        uint256 weight;
        uint256 pricePaid;
        uint256 collectedAt;
    }

    mapping(uint256 => Receipt) public receipts;
    uint256 public totalSupply;

    address public materialAuction;

    event ReceiptIssued(uint256 indexed tokenId, address indexed to, uint256 indexed batchId);

    modifier onlyAuction() {
        require(msg.sender == materialAuction, "Only auction contract");
        _;
    }

    constructor(address _materialAuction) ERC721("Collection Receipt NFT", "RECEIPT") {
        materialAuction = _materialAuction;
    }

    function mint(
        address to,
        uint256 batchId,
        string memory materialType,
        uint256 weight,
        uint256 pricePaid,
        uint256 timestamp
    ) external onlyAuction returns (uint256) {
        totalSupply++;
        uint256 tokenId = totalSupply;

        _safeMint(to, tokenId);

        receipts[tokenId] = Receipt({
            tokenId: tokenId,
            owner: to,
            batchId: batchId,
            materialType: materialType,
            weight: weight,
            pricePaid: pricePaid,
            collectedAt: timestamp
        });

        emit ReceiptIssued(tokenId, to, batchId);

        return tokenId;
    }

    // Explicit getter to allow the Auction contract to retrieve the full struct
    function getReceipt(uint256 tokenId) external view returns (Receipt memory) {
        require(_ownerOf(tokenId) != address(0), "Receipt does not exist");
        return receipts[tokenId];
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);
        
        if (to != address(0) && tokenId <= totalSupply) {
            receipts[tokenId].owner = to;
        }
        
        return previousOwner;
    }
}

contract MaterialAuction {
    enum AuctionStatus { OPEN, CLOSED, COLLECTED }

    struct MaterialBatch {
        uint256 batchId;
        address binAddress;
        string materialType;
        uint256 estimatedWeight;
        uint256 minBidETH;
        uint256 auctionDeadline;
        AuctionStatus status;
        address winner;
        uint256 winningBid;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => MaterialBatch) public batches;
    mapping(uint256 => Bid[]) public bids;
    mapping(uint256 => mapping(address => uint256)) public bidderAmounts;
    uint256 public batchCounter;

    address public governmentWallet;
    CollectionReceiptNFT public receiptNFT;
    address public smartBin;
    mapping(address => bool) public verifiedRecyclers;

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

    modifier onlyGovernment() {
        require(msg.sender == governmentWallet, "Only government");
        _;
    }

    modifier onlyVerifiedRecycler() {
        require(verifiedRecyclers[msg.sender], "Not verified recycler");
        _;
    }

    constructor(address _governmentWallet, address _smartBin) {
        require(_governmentWallet != address(0), "Invalid government wallet");
        require(_smartBin != address(0), "Invalid smart bin");
        
        governmentWallet = _governmentWallet;
        smartBin = _smartBin;
        receiptNFT = new CollectionReceiptNFT(address(this));
    }

    function registerRecycler(address recycler) external onlyGovernment {
        require(recycler != address(0), "Invalid recycler");
        verifiedRecyclers[recycler] = true;
        emit RecyclerRegistered(recycler);
    }

    function unregisterRecycler(address recycler) external onlyGovernment {
        verifiedRecyclers[recycler] = false;
    }

    function createAuction(
        address binAddress,
        string memory materialType,
        uint256 estimatedWeight,
        uint256 minBidETH,
        uint256 durationSeconds
    ) external onlyGovernment {
        require(estimatedWeight > 0, "Weight must be positive");
        require(minBidETH > 0, "Min bid must be positive");

        batchCounter++;

        batches[batchCounter] = MaterialBatch({
            batchId: batchCounter,
            binAddress: binAddress,
            materialType: materialType,
            estimatedWeight: estimatedWeight,
            minBidETH: minBidETH,
            auctionDeadline: block.timestamp + durationSeconds,
            status: AuctionStatus.OPEN,
            winner: address(0),
            winningBid: 0
        });

        emit AuctionCreated(
            batchCounter,
            materialType,
            estimatedWeight,
            minBidETH,
            block.timestamp + durationSeconds
        );
    }

    function placeBid(uint256 batchId) external payable onlyVerifiedRecycler {
        MaterialBatch storage batch = batches[batchId];
        
        require(batch.status == AuctionStatus.OPEN, "Auction not open");
        require(block.timestamp < batch.auctionDeadline, "Auction ended");
        require(msg.value >= batch.minBidETH, "Bid below minimum");

        bidderAmounts[batchId][msg.sender] += msg.value;
        uint256 totalBid = bidderAmounts[batchId][msg.sender];

        if (totalBid > batch.winningBid) {
            batch.winner = msg.sender;
            batch.winningBid = totalBid;
        }

        bids[batchId].push(Bid({
            bidder: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit BidPlaced(batchId, msg.sender, totalBid);
    }

    function finalizeAuction(uint256 batchId) external onlyGovernment {
        MaterialBatch storage batch = batches[batchId];
        
        require(
            block.timestamp >= batch.auctionDeadline || msg.sender == governmentWallet,
            "Auction not ended"
        );
        require(batch.status == AuctionStatus.OPEN, "Auction not open");
        require(batch.winner != address(0), "No bids placed");

        batch.status = AuctionStatus.CLOSED;
        address winner = batch.winner;
        uint256 winningBid = batch.winningBid;

        (bool success, ) = governmentWallet.call{value: winningBid, gas: 50000}("");
        require(success, "Transfer to government failed");

        Bid[] memory allBids = bids[batchId];
        address[] memory uniqueBidders = new address[](allBids.length);
        uint256 uniqueCount = 0;

        for (uint256 i = 0; i < allBids.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (uniqueBidders[j] == allBids[i].bidder) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                uniqueBidders[uniqueCount] = allBids[i].bidder;
                uniqueCount++;
            }
        }

        for (uint256 i = 0; i < uniqueCount; i++) {
            address bidder = uniqueBidders[i];
            if (bidder != winner) {
                uint256 refundAmount = bidderAmounts[batchId][bidder];
                if (refundAmount > 0) {
                    bidderAmounts[batchId][bidder] = 0;
                    (bool refundSuccess, ) = bidder.call{value: refundAmount}("");
                    require(refundSuccess, "Refund failed");
                    emit BidRefunded(batchId, bidder, refundAmount);
                }
            }
        }

        receiptNFT.mint(
            winner,
            batchId,
            batch.materialType,
            batch.estimatedWeight,
            winningBid,
            block.timestamp
        );

        emit AuctionFinalized(batchId, winner, winningBid);
    }

    function collectMaterial(uint256 batchId, uint256 receiptTokenId) external {
        MaterialBatch storage batch = batches[batchId];
        
        require(msg.sender == batch.winner, "Not the winner");
        require(batch.status == AuctionStatus.CLOSED, "Auction not closed");
        require(receiptNFT.ownerOf(receiptTokenId) == msg.sender, "Not receipt owner");

        // FIXED: Using the explicit getter function from the NFT contract
        CollectionReceiptNFT.Receipt memory receipt = receiptNFT.getReceipt(receiptTokenId);
        require(receipt.batchId == batchId, "Receipt batch mismatch");

        batch.status = AuctionStatus.COLLECTED;

        emit MaterialCollected(batchId, msg.sender, receiptTokenId);
    }

    function getBatchBids(uint256 batchId) external view returns (Bid[] memory) {
        return bids[batchId];
    }

    function getActiveBatches() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= batchCounter; i++) {
            if (batches[i].status == AuctionStatus.OPEN) {
                activeCount++;
            }
        }

        uint256[] memory activeBatches = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= batchCounter; i++) {
            if (batches[i].status == AuctionStatus.OPEN) {
                activeBatches[index] = i;
                index++;
            }
        }

        return activeBatches;
    }

    function updateGovernmentWallet(address newWallet) external onlyGovernment {
        require(newWallet != address(0), "Invalid wallet");
        governmentWallet = newWallet;
    }

    receive() external payable {}
}