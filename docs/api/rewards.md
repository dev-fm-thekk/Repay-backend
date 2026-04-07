# Rewards API (RWDR Token)

Interface for `RewardToken.sol`. Manages the RWDR ERC20 incentive tokens.

## 1. Token Information

### Get Token Info
- **Endpoint**: `GET /reward/info`
- **Response**: Token metadata like name, symbol, and decimals.

### Get User Balance
- **Endpoint**: `GET /reward/balance/:address`
- **Response**: The current RWDR balance of the wallet (in human-readable format).

---

## 2. Reward History

### Get All Reward Records
- **Endpoint**: `GET /reward/records/:address`
- **Auth Required**: `ADMIN` or the owner of the address.
- **Response**: Detailed history of all minting events for the user.

### Get Record Count
- **Endpoint**: `GET /reward/records/:address/count`
- **Response**: Total number of reward events recorded on-chain for the wallet.

---

## 3. Administrative Operations

### Mint Tokens
Used by the system to issue rewards for verified activities.
- **Endpoint**: `POST /reward/mint`
- **Auth Required**: `ADMIN`
- **Payload**:
  ```json
  {
    "to": "0x...",
    "amount": "100.5", // Human readable amount
    "classification": 1, // 0=PLASTIC, 1=EWASTE, 2=PAPER
    "confidenceScore": 95,
    "wasteType": "Battery",
    "weight": 500,
    "proofHash": "0x..."
  }
  ```

### Update Minting Rates
Allows the administrator to adjust the token value per gram of waste.
- **Endpoint**: `POST /reward/rates`
- **Auth Required**: `ADMIN`
- **Payload**:
  ```json
  {
    "classification": 0,
    "newRate": 1500 // Rate per gram (in 18 decimals internally)
  }
  ```
