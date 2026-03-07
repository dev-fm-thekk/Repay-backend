# Authentication & Authorization

Repay utilizes a Web3-first authentication flow based on **Sign-In with Ethereum (SIWE)**. This ensures that users are authenticated by their crypto-wallets without passwords, and their identity is verified against the blockchain.

## 1. Authentication Flow (SIWE)

## 1. Authentication Flow (Simple Signature)

### Step 1: Sign Message
The client signs a simple message logic using their wallet. 
**Message Format**: `Login to Repay Network with address: <WALLET_ADDRESS>`

Example:
```text
Login to Repay Network with address: 0xYourWalletAddress
```

### Step 2: Login & Issue JWT
The client sends the wallet address and the signature to the server.
- **Endpoint**: `POST /auth/login`
- **Payload**:
  ```json
  {
    "address": "0x...",
    "signature": "0x..."
  }
  ```
- **Response**:
  ```json
  {
    "token": "eyKj...", // JWT containing address and role
    "role": "USER",     // ADMIN, GOVERNMENT, COMPANY, etc.
    "expiresAt": "2024-03-02T23:45:00Z"
  }
  ```

---

## 2. Authorization (RBAC)

Once authenticated, the API checks the user's wallet address against roles defined in the smart contracts.

### Role Mapping
The JWT claims will include the user's wallet address. The middleware then checks:
- **Admin Role**: Verified via `EcoToken.hasRole(ADMIN_ROLE, address)`.
- **Minter Role**: Verified via `EcoToken.hasRole(MINTER_ROLE, address)`.
- **Government**: Verified if `address == MarketPlace.governmentWallet()`.
- **AI Oracle**: Verified if `address == SmartBin.aiOracle()`.
- **Verified Recycler**: Verified via `MaterialAuction.verifiedRecyclers(address)`.

### Header Usage
For all protected endpoints:
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

---

## 3. IoT / Smart Bin Authentication

For stationary IoT devices like Smart Bins:
1.  **Hardware-Bound Wallets**: Highly secure bins may have a local secure enclave (HSM) to sign transactions directly.
2.  **API Keys (Alternative)**: For simpler deployments, bins can be issued a long-lived API Key linked to their registered address in the `SmartBin` contract.
    - **Header**: `X-API-Key: <key>`
    - **Endpoint Restriction**: Bins using API keys are restricted to calling `processDrop` for their own registered address.

---

## 4. Error Handling
- `401 Unauthorized`: No token provided or token expired.
- `403 Forbidden`: Authenticated, but lacking the required blockchain role (e.g., trying to call admin functions as a regular user).
