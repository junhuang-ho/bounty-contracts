// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {LibFlow} from "../../libraries/core/LibFlow.sol";

interface IFlow {
    function getNonce(address _user) external view returns (uint256);

    function getBounty(address _user, uint256 _nonce)
        external
        view
        returns (LibFlow.BountySchema memory);

    function openBounty(
        ISuperToken _superToken,
        uint96 _amount, // wei // note: set as uint96 so that can properly cal. flow rate
        uint96 _amountMinimum, // wei // note: set as uint96 so that can properly cal. flow rate
        uint96 _durationHold, // second
        uint96 _durationFlow // second
    ) external;

    function increaseFlow(
        ISuperToken _superToken,
        address _receiver,
        int96 _flowRate,
        uint256 _nonce
    ) external;

    function decreaseFlow(
        ISuperToken _superToken,
        address _receiver,
        int96 _flowRate,
        uint256 _nonce
    ) external;

    function awardBounty(uint256 _nonce, address _awardee) external;

    function cancelBounty(uint256 _nonce) external;
}
