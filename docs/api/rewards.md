# Smart Bin & Rewards API

Interface for `SmartBin.sol` and `EcoToken.sol`. Orchestrates the recycling flow.

## Bin Management

### Register Smart Bin (Admin)
- **Endpoint**: `POST /bins`
- **Payload**:
  ```json
  {
    "binAddress": "0x...",
    "location": "Central Park South",
    "operator": "0x..."
  }
  ```

### Get Bin Status
- **Endpoint**: `GET /bins/:address`

## Recycling Flow

### Process Drop (Oracle/IoT)
This endpoint is typically called by the AI Oracle after identifying a product drop.
- **Endpoint**: `POST /bins/:address/drop`
- **Auth**: AI Oracle Role
- **Payload**:
  ```json
  {
    "productId": 101,
    "userWallet": "0x...",
    "weight": 500,
    "classification": "plastic-PET",
    "confidenceScore": 98,
    "proofHash": "0x..."
  }
  ```

### Get User Reward History
- **Endpoint**: `GET /rewards/history/:userAddress`

## ECO Token

### Get Balance
- **Endpoint**: `GET /tokens/eco/balance/:address`

### Get Reward Rates
- **Endpoint**: `GET /tokens/eco/rates`

### Calculate Expected Reward
- **Endpoint**: `GET /tokens/eco/calculate`
- **Query Params**: `weight=500&material=glass&confidence=100`
