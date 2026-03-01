// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface IEcoToken {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function burnFrom(address account, uint256 amount) external;
}

contract GovtServiceNFT is ERC721 {
    struct ServiceVoucher {
        uint256 voucherId;
        address recipient;
        string serviceType;
        uint256 ecoTokensRedeemed;
        uint256 issuedAt;
        uint256 expiresAt;
    }

    mapping(uint256 => ServiceVoucher) public vouchers;
    uint256 public totalSupply;

    address public marketplace;

    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "Only marketplace");
        _;
    }

    constructor(address _marketplace) ERC721("Government Service Voucher", "GOVSERV") {
        marketplace = _marketplace;
    }

    function mint(
        address recipient,
        uint256 voucherId,
        string memory serviceType,
        uint256 expiresAt
    ) external onlyMarketplace returns (uint256) {
        totalSupply++;
        uint256 tokenId = totalSupply;

        _safeMint(recipient, tokenId);

        vouchers[tokenId] = ServiceVoucher({
            voucherId: voucherId,
            recipient: recipient,
            serviceType: serviceType,
            ecoTokensRedeemed: 0,
            issuedAt: block.timestamp,
            expiresAt: expiresAt
        });

        return tokenId;
    }

    function setEcoTokensRedeemed(uint256 tokenId, uint256 amount) external onlyMarketplace {
        vouchers[tokenId].ecoTokensRedeemed = amount;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);
        
        if (to != address(0) && tokenId <= totalSupply) {
            vouchers[tokenId].recipient = to;
        }
        
        return previousOwner;
    }
}

