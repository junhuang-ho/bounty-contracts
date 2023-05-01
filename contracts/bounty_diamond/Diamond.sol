// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "./libraries/utils/LibDiamond.sol";
import {LibAccessControl} from "./libraries/utils/LibAccessControl.sol";
import {ICut} from "./interfaces/utils/ICut.sol";

contract Diamond {
    constructor(address _contractOwner, address _diamondCutFacet) payable {
        LibAccessControl._setupRole(
            LibAccessControl.DEFAULT_ADMIN_ROLE,
            _contractOwner
        );
        LibAccessControl._setupRole(
            LibAccessControl.MAINTAINER_ROLE,
            _contractOwner
        );
        LibAccessControl._setupRole(
            LibAccessControl.TREASURER_ROLE,
            _contractOwner
        );
        LibAccessControl._setupRole(
            LibAccessControl.STRATEGIST_ROLE,
            _contractOwner
        );

        // Add the diamondCut external function from the diamondCutFacet
        ICut.FacetCut[] memory cut = new ICut.FacetCut[](1);
        bytes4[] memory functionSelectors = new bytes4[](1);
        functionSelectors[0] = ICut.diamondCut.selector;
        cut[0] = ICut.FacetCut({
            facetAddress: _diamondCutFacet,
            action: ICut.FacetCutAction.Add,
            functionSelectors: functionSelectors
        });
        LibDiamond._cut(cut, address(0), "");
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        LibDiamond.StorageDiamond storage s;
        bytes32 position = LibDiamond.STORAGE_POSITION_DIAMOND;
        // get diamond storage
        assembly {
            s.slot := position
        }
        // get facet from function selector
        address facet = s.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: Function does not exist");
        // Execute external function from facet using delegatecall and return any value.
        assembly {
            // copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            // execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // get any return value
            returndatacopy(0, 0, returndatasize())
            // return any return value or error back to the caller
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    receive() external payable {}
}
