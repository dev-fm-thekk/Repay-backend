// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IEcoToken {
    function balanceOf(address account) external view returns (uint256);
    function burnFrom(address account, uint256 amount) external;
}

contract TicketNFT is ERC721, Ownable {
    enum TicketClass { STANDARD, PREMIUM }
    enum TransitMode { BUS, METRO, RAIL }

    struct Ticket {
        uint256 ticketId;
        address owner;
        string routeId;
        string zone;
        TicketClass class;
        TransitMode mode;
        uint256 validFrom;
        uint256 validUntil;
        bool isUsed;
        bool isExpired;
        uint256 ecoCost;
        uint256 issuedAt;
    }

    struct TicketConfig {
        string routeId;
        TransitMode mode;
        string zone;
        uint256 standardCostECO;
        uint256 premiumCostECO;
        uint256 validityDuration;
        bool isActive;
    }

    struct ValidationResult {
        bool isValid;
        uint256 ticketId;
        address owner;
        string routeId;
        TicketClass class;
        uint256 validUntil;
    }

    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256[]) public userTickets;
    mapping(string => TicketConfig) public routeConfigs;
    mapping(string => bool) public validStations;

    uint256 public ticketCounter;
    address public ecoToken;
    address public transitAuthority;
    address public admin;

    event TicketPurchased(
        uint256 indexed ticketId,
        address indexed owner,
        string routeId,
        uint256 validFrom,
        uint256 validUntil,
        uint256 ecoCost
    );
    event TicketUsed(uint256 indexed ticketId, address indexed owner, string stationId, uint256 timestamp);
    event TicketExpired(uint256 indexed ticketId);
    event RouteConfigured(string routeId, TransitMode mode, string zone, uint256 standardCost, uint256 premiumCost, uint256 validity);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyTransitAuthority() {
        require(msg.sender == transitAuthority, "Only transit authority");
        _;
    }

    constructor(address _ecoToken, address _transitAuthority) 
        ERC721("Transit Ticket NFT", "TICKET") 
        Ownable(msg.sender)
    {
        require(_ecoToken != address(0), "Invalid token");
        require(_transitAuthority != address(0), "Invalid authority");
        
        admin = msg.sender;
        ecoToken = _ecoToken;
        transitAuthority = _transitAuthority;
    }

    function configureRoute(
        string memory routeId,
        TransitMode mode,
        string memory zone,
        uint256 standardCostECO,
        uint256 premiumCostECO,
        uint256 validityDuration
    ) external onlyAdmin {
        routeConfigs[routeId] = TicketConfig({
            routeId: routeId,
            mode: mode,
            zone: zone,
            standardCostECO: standardCostECO,
            premiumCostECO: premiumCostECO,
            validityDuration: validityDuration,
            isActive: true
        });

        emit RouteConfigured(routeId, mode, zone, standardCostECO, premiumCostECO, validityDuration);
    }

    function addStation(string memory stationId, string memory routeId) external onlyAdmin {
        validStations[stationId] = true;
    }

    function purchaseTicket(
        string memory routeId,
        TicketClass class,
        uint256 travelDate
    ) external returns (uint256) {
        TicketConfig memory config = routeConfigs[routeId];
        require(config.isActive, "Route not active");

        uint256 ecoCost = class == TicketClass.PREMIUM ? config.premiumCostECO : config.standardCostECO;
        require(IEcoToken(ecoToken).balanceOf(msg.sender) >= ecoCost, "Insufficient ECO balance");

        uint256 validFrom = travelDate;
        require(validFrom >= block.timestamp, "Travel date in past");
        require(validFrom <= block.timestamp + 7 days, "Travel date too far");

        uint256 validUntil = validFrom + config.validityDuration;

        IEcoToken(ecoToken).burnFrom(msg.sender, ecoCost);

        ticketCounter++;

        tickets[ticketCounter] = Ticket({
            ticketId: ticketCounter,
            owner: msg.sender,
            routeId: routeId,
            zone: config.zone,
            class: class,
            mode: config.mode,
            validFrom: validFrom,
            validUntil: validUntil,
            isUsed: false,
            isExpired: false,
            ecoCost: ecoCost,
            issuedAt: block.timestamp
        });

        userTickets[msg.sender].push(ticketCounter);
        _safeMint(msg.sender, ticketCounter);

        emit TicketPurchased(ticketCounter, msg.sender, routeId, validFrom, validUntil, ecoCost);

        return ticketCounter;
    }

    function validateTicket(uint256 ticketId, string memory stationId)
        external
        view
        onlyTransitAuthority
        returns (ValidationResult memory)
    {
        Ticket memory ticket = tickets[ticketId];
        
        require(!ticket.isUsed, "Already used");
        require(block.timestamp >= ticket.validFrom, "Not yet valid");
        require(block.timestamp <= ticket.validUntil, "Ticket expired");
        require(validStations[stationId], "Invalid station");

        return ValidationResult({
            isValid: true,
            ticketId: ticketId,
            owner: ticket.owner,
            routeId: ticket.routeId,
            class: ticket.class,
            validUntil: ticket.validUntil
        });
    }

    function markTicketUsed(uint256 ticketId, string memory stationId) external onlyTransitAuthority {
        require(!tickets[ticketId].isUsed, "Already used");
        require(block.timestamp <= tickets[ticketId].validUntil, "Ticket expired");

        tickets[ticketId].isUsed = true;

        emit TicketUsed(ticketId, tickets[ticketId].owner, stationId, block.timestamp);
    }

    function expireStaleTickets(uint256[] memory ticketIds) external {
        for (uint256 i = 0; i < ticketIds.length; i++) {
            uint256 ticketId = ticketIds[i];
            if (block.timestamp > tickets[ticketId].validUntil && !tickets[ticketId].isExpired) {
                tickets[ticketId].isExpired = true;
                emit TicketExpired(ticketId);
            }
        }
    }

    function getTicketStatus(uint256 ticketId) external view returns (string memory) {
        Ticket memory ticket = tickets[ticketId];
        
        if (ticket.isUsed) return "USED";
        if (block.timestamp > ticket.validUntil) return "EXPIRED";
        if (block.timestamp < ticket.validFrom) return "NOT_YET_VALID";
        return "VALID";
    }

    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);
        
        if (to != address(0)) {
            tickets[tokenId].owner = to;
        }
        
        return previousOwner;
    }

    function deactivateRoute(string memory routeId) external onlyAdmin {
        routeConfigs[routeId].isActive = false;
    }

    function updateTransitAuthority(address newAuthority) external onlyAdmin {
        require(newAuthority != address(0), "Invalid authority");
        transitAuthority = newAuthority;
    }
}
