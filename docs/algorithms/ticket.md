# TicketNFT – Pseudocode Algorithm

## Data Structures

ENUM TicketStatus = { VALID, USED, EXPIRED }

STRUCT TicketMetadata:
    tokenId
    serviceId
    agencyId
    holder
    tokensPaid
    issuedAt
    expiresAt
    status
    validationHash

STATE:
    rewardToken (ERC20)
    agencyRegistry
    serviceRegistry
    nextTokenId ← 1
    defaultValidityPeriod ← 24 hours
    tickets: map(tokenId → TicketMetadata)
    holderTickets: map(holder → list of tokenIds)

---

## Purchase Ticket

FUNCTION purchaseTicket(serviceId, metadataURI):

    // 1. Get price & validate service
    tokenPrice ← serviceRegistry.recordIssuance(serviceId)

    svc ← serviceRegistry.getService(serviceId)
    agency ← agencyRegistry.getAgency(svc.agencyId)
    agencyWallet ← agency.wallet

    // 2. Transfer tokens from buyer → agency
    REQUIRE transferFrom(buyer, agencyWallet, tokenPrice) succeeds

    // 3. Mint NFT
    tokenId ← nextTokenId
    nextTokenId ← nextTokenId + 1

    MINT NFT to buyer with metadataURI

    // 4. Set expiry
    IF defaultValidityPeriod == 0:
        expiresAt ← 0
    ELSE:
        expiresAt ← current time + defaultValidityPeriod

    // 5. Store ticket
    CREATE TicketMetadata with:
        tokenId, serviceId, agencyId
        holder ← buyer
        tokensPaid ← tokenPrice
        issuedAt ← current time
        expiresAt
        status ← VALID
        validationHash ← null

    tickets[tokenId] ← TicketMetadata
    APPEND tokenId TO holderTickets[buyer]

    RETURN tokenId

---

## Validate Ticket

FUNCTION validateTicket(tokenId):

    REQUIRE caller is active agency

    callerAgency ← agencyRegistry.getAgencyByWallet(caller)
    ticket ← tickets[tokenId]

    REQUIRE ticket exists
    REQUIRE ticket.agencyId == callerAgency.id

    CALL resolveExpiry(tokenId)

    REQUIRE ticket.status == VALID

    ticket.status ← USED

    validationHash ← HASH(tokenId, caller, current time)
    ticket.validationHash ← validationHash

---

## Expire Ticket

FUNCTION expireTicket(tokenId):

    REQUIRE ticket exists

    CALL resolveExpiry(tokenId)

---

## Resolve Expiry (Internal)

FUNCTION resolveExpiry(tokenId):

    ticket ← tickets[tokenId]

    IF ticket.status == VALID AND
       ticket.expiresAt ≠ 0 AND
       current time > ticket.expiresAt:

        ticket.status ← EXPIRED

---

## Update Validity Period

FUNCTION setDefaultValidityPeriod(period):

    REQUIRE caller is owner

    defaultValidityPeriod ← period

---

## Get Ticket Status

FUNCTION getTicketStatus(tokenId):

    REQUIRE ticket exists
    ticket ← tickets[tokenId]

    IF ticket is VALID AND expired:
        RETURN EXPIRED

    RETURN ticket.status

---

## Get Holder Tickets

FUNCTION getHolderTickets(holder):

    RETURN holderTickets[holder]

---

## Check Ticket Validity

FUNCTION isTicketValid(tokenId):

    IF ticket does not exist:
        RETURN false

    ticket ← tickets[tokenId]

    IF ticket.status ≠ VALID:
        RETURN false

    IF expired:
        RETURN false

    RETURN true

---

## Get Ticket

FUNCTION getTicket(tokenId):

    REQUIRE ticket exists

    RETURN tickets[tokenId]
