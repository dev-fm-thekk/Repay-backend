# NFTMarketplace.sol

## Overview
Decentralized marketplace for trading EcoTokens. Users can sell ECO for ETH, buy ECO with ETH, or redeem ECO directly for government service vouchers. Includes an escrow mechanism to safely hold tokens during listings.

---

## Data Structures

```
struct Listing {
    uint256 listingId
    address seller
    uint256 ecoTokenAmount
    uint256 askPriceETH         // total ETH expected
    uint256 pricePerToken       // askPriceETH / ecoTokenAmount
    ListingType listingType     // ECO_FOR_ETH | ECO_FOR_SERVICE
    string serviceType          // if listingType == ECO_FOR_SERVICE
    ListingStatus status        // ACTIVE | SOLD | CANCELLED
    uint256 createdAt
}

struct ServiceVoucher {
    uint256 voucherId
    address recipient
    string serviceType          // e.g. "BUS_PASS_MONTHLY", "WATER_SUBSIDY"
    uint256 ecoTokensRedeemed
    uint256 issuedAt
    uint256 expiresAt
}

enum ListingType { ECO_FOR_ETH, ECO_FOR_SERVICE }
enum ListingStatus { ACTIVE, SOLD, CANCELLED }
```

---

## Storage

```
mapping(uint256 => Listing) public listings
mapping(uint256 => ServiceVoucher) public vouchers
mapping(string => uint256) public serviceEcoCost    // serviceType → ECO required
mapping(string => bool) public validServices

uint256 public listingCounter
uint256 public voucherCounter
uint256 public platformFeePercent   // e.g. 2 (= 2%)
address public governmentWallet
address public ecoToken
```

---

## Algorithms

### `listTokensForSale(ecoTokenAmount, askPriceETH)`
```
1. Require ecoTokenAmount > 0
2. Require askPriceETH > 0
3. Require EcoToken.balanceOf(msg.sender) >= ecoTokenAmount
4. Require EcoToken.allowance(msg.sender, address(this)) >= ecoTokenAmount

// Escrow tokens
5. EcoToken.transferFrom(msg.sender, address(this), ecoTokenAmount)

6. listingCounter++
7. Create Listing {
     listingId       = listingCounter,
     seller          = msg.sender,
     ecoTokenAmount,
     askPriceETH,
     pricePerToken   = askPriceETH / ecoTokenAmount,
     listingType     = ECO_FOR_ETH,
     status          = ACTIVE,
     createdAt       = now
   }
8. Emit ListingCreated(listingCounter, msg.sender, ecoTokenAmount, askPriceETH)
```

### `buyListing(listingId)` ← payable
```
1. Require listings[listingId].status == ACTIVE
2. Require msg.value >= listings[listingId].askPriceETH
3. Require msg.sender != listings[listingId].seller

// Calculate platform fee
4. fee = (msg.value * platformFeePercent) / 100
5. sellerProceeds = msg.value - fee

// Transfer ECO to buyer
6. EcoToken.transfer(msg.sender, listings[listingId].ecoTokenAmount)

// Transfer ETH to seller
7. Transfer sellerProceeds ETH to listings[listingId].seller

// Transfer fee to government wallet
8. Transfer fee ETH to governmentWallet

// Refund overpayment
9. If msg.value > listings[listingId].askPriceETH:
     refund = msg.value - listings[listingId].askPriceETH
     Transfer refund ETH to msg.sender

10. Set listings[listingId].status = SOLD
11. Emit ListingSold(listingId, msg.sender, listings[listingId].ecoTokenAmount, sellerProceeds)
```

### `cancelListing(listingId)`
```
1. Require listings[listingId].seller == msg.sender
2. Require listings[listingId].status == ACTIVE

// Return escrowed tokens
3. EcoToken.transfer(msg.sender, listings[listingId].ecoTokenAmount)

4. Set listings[listingId].status = CANCELLED
5. Emit ListingCancelled(listingId, msg.sender)
```

### `redeemForGovtService(serviceType, ecoTokenAmount)`
```
1. Require validServices[serviceType] == true
2. Require ecoTokenAmount >= serviceEcoCost[serviceType]
3. Require EcoToken.balanceOf(msg.sender) >= ecoTokenAmount

// Burn ECO tokens
4. EcoToken.burnFrom(msg.sender, ecoTokenAmount)

// Issue service voucher NFT
5. voucherCounter++
6. expiryDate = now + serviceExpiryDuration[serviceType]
7. Create ServiceVoucher {
     voucherId          = voucherCounter,
     recipient          = msg.sender,
     serviceType,
     ecoTokensRedeemed  = ecoTokenAmount,
     issuedAt           = now,
     expiresAt          = expiryDate
   }

// Mint voucher as ERC721
8. Call GovtServiceNFT.mint(msg.sender, voucherCounter, serviceType, expiryDate)

9. Emit ServiceRedeemed(voucherCounter, msg.sender, serviceType, ecoTokenAmount)
```

### `getActiveListings()`
```
1. Iterate listings[1..listingCounter]
2. Filter where status == ACTIVE
3. Return sorted by pricePerToken ascending
```

---

## Service Cost Table (configurable by Government)

```
"BUS_PASS_DAILY"      → 50  ECO
"BUS_PASS_MONTHLY"    → 800 ECO
"METRO_PASS_DAILY"    → 80  ECO
"METRO_PASS_MONTHLY"  → 1200 ECO
"WATER_SUBSIDY"       → 300 ECO
"ELECTRICITY_CREDIT"  → 500 ECO
```

---

## Access Control

| Function               | Allowed Callers       |
|------------------------|-----------------------|
| listTokensForSale      | Any ECO Holder        |
| buyListing             | Any User              |
| cancelListing          | Listing Seller        |
| redeemForGovtService   | Any ECO Holder        |
| addService / setFee    | Government / Admin    |

---

## Events

```
ListingCreated(uint256 listingId, address seller, uint256 amount, uint256 price)
ListingSold(uint256 listingId, address buyer, uint256 amount, uint256 ethReceived)
ListingCancelled(uint256 listingId, address seller)
ServiceRedeemed(uint256 voucherId, address user, string serviceType, uint256 ecoBurned)
```