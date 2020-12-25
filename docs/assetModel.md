
### 资产配置
```js
    // LendingPoolCore.sol
    /**  
    * @dev this function aggregates the configuration parameters of the reserve.
    * It's used in the LendingPoolDataProvider specifically to save gas, and avoid
    * multiple external contract calls to fetch the same data.
    * @param _reserve the reserve address
    * @return the reserve decimals
    * @return the base ltv as collateral
    * @return the liquidation threshold
    * @return if the reserve is used as collateral or not
    **/
    function getReserveConfiguration(address _reserve)
        external
        view
        returns (uint256, uint256, uint256, bool)
    {
        uint256 decimals;
        uint256 baseLTVasCollateral;
        uint256 liquidationThreshold;
        bool usageAsCollateralEnabled;

        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        decimals = reserve.decimals;
        baseLTVasCollateral = reserve.baseLTVasCollateral;
        liquidationThreshold = reserve.liquidationThreshold;
        usageAsCollateralEnabled = reserve.usageAsCollateralEnabled;

        return (decimals, baseLTVasCollateral, liquidationThreshold, usageAsCollateralEnabled);
    }

    /**
	 * @dev accessory functions to fetch data from the lendingPoolCore
	 **/
	function getReserveConfigurationData(address _reserve)
		external
		view
		returns (
			uint256 ltv,
			uint256 liquidationThreshold,
			uint256 liquidationBonus,
			address rateStrategyAddress,
			bool usageAsCollateralEnabled,
			bool borrowingEnabled,
			bool stableBorrowRateEnabled,
			bool isActive
		)
	{
		(, ltv, liquidationThreshold, usageAsCollateralEnabled) = core
			.getReserveConfiguration(_reserve);
		stableBorrowRateEnabled = core.getReserveIsStableBorrowRateEnabled(
			_reserve
		);
		borrowingEnabled = core.isReserveBorrowingEnabled(_reserve);
		isActive = core.getReserveIsActive(_reserve);
		liquidationBonus = core.getReserveLiquidationBonus(_reserve);

		rateStrategyAddress = core.getReserveInterestRateStrategyAddress(
			_reserve
		);
    }

    
```

### 资产数据
```js

	function getReserveData(address _reserve)
		external
		view
		returns (
			uint256 totalLiquidity,
			uint256 availableLiquidity,
			uint256 totalBorrowsStable,
			uint256 totalBorrowsVariable,
			uint256 liquidityRate,
			uint256 variableBorrowRate,
			uint256 stableBorrowRate,
			uint256 averageStableBorrowRate,
			uint256 utilizationRate,
			uint256 liquidityIndex,
			uint256 variableBorrowIndex,
			address aTokenAddress,
			uint40 lastUpdateTimestamp
		)
	{
		totalLiquidity = core.getReserveTotalLiquidity(_reserve);
		availableLiquidity = core.getReserveAvailableLiquidity(_reserve);
		totalBorrowsStable = core.getReserveTotalBorrowsStable(_reserve);
		totalBorrowsVariable = core.getReserveTotalBorrowsVariable(_reserve);
		liquidityRate = core.getReserveCurrentLiquidityRate(_reserve);
		variableBorrowRate = core.getReserveCurrentVariableBorrowRate(_reserve);
		stableBorrowRate = core.getReserveCurrentStableBorrowRate(_reserve);
		averageStableBorrowRate = core.getReserveCurrentAverageStableBorrowRate( _reserve );
		utilizationRate = core.getReserveUtilizationRate(_reserve);
		liquidityIndex = core.getReserveLiquidityCumulativeIndex(_reserve);
		variableBorrowIndex = core.getReserveVariableBorrowsCumulativeIndex(_reserve );
		aTokenAddress = core.getReserveATokenAddress(_reserve);
		lastUpdateTimestamp = core.getReserveLastUpdate(_reserve);
    }
```