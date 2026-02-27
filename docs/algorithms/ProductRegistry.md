# ProductRegistry.sol

## Overview
Central registry for all products and companies on the platform. Tracks the full lifecycle of a product from manufacture to recycling.

---

## Data Structures

```
struct Company {
    address wallet
    string name
    bool isVerified
    uint256 registeredAt
}

struct Product {
    uint256 productId
    address companyWallet
    string name
    string category         // e.g. "electronics", "plastic", "glass"
    string metadataURI      // IPFS link to extended product info
    bool isRecycled
    uint256 createdAt
}

struct RecycleRecord {
    uint256 productId
    address binAddress
    uint256 weight          // in grams
    string classification   // AI output: "plastic-PET", "e-waste", etc.
    uint256 timestamp
}
```

---

## Storage

```
mapping(address => Company) public companies
mapping(uint256 => Product) public products
mapping(uint256 => RecycleRecord) public recycleRecords
mapping(uint256 => address) public productOwner  // tracks current holder
uint256 public productCounter
```

---

## Algorithms

### `registerCompany(name, wallet)`
```
1. Require wallet != address(0)
2. Require companies[wallet].wallet == address(0)  // not already registered
3. Create Company { wallet, name, isVerified=false, registeredAt=now }
4. Store in companies[wallet]
5. Emit CompanyRegistered(wallet, name)
```

### `registerProduct(companyWallet, name, category, metadataURI)`
```
1. Require msg.sender == companyWallet or isAdmin
2. Require companies[companyWallet].isVerified == true
3. productCounter++
4. Create Product {
     productId    = productCounter,
     companyWallet,
     name, category, metadataURI,
     isRecycled   = false,
     createdAt    = now
   }
5. Store in products[productCounter]
6. productOwner[productCounter] = companyWallet
7. Emit ProductRegistered(productCounter, companyWallet, name, category)
8. Return productCounter
```

### `getProductInfo(productId)`
```
1. Require products[productId].productId != 0  // exists
2. Fetch product = products[productId]
3. Fetch company = companies[product.companyWallet]
4. Fetch recycleRecord = recycleRecords[productId] if exists
5. Return {
     product info,
     company name + wallet,
     recycle status,
     recycleRecord (if any)
   }
```

### `updateRecycleStatus(productId, binAddress, weight, classification)`
```
1. Require msg.sender is a registered SmartBin
2. Require products[productId].isRecycled == false
3. Set products[productId].isRecycled = true
4. Create RecycleRecord {
     productId, binAddress, weight,
     classification, timestamp = now
   }
5. Store in recycleRecords[productId]
6. Emit ProductRecycled(productId, binAddress, weight, classification)
```

### `verifyProduct(productId)`
```
1. Require products[productId].productId != 0
2. Return products[productId]
```

---

## Access Control

| Function               | Allowed Callers         |
|------------------------|-------------------------|
| registerCompany        | Anyone (self-register)  |
| verifyCompany          | Admin / Government      |
| registerProduct        | Verified Companies      |
| updateRecycleStatus    | Registered SmartBins    |
| getProductInfo         | Public                  |

---

## Events

```
CompanyRegistered(address wallet, string name)
ProductRegistered(uint256 productId, address company, string name, string category)
ProductRecycled(uint256 productId, address bin, uint256 weight, string classification)
```