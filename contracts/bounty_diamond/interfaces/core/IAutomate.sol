// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IAutomate {
    function setGelatoContracts(address _ops) external;

    function getGelatoAddresses()
        external
        view
        returns (
            address,
            address,
            address,
            address,
            address
        );

    function withdrawGelatoFunds(uint256 _amount) external;

    function depositGelatoFunds() external payable;

    function setMinContractGelatoBalance(uint256 _value) external;

    function getMinContractGelatoBalance() external view returns (uint256);
}
