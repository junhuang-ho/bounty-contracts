// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.2;

import {LibAccessControl} from "../../libraries/utils/LibAccessControl.sol";
import {LibAutomate} from "../../libraries/core/LibAutomate.sol";
import {IAutomate} from "../../interfaces/core/IAutomate.sol";

contract Automate is IAutomate {
    // function getContractGelatoBalance() external view returns (uint256) {
    //     return LibAutomate._getContractGelatoBalance();
    // }

    function getGelatoAddresses()
        external
        view
        returns (
            address,
            address,
            address,
            address,
            address
        )
    {
        return LibAutomate._getGelatoAddresses();
    }

    function getMinContractGelatoBalance() external view returns (uint256) {
        return LibAutomate._getMinContractGelatoBalance();
    }

    function setGelatoContracts(address _autobot) external {
        LibAccessControl._requireOnlyRole(LibAccessControl.STRATEGIST_ROLE);
        LibAutomate._setGelatoContracts(_autobot);
    }

    function setMinContractGelatoBalance(uint256 _value) external {
        LibAccessControl._requireOnlyRole(LibAccessControl.STRATEGIST_ROLE);
        LibAutomate._setMinContractGelatoBalance(_value);
    }

    function depositGelatoFunds() external payable {
        LibAutomate._depositGelatoFunds(msg.value);
    }

    function withdrawGelatoFunds(uint256 _amount) external {
        LibAccessControl._requireOnlyRole(LibAccessControl.TREASURER_ROLE);
        LibAutomate._withdrawGelatoFunds(_amount);
    }
}
