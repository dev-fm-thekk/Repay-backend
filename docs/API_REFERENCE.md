# Repay API Reference

Welcome to the Repay Backend API Reference. This document provides all the necessary information for frontend and mobile developers to integrate with the Repay ecosystem.

## 1. Getting Started

### Base URL
`http://localhost:8000` (Development)

### Authentication Flow (SIWE)
Repay uses **Sign-In with Ethereum (SIWE)**. No passwords are required.

1.  **Get Nonce**: Call `GET /auth/nonce` to receive a unique challenge string.
2.  **Sign Message**: Use a wallet (e.g. MetaMask) to sign a message following the [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) standard.
3.  **Login**: Call `POST /auth/login` with the signed message and signature.
4.  **JWT**: The server returns a JWT. Include this in the `Authorization` header for all subsequent requests:
    `Authorization: Bearer <your_jwt_token>`

---

## 2. Core Concepts

### Role-Based Access Control (RBAC)
The API automatically detects your role based on your wallet address:
- **ADMIN**: Platform owner. Can register agencies and manage global settings.
- **AGENCY**: Registered transport provider. Can manage services and validate tickets.
- **USER**: Standard occupant. Can purchase tickets and earn rewards.

### Blockchain Transactions
For operations that modify on-chain state (e.g., buying a ticket), the API usually requires your **private key** in the request body. 
> [!IMPORTANT]
> The API validates that the provided private key matches the authenticated wallet address before executing the transaction on your behalf.

---

## 3. Endpoints Reference

### 🔐 Authentication (`/auth`)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/auth/nonce` | `GET` | None | Fetches a SIWE nonce. |
| `/auth/login` | `POST` | None | Verifies signature and issues JWT. |
| `/auth/me` | `GET` | JWT | Returns current role and address. |

---

### 🏛️ Agency Management (`/agency`)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/agency/total` | `GET` | JWT | Total number of agencies. |
| `/agency/:id` | `GET` | JWT | Get full agency details by ID. |
| `/agency/wallet/:address` | `GET` | JWT | Get agency details by operator address. |
| `/agency/active/:address` | `GET` | JWT | Check if an address is an active agency. |
| `/agency/register` | `POST` | ADMIN | Register a new agency. |
| `/agency/:id/status` | `PUT` | ADMIN | Activate/Suspend an agency (`status`: 0/1). |
| `/agency/:id/wallet` | `PUT` | ADMIN | Update agency operator wallet. |
| `/agency/:id/metadata` | `PUT` | ADMIN | Update agency metadata URI (IPFS). |

---

### 🚌 Service Registry (`/service`)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/service/total` | `GET` | JWT | Total number of services. |
| `/service/:id` | `GET` | JWT | Get full service details. |
| `/service/:id/price` | `GET` | JWT | Get current RWDR price of a service. |
| `/service/:id/available` | `GET` | JWT | Check if service is currently purchasable. |
| `/service/agency/:agencyId` | `GET` | JWT | Get all services for a specific agency. |
| `/service/create` | `POST` | AGENCY | Create a new transport service. |
| `/service/:id/status` | `PUT` | ADMIN | Activate/Deactivate a service. |
| `/service/:id/price` | `PUT` | AGENCY | Update service price (requires agency PK). |
| `/service/:id/supply` | `PUT` | AGENCY | Update max supply cap (0 = unlimited). |

---

### 🎁 Rewards & Tokens (`/reward`)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/reward/info` | `GET` | JWT | Token metadata (RWDR). |
| `/reward/balance/:address` | `GET` | JWT | Get RWDR balance. |
| `/reward/allowance/:o/:s` | `GET` | JWT | Check spending allowance. |
| `/reward/rates/:type` | `GET` | JWT | Get reward rate for waste type (0=Plastic, etc). |
| `/reward/records/:addr/count` | `GET` | JWT | Total recycling records for address. |
| `/reward/records/:addr/:idx` | `GET` | JWT | Get a specific record by index. |
| `/reward/mint` | `POST` | ADMIN | Issue rewards for verified recycling. |
| `/reward/transfer` | `POST` | ADMIN | Admin transfer of tokens. |
| `/reward/rate` | `PUT` | ADMIN | Update global minting rates. |

---

### 🎫 Transit Tickets (`/ticket`)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/ticket/:tokenId` | `GET` | JWT | Get ticket details and status. |
| `/ticket/:tokenId/status` | `GET` | JWT | Get status label (VALID/USED/EXPIRED). |
| `/ticket/:tokenId/valid` | `GET` | JWT | Boolean check for current validity. |
| `/ticket/holder/:address` | `GET` | JWT | Get all tickets owned by an address. |
| `/ticket/purchase` | `POST` | USER | Purchase a ticket using RWDR. |
| `/ticket/:tokenId/validate` | `POST` | AGENCY | Scan/Use a ticket (requires agency PK). |
| `/ticket/:tokenId/expire` | `POST` | None | Manually trigger expiry check. |
| `/ticket/validity-period` | `PUT` | ADMIN | Update global default validity window. |

---

## 4. Error Responses

Common HTTP Status Codes:
- `400 Bad Request`: Validation error or expired nonce.
- `401 Unauthorized`: JWT missing or invalid.
- `403 Forbidden`: Insufficient role or private key mismatch.
- `404 Not Found`: Resource (agency, service, ticket) does not exist.
- `500 Internal Error`: Blockchain transaction failed or server error.

---

## 5. Implementation Notes

### Request Payloads for On-Chain Writes
When performing a write operation (e.g., `POST /ticket/purchase`), ensure the `private_key` passed in the body matches the address linked to the JWT session. This key is used to sign the transaction that is then broadcast by the server.

### Token Decimals
All RWDR token amounts in the API responses are formatted to human-readable strings (18 decimals). When sending amounts (like `newPrice`), provide them as human-readable strings.
