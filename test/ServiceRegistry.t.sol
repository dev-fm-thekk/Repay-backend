// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";

import "../contracts/services.sol";
import "../contracts/agency.sol";

contract ServiceRegistryTest is Test {

    AgencyRegistry agency;
    ServiceRegistry service;

    address owner = address(1);
    address agencyWallet = address(2);

    function setUp() public {

        vm.prank(owner);
        agency = new AgencyRegistry();

        vm.prank(owner);
        service = new ServiceRegistry(address(agency));

        vm.prank(owner);

        agency.registerAgency(
            "KSRTC",
            "KSRTC",
            AgencyRegistry.TransportType.BUS,
            agencyWallet,
            "meta"
        );
    }

    function testCreateService() public {

        vm.prank(agencyWallet);

        uint256 id = service.createService(
            "City Bus",
            "Central-Airport",
            100 ether,
            100,
            "meta"
        );

        ServiceRegistry.Service memory svc = service.getService(id);

        assertEq(svc.tokenPrice, 100 ether);
    }

    function testUpdatePrice() public {

        vm.startPrank(agencyWallet);

        uint256 id = service.createService(
            "Metro",
            "A-B",
            50 ether,
            100,
            "meta"
        );

        service.updatePrice(id, 200 ether);

        uint256 price = service.getPrice(id);

        assertEq(price, 200 ether);

        vm.stopPrank();
    }
}