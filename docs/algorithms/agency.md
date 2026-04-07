# AgencyRegistry – Pseudocode Algorithm

## Data Structures

ENUM TransportType = { BUS, METRO, TRAIN }  
ENUM AgencyStatus = { INACTIVE, ACTIVE }

STRUCT Agency:
    id
    name
    shortCode
    transport
    wallet
    status
    registeredAt
    metadataURI

STATE:
    nextId ← 1
    agencies: map(id → Agency)
    agencyIdByWallet: map(wallet → id)
    totalAgencies

---

## Register Agency

FUNCTION registerAgency(name, shortCode, transport, wallet, metadataURI):

    REQUIRE wallet ≠ null
    REQUIRE name not empty
    REQUIRE shortCode not empty
    REQUIRE agencyIdByWallet[wallet] == 0

    id ← nextId
    nextId ← nextId + 1

    CREATE Agency with:
        id, name, shortCode, transport
        wallet, status = ACTIVE
        registeredAt = current time
        metadataURI

    agencies[id] ← Agency
    agencyIdByWallet[wallet] ← id
    totalAgencies ← totalAgencies + 1

    RETURN id

---

## Set Agency Status

FUNCTION setAgencyStatus(id, status):

    REQUIRE agency with id exists

    agencies[id].status ← status

---

## Update Agency Wallet

FUNCTION updateAgencyWallet(id, newWallet):

    REQUIRE agency with id exists
    REQUIRE newWallet ≠ null
    REQUIRE agencyIdByWallet[newWallet] == 0

    oldWallet ← agencies[id].wallet

    agencyIdByWallet[oldWallet] ← 0
    agencyIdByWallet[newWallet] ← id

    agencies[id].wallet ← newWallet

---

## Update Metadata

FUNCTION updateAgencyMetadata(id, metadataURI):

    REQUIRE agency with id exists

    agencies[id].metadataURI ← metadataURI

---

## Check Active Agency

FUNCTION isActiveAgency(wallet):

    id ← agencyIdByWallet[wallet]

    IF id == 0:
        RETURN false

    RETURN (agencies[id].status == ACTIVE)

---

## Get Agency by Wallet

FUNCTION getAgencyByWallet(wallet):

    id ← agencyIdByWallet[wallet]

    REQUIRE id ≠ 0

    RETURN agencies[id]

---

## Get Agency by ID

FUNCTION getAgency(id):

    REQUIRE agency with id exists

    RETURN agencies[id]
