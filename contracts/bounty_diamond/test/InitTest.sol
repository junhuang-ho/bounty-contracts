// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibTest} from "./LibTest.sol";

contract InitTest {
    function init(uint256 _value) external {
        LibTest._setTestValue(_value);
    }
}
