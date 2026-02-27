# Waste Supply Chain — Smart Contract Design

## System Overview

A blockchain-based waste tracking and incentive system that follows products from manufacture through recycling, rewarding users with EcoTokens and enabling exchange for government services and transit.

---

## Contract Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ProductRegistry.sol                       │
│          (product lifecycle + recycle status)                │
└──────────────────────┬──────────────────────────────────────┘
                       │ verifyProduct / updateRecycleStatus
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     SmartBin.sol                             │
│       (AI oracle bridge + weight + token trigger)            │
└───────────┬─────────────────────────────┬───────────────────┘
            │ mintProofOfRecycle           │ notifyGovt
            ▼                             ▼
┌───────────────────────┐    ┌────────────────────────────────┐
│    EcoToken.sol        │    │      MaterialAuction.sol        │
│    (ERC20 rewards)     │    │  (ETH bidding + receipt NFT)    │
└───────────┬───────────┘    └────────────────────────────────┘
            │ spend ECO
     ┌──────┴──────┐
     ▼             ▼
┌──────────────┐  ┌──────────────────────────────────────────┐
│ TicketNFT    │  │           NFTMarketplace.sol              │
│ (transit)    │  │   (ECO ↔ ETH + govt service vouchers)    │
└──────────────┘  └──────────────────────────────────────────┘
```

---

## Contracts

| # | Contract | File | Purpose |
|---|----------|------|---------|
| 1 | ProductRegistry | `01_ProductRegistry.md` | Register companies & products, track recycle status |
| 2 | EcoToken (ERC20) | `02_EcoToken.md` | Mint/burn reward tokens, calculate rewards |
| 3 | SmartBin | `03_SmartBin.md` | Bridge physical recycling to blockchain via AI oracle |
| 4 | MaterialAuction | `04_MaterialAuction.md` | Auction raw materials to recyclers, ETH ↔ receipt NFT |
| 5 | NFTMarketplace | `05_NFTMarketplace.md` | Trade ECO ↔ ETH or redeem for govt service vouchers |
| 6 | TicketNFT (ERC721) | `06_TicketNFT.md` | Issue time-bound transit tickets paid in ECO |

---

## Token Flow

```
Recycle Waste → ECO Minted → User Wallet
                                  │
               ┌──────────────────┼──────────────────┐
               ▼                  ▼                   ▼
          Sell for ETH    Redeem for Govt       Buy Transit
         (Marketplace)      Services           Ticket (NFT)
                            (Voucher NFT)     (burned on use)
```

---

## Key Design Decisions

**EcoTokens are burned (not transferred) on redemption** — ensures tokens represent real-world recycling activity and prevents double-spending.

**Tickets are time-bound ERC721s** — they expire automatically via `validUntil` timestamp. Used tickets remain in wallet as collectibles/travel history.

**AI oracle is trusted off-chain** — SmartBin uses a signed oracle for classification. Signature verification on-chain prevents manipulation.

**Government wallet is the central authority** — controls company verification, auction creation, service pricing, and platform fee collection.

**Proof of recycle is non-fungible** — each product can only be recycled once (`isRecycled` flag), preventing double-reward attacks.