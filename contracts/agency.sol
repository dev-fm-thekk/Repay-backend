// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgencyRegistry
 * @dev Manages registration and verification of government transport agencies
 *      (bus, metro, train organisations) on the reward-token marketplace.
 *
 *      Only the platform owner (deployer) can register/suspend agencies.
 *      Registered agencies are given an "operator" role that lets them:
 *        - Create services in Services.sol
 *        - Validate / scan tickets in Ticket.sol
 */
contract AgencyRegistry is Ownable {
    // ── Types ─────────────────────────────────────────────────────────────────

    enum TransportType {
        BUS,
        METRO,
        TRAIN
    }

    enum AgencyStatus {
        INACTIVE,   // default / suspended
        ACTIVE
    }

    struct Agency {
        uint256 id;
        string  name;           // e.g. "Kerala State Road Transport Corporation"
        string  shortCode;      // e.g. "KSRTC"
        TransportType transport;
        address wallet;         // agency's operator wallet
        AgencyStatus status;
        uint256 registeredAt;
        string  metadataURI;    // off-chain details (IPFS / URL)
    }

    // ── State ─────────────────────────────────────────────────────────────────

    uint256 private _nextId = 1;

    /// id → Agency
    mapping(uint256 => Agency) public agencies;

    /// operator wallet → agency id  (0 = not registered)
    mapping(address => uint256) public agencyIdByWallet;

    /// total registered agencies (including inactive)
    uint256 public totalAgencies;

    // ── Events ────────────────────────────────────────────────────────────────

    event AgencyRegistered(
        uint256 indexed id,
        string  name,
        string  shortCode,
        TransportType transport,
        address indexed wallet
    );

    event AgencyStatusChanged(
        uint256 indexed id,
        AgencyStatus newStatus
    );

    event AgencyWalletUpdated(
        uint256 indexed id,
        address oldWallet,
        address newWallet
    );

    event AgencyMetadataUpdated(uint256 indexed id, string metadataURI);

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyActiveAgency() {
        uint256 aid = agencyIdByWallet[msg.sender];
        require(aid != 0, "AgencyRegistry: caller not an agency");
        require(
            agencies[aid].status == AgencyStatus.ACTIVE,
            "AgencyRegistry: agency is inactive"
        );
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Owner functions ───────────────────────────────────────────────────────

    /**
     * @notice Register a new government transport agency.
     * @param name         Full legal name of the agency.
     * @param shortCode    Short identifier (e.g. "KSRTC", "DMRC").
     * @param transport    Type of transport (0=BUS, 1=METRO, 2=TRAIN).
     * @param wallet       Agency operator wallet address.
     * @param metadataURI  Off-chain metadata URI (IPFS / HTTPS).
     */
    function registerAgency(
        string calldata name,
        string calldata shortCode,
        TransportType   transport,
        address         wallet,
        string calldata metadataURI
    ) external onlyOwner returns (uint256 id) {
        require(wallet != address(0),           "AgencyRegistry: zero address");
        require(bytes(name).length > 0,         "AgencyRegistry: empty name");
        require(bytes(shortCode).length > 0,    "AgencyRegistry: empty shortCode");
        require(agencyIdByWallet[wallet] == 0,  "AgencyRegistry: wallet already registered");

        id = _nextId++;

        agencies[id] = Agency({
            id:           id,
            name:         name,
            shortCode:    shortCode,
            transport:    transport,
            wallet:       wallet,
            status:       AgencyStatus.ACTIVE,
            registeredAt: block.timestamp,
            metadataURI:  metadataURI
        });

        agencyIdByWallet[wallet] = id;
        totalAgencies++;

        emit AgencyRegistered(id, name, shortCode, transport, wallet);
    }

    /**
     * @notice Activate or suspend an agency.
     */
    function setAgencyStatus(uint256 id, AgencyStatus status) external onlyOwner {
        require(agencies[id].id == id && id != 0, "AgencyRegistry: unknown agency");
        agencies[id].status = status;
        emit AgencyStatusChanged(id, status);
    }

    /**
     * @notice Transfer the operator wallet of an agency (e.g. key rotation).
     */
    function updateAgencyWallet(uint256 id, address newWallet) external onlyOwner {
        require(agencies[id].id == id && id != 0, "AgencyRegistry: unknown agency");
        require(newWallet != address(0),           "AgencyRegistry: zero address");
        require(agencyIdByWallet[newWallet] == 0,  "AgencyRegistry: wallet in use");

        address old = agencies[id].wallet;
        agencyIdByWallet[old]       = 0;
        agencyIdByWallet[newWallet] = id;
        agencies[id].wallet         = newWallet;

        emit AgencyWalletUpdated(id, old, newWallet);
    }

    /**
     * @notice Update the off-chain metadata URI for an agency.
     */
    function updateAgencyMetadata(uint256 id, string calldata metadataURI)
        external
        onlyOwner
    {
        require(agencies[id].id == id && id != 0, "AgencyRegistry: unknown agency");
        agencies[id].metadataURI = metadataURI;
        emit AgencyMetadataUpdated(id, metadataURI);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /**
     * @notice Returns true if `wallet` belongs to a currently active agency.
     */
    function isActiveAgency(address wallet) external view returns (bool) {
        uint256 aid = agencyIdByWallet[wallet];
        if (aid == 0) return false;
        return agencies[aid].status == AgencyStatus.ACTIVE;
    }

    /**
     * @notice Fetch full agency details by operator wallet.
     */
    function getAgencyByWallet(address wallet)
        external
        view
        returns (Agency memory)
    {
        uint256 aid = agencyIdByWallet[wallet];
        require(aid != 0, "AgencyRegistry: not found");
        return agencies[aid];
    }

    /**
     * @notice Fetch full agency details by id.
     */
    function getAgency(uint256 id) external view returns (Agency memory) {
        require(agencies[id].id == id && id != 0, "AgencyRegistry: unknown agency");
        return agencies[id];
    }
}
