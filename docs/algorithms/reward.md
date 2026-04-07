# RewardToken – Pseudocode Algorithm

## Data Structures

ENUM WasteType = { PLASTIC, E_WASTE, PAPER }

STRUCT WasteRecord:
    classification
    confidenceScore
    wasteType
    weight
    proofHash
    timestamp

STATE:
    rates: map(WasteType → tokensPerKg)
    userRecords: map(user → list of WasteRecord)

---

## Initialization

FUNCTION constructor():

    SET rates[PLASTIC] ← 10 tokens/kg
    SET rates[E_WASTE] ← 50 tokens/kg
    SET rates[PAPER] ← 5 tokens/kg

---

## Mint Reward

FUNCTION mintReward(to, classification, confidenceScore, wasteType, weight, proofHash):

    REQUIRE confidenceScore ≤ 100
    REQUIRE weight > 0

    rewardRate ← rates[wasteType]

    // Convert grams → kg and apply confidence
    rewardAmount ← (weight × rewardRate × confidenceScore) / 100000

    MINT rewardAmount tokens TO 'to'

    CREATE record:
        classification
        confidenceScore
        wasteType
        weight
        proofHash
        timestamp ← current time

    APPEND record TO userRecords[to]

    EMIT WasteMinted event

---

## Update Reward Rate

FUNCTION setRate(wasteType, newRate):

    SET rates[wasteType] ← newRate

---

## Get Record Count

FUNCTION getRecordCount(user):

    RETURN length of userRecords[user]