contract NFTMarketPlace {
    enum ListingType { ECO_FOR_ETH, ECO_FOR_SERVICE }
    enum ListingStatus { ACTIVE, SOLD, CANCELLED }

    struct Listing {
        uint256 listingId;
        address seller;
        uint256 ecoTokenAmount;
        uint256 askPriceETH;
        uint256 pricePerToken;
        ListingType listingType;
        string serviceType;
        ListingStatus status;
        uint256 createdAt;
    }

    struct ServiceVoucher {
        uint256 voucherId;
        address recipient;
        string serviceType;
        uint256 ecoTokensRedeemed;
        uint256 issuedAt;
        uint256 expiresAt;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => ServiceVoucher) public vouchers;
    mapping(string => uint256) public serviceEcoCost;
    mapping(string => uint256) public serviceExpiryDuration;
    mapping(string => bool) public validServices;

    uint256 public listingCounter;
    uint256 public voucherCounter;
    uint256 public platformFeePercent;
    address public governmentWallet;
    address public ecoToken;
    GovtServiceNFT public govtServiceNFT;

    event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 amount, uint256 price);
    event ListingSold(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 ethReceived);
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event ServiceRedeemed(uint256 indexed voucherId, address indexed user, string serviceType, uint256 ecoBurned);
    event ServiceAdded(string serviceType, uint256 cost, uint256 expiryDuration);
    event PlatformFeeUpdated(uint256 newFee);

    modifier onlyGovernment() {
        require(msg.sender == governmentWallet, "Only government");
        _;
    }

    constructor(address _ecoToken, address _governmentWallet, uint256 _platformFeePercent) {
        require(_ecoToken != address(0), "Invalid token");
        require(_governmentWallet != address(0), "Invalid government");
        require(_platformFeePercent <= 100, "Fee too high");

        ecoToken = _ecoToken;
        governmentWallet = _governmentWallet;
        platformFeePercent = _platformFeePercent;
        
        govtServiceNFT = new GovtServiceNFT(address(this));

        _addService("BUS_PASS_DAILY", 50 * 10**18, 1 days);
        _addService("BUS_PASS_MONTHLY", 800 * 10**18, 30 days);
        _addService("METRO_PASS_DAILY", 80 * 10**18, 1 days);
        _addService("METRO_PASS_MONTHLY", 1200 * 10**18, 30 days);
        _addService("WATER_SUBSIDY", 300 * 10**18, 90 days);
        _addService("ELECTRICITY_CREDIT", 500 * 10**18, 90 days);
    }

    function _addService(string memory serviceType, uint256 cost, uint256 expiryDuration) internal {
        serviceEcoCost[serviceType] = cost;
        serviceExpiryDuration[serviceType] = expiryDuration;
        validServices[serviceType] = true;
    }

    function addService(string memory serviceType, uint256 cost, uint256 expiryDuration) external onlyGovernment {
        _addService(serviceType, cost, expiryDuration);
        emit ServiceAdded(serviceType, cost, expiryDuration);
    }

    function listTokensForSale(uint256 ecoTokenAmount, uint256 askPriceETH) external returns (uint256) {
        require(ecoTokenAmount > 0, "Amount must be positive");
        require(askPriceETH > 0, "Price must be positive");
        require(IEcoToken(ecoToken).balanceOf(msg.sender) >= ecoTokenAmount, "Insufficient balance");
        require(IEcoToken(ecoToken).allowance(msg.sender, address(this)) >= ecoTokenAmount, "Insufficient allowance");

        IEcoToken(ecoToken).transferFrom(msg.sender, address(this), ecoTokenAmount);

        listingCounter++;

        listings[listingCounter] = Listing({
            listingId: listingCounter,
            seller: msg.sender,
            ecoTokenAmount: ecoTokenAmount,
            askPriceETH: askPriceETH,
            pricePerToken: (askPriceETH * 1e18) / ecoTokenAmount,
            listingType: ListingType.ECO_FOR_ETH,
            serviceType: "",
            status: ListingStatus.ACTIVE,
            createdAt: block.timestamp
        });

        emit ListingCreated(listingCounter, msg.sender, ecoTokenAmount, askPriceETH);
        return listingCounter;
    }

    function buyListing(uint256 listingId) external payable {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(msg.value >= listing.askPriceETH, "Insufficient ETH");
        require(msg.sender != listing.seller, "Cannot buy own listing");

        uint256 fee = (listing.askPriceETH * platformFeePercent) / 100;
        uint256 sellerProceeds = listing.askPriceETH - fee;

        IEcoToken(ecoToken).transfer(msg.sender, listing.ecoTokenAmount);

        (bool sellerSuccess, ) = listing.seller.call{value: sellerProceeds}("");
        require(sellerSuccess, "Transfer to seller failed");

        if (fee > 0) {
            (bool govSuccess, ) = governmentWallet.call{value: fee}("");
            require(govSuccess, "Transfer to government failed");
        }

        if (msg.value > listing.askPriceETH) {
            uint256 refund = msg.value - listing.askPriceETH;
            (bool refundSuccess, ) = msg.sender.call{value: refund}("");
            require(refundSuccess, "Refund failed");
        }

        listing.status = ListingStatus.SOLD;

        emit ListingSold(listingId, msg.sender, listing.ecoTokenAmount, sellerProceeds);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");

        IEcoToken(ecoToken).transfer(msg.sender, listing.ecoTokenAmount);

        listing.status = ListingStatus.CANCELLED;

        emit ListingCancelled(listingId, msg.sender);
    }

    function redeemForGovtService(string memory serviceType, uint256 ecoTokenAmount) external returns (uint256) {
        require(validServices[serviceType], "Invalid service");
        require(ecoTokenAmount >= serviceEcoCost[serviceType], "Insufficient ECO");
        require(IEcoToken(ecoToken).balanceOf(msg.sender) >= ecoTokenAmount, "Insufficient balance");

        IEcoToken(ecoToken).burnFrom(msg.sender, ecoTokenAmount);

        voucherCounter++;
        uint256 expiryDate = block.timestamp + serviceExpiryDuration[serviceType];

        vouchers[voucherCounter] = ServiceVoucher({
            voucherId: voucherCounter,
            recipient: msg.sender,
            serviceType: serviceType,
            ecoTokensRedeemed: ecoTokenAmount,
            issuedAt: block.timestamp,
            expiresAt: expiryDate
        });

        uint256 nftTokenId = govtServiceNFT.mint(msg.sender, voucherCounter, serviceType, expiryDate);
        govtServiceNFT.setEcoTokensRedeemed(nftTokenId, ecoTokenAmount);

        emit ServiceRedeemed(voucherCounter, msg.sender, serviceType, ecoTokenAmount);
        return voucherCounter;
    }

    function getActiveListings() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= listingCounter; i++) {
            if (listings[i].status == ListingStatus.ACTIVE) {
                activeCount++;
            }
        }

        uint256[] memory activeListings = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= listingCounter; i++) {
            if (listings[i].status == ListingStatus.ACTIVE) {
                activeListings[index] = i;
                index++;
            }
        }

        return activeListings;
    }

    function setPlatformFee(uint256 newFee) external onlyGovernment {
        require(newFee <= 100, "Fee too high");
        platformFeePercent = newFee;
        emit PlatformFeeUpdated(newFee);
    }

    function updateGovernmentWallet(address newWallet) external onlyGovernment {
        require(newWallet != address(0), "Invalid wallet");
        governmentWallet = newWallet;
    }

    function deactivateService(string memory serviceType) external onlyGovernment {
        validServices[serviceType] = false;
    }

    receive() external payable {}
}
