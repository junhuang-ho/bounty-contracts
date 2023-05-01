//SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../services/gelato/Types.sol";

// gelato based

error InsufficientContractGelatoBalance();
error CallerNotAutobot();

library LibAutomate {
    using SafeERC20 for IERC20;

    bytes32 constant STORAGE_POSITION_AUTOMATE = keccak256("ds.automate");
    address public constant AUTOBOT_PROXY_FACTORY =
        0xC815dB16D4be6ddf2685C201937905aBf338F5D7;
    address public constant GELATO_FEE =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    struct StorageAutomate {
        IAutomate gelatoAutobot;
        ITaskTreasuryUpgradable gelatoTreasury;
        address gelatoNetwork;
        // address dedicatedMsgSender; // TODO: not needed?
        // address opsProxyFactory;
        // address eth;
        uint256 minContractGelatoBalance;
    }

    function _storageAutomate()
        internal
        pure
        returns (StorageAutomate storage s)
    {
        bytes32 position = STORAGE_POSITION_AUTOMATE;
        assembly {
            s.slot := position
        }
    }

    function _getModuleData(uint256 _durationStart, uint256 _durationInterval)
        internal
        view
        returns (ModuleData memory)
    {
        ModuleData memory moduleData = ModuleData({
            modules: new Module[](2),
            args: new bytes[](1)
        });

        moduleData.modules[0] = Module.TIME;
        moduleData.modules[1] = Module.SINGLE_EXEC;

        moduleData.args[0] = _timeModuleArg(
            block.timestamp + _durationStart,
            _durationInterval
        );

        return moduleData;
    }

    // function _requireOnlyDedicatedMsgSender() internal view {
    //     require(
    //         msg.sender == _storageAutomate().dedicatedMsgSender,
    //         "LibAutomate: Only dedicated msg.sender"
    //     );
    // } // TODO: not needed?

    function _requireOnlyAutobot() internal view {
        if (msg.sender != address(_storageAutomate().gelatoAutobot))
            revert CallerNotAutobot();
    }

    // function _requireOnlyAutobot(address _caller) internal view {
    //     if (_caller != address(_storageAutomate().gelatoAutobot))
    //         revert CallerNotAutobot();
    // } // TODO: delete if testing of `_requireOnlyAutobot` above passes !

    function _setGelatoContracts(address _autobot) internal {
        _storageAutomate().gelatoAutobot = IAutomate(_autobot);
        _storageAutomate().gelatoNetwork = IAutomate(_autobot).gelato();
        _storageAutomate().gelatoTreasury = _storageAutomate()
            .gelatoAutobot
            .taskTreasury();
    }

    function _getGelatoAddresses()
        internal
        view
        returns (
            address,
            address,
            address,
            address,
            address
        )
    {
        return (
            address(_storageAutomate().gelatoAutobot),
            address(_storageAutomate().gelatoTreasury),
            _storageAutomate().gelatoNetwork,
            AUTOBOT_PROXY_FACTORY,
            GELATO_FEE
        ); // _storageAutomate().dedicatedMsgSender, // TODO: not needed?
    }

    function _transfer(uint256 _fee, address _feeToken) internal {
        if (_feeToken == GELATO_FEE) {
            (bool success, ) = _storageAutomate().gelatoNetwork.call{
                value: _fee
            }("");
            require(success, "LibAutomate: _transfer failed");
        } else {
            SafeERC20.safeTransfer(
                IERC20(_feeToken),
                _storageAutomate().gelatoNetwork,
                _fee
            );
        }
    }

    function _getFeeDetails()
        internal
        view
        returns (uint256 fee, address feeToken)
    {
        (fee, feeToken) = _storageAutomate().gelatoAutobot.getFeeDetails();
    }

    function _resolverModuleArg(
        address _resolverAddress,
        bytes memory _resolverData
    ) internal pure returns (bytes memory) {
        return abi.encode(_resolverAddress, _resolverData);
    }

    function _timeModuleArg(uint256 _startTime, uint256 _interval)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(uint128(_startTime), uint128(_interval));
    }

    function _proxyModuleArg() internal pure returns (bytes memory) {
        return bytes("");
    }

    function _singleExecModuleArg() internal pure returns (bytes memory) {
        return bytes("");
    }

    function _withdrawGelatoFunds(uint256 _amount) internal {
        _storageAutomate().gelatoTreasury.withdrawFunds(
            payable(msg.sender),
            GELATO_FEE,
            _amount
        );
    } // withdrawer address restriction set in facet

    function _depositGelatoFunds(uint256 _amount) internal {
        _storageAutomate().gelatoTreasury.depositFunds{value: _amount}(
            address(this), // address(this) = address of diamond
            GELATO_FEE,
            _amount
        );
    }

    function _setMinContractGelatoBalance(uint256 _value) internal {
        _storageAutomate().minContractGelatoBalance = _value;
    }

    function _getMinContractGelatoBalance() internal view returns (uint256) {
        return _storageAutomate().minContractGelatoBalance;
    }

    function _getContractGelatoBalance() internal view returns (uint256) {
        return
            _storageAutomate().gelatoTreasury.userTokenBalance(
                address(this),
                GELATO_FEE
            );
    }

    function _requireSufficientContractGelatoBalance() internal view {
        if (
            _getContractGelatoBalance() <=
            _storageAutomate().minContractGelatoBalance
        ) revert InsufficientContractGelatoBalance();
    }
}
