// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Test {
    uint256 public amount = 10;

    function test0(uint256 _amount) public returns (uint256) {
        return amount / 2;
    }

    function test1(uint256 _amount) public returns (uint256) {
        amount += _amount;

        return amount / 2;
    }
}
