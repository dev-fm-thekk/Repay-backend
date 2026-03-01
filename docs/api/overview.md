# Repay API Design Overview

This document outlines the REST API design for interacting with the Repay smart contracts. The API acts as a gateway between frontend/IoT clients and the Ethereum-compatible blockchain.

## Base URL
`https://api.repay.network/v1`

## Authentication
The platform uses **Sign-In with Ethereum (SIWE)** to authenticate wallets.
- **Flow**: Nonce -> Signature -> JWT
- **Full Guide**: [Authentication Documentation](./auth.md)
- **Headers**:
  - `Authorization: Bearer <jwt_token>`
  - `X-API-Key: <optional_iot_key>`

## API Modules

1.  **[Product Registry](./registry.md)**: Manage company identities and product lifecycle.
2.  **[Smart Bin & Rewards](./rewards.md)**: Handle material drops, AI classification, and ECO token distribution.
3.  **[Marketplace](./marketplace.md)**: Trade ECO tokens for ETH or redeem them for government services.
4.  **[Material Auction](./auction.md)**: Government-led auctions for recycled material batches.
5.  **[Transit Tickets](./tickets.md)**: Purchase and validate NFT-based transit tickets using ECO tokens.

## Common Response Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource (e.g., product, listing) created.
- `400 Bad Request`: Validation error.
- `401 Unauthorized`: Missing or invalid authentication.
- `403 Forbidden`: Wallet does not have the required role (e.g., Admin, Minter).
- `500 Internal Server Error`: Blockchain transaction failed or server error.

## Transaction Handling
For write operations, the API can either:
1.  **Direct Execution**: The server sends the transaction (requires server-side private key with roles).
2.  **Gasless / Relayer**: User signs a permit/request, and the API relays it.
3.  **Transaction Preparation**: API returns the encoded data for the frontend to sign and broadcast.

*Default recommendation: API handles transactions for IoT (Smart Bins) and Administrative tasks, while users sign via wallet for Marketplace/Tickets.*
