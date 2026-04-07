# Transit Tickets API

Interface for `TicketNFT.sol`. Manages NFT-based public transport ticketing.

## 1. Ticket Discovery

### Get Ticket Details
- **Endpoint**: `GET /ticket/:tokenId`
- **Response**: Ticket metadata including serviceId, status, and owner.

### Get User's Tickets
- **Endpoint**: `GET /ticket/holder/:address`
- **Response**: List of `tokenIds` owned by the address.

### Get Tickets by Service
- **Endpoint**: `GET /ticket/service/:serviceId`
- **Response**: All tickets issued for a specific transport service.

---

## 2. Purchase Flow

### Purchase Ticket
Purchase an NFT ticket for a specific service using RWDR tokens.
- **Endpoint**: `POST /ticket/purchase`
- **Auth Required**: `USER`, `AGENCY`, or `ADMIN`
- **Payload**:
  ```json
  {
    "serviceId": 1,
    "metadataURI": "ipfs://optional-custom-metadata",
    "private_key": "0x..." // User's private key for transaction signing
  }
  ```
- **Prerequisite**: User must have approved the `TicketNFT` contract to spend the required `RWDR` amount beforehand.

---

## 3. Validation (Gate Check)

### Validate Ticket
Marks a ticket as `USED`. Can only be performed by the agency that owns the service.
- **Endpoint**: `POST /ticket/:tokenId/validate`
- **Auth Required**: `AGENCY` (owner of the service) or `ADMIN`
- **Payload**:
  ```json
  {
    "operator_private_key": "0x..." // Private key of the agency operator
  }
  ```

---

## 4. Ticket Statuses
- `0` (VALID): Freshly purchased, ready for use.
- `1` (USED): Already scanned at a gate.
- `2` (EXPIRED): Validity period has passed.
