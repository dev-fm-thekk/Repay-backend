# SmartBin.sol

## Overview
On-chain representation of physical smart bins / recycle vendors. Coordinates AI classification, weight estimation, product verification, and token minting. Acts as the trusted bridge between the physical recycling world and the blockchain.

---

## Data Structures

```
struct Bin {
    address binAddress
    string location         // GPS or address string
    address operator        // company/entity running the bin
    bool isActive
    uint256 totalWeightProcessed    // grams
    uint256 totalTokensDispensed
}

struct DropRecord {
    uint256 dropId
    uint256 productId
    address userWallet
    uint256 weight
    string classification
    uint256 confidence          // AI confidence 0–100
    bytes32 proofHash
    uint256 tokensAwarded
    uint256 timestamp
}
```

---

## Storage

```
mapping(address => Bin) public bins
mapping(uint256 => DropRecord) public dropRecords
uint256 public dropCounter

address public productRegistry
address public ecoToken
address public aiOracle          // trusted off-chain oracle address
```

---

## Algorithms

### `registerBin(location, operator)`
```
1. Require msg.sender == admin
2. Require bins[msg.sender].binAddress == address(0)
3. Create Bin { binAddress=msg.sender, location, operator, isActive=true, ... }
4. Authorize this bin as minter in EcoToken contract
5. Emit BinRegistered(msg.sender, location, operator)
```

### `receiveWaste(productId, userWallet, rawSensorData)`
```
// Step 1: Verify product
1. Call ProductRegistry.verifyProduct(productId)
2. Require product.isRecycled == false
3. Require bins[msg.sender].isActive == true

// Step 2: Classify waste (via oracle)
4. classificationRequestId = requestAIClassification(productId, rawSensorData)
   → Oracle processes image + productId off-chain
   → Oracle calls back fulfillClassification(requestId, classification, confidence)

// Step 3: Estimate weight
5. weight = parseWeight(rawSensorData)  // from load cell sensor
6. Require weight > MIN_WEIGHT_GRAMS    // e.g. 10g

// Step 4: Record drop
7. dropCounter++
8. proofHash = keccak256(productId, userWallet, weight, classification, confidence, now)
```

### `fulfillClassification(requestId, classification, confidence, weight, userWallet, productId)`
```
// Called by trusted AI oracle after processing
1. Require msg.sender == aiOracle
2. Require pendingRequests[requestId] exists

// Step 5: Update registry
3. Call ProductRegistry.updateRecycleStatus(productId, address(this), weight, classification)

// Step 6: Mint reward tokens
4. Call EcoToken.mintProofOfRecycle(
     userWallet, productId, weight, classification, confidence, proofHash
   )
5. tokensAwarded = EcoToken.calculateReward(weight, classification, confidence)

// Step 7: Save drop record
6. dropRecords[dropCounter] = DropRecord {
     dropCounter, productId, userWallet, weight,
     classification, confidence, proofHash, tokensAwarded, now
   }

// Step 8: Update bin stats
7. bins[address(this)].totalWeightProcessed += weight
8. bins[address(this)].totalTokensDispensed += tokensAwarded

9. Emit WasteProcessed(dropCounter, productId, userWallet, weight, classification, tokensAwarded)
10. Delete pendingRequests[requestId]
```

### `notifyGovMaterialAvailable(materialType, estimatedWeight)`
```
1. Require msg.sender == bin operator
2. Require estimatedWeight > BATCH_THRESHOLD   // e.g. 50kg
3. Emit MaterialBatchReady(address(this), materialType, estimatedWeight, now)
   → Government monitors this event to trigger auction
```

### `releaseMaterialToBuyer(batchId, buyerAddress, receiptHash)`
```
1. Require msg.sender == governmentWallet
2. Require batches[batchId].isAuctioned == true
3. Require batches[batchId].buyer == buyerAddress
4. Set batches[batchId].isReleased = true
5. Emit MaterialReleased(batchId, buyerAddress, receiptHash)
```

---

## Oracle Integration (AI Classification)

```
Off-chain flow:
  1. SmartBin emits ClassificationRequested(requestId, productId, imageHash)
  2. Oracle node listens for event
  3. Oracle fetches product metadata from ProductRegistry
  4. Oracle runs AI model: classifyImage(image, materialType) → {label, confidence}
  5. Oracle calls fulfillClassification() on-chain with signed result
  6. SmartBin verifies oracle signature before accepting result
```

---

## Access Control

| Function                    | Allowed Callers         |
|-----------------------------|-------------------------|
| registerBin                 | Admin                   |
| receiveWaste                | Registered Bin (self)   |
| fulfillClassification       | AI Oracle               |
| notifyGovMaterialAvailable  | Bin Operator            |
| releaseMaterialToBuyer      | Government Wallet       |

---

## Events

```
BinRegistered(address bin, string location, address operator)
WasteProcessed(uint256 dropId, uint256 productId, address user, uint256 weight, string classification, uint256 tokens)
ClassificationRequested(bytes32 requestId, uint256 productId, bytes32 imageHash)
MaterialBatchReady(address bin, string materialType, uint256 weight, uint256 timestamp)
MaterialReleased(uint256 batchId, address buyer, bytes32 receiptHash)
```