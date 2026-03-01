# Product Registry API

Interface for `ProductRegistry.sol`. Manages company verification and product registration.

## Companies

### Register Company
Register a new company for verification.
- **Endpoint**: `POST /registry/companies`
- **Auth**: Wallet Signature
- **Payload**:
  ```json
  {
    "name": "EcoCorp Inc.",
    "wallet": "0x..."
  }
  ```

### Get Company Info
- **Endpoint**: `GET /registry/companies/:address`

### Verify Company (Admin)
- **Endpoint**: `PATCH /registry/companies/:address/verify`
- **Auth**: Admin Role

## Products

### Register Product
- **Endpoint**: `POST /registry/products`
- **Auth**: Verified Company or Admin
- **Payload**:
  ```json
  {
    "companyWallet": "0x...",
    "name": "Recyclable Bottle",
    "category": "Plastic",
    "metadataURI": "ipfs://..."
  }
  ```

### Get Product Details
Fetches product info, company details, and recycling history.
- **Endpoint**: `GET /registry/products/:id`
- **Response**:
  ```json
  {
    "productId": 1,
    "name": "...",
    "category": "...",
    "isRecycled": false,
    "company": { ... },
    "recycleRecord": { ... }
  }
  ```

## Bins

### Register Bin (Admin)
Allows a bin to update product recycling statuses.
- **Endpoint**: `POST /registry/bins`
- **Payload**: `{ "binAddress": "0x..." }`
