// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IUtility {
    function getNativeBalance() external view returns (uint256);

    function withdrawNativeBalance(uint256 _amount) external;
}
