 LendingPoolDataProvider contract

### 健康率计算
> （抵押(ETH)*清算阈值(%)）/(借出(ETH)+费用(ETH)) = x(1e18)
```js
    /**
    * @dev calculates the health factor from the corresponding balances
    * @param collateralBalanceETH the total collateral balance in ETH
    * @param borrowBalanceETH the total borrow balance in ETH
    * @param totalFeesETH the total fees in ETH
    * @param liquidationThreshold the avg liquidation threshold
    **/
    function calculateHealthFactorFromBalancesInternal(
        uint256 collateralBalanceETH,
        uint256 borrowBalanceETH,
        uint256 totalFeesETH,
        uint256 liquidationThreshold
    ) internal pure returns (uint256) {
        if (borrowBalanceETH == 0) return uint256(-1);

        return
            (collateralBalanceETH.mul(liquidationThreshold).div(100)).wadDiv(
                borrowBalanceETH.add(totalFeesETH)
            );
    }
```

### 判断 用户资产是否健康

```js
    /**
    * @dev check if a specific balance decrease is allowed (i.e. doesn't bring the user borrow position health factor under 1e18)
    * @param _reserve the address of the reserve
    * @param _user the address of the user
    * @param _amount the amount to decrease
    * @return true if the decrease of the balance is allowed
    **/

   // 是否允许资产转移
    function balanceDecreaseAllowed(address _reserve, address _user, uint256 _amount)
        external
        view
        returns (bool)
    {
        // Usage of a memory struct of vars to avoid "Stack too deep" errors due to local variables
        balanceDecreaseAllowedLocalVars memory vars;
        //1. 获取资产配置
        (
            vars.decimals, // 资产的小树单位
            ,
            vars.reserveLiquidationThreshold, // 清算阈值 85
            vars.reserveUsageAsCollateralEnabled // 是否用作抵押
        ) = core.getReserveConfiguration(_reserve); 

        //2. 资产是否用作抵押，如果没有，不应该阻止转移
        if (
            !vars.reserveUsageAsCollateralEnabled || // 是否在系统中用做为抵押
            !core.isUserUseReserveAsCollateralEnabled(_reserve, _user) // 用户是否将资产作为抵押
        ) {
            return true; //if reserve is not used as collateral, no reasons to block the transfer
        }

        //3. 获取用户资产数据
        (
            ,
            vars.collateralBalanceETH, // 用户抵押的资产价值(ETH)
            vars.borrowBalanceETH, // 用户借出资产
            vars.totalFeesETH, // 用产生的费用
            ,
            vars.currentLiquidationThreshold, //当前清算的阈值 decimals (liquidityBalanceETH.mul(vars.liquidationThreshold))/(totalCollateralBalanceETH)
            ,
        ) = calculateUserGlobalData(_user);

        //4. 判断是用户否用有抵押，如果没有，不应该阻止转移
        if (vars.borrowBalanceETH == 0) {
            return true; //no borrows - no reasons to block the transfer
        }

        IPriceOracleGetter oracle = IPriceOracleGetter(addressesProvider.getPriceOracle());
        //5. 获取最新的资产价格
        vars.amountToDecreaseETH = oracle.getAssetPrice(_reserve).mul(_amount).div(
            10 ** vars.decimals
        );

        //6. 减少资产 = 抵押资产-转移资产
        vars.collateralBalancefterDecrease = vars.collateralBalanceETH.sub(
            vars.amountToDecreaseETH
        );

        //if there is a borrow, there can't be 0 collateral
        if (vars.collateralBalancefterDecrease == 0) {
            return false;
        }

        //7.  资产转移后的健康值阈值 =抵押*当前清算阈值-(转移资产*资产清算阈值)
        vars.liquidationThresholdAfterDecrease = vars
            .collateralBalanceETH
            .mul(vars.currentLiquidationThreshold)
            .sub(vars.amountToDecreaseETH.mul(vars.reserveLiquidationThreshold))
            .div(vars.collateralBalancefterDecrease);
        //8. 
        uint256 healthFactorAfterDecrease = calculateHealthFactorFromBalancesInternal(
            vars.collateralBalancefterDecrease,
            vars.borrowBalanceETH,
            vars.totalFeesETH,
            vars.liquidationThresholdAfterDecrease
        );

        return healthFactorAfterDecrease > HEALTH_FACTOR_LIQUIDATION_THRESHOLD;

    }
```

