// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./agency.sol";

/**
 * @title ServiceRegistry
 * @dev Allows registered government agencies to publish "services" —
 *      each service describes a ticket type and its RWDR token price.
 *
 *      Examples
 *      ────────
 *        • KSRTC City Bus  – Route: Trivandrum Central → Airport  – 100 RWDR
 *        • DMRC Metro      – Route: Rajiv Chowk → Noida Sec-62    – 80  RWDR
 *        • Indian Railways – Route: TVC → MAS (Sleeper)            – 500 RWDR
 *
 *      Services are created by active agency operators and can be
 *      activated / deactivated by either the agency or the platform owner.
 */
contract ServiceRegistry is Ownable {
    // ── Types ─────────────────────────────────────────────────────────────────

    enum ServiceStatus {
        INACTIVE,
        ACTIVE
    }

    struct Service {
        uint256       id;
        uint256       agencyId;        // agency that owns this service
        string        name;            // human-readable ticket name
        string        route;           // origin → destination (or zone)
        uint256       tokenPrice;      // RWDR tokens required (18-decimal)
        uint256       maxSupply;       // 0 = unlimited
        uint256       totalIssued;     // tickets minted so far
        ServiceStatus status;
        uint256       createdAt;
        string        metadataURI;     // off-chain schedule / route info
    }

    // ── State ─────────────────────────────────────────────────────────────────

    AgencyRegistry public immutable agencyRegistry;

    uint256 private _nextServiceId = 1;

    /// serviceId → Service
    mapping(uint256 => Service) public services;

    /// agencyId → list of serviceIds
    mapping(uint256 => uint256[]) public agencyServices;

    uint256 public totalServices;

    // ── Events ────────────────────────────────────────────────────────────────

    event ServiceCreated(
        uint256 indexed serviceId,
        uint256 indexed agencyId,
        string  name,
        string  route,
        uint256 tokenPrice,
        uint256 maxSupply
    );

    event ServiceStatusChanged(uint256 indexed serviceId, ServiceStatus newStatus);
    event ServicePriceUpdated(uint256 indexed serviceId, uint256 newPrice);
    event ServiceSupplyUpdated(uint256 indexed serviceId, uint256 newMaxSupply);
    event TicketIssued(uint256 indexed serviceId, uint256 newTotalIssued);

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyServiceAgency(uint256 serviceId) {
        uint256 aid = agencyRegistry.agencyIdByWallet(msg.sender);
        require(aid != 0,                            "ServiceRegistry: not an agency");
        require(services[serviceId].agencyId == aid, "ServiceRegistry: not service owner");
        _;
    }

    modifier serviceExists(uint256 serviceId) {
        require(
            services[serviceId].id == serviceId && serviceId != 0,
            "ServiceRegistry: unknown service"
        );
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address agencyRegistryAddress) Ownable(msg.sender) {
        require(agencyRegistryAddress != address(0), "ServiceRegistry: zero address");
        agencyRegistry = AgencyRegistry(agencyRegistryAddress);
    }

    // ── Agency functions ──────────────────────────────────────────────────────

    /**
     * @notice Create a new ticket-type service.
     * @param name         Ticket name, e.g. "City Bus – Ordinary".
     * @param route        Route or zone string, e.g. "Central → Airport".
     * @param tokenPrice   Cost in RWDR tokens (with 18 decimals).
     *                     e.g. 100 tokens → 100 * 10**18
     * @param maxSupply    Maximum tickets that can ever be issued (0 = unlimited).
     * @param metadataURI  Off-chain details (schedule, stops, fare chart, IPFS).
     */
    function createService(
        string calldata name,
        string calldata route,
        uint256         tokenPrice,
        uint256         maxSupply,
        string calldata metadataURI
    ) external returns (uint256 serviceId) {
        require(
            agencyRegistry.isActiveAgency(msg.sender),
            "ServiceRegistry: caller is not an active agency"
        );
        require(bytes(name).length > 0,  "ServiceRegistry: empty name");
        require(tokenPrice > 0,          "ServiceRegistry: price must be > 0");

        uint256 agencyId = agencyRegistry.agencyIdByWallet(msg.sender);
        serviceId        = _nextServiceId++;

        services[serviceId] = Service({
            id:           serviceId,
            agencyId:     agencyId,
            name:         name,
            route:        route,
            tokenPrice:   tokenPrice,
            maxSupply:    maxSupply,
            totalIssued:  0,
            status:       ServiceStatus.ACTIVE,
            createdAt:    block.timestamp,
            metadataURI:  metadataURI
        });

        agencyServices[agencyId].push(serviceId);
        totalServices++;

        emit ServiceCreated(serviceId, agencyId, name, route, tokenPrice, maxSupply);
    }

    /**
     * @notice Activate or deactivate a service (agency operator or platform owner).
     */
    function setServiceStatus(uint256 serviceId, ServiceStatus status)
        external
        serviceExists(serviceId)
    {
        uint256 aid = agencyRegistry.agencyIdByWallet(msg.sender);
        bool isAgencyOp = (aid != 0 && services[serviceId].agencyId == aid);
        bool isPlatformOwner = (msg.sender == owner());

        require(isAgencyOp || isPlatformOwner, "ServiceRegistry: not authorised");

        services[serviceId].status = status;
        emit ServiceStatusChanged(serviceId, status);
    }

    /**
     * @notice Update the RWDR token price of a service (agency operator only).
     */
    function updatePrice(uint256 serviceId, uint256 newPrice)
        external
        serviceExists(serviceId)
        onlyServiceAgency(serviceId)
    {
        require(newPrice > 0, "ServiceRegistry: price must be > 0");
        services[serviceId].tokenPrice = newPrice;
        emit ServicePriceUpdated(serviceId, newPrice);
    }

    /**
     * @notice Update the maximum supply cap (agency operator only).
     *         New cap must be >= tickets already issued (or 0 for unlimited).
     */
    function updateMaxSupply(uint256 serviceId, uint256 newMaxSupply)
        external
        serviceExists(serviceId)
        onlyServiceAgency(serviceId)
    {
        require(
            newMaxSupply == 0 || newMaxSupply >= services[serviceId].totalIssued,
            "ServiceRegistry: cap below issued count"
        );
        services[serviceId].maxSupply = newMaxSupply;
        emit ServiceSupplyUpdated(serviceId, newMaxSupply);
    }

    // ── Internal (called by Ticket.sol) ───────────────────────────────────────

    /**
     * @notice Record that one ticket has been issued for a service.
     *         Only callable by the Ticket contract (set via setTicketContract).
     */
    address public ticketContract;

    function setTicketContract(address _ticketContract) external onlyOwner {
        require(_ticketContract != address(0), "ServiceRegistry: zero address");
        ticketContract = _ticketContract;
    }

    /**
     * @dev Called by Ticket.sol after a successful mint.
     *      Increments totalIssued and validates supply cap.
     */
    function recordIssuance(uint256 serviceId)
        external
        serviceExists(serviceId)
        returns (uint256 tokenPrice)
    {
        require(msg.sender == ticketContract, "ServiceRegistry: caller not ticket contract");

        Service storage svc = services[serviceId];

        require(svc.status == ServiceStatus.ACTIVE, "ServiceRegistry: service inactive");
        require(
            svc.maxSupply == 0 || svc.totalIssued < svc.maxSupply,
            "ServiceRegistry: supply exhausted"
        );

        svc.totalIssued++;
        emit TicketIssued(serviceId, svc.totalIssued);

        return svc.tokenPrice;
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /**
     * @notice Returns all service ids belonging to an agency.
     */
    function getAgencyServices(uint256 agencyId)
        external
        view
        returns (uint256[] memory)
    {
        return agencyServices[agencyId];
    }

    /**
     * @notice Convenience: get token price for a given service.
     */
    function getPrice(uint256 serviceId)
        external
        view
        serviceExists(serviceId)
        returns (uint256)
    {
        return services[serviceId].tokenPrice;
    }

    /**
     * @notice Check whether a service is currently purchasable.
     */
    function isAvailable(uint256 serviceId) external view returns (bool) {
        if (services[serviceId].id != serviceId) return false;
        Service storage svc = services[serviceId];
        if (svc.status != ServiceStatus.ACTIVE)  return false;
        if (svc.maxSupply != 0 && svc.totalIssued >= svc.maxSupply) return false;
        return true;
    }

    /**
     * @notice Return the full Service struct for a given serviceId.
     *         Use this instead of the raw `services` mapping when you need the
     *         complete struct in a single call (public mappings with string fields
     *         return tuples, not structs, when called from other contracts).
     */
    function getService(uint256 serviceId)
        external
        view
        serviceExists(serviceId)
        returns (Service memory)
    {
        return services[serviceId];
    }
}
