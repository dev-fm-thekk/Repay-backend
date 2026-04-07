// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./agency.sol";
import "./services.sol";

/**
 * @title TicketNFT
 * @dev ERC-721 NFT contract for government-service tickets purchased with RWDR tokens.
 *
 *  Flow
 *  ────
 *  1. Citizen calls `purchaseTicket(serviceId)`.
 *     - ServiceRegistry verifies the service is active & has supply.
 *     - The RWDR token price is fetched from ServiceRegistry.
 *     - Citizen must have approved this contract to spend `tokenPrice` RWDR.
 *     - RWDR tokens are transferred from citizen → agency wallet.
 *     - An NFT ticket is minted to the citizen.
 *
 *  2. At the gate the agency operator calls `validateTicket(tokenId)`.
 *     - Confirms ticket belongs to the calling agency's service.
 *     - Marks ticket as USED so it cannot be reused.
 *
 *  Ticket lifecycle: VALID → USED | EXPIRED (after `validityPeriod`).
 *
 *  Transfers are intentionally locked after purchase — tickets are
 *  soul-bound (non-transferable) to prevent secondary-market abuse.
 */
contract TicketNFT is ERC721URIStorage, Ownable {
    // ── Types ─────────────────────────────────────────────────────────────────

    enum TicketStatus {
        VALID,
        USED,
        EXPIRED
    }

    struct TicketMetadata {
        uint256     tokenId;
        uint256     serviceId;
        uint256     agencyId;
        address     holder;
        uint256     tokensPaid;      // RWDR amount paid (18-decimal)
        uint256     issuedAt;
        uint256     expiresAt;       // 0 if no expiry
        TicketStatus status;
        bytes32     validationHash;  // set on validation: keccak256(tokenId, validator, timestamp)
    }

    // ── State ─────────────────────────────────────────────────────────────────

    IERC20          public immutable rewardToken;
    AgencyRegistry  public immutable agencyRegistry;
    ServiceRegistry public immutable serviceRegistry;

    uint256 private _nextTokenId = 1;

    /// Default ticket validity window (seconds). 0 = no expiry.
    uint256 public defaultValidityPeriod = 24 hours;

    /// tokenId → TicketMetadata
    mapping(uint256 => TicketMetadata) public tickets;

    /// holder → list of tokenIds
    mapping(address => uint256[]) private _holderTickets;

    // ── Events ────────────────────────────────────────────────────────────────

    event TicketPurchased(
        uint256 indexed tokenId,
        uint256 indexed serviceId,
        uint256 indexed agencyId,
        address  holder,
        uint256  tokensPaid,
        uint256  issuedAt,
        uint256  expiresAt
    );

    event TicketValidated(
        uint256 indexed tokenId,
        uint256 indexed serviceId,
        address  validator,
        bytes32  validationHash,
        uint256  validatedAt
    );

    event TicketExpired(uint256 indexed tokenId, uint256 expiredAt);

    event ValidityPeriodUpdated(uint256 newPeriod);

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param _rewardToken       Address of RewardToken (RWDR) ERC-20.
     * @param _agencyRegistry    Address of AgencyRegistry.
     * @param _serviceRegistry   Address of ServiceRegistry.
     */
    constructor(
        address _rewardToken,
        address _agencyRegistry,
        address _serviceRegistry
    )
        ERC721("GovService Ticket", "GSTKT")
        Ownable(msg.sender)
    {
        require(_rewardToken      != address(0), "TicketNFT: zero reward token");
        require(_agencyRegistry   != address(0), "TicketNFT: zero agency registry");
        require(_serviceRegistry  != address(0), "TicketNFT: zero service registry");

        rewardToken      = IERC20(_rewardToken);
        agencyRegistry   = AgencyRegistry(_agencyRegistry);
        serviceRegistry  = ServiceRegistry(_serviceRegistry);
    }

    // ── Soul-bound: disable transfers ─────────────────────────────────────────

    /**
     * @dev Override _update to block all transfers except minting.
     *      Tickets are soul-bound to the original purchaser.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0)), block everything else
        require(from == address(0), "TicketNFT: tickets are non-transferable");
        return super._update(to, tokenId, auth);
    }

    // ── Purchase ──────────────────────────────────────────────────────────────

    /**
     * @notice Purchase a ticket for a government service using RWDR tokens.
     *
     * @dev Prerequisites (caller must do these off-chain before calling):
     *   1. RewardToken.approve(ticketNFTAddress, tokenPrice)
     *
     * @param serviceId  The service to purchase a ticket for.
     * @param metadataURI IPFS / HTTPS URI for the NFT token metadata (QR image etc.)
     */
    function purchaseTicket(uint256 serviceId, string calldata metadataURI)
        external
        returns (uint256 tokenId)
    {
        // ── 1. Record issuance & fetch price from ServiceRegistry ──────────
        //       Reverts if: service inactive, supply exhausted.
        uint256 tokenPrice = serviceRegistry.recordIssuance(serviceId);

        // ── 2. Fetch agency wallet for payment routing ─────────────────────
        // Use getService() — raw public mapping returns a tuple across contracts, not a struct.
        ServiceRegistry.Service memory svc = serviceRegistry.getService(serviceId);
        AgencyRegistry.Agency memory agency = agencyRegistry.getAgency(svc.agencyId);
        address agencyWallet = agency.wallet;

        // ── 3. Collect RWDR tokens from buyer → agency wallet ──────────────
        require(
            rewardToken.transferFrom(msg.sender, agencyWallet, tokenPrice),
            "TicketNFT: token transfer failed"
        );

        // ── 4. Mint NFT ────────────────────────────────────────────────────
        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        uint256 expiresAt = defaultValidityPeriod == 0
            ? 0
            : block.timestamp + defaultValidityPeriod;

        tickets[tokenId] = TicketMetadata({
            tokenId:        tokenId,
            serviceId:      serviceId,
            agencyId:       svc.agencyId,
            holder:         msg.sender,
            tokensPaid:     tokenPrice,
            issuedAt:       block.timestamp,
            expiresAt:      expiresAt,
            status:         TicketStatus.VALID,
            validationHash: bytes32(0)
        });

        _holderTickets[msg.sender].push(tokenId);

        emit TicketPurchased(
            tokenId,
            serviceId,
            svc.agencyId,
            msg.sender,
            tokenPrice,
            block.timestamp,
            expiresAt
        );
    }

    // ── Validation (gate check) ───────────────────────────────────────────────

    /**
     * @notice Validate (scan) a ticket at the gate.
     *         Can only be called by an active agency operator.
     *         The ticket must belong to a service owned by the calling agency.
     *
     * @param tokenId   The NFT token id to validate.
     */
    function validateTicket(uint256 tokenId) external {
        // ── 1. Caller must be an active agency ─────────────────────────────
        require(
            agencyRegistry.isActiveAgency(msg.sender),
            "TicketNFT: caller is not an active agency"
        );

        AgencyRegistry.Agency memory callerAgency =
            agencyRegistry.getAgencyByWallet(msg.sender);

        TicketMetadata storage ticket = tickets[tokenId];

        require(ticket.tokenId == tokenId, "TicketNFT: ticket does not exist");

        // ── 2. Ticket must belong to this agency's service ─────────────────
        require(
            ticket.agencyId == callerAgency.id,
            "TicketNFT: ticket not from your agency"
        );

        // ── 3. Resolve current status (lazy expiry) ────────────────────────
        _resolveExpiry(tokenId);

        require(ticket.status == TicketStatus.VALID, "TicketNFT: ticket is not valid");

        // ── 4. Mark as used ────────────────────────────────────────────────
        ticket.status = TicketStatus.USED;

        bytes32 vHash = keccak256(
            abi.encodePacked(tokenId, msg.sender, block.timestamp)
        );
        ticket.validationHash = vHash;

        emit TicketValidated(
            tokenId,
            ticket.serviceId,
            msg.sender,
            vHash,
            block.timestamp
        );
    }

    // ── Expiry helpers ────────────────────────────────────────────────────────

    /**
     * @notice Explicitly trigger expiry check for a ticket.
     *         Anyone can call this; it only changes state if truly expired.
     */
    function expireTicket(uint256 tokenId) external {
        require(tickets[tokenId].tokenId == tokenId, "TicketNFT: ticket does not exist");
        _resolveExpiry(tokenId);
    }

    /// @dev Lazy expiry resolution: marks ticket EXPIRED if past its window.
    function _resolveExpiry(uint256 tokenId) internal {
        TicketMetadata storage ticket = tickets[tokenId];
        if (
            ticket.status == TicketStatus.VALID &&
            ticket.expiresAt != 0 &&
            block.timestamp > ticket.expiresAt
        ) {
            ticket.status = TicketStatus.EXPIRED;
            emit TicketExpired(tokenId, block.timestamp);
        }
    }

    // ── Owner configuration ───────────────────────────────────────────────────

    /**
     * @notice Update the default validity window for newly minted tickets.
     *         Set to 0 for no expiry.
     */
    function setDefaultValidityPeriod(uint256 periodSeconds) external onlyOwner {
        defaultValidityPeriod = periodSeconds;
        emit ValidityPeriodUpdated(periodSeconds);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /**
     * @notice Get the current (lazily evaluated) status of a ticket.
     */
    function getTicketStatus(uint256 tokenId)
        external
        view
        returns (TicketStatus)
    {
        require(tickets[tokenId].tokenId == tokenId, "TicketNFT: ticket does not exist");
        TicketMetadata memory t = tickets[tokenId];

        if (
            t.status == TicketStatus.VALID &&
            t.expiresAt != 0 &&
            block.timestamp > t.expiresAt
        ) {
            return TicketStatus.EXPIRED; // view-only: doesn't write state
        }
        return t.status;
    }

    /**
     * @notice Returns all ticket token ids owned by a given address.
     */
    function getHolderTickets(address holder)
        external
        view
        returns (uint256[] memory)
    {
        return _holderTickets[holder];
    }

    /**
     * @notice Check if a specific ticket is valid (not used, not expired).
     */
    function isTicketValid(uint256 tokenId) external view returns (bool) {
        if (tickets[tokenId].tokenId != tokenId) return false;
        TicketMetadata memory t = tickets[tokenId];
        if (t.status != TicketStatus.VALID) return false;
        if (t.expiresAt != 0 && block.timestamp > t.expiresAt) return false;
        return true;
    }

    /**
     * @notice Full metadata for a ticket.
     */
    function getTicket(uint256 tokenId)
        external
        view
        returns (TicketMetadata memory)
    {
        require(tickets[tokenId].tokenId == tokenId, "TicketNFT: ticket does not exist");
        return tickets[tokenId];
    }
}
