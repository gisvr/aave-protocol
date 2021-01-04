pragma solidity ^0.5.0;

import "../base/FlashLoanReceiverBase.sol";
import "./ILendingPool.sol";
import "../../interfaces/ILendingPoolAddressesProvider.sol";

// The following is the mainnet address for the LendingPoolAddressProvider. Get the correct address for your network from: https://docs.aave.com/developers/developing-on-aave/deployed-contract-instances
contract FlashLoanReceiverTest is FlashLoanReceiverBase {
    using SafeMath for uint256;

    constructor(ILendingPoolAddressesProvider _provider)
        FlashLoanReceiverBase(_provider)
        public {}


    function executeOperation(
        address _reserve,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _params
    )
        external
    {
        require(_amount <= getBalanceInternal(address(this), _reserve), "Invalid balance, was the flashLoan successful?");

        //
        // do your thing here
        //

        // Time to transfer the funds back
        uint totalDebt = _amount.add(_fee);
        transferFundsBackToPoolInternal(_reserve, totalDebt);
    }

    function flashloan(address asset, uint amount) public  {
        bytes memory data = "";
        // uint amount = 1 ether;
        // address asset = address(0x6B175474E89094C44Da98b954EedeAC495271d0F); // mainnet DAI, for more asset addresses, see: https://docs.aave.com/developers/developing-on-aave/deployed-contract-instances

        ILendingPool lendingPool = ILendingPool(addressesProvider.getLendingPool());
        lendingPool.flashLoan(address(this), asset, amount, data);
    }
}