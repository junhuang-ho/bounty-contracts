// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

interface IFlowSetup {
    function getMinimumDepositAmount() external view returns (uint96);

    function getMinimumFlowAmount() external view returns (uint96);

    function getMaxFlowDurationPerUnitFlowAmount()
        external
        view
        returns (uint96);

    function getSTBufferDurationInSecond() external view returns (uint256);

    function setMinimumDepositAmount(uint96 _amount) external;

    function setMinimumFlowAmount(uint96 _amount) external;

    function setMaxFlowDurationPerUnitFlowAmount(uint96 _duration) external;

    function setSTBufferAmount(uint256 _duration) external;

    function isSuperTokensSupported(ISuperToken _superToken)
        external
        view
        returns (bool);

    function addSuperToken(ISuperToken _superToken) external;

    function removeSuperToken(ISuperToken _superToken) external;

    function withdrawSuperToken(ISuperToken _superToken, uint256 _amount)
        external;
}
