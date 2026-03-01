# Material Auction API

Interface for `MaterialAuction.sol`. Manages B2B auctions for collected recyclables.

## Auctions

### Create Auction (Government)
- **Endpoint**: `POST /auctions`
- **Auth**: Government Wallet
- **Payload**:
  ```json
  {
    "binAddress": "0x...",
    "materialType": "plastic-PET",
    "estimatedWeight": 55000,
    "minBidETH": "1.5",
    "durationSeconds": 86400
  }
  ```

### List Auctions
- **Endpoint**: `GET /auctions`
- **Query Params**: `status=OPEN`

### Place Bid
- **Endpoint**: `POST /auctions/:id/bids`
- **Auth**: Verified Recycler
- **Payload**:
  ```json
  {
    "amountETH": "1.6"
  }
  ```

### Finalize Auction (Government)
- **Endpoint**: `POST /auctions/:id/finalize`

## Recyclers

### Register Recycler (Government)
- **Endpoint**: `POST /auctions/recyclers`
- **Payload**: `{ "address": "0x..." }`

### Get Recycler Status
- **Endpoint**: `GET /auctions/recyclers/:address`

## Collection

### Collect Material
- **Endpoint**: `POST /auctions/:id/collect`
- **Payload**:
  ```json
  {
    "receiptTokenId": 5
  }
  ```
