# Repay Backend - Smart Contracts

A blockchain-based recycling incentive platform with smart contracts for product tracking, waste management, and eco-token rewards.

## Architecture

The system consists of 6 main smart contracts:

1. **EcoToken (ERC20)** - Reward token minted when users recycle
2. **ProductRegistry** - Central registry for products and companies
3. **SmartBin** - Coordinates waste processing with AI classification
4. **TicketNFT (ERC721)** - Transit ticket NFTs purchased with EcoTokens
5. **MaterialAuction** - Government-controlled auctions for collected materials
6. **NFTMarketPlace** - Trading platform for EcoTokens and government services

## Technology Stack

- **Solidity ^0.8.20**
- **OpenZeppelin Contracts ^5.0.0** - Battle-tested ERC20/ERC721 implementations
- **Foundry/Forge** - Testing framework
- **Hardhat** - Development environment

## Installation

```bash
# Install dependencies
npm install

# Or with bun
bun install
```

## Testing

```bash
# Run Forge tests
forge test

# Or use npm script
npm run test:forge

# Run with verbosity
forge test -vvv

# Test specific contract
forge test --match-contract EcoTokenTest
```

## Compilation

```bash
# Compile with Forge
forge build

# Or use npm script
npm run compile:forge
```

## Contract Overview

### EcoToken.sol
- ERC20 token with OpenZeppelin implementation
- Role-based access control (ADMIN_ROLE, MINTER_ROLE)
- Custom reward calculation based on material type and AI confidence
- Tracks total minted and burned tokens

### ProductRegistry.sol
- Company registration and verification
- Product lifecycle tracking
- Recycle status management
- Integration with SmartBin for updates

### SmartBin.sol
- Oracle-based AI classification system
- Waste drop recording
- Material batch notifications for government
- Integration with ProductRegistry and EcoToken

### TicketNFT.sol
- ERC721 NFT tickets with OpenZeppelin implementation
- Route configuration for different transit modes
- Time-bound validation system
- Standard and Premium ticket classes

### MaterialAuction.sol
- Government-controlled batch auctions
- ETH bidding with automatic refunds
- CollectionReceiptNFT (ERC721) for winners
- Material collection tracking

### NFTMarketPlace.sol
- ECO token listing and trading
- Government service redemption
- GovtServiceNFT (ERC721) vouchers
- Platform fee system

## Key Features

### OpenZeppelin Integration
All token standards (ERC20, ERC721) use OpenZeppelin's audited implementations:
- Enhanced security and best practices
- Gas-optimized operations
- Standard compliance
- Reentrancy protection

### Access Control
- Role-based permissions using OpenZeppelin AccessControl
- Admin roles for system management
- Minter roles for authorized contracts
- Government wallet for auctions

### Oracle Integration
- AI classification oracle for waste identification
- Request-fulfill pattern for async processing
- Confidence scoring for reward calculation

## Configuration Files

### foundry.toml
```toml
[profile.default]
src = "contracts"
out = "out"
libs = ["node_modules", "lib"]
test = "test"
solc = "0.8.20"
```

### remappings.txt
```
@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/
forge-std/=node_modules/forge-std/src/
```

## Development Workflow

1. **Write Contracts** - Follow algorithms in `docs/algorithms/`
2. **Write Tests** - Comprehensive test coverage for each contract
3. **Compile** - `forge build`
4. **Test** - `forge test`
5. **Deploy** - Use Hardhat scripts or Foundry scripts

## Testing Best Practices

- Each contract has comprehensive test coverage
- Tests use Foundry's `vm` cheatcodes for state manipulation
- Event emission testing with `vm.expectEmit`
- Access control verification
- Edge case and error condition testing

## Security Considerations

- OpenZeppelin contracts provide battle-tested security
- Role-based access control prevents unauthorized actions
- Oracle pattern prevents manipulation of AI classifications
- Escrow mechanisms in marketplace and auction contracts
- Comprehensive test coverage for all critical paths

## License

MIT
