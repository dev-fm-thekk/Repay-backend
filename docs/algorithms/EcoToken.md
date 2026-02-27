# EcoToken.sol (ERC20)

## Overview
ERC20 token minted as rewards when users recycle waste. Tokens are the core currency of the ecosystem — used to buy transit tickets, trade on the marketplace, or redeem for government services.

---

## Token Parameters

```
name:     "EcoToken"
symbol:   "ECO"
decimals: 18
```

---

## Data Structures

```
struct RecycleReward {
    uint256 productId
    address user
    uint256 tokensAwarded
    bytes32 proofHash       // hash of AI classification + weight + binId
    uint256 timestamp
}
```

---

## Storage

```
mapping(address => uint256) public balances
mapping(address => mapping(address => uint256)) public allowances
uint256 public totalSupply
uint256 public totalMinted
uint256 public totalBurned

mapping(address => bool) public authorizedMinters   // SmartBins
mapping(uint256 => RecycleReward) public rewardHistory  // productId → reward

// Reward rate table (tokens per gram per material type)
mapping(string => uint256) public rewardRates
```

---

## Reward Rate Table

```
"plastic-PET"   → 10 ECO per 100g
"plastic-HDPE"  → 8  ECO per 100g
"glass"         → 5  ECO per 100g
"metal-aluminum"→ 15 ECO per 100g
"e-waste"       → 25 ECO per 100g
"paper"         → 3  ECO per 100g
"default"       → 2  ECO per 100g
```

---

## Algorithms

### `calculateReward(weight, materialType, confidenceScore)`
```
1. Fetch rate = rewardRates[materialType] ?? rewardRates["default"]
2. baseReward = (weight / 100) * rate
3. qualityMultiplier = confidenceScore / 100   // AI confidence 0–100
4. finalReward = baseReward * qualityMultiplier
5. Return finalReward (in wei units, 18 decimals)
```

### `mintProofOfRecycle(userWallet, productId, weight, materialType, confidenceScore, proofHash)`
```
1. Require msg.sender is authorizedMinter (SmartBin)
2. Require rewardHistory[productId].tokensAwarded == 0  // not already rewarded
3. amount = calculateReward(weight, materialType, confidenceScore)
4. Require amount > 0
5. balances[userWallet] += amount
6. totalSupply += amount
7. totalMinted += amount
8. Store RecycleReward { productId, userWallet, amount, proofHash, now }
9. Emit Transfer(address(0), userWallet, amount)
10. Emit RecycleMint(userWallet, productId, amount, proofHash)
```

### `burn(amount)`
```
1. Require balances[msg.sender] >= amount
2. balances[msg.sender] -= amount
3. totalSupply -= amount
4. totalBurned += amount
5. Emit Transfer(msg.sender, address(0), amount)
6. Emit TokensBurned(msg.sender, amount)
```

### `burnFrom(userWallet, amount)`
```
1. Require allowances[userWallet][msg.sender] >= amount
2. Require balances[userWallet] >= amount
3. allowances[userWallet][msg.sender] -= amount
4. balances[userWallet] -= amount
5. totalSupply -= amount
6. totalBurned += amount
7. Emit Transfer(userWallet, address(0), amount)
```

### Standard ERC20: `transfer`, `approve`, `transferFrom`
```
transfer(to, amount):
  1. Require balances[msg.sender] >= amount
  2. balances[msg.sender] -= amount
  3. balances[to] += amount
  4. Emit Transfer(msg.sender, to, amount)

approve(spender, amount):
  1. allowances[msg.sender][spender] = amount
  2. Emit Approval(msg.sender, spender, amount)

transferFrom(from, to, amount):
  1. Require allowances[from][msg.sender] >= amount
  2. Require balances[from] >= amount
  3. allowances[from][msg.sender] -= amount
  4. balances[from] -= amount
  5. balances[to] += amount
  6. Emit Transfer(from, to, amount)
```

---

## Access Control

| Function            | Allowed Callers       |
|---------------------|-----------------------|
| mintProofOfRecycle  | Authorized SmartBins  |
| burn                | Token Holder          |
| burnFrom            | Approved Spender      |
| addMinter           | Admin                 |
| updateRewardRates   | Admin / Government    |

---

## Events

```
Transfer(address from, address to, uint256 amount)
Approval(address owner, address spender, uint256 amount)
RecycleMint(address user, uint256 productId, uint256 amount, bytes32 proofHash)
TokensBurned(address user, uint256 amount)
```