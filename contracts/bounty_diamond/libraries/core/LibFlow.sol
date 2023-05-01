//SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.2;

import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {SuperTokenV1Library} from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import {LibAutomate} from "../../libraries/core/LibAutomate.sol";

error ContractError();

library LibFlow {
    using SuperTokenV1Library for ISuperToken;

    bytes32 constant STORAGE_POSITION_FLOW = keccak256("ds.flow");

    struct BountySchema {
        bytes32 taskIdFlowIncrease;
        bytes32 taskIdFlowDecrease;
        uint256 timestampIncrease;
        uint256 timestampDecrease;
        uint256 depositAmount;
        uint256 depositAmountMinimum;
        int96 flowRate;
        address superToken;
    } // TODO: can add timestampCreatedAt if needed, currently `openBounty` is roughly $0.2 gas at ~280gwei per gas

    struct StorageFlow {
        mapping(address => uint256) nonce; // track nonce used for taskIds | note: nonce allows a single client to open multiple requests (multiple taskIds)
        mapping(address => mapping(uint256 => BountySchema)) bounties; // user --> nonce --> BountySchema
    }

    function _storageFlow() internal pure returns (StorageFlow storage s) {
        bytes32 position = STORAGE_POSITION_FLOW;
        assembly {
            s.slot := position
        }
    }

    function _getNonce(address _user) internal view returns (uint256) {
        return _storageFlow().nonce[_user];
    }

    function _getBounty(address _user, uint256 _nonce)
        internal
        view
        returns (BountySchema memory)
    {
        return _storageFlow().bounties[_user][_nonce];
    }

    function _increaseFlow(
        ISuperToken _superToken,
        address _receiver,
        int96 _flowRate,
        uint256 _nonce
    ) internal {
        int96 flowRate = _superToken.getFlowRate(address(this), _receiver);

        if (flowRate <= 0) {
            _superToken.createFlow(_receiver, _flowRate);
        } else {
            _superToken.updateFlow(_receiver, flowRate + _flowRate);
        }

        _storageFlow().bounties[_receiver][_nonce].timestampIncrease = block
            .timestamp;
    }

    function _decreaseFlow(
        ISuperToken _superToken,
        address _receiver,
        int96 _flowRate,
        uint256 _nonce
    ) internal {
        int96 flowRate = _superToken.getFlowRate(address(this), _receiver);

        if (flowRate - _flowRate <= 0) {
            _superToken.deleteFlow(address(this), _receiver);
        } else {
            _superToken.updateFlow(_receiver, flowRate - _flowRate);
        }

        _storageFlow().bounties[_receiver][_nonce].timestampDecrease = block
            .timestamp;
    }

    function _stopBounty(uint256 _nonce, address _receiver) internal {
        uint256 timestampIncrease = _storageFlow()
        .bounties[msg.sender][_nonce].timestampIncrease;
        uint256 timestampDecrease = _storageFlow()
        .bounties[msg.sender][_nonce].timestampDecrease;

        address superToken = _storageFlow()
        .bounties[msg.sender][_nonce].superToken;
        ISuperToken iSuperToken = ISuperToken(superToken); // here will auto fail if invalid supertoken (not supp supertoken still passes)

        if (timestampIncrease == 0 && timestampDecrease == 0) {
            // --- no task started ---
            // cancel both tasks
            // transfer back FULL amount to requester

            LibAutomate._storageAutomate().gelatoAutobot.cancelTask(
                _storageFlow().bounties[msg.sender][_nonce].taskIdFlowIncrease
            );
            LibAutomate._storageAutomate().gelatoAutobot.cancelTask(
                _storageFlow().bounties[msg.sender][_nonce].taskIdFlowDecrease
            );

            iSuperToken.transferFrom(
                address(this),
                _receiver,
                _storageFlow().bounties[msg.sender][_nonce].depositAmount
            );
        } else if (timestampIncrease != 0 && timestampDecrease == 0) {
            // --- flow started ---
            // get current block.timestamp, use it to calculate total flow so far for given nonce & get remaining deposit
            // stop flow for give nonce (use decreaseFlow to delete/update accordingly)
            // cancel decreaseFlow task
            // transfer back remaining amount to requester

            int96 flowRate = _storageFlow()
            .bounties[msg.sender][_nonce].flowRate;

            uint256 amountFlowSoFar = uint256(int256(flowRate)) *
                (block.timestamp - timestampIncrease); // TODO: test if will have any error from casting int96 as uint256 then multiplying uint256?
            uint256 amountRemaining = _storageFlow()
            .bounties[msg.sender][_nonce].depositAmount - amountFlowSoFar;

            _decreaseFlow(iSuperToken, msg.sender, flowRate, _nonce);

            LibAutomate._storageAutomate().gelatoAutobot.cancelTask(
                _storageFlow().bounties[msg.sender][_nonce].taskIdFlowDecrease
            );

            iSuperToken.transferFrom(address(this), _receiver, amountRemaining);
        } else if (timestampIncrease != 0 && timestampDecrease != 0) {
            // --- flow ended ---
            // transfer back remaining amount (equal to min amount) to requester

            // // V1
            // uint256 depositAmountMinimum = bounties[msg.sender][_nonce]
            //     .depositAmountMinimum;

            // iSuperToken.transferFrom(
            //     address(this),
            //     _receiver,
            //     depositAmountMinimum
            // ); // TODO: make sure user receives total of what was deposited initially, nothing more, nothing less. TODO: TEST

            // V2 // TODO: test against V1 to see which one more accurate
            int96 flowRate = _storageFlow()
            .bounties[msg.sender][_nonce].flowRate;

            uint256 amountFlowExactly = uint256(int256(flowRate)) *
                (timestampDecrease - timestampIncrease);
            uint256 amountRemaining = _storageFlow()
            .bounties[msg.sender][_nonce].depositAmount - amountFlowExactly;

            iSuperToken.transferFrom(address(this), _receiver, amountRemaining);
        } else {
            revert ContractError();
        }

        delete _storageFlow().bounties[msg.sender][_nonce];
    }
}
