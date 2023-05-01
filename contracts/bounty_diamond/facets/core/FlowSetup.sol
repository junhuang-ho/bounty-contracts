// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.2;

import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import {LibAccessControl} from "../../libraries/utils/LibAccessControl.sol";
import {LibFlowSetup} from "../../libraries/core/LibFlowSetup.sol";
import {IFlowSetup} from "../../interfaces/core/IFlowSetup.sol";

contract FlowSetup is IFlowSetup {
    function getMinimumDepositAmount() external view returns (uint96) {
        return LibFlowSetup._getMinimumDepositAmount();
    }

    function getMinimumFlowAmount() external view returns (uint96) {
        return LibFlowSetup._getMinimumFlowAmount();
    }

    function getMaxFlowDurationPerUnitFlowAmount()
        external
        view
        returns (uint96)
    {
        return LibFlowSetup._getMaxFlowDurationPerUnitFlowAmount();
    }

    function getSTBufferDurationInSecond() external view returns (uint256) {
        return LibFlowSetup._getSTBufferDurationInSecond();
    }

    function setMinimumDepositAmount(uint96 _amount) external {
        LibAccessControl._requireOnlyRole(LibAccessControl.STRATEGIST_ROLE);
        LibFlowSetup._setMinimumDepositAmount(_amount);
    }

    function setMinimumFlowAmount(uint96 _amount) external {
        LibAccessControl._requireOnlyRole(LibAccessControl.STRATEGIST_ROLE);
        LibFlowSetup._setMinimumFlowAmount(_amount);
    }

    function setMaxFlowDurationPerUnitFlowAmount(uint96 _duration) external {
        LibAccessControl._requireOnlyRole(LibAccessControl.STRATEGIST_ROLE);
        LibFlowSetup._setMaxFlowDurationPerUnitFlowAmount(_duration);
    }

    function setSTBufferAmount(uint256 _duration) external {
        LibAccessControl._requireOnlyRole(LibAccessControl.STRATEGIST_ROLE);
        LibFlowSetup._setSTBufferAmount(_duration);
    }

    function isSuperTokensSupported(ISuperToken _superToken)
        external
        view
        returns (bool)
    {
        return LibFlowSetup._isSuperTokensSupported(_superToken);
    }

    function addSuperToken(ISuperToken _superToken) external {
        LibAccessControl._requireOnlyRole(LibAccessControl.STRATEGIST_ROLE);
        LibFlowSetup._addSuperToken(_superToken);
    }

    function removeSuperToken(ISuperToken _superToken) external {
        LibAccessControl._requireOnlyRole(LibAccessControl.STRATEGIST_ROLE);
        LibFlowSetup._removeSuperToken(_superToken);
    }

    // depositSuperToken - just send supertoken to contract address

    function withdrawSuperToken(ISuperToken _superToken, uint256 _amount)
        external
    {
        LibAccessControl._requireOnlyRole(LibAccessControl.TREASURER_ROLE);
        LibFlowSetup._withdrawSuperToken(_superToken, _amount);
    }
}

/**
 * useful functions
 *
 * 1. from SuperTokenV1Library, do .balanceOf()/.getNetFlowRate()
 * to get how many more seconds before losing its SF deposit
 *
 * 2. if want to know how much supertoken to deposit in order to last
 * an extra N seconds, just take the .getNetFlowRate() and multiply by N
 */
