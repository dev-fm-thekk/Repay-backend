# Authentication & Authorization

Repay utilizes a Web3-first authentication flow based on **Sign-In with Ethereum (SIWE)**. This ensures that users are authenticated by their crypto-wallets without passwords, and their identity is verified against the blockchain.

## 1. Authentication Flow (SIWE)

### Step 1: Request Nonce
To prevent replay attacks, the client must first fetch a temporary nonce from the server.
- **Endpoint**: `GET /auth/nonce`
- **Response**:
  ```json
  {
    "nonce": "XyZ123..."
  }
  ```

### Step 2: Sign Message
The client signs a message using their wallet (e.g., MetaMask, WalletConnect). The message should follow the EIP-4361 standard.
```text
repay.network wants you to sign in with your Ethereum account:
0xYourWalletAddress

Sign in to the Repay decentralised recycling platform.

URI: https://repay.network
Version: 1
Chain ID: 1
Nonce: XyZ123...
Issued At: 2024-03-01T23:45:00Z
```

### Step 3: Verify Signature & Issue JWT
The client sends the signed message and signature to the server.
- **Endpoint**: `POST /auth/verify`
- **Payload**:
  ```json
  {
    "message": "...",
    "signature": "0x..."
  }
  ```
- **Response**:
  ```json
  {
    "token": "eyKj...", // JWT
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
