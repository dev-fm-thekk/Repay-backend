# ServiceRegistry – Pseudocode Algorithm

## Data Structures

ENUM ServiceStatus = { INACTIVE, ACTIVE }

STRUCT Service:
    id
    agencyId
    name
    route
    tokenPrice
    maxSupply
    totalIssued
    status
    createdAt
    metadataURI

STATE:
    agencyRegistry (external contract)
    nextServiceId ← 1
    services: map(serviceId → Service)
    agencyServices: map(agencyId → list of serviceIds)
    totalServices
    ticketContract

---

## Create Service

FUNCTION createService(name, route, tokenPrice, maxSupply, metadataURI):

    REQUIRE caller is an active agency (via agencyRegistry)
    REQUIRE name not empty
    REQUIRE tokenPrice > 0

    agencyId ← agencyRegistry.getAgencyId(caller)

    serviceId ← nextServiceId
    nextServiceId ← nextServiceId + 1

    CREATE Service with:
        id, agencyId, name, route
        tokenPrice, maxSupply
        totalIssued ← 0
        status ← ACTIVE
        createdAt ← current time
        metadataURI

    services[serviceId] ← Service
    APPEND serviceId TO agencyServices[agencyId]
    totalServices ← totalServices + 1

    RETURN serviceId

---

## Set Service Status

FUNCTION setServiceStatus(serviceId, status):

    REQUIRE service exists

    IF caller is service’s agency OR platform owner:
        services[serviceId].status ← status
    ELSE:
        REJECT

---

## Update Price

FUNCTION updatePrice(serviceId, newPrice):

    REQUIRE service exists
    REQUIRE caller is owning agency
    REQUIRE newPrice > 0

    services[serviceId].tokenPrice ← newPrice

---

## Update Max Supply

FUNCTION updateMaxSupply(serviceId, newMaxSupply):

    REQUIRE service exists
    REQUIRE caller is owning agency

    REQUIRE newMaxSupply == 0 OR
            newMaxSupply ≥ services[serviceId].totalIssued

    services[serviceId].maxSupply ← newMaxSupply

---

## Set Ticket Contract

FUNCTION setTicketContract(address):

    REQUIRE caller is owner
    REQUIRE address ≠ null

    ticketContract ← address

---

## Record Ticket Issuance

FUNCTION recordIssuance(serviceId):

    REQUIRE service exists
    REQUIRE caller == ticketContract

    svc ← services[serviceId]

    REQUIRE svc.status == ACTIVE
    REQUIRE svc.maxSupply == 0 OR svc.totalIssued < svc.maxSupply

    svc.totalIssued ← svc.totalIssued + 1

    RETURN svc.tokenPrice

---

## Get Agency Services

FUNCTION getAgencyServices(agencyId):

    RETURN agencyServices[agencyId]

---

## Get Price

FUNCTION getPrice(serviceId):

    REQUIRE service exists

    RETURN services[serviceId].tokenPrice

---

## Check Availability

FUNCTION isAvailable(serviceId):

    IF service does not exist:
        RETURN false

    svc ← services[serviceId]

    IF svc.status ≠ ACTIVE:
        RETURN false

    IF svc.maxSupply ≠ 0 AND svc.totalIssued ≥ svc.maxSupply:
        RETURN false

    RETURN true

---

## Get Service

FUNCTION getService(serviceId):

    REQUIRE service exists

    RETURN services[serviceId]
