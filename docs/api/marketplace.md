# Marketplace API

Interface for `NFTMarketPlace.sol`. Handles ECO token trading and service redemption.

## P2P Token Sale

### Create ECO Listing
- **Endpoint**: `POST /marketplace/listings`
- **Auth**: User Wallet
- **Payload**:
  ```json
  {
    "ecoTokenAmount": "100000000000000000000",
    "askPriceETH": "0.05"
  }
  ```

### List Active Listings
- **Endpoint**: `GET /marketplace/listings`
- **Query Params**: `status=ACTIVE`

### Get Listing Details
- **Endpoint**: `GET /marketplace/listings/:id`

### Cancel Listing
- **Endpoint**: `DELETE /marketplace/listings/:id`

## Government Services

### List Available Services
- **Endpoint**: `GET /marketplace/services`

### Redeem ECO for Service
Redeems ECO tokens for a digital voucher (NFT).
- **Endpoint**: `POST /marketplace/services/redeem`
- **Payload**:
  ```json
  {
    "serviceType": "BUS_PASS_MONTHLY",
    "ecoTokenAmount": "800000000000000000000"
  }
  ```

### Get User Vouchers
- **Endpoint**: `GET /marketplace/vouchers/:userAddress`
