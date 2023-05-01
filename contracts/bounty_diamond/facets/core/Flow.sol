// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.2;

import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {LibAutomate} from "../../libraries/core/LibAutomate.sol";
import {LibFlowSetup} from "../../libraries/core/LibFlowSetup.sol";
import {LibFlow} from "../../libraries/core/LibFlow.sol";
import {IFlow} from "../../interfaces/core/IFlow.sol";

import "../../services/gelato/Types.sol";

error InvalidMinimumAmount();
error InsufficientMinimumAmount();
error InsufficientFlowAmount();
error ExcessiveFlowDuration();

contract Flow is IFlow {
    function getNonce(address _user) external view returns (uint256) {
        return LibFlow._getNonce(_user);
    }

    function getBounty(address _user, uint256 _nonce)
        external
        view
        returns (LibFlow.BountySchema memory)
    {
        return LibFlow._getBounty(_user, _nonce);
    }

    function openBounty(
        ISuperToken _superToken,
        uint96 _amount, // wei // note: set as uint96 so that can properly cal. flow rate
        uint96 _amountMinimum, // wei // note: set as uint96 so that can properly cal. flow rate
        uint96 _durationHold, // second
        uint96 _durationFlow // second
    ) external {
        LibAutomate._requireSufficientContractGelatoBalance();

        LibFlowSetup.StorageFlowSetup storage sFlowSetup = LibFlowSetup
            ._storageFlowSetup();

        LibFlowSetup._requireValidSuperToken(_superToken);
        if (_amountMinimum < sFlowSetup.minimumDepositAmount)
            revert InsufficientMinimumAmount();
        if (_amountMinimum >= _amount) revert InvalidMinimumAmount();
        uint96 maximumFlowAmount = _amount - _amountMinimum;
        if (maximumFlowAmount < sFlowSetup.minimumFlowAmount)
            revert InsufficientFlowAmount();
        LibFlowSetup._requireNonZeroDuration(_durationHold);
        LibFlowSetup._requireNonZeroDuration(_durationFlow);
        /**
         * number_of_units_flow_amount = maximumFlowAmount / sFlowSetup.minimumFlowAmount
         * max_flow_duration_allowed_for_this_open_bounty = number_of_units_flow_amount * flow_duration_per_unit_flow_amount (sFlowSetup.maxFlowDurationPerUnitFlowAmount)
         * hence: _durationFlow must be less than or equal max_flow_duration_allowed_for_this_open_bounty
         * otherwise, revert
         *
         * this is to put a cap to how long a bounty flow can generally last
         */
        if (
            _durationFlow >
            (maximumFlowAmount / sFlowSetup.minimumFlowAmount) *
                sFlowSetup.maxFlowDurationPerUnitFlowAmount
        ) revert ExcessiveFlowDuration();

        int96 flowRate = int96(maximumFlowAmount / _durationFlow); // TODO: make sure no decimal given input values & their constraints
        LibFlowSetup._requireSufficientContractSTBalance(_superToken, flowRate);

        LibAutomate.StorageAutomate storage sAutomate = LibAutomate
            ._storageAutomate();
        LibFlow.StorageFlow storage sFlow = LibFlow._storageFlow();

        uint256 currentNonce = sFlow.nonce[msg.sender];

        // 1. deposit & initial set
        _superToken.transferFrom(msg.sender, address(this), _amount);
        sFlow.bounties[msg.sender][currentNonce].depositAmount = _amount;
        sFlow
        .bounties[msg.sender][currentNonce]
            .depositAmountMinimum = _amountMinimum;
        sFlow.bounties[msg.sender][currentNonce].flowRate = flowRate;
        sFlow.bounties[msg.sender][currentNonce].superToken = address(
            _superToken
        );

        // 2. schedule start flow task
        ModuleData memory moduleDataFlowStart = LibAutomate._getModuleData(
            _durationHold,
            _durationHold
        );

        bytes memory execDataFlowStart = abi.encodeWithSelector(
            this.increaseFlow.selector,
            _superToken,
            msg.sender, // start send back to owner
            flowRate,
            currentNonce
        );
        sFlow.bounties[msg.sender][currentNonce].taskIdFlowIncrease = sAutomate
            .gelatoAutobot
            .createTask(
                address(this),
                execDataFlowStart,
                moduleDataFlowStart,
                address(0)
            );

        // 3. schedule stop flow task
        ModuleData memory moduleDataFlowStop = LibAutomate._getModuleData(
            _durationHold + _durationFlow,
            _durationFlow
        );

        bytes memory execDataFlowStop = abi.encodeWithSelector(
            this.decreaseFlow.selector,
            _superToken,
            msg.sender, // stop send back to owner (note: client has to manually "withdraw" remaining minimum using "cancel" fn)
            flowRate,
            currentNonce
        );

        sFlow.bounties[msg.sender][currentNonce].taskIdFlowDecrease = sAutomate
            .gelatoAutobot
            .createTask(
                address(this),
                execDataFlowStop,
                moduleDataFlowStop,
                address(0)
            );

        // 4. others
        sFlow.nonce[msg.sender] = currentNonce + 1;
    }

    function increaseFlow(
        ISuperToken _superToken,
        address _receiver,
        int96 _flowRate,
        uint256 _nonce
    ) external {
        LibAutomate._requireOnlyAutobot();

        LibFlow._increaseFlow(_superToken, _receiver, _flowRate, _nonce);
    }

    function decreaseFlow(
        ISuperToken _superToken,
        address _receiver,
        int96 _flowRate,
        uint256 _nonce
    ) external {
        LibAutomate._requireOnlyAutobot();

        LibFlow._decreaseFlow(_superToken, _receiver, _flowRate, _nonce);
    }

    /**
     * passing address `_awardee` from off-chain as
     * current model does not allow participants
     * to officially associate themself with the
     * bounty through on-chain means
     */
    function awardBounty(uint256 _nonce, address _awardee) external {
        LibFlow._stopBounty(_nonce, _awardee);
    }

    function cancelBounty(uint256 _nonce) external {
        LibFlow._stopBounty(_nonce, msg.sender);
    }
}
