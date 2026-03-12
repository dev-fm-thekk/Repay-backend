# Agency & Service Registry API

Interfaces for `AgencyRegistry.sol` and `ServiceRegistry.sol`. Manages government transport agencies and their associated transit services.

## 1. Agency Management (Admin Only)

### Register Agency
- **Endpoint**: `POST /agency/register`
- **Auth**: `ADMIN`
- **Payload**:
  ```json
  {
    "name": "City Metro",
    "shortCode": "METRO",
    "transport": 1, // 0=BUS, 1=METRO, 2=TRAIN
    "wallet": "0xAgencyOperatorWallet",
    "metadataURI": "ipfs://..."
  }
  ```

### Update Agency Status
- **Endpoint**: `PUT /agency/:id/status`
- **Payload**: `{ "status": 1 }` // 0=INACTIVE, 1=ACTIVE

---

## 2. Agency Discovery

### Search by Wallet
- **Endpoint**: `GET /agency/wallet/:address`
- **Response**: Full agency details if the address is a registered operator.

### Check Active Status
- **Endpoint**: `GET /agency/active/:address`
- **Response**: `{ "isActive": true/false }`

---

## 3. Service Management

### Create Service
Agencies can create multiple services (routes) for their transport network.
- **Endpoint**: `POST /service/create`
- **Auth**: `AGENCY` or `ADMIN`
- **Payload**:
  ```json
  {
    "name": "Orange Line-Express",
    "route": "Downtown -> Airport",
    "tokenPrice": "2.5", // Price in RWDR
    "maxSupply": 5000,   // 0 for unlimited
    "metadataURI": "ipfs://...",
    "agency_private_key": "0x..." // Required to sign on-chain record
  }
  ```

### Update Service Price
- **Endpoint**: `PATCH /service/:id/price`
- **Payload**:
  ```json
  {
    "newPrice": "3.0",
    "agency_private_key": "0x..."
  }
  ```

---

## 4. Service Discovery

### Get All Services for Agency
- **Endpoint**: `GET /service/agency/:agencyId`

### Check Availability
- **Endpoint**: `GET /service/available/:id`
- **Response**: Returns true if the service is active and has remaining supply.
