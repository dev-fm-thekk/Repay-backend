// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProductRegistry {
    struct Company {
        address wallet;
        string name;
        bool isVerified;
        uint256 registeredAt;
    }

    struct Product {
        uint256 productId;
        address companyWallet;
        string name;
        string category;
        string metadataURI;
        bool isRecycled;
        uint256 createdAt;
    }

    struct RecycleRecord {
        uint256 productId;
        address binAddress;
        uint256 weight;
        string classification;
        uint256 timestamp;
    }

    mapping(address => Company) public companies;
    mapping(uint256 => Product) public products;
    mapping(uint256 => RecycleRecord) public recycleRecords;
    mapping(uint256 => address) public productOwner;
    uint256 public productCounter;

    mapping(address => bool) public registeredBins;
    address public admin;

    event CompanyRegistered(address indexed wallet, string name);
    event CompanyVerified(address indexed wallet);
    event ProductRegistered(
        uint256 indexed productId,
        address indexed company,
        string name,
        string category
    );
    event ProductRecycled(
        uint256 indexed productId,
        address indexed bin,
        uint256 weight,
        string classification
    );
    event BinRegistered(address indexed binAddress);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyRegisteredBin() {
        require(registeredBins[msg.sender], "Not a registered bin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerCompany(string memory _name, address wallet) external {
        require(wallet != address(0), "Invalid wallet address");
        require(companies[wallet].wallet == address(0), "Company already registered");

        companies[wallet] = Company({
            wallet: wallet,
            name: _name,
            isVerified: false,
            registeredAt: block.timestamp
        });

        emit CompanyRegistered(wallet, _name);
    }

    function verifyCompany(address wallet) external onlyAdmin {
        require(companies[wallet].wallet != address(0), "Company not registered");
        companies[wallet].isVerified = true;
        emit CompanyVerified(wallet);
    }

    function registerProduct(
        address companyWallet,
        string memory _name,
        string memory category,
        string memory metadataURI
    ) external returns (uint256) {
        require(
            msg.sender == companyWallet || msg.sender == admin,
            "Not authorized"
        );
        require(companies[companyWallet].isVerified, "Company not verified");

        productCounter++;

        products[productCounter] = Product({
            productId: productCounter,
            companyWallet: companyWallet,
            name: _name,
            category: category,
            metadataURI: metadataURI,
            isRecycled: false,
            createdAt: block.timestamp
        });

        productOwner[productCounter] = companyWallet;

        emit ProductRegistered(productCounter, companyWallet, _name, category);
        return productCounter;
    }

    function getProductInfo(uint256 productId)
        external
        view
        returns (
            Product memory product,
            Company memory company,
            RecycleRecord memory recycleRecord,
            bool hasRecycleRecord
        )
    {
        require(products[productId].productId != 0, "Product does not exist");

        product = products[productId];
        company = companies[product.companyWallet];
        
        if (product.isRecycled) {
            recycleRecord = recycleRecords[productId];
            hasRecycleRecord = true;
        } else {
            hasRecycleRecord = false;
        }
    }

    function updateRecycleStatus(
        uint256 productId,
        address binAddress,
        uint256 weight,
        string memory classification
    ) external onlyRegisteredBin {
        require(products[productId].productId != 0, "Product does not exist");
        require(!products[productId].isRecycled, "Already recycled");

        products[productId].isRecycled = true;

        recycleRecords[productId] = RecycleRecord({
            productId: productId,
            binAddress: binAddress,
            weight: weight,
            classification: classification,
            timestamp: block.timestamp
        });

        emit ProductRecycled(productId, binAddress, weight, classification);
    }

    function verifyProduct(uint256 productId)
        external
        view
        returns (Product memory)
    {
        require(products[productId].productId != 0, "Product does not exist");
        return products[productId];
    }

    function registerBin(address binAddress) external onlyAdmin {
        require(binAddress != address(0), "Invalid bin address");
        registeredBins[binAddress] = true;
        emit BinRegistered(binAddress);
    }

    function unregisterBin(address binAddress) external onlyAdmin {
        registeredBins[binAddress] = false;
    }
}
