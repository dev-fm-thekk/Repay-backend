# TicketNFT.sol (ERC721)

## Overview
Issues time-bound transit tickets as ERC721 NFTs in exchange for EcoTokens. Tickets are validated and consumed at station gates. Each ticket is single-use and expires after its validity window.

---

## Data Structures

```
struct Ticket {
    uint256 ticketId
    address owner
    string routeId          // e.g. "METRO-LINE1", "BUS-42", "RAIL-CHENNAI-TVM"
    string zone             // e.g. "ZONE-A", "ZONE-B", "ALL"
    TicketClass class       // STANDARD | PREMIUM
    TransitMode mode        // BUS | METRO | RAIL
    uint256 validFrom
    uint256 validUntil
    bool isUsed
    bool isExpired
    uint256 ecoCost
    uint256 issuedAt
}

enum TicketClass { STANDARD, PREMIUM }
enum TransitMode { BUS, METRO, RAIL }
```

---

## Storage

```
mapping(uint256 => Ticket) public tickets
mapping(address => uint256[]) public userTickets
mapping(string => TicketConfig) public routeConfigs      // route → config

uint256 public ticketCounter
address public ecoToken
address public transitAuthority                          // validates at gates

struct TicketConfig {
    string routeId
    TransitMode mode
    uint256 standardCostECO
    uint256 premiumCostECO
    uint256 validityDuration    // seconds
    bool isActive
}
```

---

## Algorithms

### `purchaseTicket(routeId, class, travelDate)`
```
1. Require routeConfigs[routeId].isActive == true
2. config = routeConfigs[routeId]
3. ecoCost = class == PREMIUM ? config.premiumCostECO : config.standardCostECO

// Deduct EcoTokens
4. Require EcoToken.balanceOf(msg.sender) >= ecoCost
5. EcoToken.burnFrom(msg.sender, ecoCost)
   // Tokens are burned (not transferred) — this is proof of contribution

// Set validity window
6. validFrom = travelDate (must be today or future, within 7 days)
7. Require validFrom >= block.timestamp
8. Require validFrom <= block.timestamp + 7 days
9. validUntil = validFrom + config.validityDuration

// Mint ticket NFT
10. ticketCounter++
11. Mint ERC721 token (ticketCounter) to msg.sender
12. Create Ticket {
      ticketId    = ticketCounter,
      owner       = msg.sender,
      routeId, zone = config.zone, class,
      mode        = config.mode,
      validFrom, validUntil,
      isUsed      = false,
      isExpired   = false,
      ecoCost,
      issuedAt    = now
    }
13. Emit TicketPurchased(ticketCounter, msg.sender, routeId, validFrom, validUntil, ecoCost)
```

### `validateTicket(ticketId, stationId)`
```
// Called by station gate terminal (transit authority)
1. Require msg.sender == transitAuthority or authorizedGate

2. ticket = tickets[ticketId]
3. Require ticket.isUsed == false          → revert "Already used"
4. Require block.timestamp >= ticket.validFrom    → revert "Not yet valid"
5. Require block.timestamp <= ticket.validUntil   → revert "Ticket expired"
6. Require ownerOf(ticketId) == tx.origin or pre-approved

// Validate station is on correct route
7. Require isStationOnRoute(stationId, ticket.routeId) == true

8. Return ValidationResult {
     isValid    = true,
     ticketId,
     owner      = ticket.owner,
     routeId    = ticket.routeId,
     class      = ticket.class,
     validUntil = ticket.validUntil
   }
```

### `markTicketUsed(ticketId)`
```
// Called immediately after validateTicket by gate
1. Require msg.sender == transitAuthority or authorizedGate
2. Require tickets[ticketId].isUsed == false
3. Require block.timestamp <= tickets[ticketId].validUntil

4. tickets[ticketId].isUsed = true
5. Emit TicketUsed(ticketId, tickets[ticketId].owner, stationId, now)

// NFT is NOT burned — remains as collectible/travel history
```

### `expireStaleTickets(ticketIds[])` ← batched cleanup
```
For each ticketId in ticketIds:
  1. If block.timestamp > tickets[ticketId].validUntil
     AND tickets[ticketId].isExpired == false:
       tickets[ticketId].isExpired = true
       Emit TicketExpired(ticketId)
```

### `getTicketStatus(ticketId)`
```
1. ticket = tickets[ticketId]
2. If ticket.isUsed: return "USED"
3. If block.timestamp > ticket.validUntil: return "EXPIRED"
4. If block.timestamp < ticket.validFrom: return "NOT_YET_VALID"
5. Return "VALID"
```

---

## Route Configuration Examples

```
routeId: "METRO-LINE1"
  mode:            METRO
  zone:            ALL
  standardCostECO: 80
  premiumCostECO:  150
  validity:        86400 (24 hours)

routeId: "BUS-CITY-ZONE-A"
  mode:            BUS
  zone:            ZONE-A
  standardCostECO: 50
  premiumCostECO:  90
  validity:        7200 (2 hours)

routeId: "RAIL-TVM-CHENNAI"
  mode:            RAIL
  zone:            ALL
  standardCostECO: 500
  premiumCostECO:  900
  validity:        172800 (48 hours)
```

---

## Token Lifecycle

```
User holds ECO
    ↓ purchaseTicket()
ECO burned → Ticket NFT minted (VALID)
    ↓ validateTicket() at gate
Gate confirms valid
    ↓ markTicketUsed()
Ticket NFT state = USED (stays in wallet as collectible)
    ↓ validUntil passes (if unused)
Ticket NFT state = EXPIRED
```

---

## Access Control

| Function            | Allowed Callers           |
|---------------------|---------------------------|
| purchaseTicket      | Any ECO Holder            |
| validateTicket      | Transit Authority / Gates |
| markTicketUsed      | Transit Authority / Gates |
| addRoute / setRoute | Transit Authority / Admin |
| expireStaleTickets  | Anyone (public cleanup)   |

---

## Events

```
TicketPurchased(uint256 ticketId, address owner, string routeId, uint256 validFrom, uint256 validUntil, uint256 ecoCost)
TicketUsed(uint256 ticketId, address owner, string stationId, uint256 timestamp)
TicketExpired(uint256 ticketId)
RouteConfigured(string routeId, TransitMode mode, uint256 standardCost, uint256 premiumCost)
```