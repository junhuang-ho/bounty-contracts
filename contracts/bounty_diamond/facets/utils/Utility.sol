// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.2;

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {LibAccessControl} from "../../libraries/utils/LibAccessControl.sol";
import {IUtility} from "../../interfaces/utils/IUtility.sol";

error FailedWithdrawNativeToken();

contract Utility is IUtility, ReentrancyGuard {
    function getNativeBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function withdrawNativeBalance(uint256 _amount) external nonReentrant {
        LibAccessControl._requireOnlyRole(LibAccessControl.TREASURER_ROLE);

        (bool sent, ) = payable(msg.sender).call{value: _amount}("");
        if (!sent) revert FailedWithdrawNativeToken();
        // require(sent, "Withdraw funds failed");
    }
}
