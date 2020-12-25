

LendingPoolDataProvider
### 账户数据  getUserAccountData
```js
	function getUserAccountData(address _user)
		external
		view
		returns (
			uint256 totalLiquidityETH,
			uint256 totalCollateralETH,
			uint256 totalBorrowsETH,
			uint256 totalFeesETH,
			uint256 availableBorrowsETH,
			uint256 currentLiquidationThreshold,
			uint256 ltv,
			uint256 healthFactor
		)
	{
		(
			totalLiquidityETH,
			totalCollateralETH,
			totalBorrowsETH,
			totalFeesETH,
			ltv,
			currentLiquidationThreshold,
			healthFactor,

		) = calculateUserGlobalData(_user);

		availableBorrowsETH = calculateAvailableBorrowsETHInternal(
			totalCollateralETH,
			totalBorrowsETH,
			totalFeesETH,
			ltv
		);
	}
```
### 用户资产 getUserReserveData
```js
	function getUserReserveData(address _reserve, address _user)
		external
		view
		returns (
			uint256 currentATokenBalance,
			uint256 currentBorrowBalance,
			uint256 principalBorrowBalance,
			uint256 borrowRateMode,
			uint256 borrowRate,
			uint256 liquidityRate,
			uint256 originationFee,
			uint256 variableBorrowIndex,
			uint256 lastUpdateTimestamp,
			bool usageAsCollateralEnabled
		)
	{
        currentATokenBalance = AToken(core.getReserveATokenAddress(_reserve)).balanceOf(_user);
        
        CoreLibrary.InterestRateMode mode = core.getUserCurrentBorrowRateMode(_reserve, _user);
        
        //获取借贷信息。。
		(principalBorrowBalance, currentBorrowBalance, ) = core.getUserBorrowBalances(_reserve, _user);

		//default is 0, if mode == CoreLibrary.InterestRateMode.NONE
		if (mode == CoreLibrary.InterestRateMode.STABLE) {
			borrowRate = core.getUserCurrentStableBorrowRate(_reserve, _user);
		} else if (mode == CoreLibrary.InterestRateMode.VARIABLE) {
			borrowRate = core.getReserveCurrentVariableBorrowRate(_reserve);
		}

		borrowRateMode = uint256(mode);
		liquidityRate = core.getReserveCurrentLiquidityRate(_reserve);
		originationFee = core.getUserOriginationFee(_reserve, _user);
		variableBorrowIndex = core.getUserVariableBorrowCumulativeIndex(
			_reserve,
			_user
        );
        //
		lastUpdateTimestamp = core.getUserLastUpdate(_reserve, _user);
		usageAsCollateralEnabled = core.isUserUseReserveAsCollateralEnabled(
			_reserve,
			_user
		);
	}
```

### 获取用户借贷 core.getUserBorrowBalances(_reserve, _user);