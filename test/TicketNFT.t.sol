// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";

import "../contracts/ticket.sol";
import "../contracts/reward.sol";
import "../contracts/services.sol";
import "../contracts/agency.sol";

contract TicketNFTTest is Test {

    RewardToken reward;
    AgencyRegistry agency;
    ServiceRegistry service;
    TicketNFT ticket;

    address owner = address(1);
    address agencyWallet = address(2);
    address user = address(3);

    uint256 serviceId;

    function setUp() public {

        vm.startPrank(owner);

        reward = new RewardToken();
        agency = new AgencyRegistry();
        service = new ServiceRegistry(address(agency));
        ticket = new TicketNFT(address(reward), address(agency), address(service));

        service.setTicketContract(address(ticket));

        agency.registerAgency(
            "KSRTC",
            "KSRTC",
            AgencyRegistry.TransportType.BUS,
            agencyWallet,
            "meta"
        );

        vm.stopPrank();

        vm.prank(agencyWallet);

        serviceId = service.createService(
            "Bus Ticket",
            "A-B",
            10 ether,
            100,
            "meta"
        );

        vm.prank(owner);

        reward.mintReward(
            user,
            "Plastic",
            100,
            RewardToken.WasteType.PLASTIC,
            2000,
            keccak256("proof")
        );

        vm.prank(user);

        reward.approve(address(ticket), type(uint256).max);
    }

    function testPurchaseTicket() public {

        vm.prank(user);

        uint256 tokenId = ticket.purchaseTicket(
            serviceId,
            "ipfs://ticket"
        );

        assertEq(ticket.ownerOf(tokenId), user);
    }

    function testValidateTicket() public {

        vm.prank(user);
        uint256 tokenId = ticket.purchaseTicket(serviceId, "meta");

        vm.prank(agencyWallet);

        ticket.validateTicket(tokenId);

        TicketNFT.TicketMetadata memory data = ticket.getTicket(tokenId);

        assertEq(uint256(data.status), uint256(TicketNFT.TicketStatus.USED));
    }
}