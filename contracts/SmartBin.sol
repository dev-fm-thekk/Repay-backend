// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProductRegistry {
    struct Product {
        uint256 productId;
        address companyWallet;
        string name;
        string category;
        string metadataURI;
        bool isRecycled;
        uint256 createdAt;
    }
    
    function verifyProduct(uint256 productId) external view returns (Product memory);
    function updateRecycleStatus(uint256 productId, address binAddress, uint256 weight, string memory classification) external;
}

interface IEcoToken {
    struct MintRequest {
        address userWallet;
        uint256 productId;
        uint256 weight;
        string materialType;
        uint256 confidenceScore;
        bytes32 proofHash;
    }

    function mintProofOfRecycle(MintRequest calldata req) external;
    function calculateReward(uint256 weight, string memory materialType, uint256 confidenceScore) external view returns (uint256);
}

contract SmartBin {
    struct Bin {
        address binAddress;
        string location;
        address operator;
        bool isActive;
        uint256 totalWeightProcessed;
        uint256 totalTokensDispensed;
    }

    struct DropRecord {
        uint256 dropId;
        uint256 productId;
        address userWallet;
        uint256 weight;
        string classification;
        uint256 timestamp;
        uint256 tokensAwarded;
    }

    mapping(address => Bin) public bins;
    mapping(uint256 => DropRecord) public dropHistory;
    uint256 public dropCounter;

    address public admin;
    address public aiOracle;
    address public governmentWallet;
    
    IProductRegistry public productRegistry;
    IEcoToken public ecoToken;

    uint256 public constant BATCH_THRESHOLD = 50000; // 50kg in grams

    event BinRegistered(address indexed binAddress, string location);
    event MaterialDropped(uint256 indexed dropId, uint256 indexed productId, address user, string material, uint256 tokens);
    event MaterialBatchReady(address indexed bin, string materialType, uint256 weight, uint256 timestamp);
    event MaterialReleased(uint256 indexed batchId, address indexed buyer, bytes32 receiptHash);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == aiOracle, "Only AI Oracle");
        _;
    }

    modifier onlyGovernment() {
        require(msg.sender == governmentWallet, "Only government");
        _;
    }

    constructor(address _registry, address _token, address _oracle, address _gov) {
        admin = msg.sender;
        productRegistry = IProductRegistry(_registry);
        ecoToken = IEcoToken(_token);
        aiOracle = _oracle;
        governmentWallet = _gov;
    }

    function registerBin(address binAddress, string memory location, address operator) external onlyAdmin {
        bins[binAddress] = Bin({
            binAddress: binAddress,
            location: location,
            operator: operator,
            isActive: true,
            totalWeightProcessed: 0,
            totalTokensDispensed: 0
        });
        emit BinRegistered(binAddress, location);
    }

    function processDrop(
        uint256 productId,
        address userWallet,
        uint256 weight,
        string memory classification,
        uint256 confidenceScore,
        bytes32 proofHash
    ) external onlyOracle {
        require(bins[msg.sender].isActive, "Bin inactive");
        
        // 1. Verify product exists and is not recycled via Registry
        IProductRegistry.Product memory product = productRegistry.verifyProduct(productId);
        require(!product.isRecycled, "Already recycled");

        // 2. Calculate tokens to display in event
        uint256 tokensAwarded = ecoToken.calculateReward(weight, classification, confidenceScore);

        // 3. Update Registry
        productRegistry.updateRecycleStatus(productId, msg.sender, weight, classification);

        // 4. Mint Tokens using the Struct to prevent Stack Too Deep
        ecoToken.mintProofOfRecycle(IEcoToken.MintRequest({
            userWallet: userWallet,
            productId: productId,
            weight: weight,
            materialType: classification,
            confidenceScore: confidenceScore,
            proofHash: proofHash
        }));

        // 5. Update Local Stats
        dropCounter++;
        bins[msg.sender].totalWeightProcessed += weight;
        bins[msg.sender].totalTokensDispensed += tokensAwarded;

        dropHistory[dropCounter] = DropRecord({
            dropId: dropCounter,
            productId: productId,
            userWallet: userWallet,
            weight: weight,
            classification: classification,
            timestamp: block.timestamp,
            tokensAwarded: tokensAwarded
        });

        emit MaterialDropped(dropCounter, productId, userWallet, classification, tokensAwarded);
    }

    function notifyGovMaterialAvailable(string calldata materialType, uint256 estimatedWeight) external {
        require(bins[msg.sender].operator == msg.sender, "Only operator");
        require(estimatedWeight >= BATCH_THRESHOLD, "Below threshold");
        emit MaterialBatchReady(msg.sender, materialType, estimatedWeight, block.timestamp);
    }

    function releaseMaterialToBuyer(uint256 batchId, address buyerAddress, bytes32 receiptHash) external onlyGovernment {
        emit MaterialReleased(batchId, buyerAddress, receiptHash);
    }

    function updateOracle(address newOracle) external onlyAdmin {
        aiOracle = newOracle;
    }
}