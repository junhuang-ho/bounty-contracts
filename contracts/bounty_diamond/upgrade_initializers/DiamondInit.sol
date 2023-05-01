// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import {LibDiamond} from "../libraries/utils/LibDiamond.sol";
import {LibAutomate} from "../libraries/core/LibAutomate.sol";
import {LibFlowSetup} from "../libraries/core/LibFlowSetup.sol";
import {IERC165} from "../interfaces/utils/IERC165.sol";
import {ICut} from "../interfaces/utils/ICut.sol";
import {ILoupe} from "../interfaces/utils/ILoupe.sol";
import {IAccessControl} from "../interfaces/utils/IAccessControl.sol";
import {IUtility} from "../interfaces/utils/IUtility.sol";
import {IAutomate} from "../interfaces/core/IAutomate.sol";
import {IFlowSetup} from "../interfaces/core/IFlowSetup.sol";
import {IFlow} from "../interfaces/core/IFlow.sol";

contract DiamondInit {
    function init(
        address _autobot,
        uint96 _minimumDepositAmount,
        uint96 _minimumFlowAmount,
        uint96 _maxFlowDurationPerUnitFlowAmount,
        uint256 _minimumContractGelatoBalance,
        uint256 _STBufferDurationInSecond,
        ISuperToken[] memory _superTokens
    ) external {
        LibDiamond.StorageDiamond storage s = LibDiamond._storageDiamond();
        s.supportedInterfaces[type(IERC165).interfaceId] = true;
        s.supportedInterfaces[type(ICut).interfaceId] = true;
        s.supportedInterfaces[type(ILoupe).interfaceId] = true;
        s.supportedInterfaces[type(IAccessControl).interfaceId] = true;
        s.supportedInterfaces[type(IUtility).interfaceId] = true;
        s.supportedInterfaces[type(IAutomate).interfaceId] = true;
        s.supportedInterfaces[type(IFlowSetup).interfaceId] = true;
        s.supportedInterfaces[type(IFlow).interfaceId] = true;

        LibAutomate._setGelatoContracts(_autobot);
        LibAutomate._setMinContractGelatoBalance(_minimumContractGelatoBalance);
        LibFlowSetup._setMinimumDepositAmount(_minimumDepositAmount);
        LibFlowSetup._setMinimumFlowAmount(_minimumFlowAmount);
        LibFlowSetup._setMaxFlowDurationPerUnitFlowAmount(
            _maxFlowDurationPerUnitFlowAmount
        );
        LibFlowSetup._setSTBufferAmount(_STBufferDurationInSecond);
        for (uint256 i = 0; i < _superTokens.length; i++) {
            LibFlowSetup._addSuperToken(_superTokens[i]);
        }
    }
}
