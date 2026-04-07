export const RewardTokenAbi = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "spender", "type": "address" },
            { "internalType": "uint256", "name": "allowance", "type": "uint256" },
            { "internalType": "uint256", "name": "needed", "type": "uint256" }
        ],
        "name": "ERC20InsufficientAllowance",
        "type": "error"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "sender", "type": "address" },
            { "internalType": "uint256", "name": "balance", "type": "uint256" },
            { "internalType": "uint256", "name": "needed", "type": "uint256" }
        ],
        "name": "ERC20InsufficientBalance",
        "type": "error"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "approver", "type": "address" }
        ],
        "name": "ERC20InvalidApprover",
        "type": "error"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "receiver", "type": "address" }
        ],
        "name": "ERC20InvalidReceiver",
        "type": "error"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "sender", "type": "address" }
        ],
        "name": "ERC20InvalidSender",
        "type": "error"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "spender", "type": "address" }
        ],
        "name": "ERC20InvalidSpender",
        "type": "error"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "owner", "type": "address" }
        ],
        "name": "OwnableInvalidOwner",
        "type": "error"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "account", "type": "address" }
        ],
        "name": "OwnableUnauthorizedAccount",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "spender", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
            { "indexed": false, "internalType": "enum RewardToken.WasteType", "name": "wasteType", "type": "uint8" },
            { "indexed": false, "internalType": "uint256", "name": "weight", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "tokensMinted", "type": "uint256" },
            { "indexed": false, "internalType": "string", "name": "classification", "type": "string" },
            { "indexed": false, "internalType": "bytes32", "name": "proofHash", "type": "bytes32" }
        ],
        "name": "WasteMinted",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "address", "name": "spender", "type": "address" }
        ],
        "name": "allowance",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "spender", "type": "address" },
            { "internalType": "uint256", "name": "value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
        "name": "getRecordCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "string", "name": "classification", "type": "string" },
            { "internalType": "uint256", "name": "confidenceScore", "type": "uint256" },
            { "internalType": "enum RewardToken.WasteType", "name": "wasteType", "type": "uint8" },
            { "internalType": "uint256", "name": "weight", "type": "uint256" },
            { "internalType": "bytes32", "name": "proofHash", "type": "bytes32" }
        ],
        "name": "mintReward",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "enum RewardToken.WasteType", "name": "", "type": "uint8" }
        ],
        "name": "rates",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "enum RewardToken.WasteType", "name": "wasteType", "type": "uint8" },
            { "internalType": "uint256", "name": "newRate", "type": "uint256" }
        ],
        "name": "setRate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "value", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "from", "type": "address" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "value", "type": "uint256" }
        ],
        "name": "transferFrom",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "", "type": "address" },
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "name": "userRecords",
        "outputs": [
            { "internalType": "string", "name": "classification", "type": "string" },
            { "internalType": "uint256", "name": "confidenceScore", "type": "uint256" },
            { "internalType": "enum RewardToken.WasteType", "name": "wasteType", "type": "uint8" },
            { "internalType": "uint256", "name": "weight", "type": "uint256" },
            { "internalType": "bytes32", "name": "proofHash", "type": "bytes32" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const AgencyRegistryAbi = [
    // ── Read ──────────────────────────────────────────────────────────────────
    {
        "inputs": [],
        "name": "totalAgencies",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
        "name": "getAgency",
        "outputs": [
            {
                "components": [
                    { "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "internalType": "string", "name": "name", "type": "string" },
                    { "internalType": "string", "name": "shortCode", "type": "string" },
                    { "internalType": "uint8", "name": "transport", "type": "uint8" },
                    { "internalType": "address", "name": "wallet", "type": "address" },
                    { "internalType": "uint8", "name": "status", "type": "uint8" },
                    { "internalType": "uint256", "name": "registeredAt", "type": "uint256" },
                    { "internalType": "string", "name": "metadataURI", "type": "string" }
                ],
                "internalType": "struct AgencyRegistry.Agency",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "wallet", "type": "address" }],
        "name": "getAgencyByWallet",
        "outputs": [
            {
                "components": [
                    { "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "internalType": "string", "name": "name", "type": "string" },
                    { "internalType": "string", "name": "shortCode", "type": "string" },
                    { "internalType": "uint8", "name": "transport", "type": "uint8" },
                    { "internalType": "address", "name": "wallet", "type": "address" },
                    { "internalType": "uint8", "name": "status", "type": "uint8" },
                    { "internalType": "uint256", "name": "registeredAt", "type": "uint256" },
                    { "internalType": "string", "name": "metadataURI", "type": "string" }
                ],
                "internalType": "struct AgencyRegistry.Agency",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "wallet", "type": "address" }],
        "name": "isActiveAgency",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "agencyIdByWallet",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    // ── Write ─────────────────────────────────────────────────────────────────
    {
        "inputs": [
            { "internalType": "string", "name": "name", "type": "string" },
            { "internalType": "string", "name": "shortCode", "type": "string" },
            { "internalType": "uint8", "name": "transport", "type": "uint8" },
            { "internalType": "address", "name": "wallet", "type": "address" },
            { "internalType": "string", "name": "metadataURI", "type": "string" }
        ],
        "name": "registerAgency",
        "outputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "uint8", "name": "status", "type": "uint8" }
        ],
        "name": "setAgencyStatus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "address", "name": "newWallet", "type": "address" }
        ],
        "name": "updateAgencyWallet",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "string", "name": "metadataURI", "type": "string" }
        ],
        "name": "updateAgencyMetadata",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export const ServiceRegistryAbi = [
    // ── Read ──────────────────────────────────────────────────────────────────
    {
        "inputs": [],
        "name": "totalServices",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "serviceId", "type": "uint256" }],
        "name": "getService",
        "outputs": [
            {
                "components": [
                    { "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "internalType": "uint256", "name": "agencyId", "type": "uint256" },
                    { "internalType": "string", "name": "name", "type": "string" },
                    { "internalType": "string", "name": "route", "type": "string" },
                    { "internalType": "uint256", "name": "tokenPrice", "type": "uint256" },
                    { "internalType": "uint256", "name": "maxSupply", "type": "uint256" },
                    { "internalType": "uint256", "name": "totalIssued", "type": "uint256" },
                    { "internalType": "uint8", "name": "status", "type": "uint8" },
                    { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
                    { "internalType": "string", "name": "metadataURI", "type": "string" }
                ],
                "internalType": "struct ServiceRegistry.Service",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "serviceId", "type": "uint256" }],
        "name": "getPrice",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "serviceId", "type": "uint256" }],
        "name": "isAvailable",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "agencyId", "type": "uint256" }],
        "name": "getAgencyServices",
        "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    // ── Write ─────────────────────────────────────────────────────────────────
    {
        "inputs": [
            { "internalType": "string", "name": "name", "type": "string" },
            { "internalType": "string", "name": "route", "type": "string" },
            { "internalType": "uint256", "name": "tokenPrice", "type": "uint256" },
            { "internalType": "uint256", "name": "maxSupply", "type": "uint256" },
            { "internalType": "string", "name": "metadataURI", "type": "string" }
        ],
        "name": "createService",
        "outputs": [{ "internalType": "uint256", "name": "serviceId", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "serviceId", "type": "uint256" },
            { "internalType": "uint8", "name": "status", "type": "uint8" }
        ],
        "name": "setServiceStatus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "serviceId", "type": "uint256" },
            { "internalType": "uint256", "name": "newPrice", "type": "uint256" }
        ],
        "name": "updatePrice",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "serviceId", "type": "uint256" },
            { "internalType": "uint256", "name": "newMaxSupply", "type": "uint256" }
        ],
        "name": "updateMaxSupply",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_ticketContract", "type": "address" }],
        "name": "setTicketContract",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export const TicketNFTAbi = [
    // ── Read ──────────────────────────────────────────────────────────────────
    {
        "inputs": [],
        "name": "defaultValidityPeriod",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "getTicket",
        "outputs": [
            {
                "components": [
                    { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                    { "internalType": "uint256", "name": "serviceId", "type": "uint256" },
                    { "internalType": "uint256", "name": "agencyId", "type": "uint256" },
                    { "internalType": "address", "name": "holder", "type": "address" },
                    { "internalType": "uint256", "name": "tokensPaid", "type": "uint256" },
                    { "internalType": "uint256", "name": "issuedAt", "type": "uint256" },
                    { "internalType": "uint256", "name": "expiresAt", "type": "uint256" },
                    { "internalType": "uint8", "name": "status", "type": "uint8" },
                    { "internalType": "bytes32", "name": "validationHash", "type": "bytes32" }
                ],
                "internalType": "struct TicketNFT.TicketMetadata",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "getTicketStatus",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "isTicketValid",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "holder", "type": "address" }],
        "name": "getHolderTickets",
        "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    // ── Write ─────────────────────────────────────────────────────────────────
    {
        "inputs": [
            { "internalType": "uint256", "name": "serviceId", "type": "uint256" },
            { "internalType": "string", "name": "metadataURI", "type": "string" }
        ],
        "name": "purchaseTicket",
        "outputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "validateTicket",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "expireTicket",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "periodSeconds", "type": "uint256" }],
        "name": "setDefaultValidityPeriod",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // ── Events ────────────────────────────────────────────────────────────────
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
            { "indexed": true, "internalType": "uint256", "name": "serviceId", "type": "uint256" },
            { "indexed": true, "internalType": "uint256", "name": "agencyId", "type": "uint256" },
            { "indexed": false, "internalType": "address", "name": "holder", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "tokensPaid", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "issuedAt", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "expiresAt", "type": "uint256" }
        ],
        "name": "TicketPurchased",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
            { "indexed": true, "internalType": "uint256", "name": "serviceId", "type": "uint256" },
            { "indexed": false, "internalType": "address", "name": "validator", "type": "address" },
            { "indexed": false, "internalType": "bytes32", "name": "validationHash", "type": "bytes32" },
            { "indexed": false, "internalType": "uint256", "name": "validatedAt", "type": "uint256" }
        ],
        "name": "TicketValidated",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "spender", "type": "address" },
            { "internalType": "uint256", "name": "allowance", "type": "uint256" },
            { "internalType": "uint256", "name": "needed", "type": "uint256" }
        ],
        "name": "ERC20InsufficientAllowance",
        "type": "error"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "sender", "type": "address" },
            { "internalType": "uint256", "name": "balance", "type": "uint256" },
            { "internalType": "uint256", "name": "needed", "type": "uint256" }
        ],
        "name": "ERC20InsufficientBalance",
        "type": "error"
    }
] as const;
