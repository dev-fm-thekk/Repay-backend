# Transit Tickets API

Interface for `TicketNFT.sol`. Manages NFT-based public transport ticketing.

## Configuration

### Configure Route (Admin)
- **Endpoint**: `POST /tickets/routes`
- **Payload**:
  ```json
  {
    "routeId": "METRO_L1",
    "mode": "METRO",
    "zone": "ZONE_A",
    "standardCostECO": "50000000000000000000",
    "premiumCostECO": "100000000000000000000",
    "validityDuration": 3600
  }
  ```

## Ticketing

### Purchase Ticket
- **Endpoint**: `POST /tickets/purchase`
- **Payload**:
  ```json
  {
    "routeId": "METRO_L1",
    "class": "STANDARD",
    "travelDate": 1740864000
  }
  ```

### Get User Tickets
- **Endpoint**: `GET /tickets/user/:address`

### Validate Ticket (Transit Authority)
- **Endpoint**: `GET /tickets/:id/validate`
- **Query Params**: `stationId=STN_001`

### Use Ticket (Transit Authority)
Marks the NFT as used upon entry.
- **Endpoint**: `POST /tickets/:id/use`
- **Payload**:
  ```json
  {
    "stationId": "STN_001"
  }
  ```
