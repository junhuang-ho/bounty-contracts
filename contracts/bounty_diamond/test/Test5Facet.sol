// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibTest} from "./LibTest.sol";

contract Test5Facet {
    function test5Func1() external {}

    function test5Func2() external {}

    function setValue(uint256 _value) external {
        LibTest._setTestValue(_value);
    }

    function getValue() external view returns (uint256) {
        return LibTest._getTestValue();
    }
}
