
// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;
 

interface ILendingPool {  
    function deposit(address _reserve, uint256 _amount, uint16 _referralCode) external payable;
    function flashLoan(address _receiver, address _reserve, uint256 _amount, bytes calldata _params) external;
}
