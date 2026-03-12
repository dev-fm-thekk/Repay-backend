# Repay Backend - Governance & Transport Ecosystem

A blockchain-powered platform for government transport agencies, service management, and incentive-based rewards. The system utilizes ERC20 tokens for rewards and ERC721 NFTs for transit tickets, all secured by a Web3-first REST API.

## Core Architecture

The system is built on four primary smart contracts:

1.  **RewardToken (RWDR)**: An ERC20 token used to incentivize eco-friendly behavior.
2.  **AgencyRegistry**: A governance contract where the platform administrator registers government transport agencies (e.g., Metro, Bus Authorities).
3.  **ServiceRegistry**: Allows registered agencies to define and manage transport services (routes, price in RWDR, supply).
4.  **TicketNFT**: Handles the minting, purchasing, and validation of NFT-based transit tickets.

## Backend API

The project includes a Node.js/Express server that serves as a bridge between the blockchain and frontend/mobile applications.

### Key Features:
- **SIWE Authentication**: Sign-In with Ethereum for secure, wallet-based logins.
- **RBAC (Role-Based Access Control)**: Permission system (`ADMIN`, `AGENCY`, `USER`) determined by on-chain state.
- **Contract Security**: Sensitive blockchain operations require a transient private key validation against the authenticated session.
- **Viem Integration**: High-performance, type-safe blockchain interactions.

## Technology Stack

- **Solidity ^0.8.28**
- **Smarter Contracts**: OpenZeppelin v5.0
- **Blockchain Environment**: Hardhat & Local Node
- **Server**: Node.js, Express, Bun
- **Authentication**: SIWE (Sign-In with Ethereum), JWT
- **Blockchain Interface**: Viem

## Installation & Setup

```bash
# Install dependencies
bun install

# Start local hardhat node
npx hardhat node

# Deploy contracts to local network
npm run deploy-local

# Start the API server
bun run server
```

## API Documentation

- **[Overview](./docs/api/overview.md)**: Design principles and base configurations.
- **[Authentication](./docs/api/auth.md)**: SIWE flow and role mapping.
- **[Agencies & Services](./docs/api/registry.md)**: Registration and service management.
- **[Transit Tickets](./docs/api/tickets.md)**: Purchase and validation flow.
- **[Rewards](./docs/api/rewards.md)**: Token balance and history.

## Testing

The project uses a combination of Hardhat tests for contracts and Bun for API E2E testing.

```bash
# Run Contract Tests
npx hardhat test

# Run API E2E Tests
bun test test/api.test.ts
```

## Security Design

1.  **Wallet-Only Identity**: No passwords or traditional accounts; identity is proven via cryptographic signatures.
2.  **On-Chain Roles**: Roles are not stored in a database but fetched directly from the registry contracts.
3.  **Private Key Enforcement**: Operations that move funds (like purchasing a ticket) require the user's private key to be passed to the API, where it is validated against the authenticated session before execution.
4.  **Soul-Bound Tickets**: Transit NFTs are non-transferable to prevent secondary market abuse.

## License

MIT