### 获取健康数据
>  LendingPoolDataProvider
1. 流动性资产和抵押资产并不互斥是包含关系 totalLiquidityBalanceETH  和 totalCollateralBalanceETH 是 包含关系，并不互斥
``` js
    /**
    * @dev calculates the user data across the reserves.
    * this includes the total liquidity/collateral/borrow balances in ETH,
    * the average Loan To Value, the average Liquidation Ratio, and the Health factor.
    * @param _user the address of the user
    * @return the total liquidity, total collateral, total borrow balances of the user in ETH.
    * also the average Ltv, liquidation threshold, and the health factor
    **/
    function calculateUserGlobalData(address _user)
        public
        view
        returns (
            uint256 totalLiquidityBalanceETH, // 总计流动性余额
            uint256 totalCollateralBalanceETH, // 总计抵押余额
            uint256 totalBorrowBalanceETH, // 总计借款余额
            uint256 totalFeesETH, // 总计费用
            uint256 currentLtv, // 当前抵押率 75
            uint256 currentLiquidationThreshold, // 当前资产清算阈值
            uint256 healthFactor, // 健康度 小于1就会被清算
            bool healthFactorBelowThreshold // 健康系数是否低于阈值
        )
    {
        IPriceOracleGetter oracle = IPriceOracleGetter(addressesProvider.getPriceOracle());

        // Usage of a memory struct of vars to avoid "Stack too deep" errors due to local variables
        UserGlobalDataLocalVars memory vars;

        address[] memory reserves = core.getReserves();

        for (uint256 i = 0; i < reserves.length; i++) {
            vars.currentReserve = reserves[i];

            // 用户基础资产数据
            (
                vars.compoundedLiquidityBalance,
                vars.compoundedBorrowBalance,
                vars.originationFee,
                vars.userUsesReserveAsCollateral
            ) = core.getUserBasicReserveData(vars.currentReserve, _user);

            // 没有资产 && 没有借款
            if (vars.compoundedLiquidityBalance == 0 && vars.compoundedBorrowBalance == 0) {
                continue;
            }

            //fetch reserve data
            (
                vars.reserveDecimals,
                vars.baseLtv,
                vars.liquidationThreshold,
                vars.usageAsCollateralEnabled
            ) = core.getReserveConfiguration(vars.currentReserve);

            //获取当前资产价格
            vars.tokenUnit = 10 ** vars.reserveDecimals;
            vars.reserveUnitPrice = oracle.getAssetPrice(vars.currentReserve);

            //有流动性和抵押资产
            if (vars.compoundedLiquidityBalance > 0) {
                // 产生的利息价格
                uint256 liquidityBalanceETH = vars
                    .reserveUnitPrice
                    .mul(vars.compoundedLiquidityBalance)
                    .div(vars.tokenUnit);
                // 将资产进行总计
                totalLiquidityBalanceETH = totalLiquidityBalanceETH.add(liquidityBalanceETH);

                // 如果资产作为抵押
                if (vars.usageAsCollateralEnabled && vars.userUsesReserveAsCollateral) {
                    // 累计抵押资产
                    totalCollateralBalanceETH = totalCollateralBalanceETH.add(liquidityBalanceETH);
                    // 累计当前的 净值资产
                    currentLtv = currentLtv.add(liquidityBalanceETH.mul(vars.baseLtv));
                    // 累计可以用于清算的资产
                    currentLiquidationThreshold = currentLiquidationThreshold.add(
                        liquidityBalanceETH.mul(vars.liquidationThreshold)
                    );
                }
            }
            // 有借贷资产
            if (vars.compoundedBorrowBalance > 0) {
                //累计借资产
                totalBorrowBalanceETH = totalBorrowBalanceETH.add(
                    vars.reserveUnitPrice.mul(vars.compoundedBorrowBalance).div(vars.tokenUnit)
                );
                //累计借资产手续费用
                totalFeesETH = totalFeesETH.add(
                    vars.originationFee.mul(vars.reserveUnitPrice).div(vars.tokenUnit)
                );
            }
        } // end for

        currentLtv = totalCollateralBalanceETH > 0 ? currentLtv.div(totalCollateralBalanceETH) : 0;
        // 计算当前的清算阈值
        currentLiquidationThreshold = totalCollateralBalanceETH > 0
            ? currentLiquidationThreshold.div(totalCollateralBalanceETH)
            : 0;

        //
        healthFactor = calculateHealthFactorFromBalancesInternal(
            totalCollateralBalanceETH,
            totalBorrowBalanceETH,
            totalFeesETH,
            currentLiquidationThreshold
        );
        healthFactorBelowThreshold = healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD;

    }
    
```


