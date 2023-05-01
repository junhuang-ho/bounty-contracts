//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibTest {
    bytes32 constant STORAGE_POSITION_TEST = keccak256("ds.test123");

    struct StorageTest {
        uint256 value;
    }

    function _storageTest() internal pure returns (StorageTest storage s) {
        bytes32 position = STORAGE_POSITION_TEST;
        assembly {
            s.slot := position
        }
    }

    function _setTestValue(uint256 _value) internal {
        _storageTest().value = _value;
    }

    function _getTestValue() internal view returns (uint256) {
        return _storageTest().value;
    }
}
