pragma solidity ^0.5.0;

import "./DoubleSlopeInterestRateStrategyBase.sol";


/**
* @title OptimizedReserveInterestRateStrategy contract
* @notice implements a double slope interest rate model with 91% optimal threshold.
* @author Aave
**/
contract OptimizedReserveInterestRateStrategy is DoubleSlopeInterestRateStrategyBase {
    /**
    * @dev this constant represents the utilization rate at which the pool aims to obtain most competitive borrow rates
    * expressed in ray
    **/
    uint256 public constant OPTIMAL_UTILIZATION_RATE = 0.80 * 1e27;

    constructor(
        ILendingPoolAddressesProvider _provider,
        uint256 _baseVariableBorrowRate,
        uint256 _variableRateSlope1,
        uint256 _variableRateSlope2,
        uint256 _stableRateSlope1,
        uint256 _stableRateSlope2
    )
        public
        DoubleSlopeInterestRateStrategyBase(
            _provider,
            _baseVariableBorrowRate,
            _variableRateSlope1,
            _variableRateSlope2,
            _stableRateSlope1,
            _stableRateSlope2
        )
    {}

    /**
    * @dev calculates the interest rates depending on the available liquidity and the total borrowed.
    * @param _reserve the address of the reserve
    * @param _availableLiquidity the liquidity available in the reserve
    * @param _totalBorrowsStable the total borrowed from the reserve a stable rate
    * @param _totalBorrowsVariable the total borrowed from the reserve at a variable rate
    * @param _averageStableBorrowRate the weighted average of all the stable rate borrows
    * @return the liquidity rate, stable borrow rate and variable borrow rate calculated from the input parameters
    **/
    function calculateInterestRates(
        address _reserve,
        uint256 _availableLiquidity,
        uint256 _totalBorrowsStable,
        uint256 _totalBorrowsVariable,
        uint256 _averageStableBorrowRate
    )
        external
        view
        returns (
            uint256 currentLiquidityRate,
            uint256 currentStableBorrowRate,
            uint256 currentVariableBorrowRate
        )
    {
        return
            super.calculateInterestRatesInternal(
                _reserve,
                _availableLiquidity,
                _totalBorrowsStable,
                _totalBorrowsVariable,
                _averageStableBorrowRate,
                OPTIMAL_UTILIZATION_RATE
            );
    }

}