//SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.2;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

/**
 * // bytes4(keccak256("isValidSignature(bytes32,bytes)")
 * // 0x1626ba7e
 */

library LibSecurity {
    function _requireValidSignature(
        address _walletAddress,
        bytes32 _hash,
        bytes memory _signature
    ) internal view {
        bytes4 result = IERC1271(_walletAddress).isValidSignature(
            _hash,
            _signature
        );
        require(result == 0x1626ba7e, "INVALID_SIGNATURE");
    }
}
