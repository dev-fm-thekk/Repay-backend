# MaterialAuction.sol

## Overview
Government-controlled auction contract for selling collected raw material batches to licensed recycling companies. Handles ETH bidding, winner selection, and issuance of collection receipt NFTs.

---

## Data Structures

```
struct MaterialBatch {
    uint256 batchId
    address binAddress
    string materialType
    uint256 estimatedWeight     // grams
    uint256 minBidETH
    uint256 auctionDeadline
    AuctionStatus status        // OPEN | CLOSED | COLLECTED
    address winner
    uint256 winningBid
}

struct Bid {
    address bidder
    uint256 amount              // ETH in wei
    uint256 timestamp
}

enum AuctionStatus { OPEN, CLOSED, COLLECTED }
```

---

## Storage

```
mapping(uint256 => MaterialBatch) public batches
mapping(uint256 => Bid[]) public bids               // batchId → all bids
mapping(uint256 => mapping(address => uint256)) public bidderAmounts  // for refunds
uint256 public batchCounter

address public governmentWallet
address public receiptNFT       // CollectionReceiptNFT contract
address public smartBin
```

---

## Algorithms

### `createAuction(binAddress, materialType, estimatedWeight, minBidETH, durationSeconds)`
```
1. Require msg.sender == governmentWallet
2. Require estimatedWeight > 0
3. Require minBidETH > 0
4. batchCounter++
5. Create MaterialBatch {
     batchId        = batchCounter,
     binAddress,
     materialType,
     estimatedWeight,
     minBidETH,
     auctionDeadline = now + durationSeconds,
     status          = OPEN,
     winner          = address(0),
     winningBid      = 0
   }
6. Emit AuctionCreated(batchCounter, materialType, estimatedWeight, minBidETH, auctionDeadline)
```

### `placeBid(batchId)` ← payable
```
1. Require batches[batchId].status == OPEN
2. Require block.timestamp < batches[batchId].auctionDeadline
3. Require msg.value >= batches[batchId].minBidETH
4. Require msg.sender is a verified recycling company

// Allow top-up bids from same bidder
5. bidderAmounts[batchId][msg.sender] += msg.value
6. totalBid = bidderAmounts[batchId][msg.sender]

// Track highest bid
7. If totalBid > batches[batchId].winningBid:
     batches[batchId].winner = msg.sender
     batches[batchId].winningBid = totalBid

8. Append Bid { msg.sender, msg.value, now } to bids[batchId]
9. Emit BidPlaced(batchId, msg.sender, totalBid)
```

### `finalizeAuction(batchId)`
```
1. Require msg.sender == governmentWallet
2. Require block.timestamp >= batches[batchId].auctionDeadline
   OR msg.sender == governmentWallet (early close allowed)
3. Require batches[batchId].status == OPEN
4. Require batches[batchId].winner != address(0)  // at least one bid

5. Set batches[batchId].status = CLOSED
6. winner = batches[batchId].winner
7. winningBid = batches[batchId].winningBid

// Transfer ETH to government wallet
8. Transfer winningBid ETH to governmentWallet

// Refund all non-winners
9. For each unique bidder in bids[batchId]:
     If bidder != winner:
       refundAmount = bidderAmounts[batchId][bidder]
       Transfer refundAmount ETH to bidder
       Emit BidRefunded(batchId, bidder, refundAmount)

// Issue receipt NFT to winner
10. Call CollectionReceiptNFT.mint(winner, batchId, materialType, estimatedWeight, winningBid, now)

11. Emit AuctionFinalized(batchId, winner, winningBid)
```

### `collectMaterial(batchId, receiptTokenId)`
```
1. Require msg.sender == batches[batchId].winner
2. Require batches[batchId].status == CLOSED
3. Verify CollectionReceiptNFT.ownerOf(receiptTokenId) == msg.sender
4. Verify receipt metadata matches batchId

// Notify SmartBin to release material
5. Call SmartBin.releaseMaterialToBuyer(batchId, msg.sender, receiptTokenId)

6. Set batches[batchId].status = COLLECTED
7. Emit MaterialCollected(batchId, msg.sender, receiptTokenId)
```

---

## CollectionReceiptNFT (ERC721) — inline sub-contract

### `mint(to, batchId, materialType, weight, pricePaid, timestamp)`
```
1. Require msg.sender == MaterialAuction contract
2. tokenId = totalSupply + 1
3. Mint ERC721 to `to`
4. Store metadata {
     batchId, materialType, weight,
     pricePaid, collectedAt=timestamp
   } on-chain or to IPFS
5. Emit ReceiptIssued(tokenId, to, batchId)
```

---

## Access Control

| Function          | Allowed Callers           |
|-------------------|---------------------------|
| createAuction     | Government Wallet         |
| placeBid          | Verified Recycling Co.    |
| finalizeAuction   | Government Wallet         |
| collectMaterial   | Auction Winner            |
| registerRecycler  | Government / Admin        |

---

## Events

```
AuctionCreated(uint256 batchId, string materialType, uint256 weight, uint256 minBid, uint256 deadline)
BidPlaced(uint256 batchId, address bidder, uint256 totalAmount)
BidRefunded(uint256 batchId, address bidder, uint256 amount)
AuctionFinalized(uint256 batchId, address winner, uint256 winningBid)
MaterialCollected(uint256 batchId, address recycler, uint256 receiptTokenId)
ReceiptIssued(uint256 tokenId, address to, uint256 batchId)
```