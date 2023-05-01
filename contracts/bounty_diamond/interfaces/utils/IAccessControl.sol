// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAccessControl {
    function getDefaultAdminRole() external pure returns (bytes32);

    function getRole(string memory _role) external pure returns (bytes32);

    function hasRole(bytes32 _role, address _account)
        external
        view
        returns (bool);

    function getRoleAdmin(bytes32 _role) external view returns (bytes32);

    function grantRole(bytes32 _role, address _account) external;

    function revokeRole(bytes32 _role, address _account) external;

    function renounceRole(bytes32 _role) external;
}