### 用户基础资产数据 getUserBasicReserveData 
>  LendingPoolCore.sol
```js
    /**
    * @dev returns the basic data (balances, fee accrued, reserve enabled/disabled as collateral)
    * needed to calculate the global account data in the LendingPoolDataProvider
    * @param _reserve the address of the reserve
    * @param _user the address of the user
    * @return the user deposited balance, the principal borrow balance, the fee, and if the reserve is enabled as collateral or not
    **/
    function getUserBasicReserveData(address _reserve, address _user)
        external
        view
        returns (uint256, uint256, uint256, bool)
    {
        // 资产对应的数据
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        // 用资产对应的数据
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];

        uint256 underlyingBalance = getUserUnderlyingAssetBalance(_reserve, _user);
        // 用户借款为0直接返回，
        if (user.principalBorrowBalance == 0) {
            return (underlyingBalance, 0, 0, user.useAsCollateral);
        }

        return (
            underlyingBalance, // 资产余额 通过AToken查询的余额
            user.getCompoundedBorrowBalance(reserve), // 
            user.originationFee,// 融资费用
            user.useAsCollateral // 用用是否将资产用做抵押
        );
    }
```


### 用户借款数据 getCompoundedBorrowBalance 
>  CoreLibrary.sol
> calculateCompoundedInterest: 计算利率在时间上的复利
   * 固定利率
    >_self.stableBorrowRate 每个用户的固定利率不相同。 和参与时间有关
   * 浮动利率
    >_reserve.currentVariableBorrowRate 资产当前的浮动利率
```js
    /**
    * @dev calculates the compounded borrow balance of a user
    * @param _self the userReserve object
    * @param _reserve the reserve object
    * @return the user compounded borrow balance
    **/
    function getCompoundedBorrowBalance(
        CoreLibrary.UserReserveData storage _self,
        CoreLibrary.ReserveData storage _reserve
    ) internal view returns (uint256) {
        if (_self.principalBorrowBalance == 0) return 0;
         
        uint256 principalBorrowBalanceRay =   // 用户基础借款
			_self.principalBorrowBalance.wadToRay();
        uint256 compoundedBalance = 0; //复利
        uint256 cumulatedInterest = 0; //累计利息
 
		if (_self.stableBorrowRate > 0) {
			cumulatedInterest = calculateCompoundedInterest(
				_self.stableBorrowRate,
				_self.lastUpdateTimestamp
			);
		} else {
			//variable interest
			cumulatedInterest = calculateCompoundedInterest(
				_reserve.currentVariableBorrowRate,
				_reserve.lastUpdateTimestamp
			).rayMul(_reserve.lastVariableBorrowCumulativeIndex)
			 .rayDiv(_self.lastVariableBorrowCumulativeIndex);
		}

        //处理 复利的单位
		compoundedBalance = principalBorrowBalanceRay
			.rayMul(cumulatedInterest)
			.rayToWad();

		if (compoundedBalance == _self.principalBorrowBalance) {
			//solium-disable-next-line
			if (_self.lastUpdateTimestamp != block.timestamp) {
				//no interest cumulation because of the rounding - we add 1 wei
				//as symbolic cumulated interest to avoid interest free loans.

				return _self.principalBorrowBalance.add(1 wei);
			}
		}

		return compoundedBalance;
    }

```

### 计算清算健康度 calculateHealthFactorFromBalancesInternal
> 抵押*清算阈值(%) / (借资产+借资产费用）
``` js
	/**
	 * @dev calculates the health factor from the corresponding balances
	 * @param collateralBalanceETH the total collateral balance in ETH
	 * @param borrowBalanceETH the total borrow balance in ETH
	 * @param totalFeesETH the total fees in ETH
	 * @param liquidationThreshold the avg liquidation threshold
	 **/
	function calculateHealthFactorFromBalancesInternal(
		uint256 collateralBalanceETH,
		uint256 borrowBalanceETH,
		uint256 totalFeesETH,
		uint256 liquidationThreshold
	) internal pure returns (uint256) {
		if (borrowBalanceETH == 0) return uint256(-1);

		return
			(collateralBalanceETH.mul(liquidationThreshold).div(100)).wadDiv(
				borrowBalanceETH.add(totalFeesETH)
			);
	}
```