// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/agency.sol";

contract AgencyRegistryTest is Test {

    AgencyRegistry registry;

    address owner = address(1);
    address agencyWallet = address(2);

    function setUp() public {
        vm.prank(owner);
        registry = new AgencyRegistry();
    }

    function testRegisterAgency() public {
        vm.prank(owner);

        uint256 id = registry.registerAgency(
            "Kerala State Road Transport",
            "KSRTC",
            AgencyRegistry.TransportType.BUS,
            agencyWallet,
            "ipfs://meta"
        );

        AgencyRegistry.Agency memory agency = registry.getAgency(id);

        assertEq(agency.wallet, agencyWallet);
        assertEq(uint256(agency.status), uint256(AgencyRegistry.AgencyStatus.ACTIVE));
    }

    function testSetAgencyStatus() public {
        vm.startPrank(owner);

        uint256 id = registry.registerAgency(
            "KSRTC",
            "KSRTC",
            AgencyRegistry.TransportType.BUS,
            agencyWallet,
            "meta"
        );

        registry.setAgencyStatus(id, AgencyRegistry.AgencyStatus.INACTIVE);

        AgencyRegistry.Agency memory agency = registry.getAgency(id);

        assertEq(uint256(agency.status), uint256(AgencyRegistry.AgencyStatus.INACTIVE));

        vm.stopPrank();
    }

    function testUpdateAgencyWallet() public {
        vm.startPrank(owner);

        uint256 id = registry.registerAgency(
            "KSRTC",
            "KSRTC",
            AgencyRegistry.TransportType.BUS,
            agencyWallet,
            "meta"
        );

        address newWallet = address(3);

        registry.updateAgencyWallet(id, newWallet);

        AgencyRegistry.Agency memory agency = registry.getAgency(id);

        assertEq(agency.wallet, newWallet);

        vm.stopPrank();
    }
}