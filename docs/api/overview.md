# Repay API Design Overview

This document outlines the REST API design for interacting with the Repay transport and governance ecosystem. The API acts as a secure bridge between client applications and the smart contracts.

## Base URL
`http://localhost:8000` (Development)

## Authentication
The platform uses **Sign-In with Ethereum (SIWE)** to authenticate wallets and issue stateless JWT sessions.
- **Flow**: Nonce -> Signature Verification -> JWT
- **Full Guide**: [Authentication Documentation](./auth.md)
- **Header**: `Authorization: Bearer <jwt_token>`

## API Modules

1.  **[Authentication](./auth.md)**: Wallet-based login and session management.
2.  **[Agency Registry](./registry.md)**: Admin-only registration of government transport agencies.
3.  **[Service Registry](./registry.md)**: Management of transit services by registered agencies.
4.  **[Transit Tickets](./tickets.md)**: Purchasing and validating NFT-based tickets using RWDR.
5.  **[Rewards](./rewards.md)**: RWDR token balance tracking and incentive history.

## Common Response Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource (e.g., service, agency) created.
- `400 Bad Request`: Validation error (e.g., missing fields).
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: Wallet does not have the required role (Admin or Agency) for the operation.
- `500 Internal Server Error`: Blockchain transaction reverted or server-side failure.

## Transaction Handling
The API supports secure blockchain interactions through:
1.  **Server-Side Execution**: The API server executes the transaction using an authorized wallet (for Admin/Governance tasks).
2.  **User-Scoped Execution**: For operations involving user funds (like buying a ticket), the user must provide their `private_key`. The API validates that this key matches the authenticated session before proceeding with the transaction on their behalf.

*All blockchain responses include the `transactionHash` for client-side verification.*
