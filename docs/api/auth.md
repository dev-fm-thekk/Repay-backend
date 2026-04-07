# Authentication & Authorization

Repay utilizes a Web3-first authentication flow based on **Sign-In with Ethereum (SIWE)**. This ensures that users are authenticated by their crypto-wallets without passwords, and their identity is verified cryptographically.

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
The client signs a message using their wallet (e.g., MetaMask). The message must follow the EIP-4361 standard.
```text
domain: localhost
address: 0xYourWalletAddress
statement: Sign in with Ethereum to Repay
uri: http://localhost
version: 1
chainId: 31337
nonce: XyZ123...
issuedAt: 2024-03-01T23:45:00Z
```

### Step 3: Verify & Login
The client sends the signed message and signature to the server.
- **Endpoint**: `POST /auth/login`
- **Payload**:
  ```json
  {
    "message": { ...siweObject... },
    "signature": "0x..."
  }
  ```
- **Response**:
  ```json
  {
    "token": "eyKj..." // JWT
  }
  ```

---

## 2. Authorization (RBAC)

Once authenticated via JWT, the API middleware determines the user's role by checking their wallet address against the platform's state.

### Role Mapping (Live Check)
The `authenticate` middleware attaches a `role` to the request object:
- **ADMIN**: Wallet address matches the `ADMIN_PRIVATE_KEY` configuration.
- **AGENCY**: Wallet address is registered and marked as active in the `AgencyRegistry` contract (`isActiveAgency(address) == true`).
- **USER**: Default role for any address that successfully logins via SIWE but is not an Admin or Agency.

### Role Enforcement
Routes are protected by the `authorize([Role])` middleware. If a user's role is not in the allowed list, the API returns `403 Forbidden`.

### Header Usage
For all protected endpoints:
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

---

## 3. Blockchain Execution Security

For operations that execute smart contract functions on behalf of the user (e.g., `purchaseTicket`), the API requires an additional security layer:

1.  **Private Key Required**: The client must send the `private_key` of their wallet in the request body.
2.  **Validation**: The API derives the wallet address from the provided private key and ensures it matches the address stored in the JWT session.
3.  **Scoped Execution**: If validated, the API uses that private key to sign and broadcast the specific blockchain transaction.

---

## 4. Error Handling
- `401 Unauthorized`: No JWT provided, token malformed, or session expired.
- `403 Forbidden`: Authenticated, but lacking the required role (e.g., a simple USER trying to register an agency).
- `400 Bad Request`: Validation error or missing `private_key` for execution.
