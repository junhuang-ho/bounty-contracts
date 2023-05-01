//SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.2;

import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {SuperTokenV1Library} from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

error ZeroDuration();
error InvalidSuperToken();
error InsufficientContractSTBalance();

library LibFlowSetup {
    using SuperTokenV1Library for ISuperToken;

    bytes32 constant STORAGE_POSITION_FLOW_SETUP = keccak256("ds.flow.setup");

    struct StorageFlowSetup {
        mapping(ISuperToken => bool) superTokens;
        uint96 minimumDepositAmount;
        uint96 minimumFlowAmount; // 1 unit
        uint96 maxFlowDurationPerUnitFlowAmount;
        uint256 STBufferDurationInSecond;
    }

    /**
     * --- maxFlowDurationPerUnitFlowAmount ---
     * how long a unit flow amount (govern by `minimumFlowAmount`) should last in seconds
     * eg: 1 USDC should last a max of 2592000 seconds = 1 month
     *
     * --- _durationFlow ---
     * minimumFlowAmount --> 1 unit(s) --> maxFlowDurationPerUnitFlowAmount
     * maximumFlowAmount --> N unit(s) --> an amount that _durationFlow should NOT exceed
     * - if exceed throw error: ExcessiveFlowDuration
     */

    function _storageFlowSetup()
        internal
        pure
        returns (StorageFlowSetup storage s)
    {
        bytes32 position = STORAGE_POSITION_FLOW_SETUP;
        assembly {
            s.slot := position
        }
    }

    function _getMinimumDepositAmount() internal view returns (uint96) {
        return _storageFlowSetup().minimumDepositAmount;
    }

    function _getMinimumFlowAmount() internal view returns (uint96) {
        return _storageFlowSetup().minimumFlowAmount;
    }

    function _getMaxFlowDurationPerUnitFlowAmount()
        internal
        view
        returns (uint96)
    {
        return _storageFlowSetup().maxFlowDurationPerUnitFlowAmount;
    }

    function _getSTBufferDurationInSecond() internal view returns (uint256) {
        return _storageFlowSetup().STBufferDurationInSecond;
    }

    function _setMinimumDepositAmount(uint96 _amount) internal {
        _storageFlowSetup().minimumDepositAmount = _amount;
    }

    function _setMinimumFlowAmount(uint96 _amount) internal {
        _storageFlowSetup().minimumFlowAmount = _amount;
    }

    function _setMaxFlowDurationPerUnitFlowAmount(uint96 _duration) internal {
        _requireNonZeroDuration(_duration);
        _storageFlowSetup().maxFlowDurationPerUnitFlowAmount = _duration;
    }

    function _setSTBufferAmount(uint256 _duration) internal {
        _requireNonZeroDuration(_duration);
        _storageFlowSetup().STBufferDurationInSecond = _duration;
    }

    function _isSuperTokensSupported(ISuperToken _superToken)
        internal
        view
        returns (bool)
    {
        return _storageFlowSetup().superTokens[_superToken];
    }

    function _addSuperToken(ISuperToken _superToken) internal {
        _storageFlowSetup().superTokens[_superToken] = true;
    }

    function _removeSuperToken(ISuperToken _superToken) internal {
        delete _storageFlowSetup().superTokens[_superToken];
    }

    function _withdrawSuperToken(ISuperToken _superToken, uint256 _amount)
        internal
    {
        _superToken.transfer(msg.sender, _amount);
    }

    function _requireValidSuperToken(ISuperToken _superToken) internal view {
        if (!_storageFlowSetup().superTokens[_superToken])
            revert InvalidSuperToken();
    }

    function _requireNonZeroDuration(uint256 _duration) internal pure {
        if (_duration <= 0) revert ZeroDuration();
    }

    /**
     * guard against how long before contract runs out of funds and loses its deposit
     *
     * * `STBufferDurationInSecond` is a critical parameter and should be set as large as possible
     */
    function _requireSufficientContractSTBalance(
        ISuperToken _superToken,
        int96 newFlowRate
    ) internal view {
        uint256 contractBalance = _superToken.balanceOf(address(this));
        uint256 newBufferAmount = _superToken.getBufferAmountByFlowRate(
            newFlowRate
        );
        int96 contractNetFlowRate = _superToken.getNetFlowRate(address(this));
        if (
            contractBalance <=
            newBufferAmount +
                (uint256(uint96(contractNetFlowRate + newFlowRate)) *
                    _storageFlowSetup().STBufferDurationInSecond)
        ) revert InsufficientContractSTBalance();
    }
}
