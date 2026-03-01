// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/TicketNFT.sol";
import "../contracts/EcoToken.sol";

contract TicketNFTTest is Test {
    TicketNFT public ticketNFT;
    EcoToken public token;

    address public admin;
    address public transitAuthority;
    address public user1;
    address public user2;

    event TicketPurchased(
        uint256 indexed ticketId,
        address indexed owner,
        string routeId,
        uint256 validFrom,
        uint256 validUntil,
        uint256 ecoCost
    );
    event TicketUsed(
        uint256 indexed ticketId,
        address indexed owner,
        string stationId,
        uint256 timestamp
    );
    event TicketExpired(uint256 indexed ticketId);
    event RouteConfigured(
        string routeId,
        TicketNFT.TransitMode mode,
        string zone,
        uint256 standardCost,
        uint256 premiumCost,
        uint256 validity
    );

    function setUp() public {
        admin = address(this);
        transitAuthority = makeAddr("transitAuthority");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        token = new EcoToken();
        ticketNFT = new TicketNFT(address(token), transitAuthority);

        ticketNFT.configureRoute(
            "METRO-LINE1",
            TicketNFT.TransitMode.METRO,
            "ALL",
            80 * 10 ** 18,
            150 * 10 ** 18,
            86400
        );

        ticketNFT.configureRoute(
            "BUS-CITY-ZONE-A",
            TicketNFT.TransitMode.BUS,
            "ZONE-A",
            50 * 10 ** 18,
            90 * 10 ** 18,
            7200
        );

        ticketNFT.addStation("STATION-1", "METRO-LINE1");
        ticketNFT.addStation("STATION-2", "METRO-LINE1");

        token.addMinter(admin);

        // Update this call to use the MintRequest struct
        token.mintProofOfRecycle(
            EcoToken.MintRequest({
                userWallet: user1,
                productId: 1,
                weight: 1000000, // Increased from 50,000 to 1,000,000 (yields 100 ECO)
                materialType: "plastic-PET",
                confidenceScore: 100,
                proofHash: keccak256("proof1")
            })
        );
    }

    function testInitialState() public view {
        assertEq(ticketNFT.admin(), admin);
        assertEq(ticketNFT.ecoToken(), address(token));
        assertEq(ticketNFT.transitAuthority(), transitAuthority);
        assertEq(ticketNFT.ticketCounter(), 0);
        assertEq(ticketNFT.name(), "Transit Ticket NFT");
        assertEq(ticketNFT.symbol(), "TICKET");
    }

    function testConfigureRoute() public {
        vm.expectEmit(false, false, false, true);
        emit RouteConfigured(
            "RAIL-TVM-CHENNAI",
            TicketNFT.TransitMode.RAIL,
            "ALL",
            500 * 10 ** 18,
            900 * 10 ** 18,
            172800
        );

        ticketNFT.configureRoute(
            "RAIL-TVM-CHENNAI",
            TicketNFT.TransitMode.RAIL,
            "ALL",
            500 * 10 ** 18,
            900 * 10 ** 18,
            172800
        );

        (
            string memory routeId,
            TicketNFT.TransitMode mode,
            string memory zone,
            uint256 standardCost,
            uint256 premiumCost,
            uint256 validity,
            bool isActive
        ) = ticketNFT.routeConfigs("RAIL-TVM-CHENNAI");
        assertEq(routeId, "RAIL-TVM-CHENNAI");
        assertTrue(uint8(mode) == uint8(TicketNFT.TransitMode.RAIL));
        assertEq(zone, "ALL");
        assertEq(standardCost, 500 * 10 ** 18);
        assertEq(premiumCost, 900 * 10 ** 18);
        assertEq(validity, 172800);
        assertTrue(isActive);
    }

    function testOnlyAdminCanConfigureRoute() public {
        vm.prank(user1);
        vm.expectRevert("Only admin");
        ticketNFT.configureRoute(
            "TEST",
            TicketNFT.TransitMode.BUS,
            "ZONE-A",
            50 * 10 ** 18,
            90 * 10 ** 18,
            7200
        );
    }

    function testPurchaseStandardTicket() public {
        uint256 travelDate = block.timestamp + 1 hours;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);

        vm.expectEmit(true, true, false, false);
        emit TicketPurchased(
            1,
            user1,
            "METRO-LINE1",
            travelDate,
            travelDate + 86400, // Fixed
            80 * 10 ** 18
        );

        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        assertEq(ticketId, 1);
        assertEq(ticketNFT.ticketCounter(), 1);
        assertEq(ticketNFT.ownerOf(ticketId), user1);

        (
            uint256 tid,
            address owner,
            string memory routeId,
            string memory zone,
            TicketNFT.TicketClass class,
            ,
            uint256 validFrom,
            uint256 validUntil,
            bool isUsed,
            bool isExpired,
            uint256 ecoCost,

        ) = ticketNFT.tickets(ticketId);
        assertEq(tid, ticketId);
        assertEq(owner, user1);
        assertEq(routeId, "METRO-LINE1");
        assertEq(zone, "ALL");
        assertTrue(uint8(class) == uint8(TicketNFT.TicketClass.STANDARD));
        assertEq(validFrom, travelDate);
        assertEq(validUntil, travelDate + 86400);
        assertFalse(isUsed);
        assertFalse(isExpired);
        assertEq(ecoCost, 80 * 10 ** 18);
    }

    function testPurchasePremiumTicket() public {
        uint256 travelDate = block.timestamp + 1 hours;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 150 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.PREMIUM,
            travelDate
        );
        vm.stopPrank();

        (
            ,
            ,
            ,
            ,
            TicketNFT.TicketClass class,
            ,
            ,
            ,
            ,
            ,
            uint256 ecoCost,

        ) = ticketNFT.tickets(ticketId);
        assertTrue(uint8(class) == uint8(TicketNFT.TicketClass.PREMIUM));
        assertEq(ecoCost, 150 * 10 ** 18);
    }

    function testCannotPurchaseWithInsufficientBalance() public {
        uint256 travelDate = block.timestamp + 1 hours;

        vm.startPrank(user2);
        token.approve(address(ticketNFT), 80 * 10 ** 18);

        vm.expectRevert("Insufficient ECO balance");
        ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();
    }

    function testCannotPurchaseForInactiveRoute() public {
        ticketNFT.deactivateRoute("METRO-LINE1");

        uint256 travelDate = block.timestamp + 1 hours;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);

        vm.expectRevert("Route not active");
        ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();
    }

    function testCannotPurchaseForPastDate() public {
        vm.warp(block.timestamp + 2 hours); // ensure timestamp is large enough
        uint256 travelDate = block.timestamp - 1 hours;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);

        vm.expectRevert("Travel date in past");
        ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();
    }

    function testCannotPurchaseForTooFarDate() public {
        uint256 travelDate = block.timestamp + 8 days;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);

        vm.expectRevert("Travel date too far");
        ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();
    }

    function testValidateTicket() public {
        uint256 travelDate = block.timestamp;

        // 🔥 Give user tokens first
        token.mint(user1, 100 * 10 ** 18);

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        vm.prank(transitAuthority);
        TicketNFT.ValidationResult memory result = ticketNFT.validateTicket(
            ticketId,
            "STATION-1"
        );

        assertTrue(result.isValid);
        assertEq(result.ticketId, ticketId);
        assertEq(result.owner, user1);
        assertEq(result.routeId, "METRO-LINE1");
    }

    function testCannotValidateUsedTicket() public {
        uint256 travelDate = block.timestamp;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        vm.startPrank(transitAuthority);
        ticketNFT.markTicketUsed(ticketId, "STATION-1");

        vm.expectRevert("Already used");
        ticketNFT.validateTicket(ticketId, "STATION-1");
        vm.stopPrank();
    }

    function testCannotValidateExpiredTicket() public {
        uint256 travelDate = block.timestamp;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        vm.warp(block.timestamp + 86400 + 1);

        vm.prank(transitAuthority);
        vm.expectRevert("Ticket expired");
        ticketNFT.validateTicket(ticketId, "STATION-1");
    }

    function testCannotValidateNotYetValidTicket() public {
        uint256 travelDate = block.timestamp + 2 hours;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        vm.prank(transitAuthority);
        vm.expectRevert("Not yet valid");
        ticketNFT.validateTicket(ticketId, "STATION-1");
    }

    function testOnlyTransitAuthorityCanValidate() public {
        uint256 travelDate = block.timestamp;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert("Only transit authority");
        ticketNFT.validateTicket(ticketId, "STATION-1");
    }

    function testMarkTicketUsed() public {
        uint256 travelDate = block.timestamp;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        vm.prank(transitAuthority);
        vm.expectEmit(true, true, false, false);
        emit TicketUsed(ticketId, user1, "STATION-1", block.timestamp);
        ticketNFT.markTicketUsed(ticketId, "STATION-1");

        (, , , , , , , , bool isUsed, , , ) = ticketNFT.tickets(ticketId);
        assertTrue(isUsed);
    }

    function testCannotMarkUsedTicketTwice() public {
        uint256 travelDate = block.timestamp;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        vm.startPrank(transitAuthority);
        ticketNFT.markTicketUsed(ticketId, "STATION-1");

        vm.expectRevert("Already used");
        ticketNFT.markTicketUsed(ticketId, "STATION-1");
        vm.stopPrank();
    }

    function testExpireStaleTickets() public {
        uint256 travelDate = block.timestamp;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 160 * 10 ** 18);
        uint256 ticketId1 = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        uint256 ticketId2 = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        vm.warp(block.timestamp + 86400 + 1);

        uint256[] memory ticketIds = new uint256[](2);
        ticketIds[0] = ticketId1;
        ticketIds[1] = ticketId2;

        vm.expectEmit(true, false, false, false);
        emit TicketExpired(ticketId1);
        vm.expectEmit(true, false, false, false);
        emit TicketExpired(ticketId2);
        ticketNFT.expireStaleTickets(ticketIds);

        (, , , , , , , , , bool isExpired1, , ) = ticketNFT.tickets(ticketId1);
        (, , , , , , , , , bool isExpired2, , ) = ticketNFT.tickets(ticketId2);
        assertTrue(isExpired1);
        assertTrue(isExpired2);
    }

    function testGetTicketStatus() public {
        uint256 travelDate = block.timestamp + 1 hours;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        assertEq(ticketNFT.getTicketStatus(ticketId), "NOT_YET_VALID");

        vm.warp(travelDate);
        assertEq(ticketNFT.getTicketStatus(ticketId), "VALID");

        vm.prank(transitAuthority);
        ticketNFT.markTicketUsed(ticketId, "STATION-1");
        assertEq(ticketNFT.getTicketStatus(ticketId), "USED");
    }

    function testGetTicketStatusExpired() public {
        uint256 travelDate = block.timestamp;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        vm.warp(block.timestamp + 86400 + 1);
        assertEq(ticketNFT.getTicketStatus(ticketId), "EXPIRED");
    }

    function testGetUserTickets() public {
        uint256 travelDate = block.timestamp;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 240 * 10 ** 18);
        ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );
        vm.stopPrank();

        uint256[] memory userTickets = ticketNFT.getUserTickets(user1);
        assertEq(userTickets.length, 3);
        assertEq(userTickets[0], 1);
        assertEq(userTickets[1], 2);
        assertEq(userTickets[2], 3);
    }

    function testERC721BalanceOf() public {
        vm.startPrank(user1);
        token.approve(address(ticketNFT), 160 * 10 ** 18);
        ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            block.timestamp
        );
        ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            block.timestamp
        );
        vm.stopPrank();

        assertEq(ticketNFT.balanceOf(user1), 2);
    }

    function testERC721Transfer() public {
        uint256 travelDate = block.timestamp;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );

        ticketNFT.transferFrom(user1, user2, ticketId);
        vm.stopPrank();

        assertEq(ticketNFT.ownerOf(ticketId), user2);
        assertEq(ticketNFT.balanceOf(user1), 0);
        assertEq(ticketNFT.balanceOf(user2), 1);
    }

    function testERC721ApproveAndTransfer() public {
        uint256 travelDate = block.timestamp;

        vm.startPrank(user1);
        token.approve(address(ticketNFT), 80 * 10 ** 18);
        uint256 ticketId = ticketNFT.purchaseTicket(
            "METRO-LINE1",
            TicketNFT.TicketClass.STANDARD,
            travelDate
        );

        ticketNFT.approve(user2, ticketId);
        vm.stopPrank();

        assertEq(ticketNFT.getApproved(ticketId), user2);

        vm.prank(user2);
        ticketNFT.transferFrom(user1, user2, ticketId);

        assertEq(ticketNFT.ownerOf(ticketId), user2);
    }

    function testUpdateTransitAuthority() public {
        address newAuthority = makeAddr("newAuthority");
        ticketNFT.updateTransitAuthority(newAuthority);
        assertEq(ticketNFT.transitAuthority(), newAuthority);
    }

    function testOnlyAdminCanUpdateTransitAuthority() public {
        address newAuthority = makeAddr("newAuthority");

        vm.prank(user1);
        vm.expectRevert("Only admin");
        ticketNFT.updateTransitAuthority(newAuthority);
    }
}
