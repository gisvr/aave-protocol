清算

## 清算流程: liquidationCall
> 清算用户抵押物  
```js
    /**
    * @dev users can invoke this function to liquidate an undercollateralized position.
    * @param _reserve the address of the collateral to liquidated
    * @param _reserve the address of the principal reserve
    * @param _user the address of the borrower
    * @param _purchaseAmount the amount of principal that the liquidator wants to repay
    * @param _receiveAToken true if the liquidators wants to receive the aTokens, false if
    * he wants to receive the underlying asset directly
    **/
    function liquidationCall(
        address _collateral, // 被清算的抵押物- 清算者得到的资产
        address _reserve, // 储备物- 清算者需要支出的资产
        address _user, // 借款人- 被清算的对象
        uint256 _purchaseAmount, //购买数量- 清算人想要偿还的本金数额- 支出
        bool _receiveAToken
    ) external payable returns (uint256, string memory) {
        // Usage of a memory struct of vars to avoid "Stack too deep" errors due to local variables
        LiquidationCallLocalVars memory vars;

        (, , , , , , , vars.healthFactorBelowThreshold) = dataProvider.calculateUserGlobalData(
            _user
        );
        // 健康阈值 false
        if (!vars.healthFactorBelowThreshold) {
            return (
                uint256(LiquidationErrors.HEALTH_FACTOR_ABOVE_THRESHOLD),
                "Health factor is not below the threshold"
            );
        }

        // 用户抵押资产余额
        vars.userCollateralBalance = core.getUserUnderlyingAssetBalance(_collateral, _user);

        //if _user hasn't deposited this specific collateral, nothing can be liquidated
        if (vars.userCollateralBalance == 0) {
            return (
                uint256(LiquidationErrors.NO_COLLATERAL_AVAILABLE),
                "Invalid collateral to liquidate"
            );
        }

        // 是否启用抵押
        vars.isCollateralEnabled =
            core.isReserveUsageAsCollateralEnabled(_collateral) &&
            core.isUserUseReserveAsCollateralEnabled(_collateral, _user);

        //if _collateral isn't enabled as collateral by _user, it cannot be liquidated
        if (!vars.isCollateralEnabled) {
            return (
                uint256(LiquidationErrors.COLLATERAL_CANNOT_BE_LIQUIDATED),
                "The collateral chosen cannot be liquidated"
            );
        }

        //if the user hasn't borrowed the specific currency defined by _reserve, it cannot be liquidated
        //获取需要还款余额，和借款利息
        (, vars.userCompoundedBorrowBalance, vars.borrowBalanceIncrease) = core
            .getUserBorrowBalances(_reserve, _user);

        if (vars.userCompoundedBorrowBalance == 0) {
            return (
                uint256(LiquidationErrors.CURRRENCY_NOT_BORROWED),
                "User did not borrow the specified currency"
            );
        }

        // LIQUIDATION_CLOSE_FACTOR_PERCENT =50 
        //all clear - calculate the max principal amount that can be liquidated
        // 获取最大清算
        vars.maxPrincipalAmountToLiquidate = vars
            .userCompoundedBorrowBalance
            .mul(LIQUIDATION_CLOSE_FACTOR_PERCENT)
            .div(100);

        // 获取实际清算数量 #TODO Fix BUG
        vars.actualAmountToLiquidate = _purchaseAmount > vars.maxPrincipalAmountToLiquidate
            ? vars.maxPrincipalAmountToLiquidate
            : _purchaseAmount;

        // 借款产生的，需要清算的 抵押物品, 需要偿还的资产
       (uint256 maxCollateralToLiquidate, uint256 principalAmountNeeded) =
			calculateAvailableCollateralToLiquidate(
				_collateral,
				_reserve,
				vars.actualAmountToLiquidate,
				vars.userCollateralBalance
			);

        vars.originationFee = core.getUserOriginationFee(_reserve, _user);

        //if there is a fee to liquidate, calculate the maximum amount of fee that can be liquidated
        // 借款费用需要产生的清算
        if (vars.originationFee > 0) {
            (
                vars.liquidatedCollateralForFee,
                vars.feeLiquidated
            ) = calculateAvailableCollateralToLiquidate(
                _collateral,
                _reserve,
                vars.originationFee,
                vars.userCollateralBalance.sub(maxCollateralToLiquidate)
            );
        }

        //if principalAmountNeeded < vars.ActualAmountToLiquidate, there isn't enough
        //of _collateral to cover the actual amount that is being liquidated, hence we liquidate
        //a smaller amount

        // 当实际 清算的数量大于 需要补充的流动资产。 修正需要补充的资产
        if (principalAmountNeeded < vars.actualAmountToLiquidate) {
            vars.actualAmountToLiquidate = principalAmountNeeded;
        }

        //if liquidator reclaims the underlying asset, we make sure there is enough available collateral in the reserve
        // 如果清算人收回 标的资产，我们就确保储备中有足够的抵押品？？ true 是接受 AToken 作为 receive
        if (!_receiveAToken) {
            uint256 currentAvailableCollateral = core.getReserveAvailableLiquidity(_collateral);
            if (currentAvailableCollateral < maxCollateralToLiquidate) {
                return (
                    uint256(LiquidationErrors.NOT_ENOUGH_LIQUIDITY),
                    "There isn't enough liquidity available to liquidate"
                );
            }
        }

        // 更新清算后的状态
        core.updateStateOnLiquidation(
            _reserve,
            _collateral,
            _user,
            vars.actualAmountToLiquidate,
            maxCollateralToLiquidate,
            vars.feeLiquidated,
            vars.liquidatedCollateralForFee,
            vars.borrowBalanceIncrease,
            _receiveAToken
        );

        AToken collateralAtoken = AToken(core.getReserveATokenAddress(_collateral));

        //if liquidator reclaims the aToken, he receives the equivalent atoken amount
        if (_receiveAToken) {
            // 将对应资产的AToken 转移给清算者
            collateralAtoken.transferOnLiquidation(_user, msg.sender, maxCollateralToLiquidate);
        } else {
            // otherwise receives the underlying asset
            // burn the equivalent amount of atoken
            // burn ATonken，从core给清算者转账
            collateralAtoken.burnOnLiquidation(_user, maxCollateralToLiquidate);
            core.transferToUser(_collateral, msg.sender, maxCollateralToLiquidate);
        }

        //transfers the principal currency to the pool
        // 清算者的 reserve 资产补充到 pool中
        core.transferToReserve.value(msg.value)(_reserve, msg.sender, vars.actualAmountToLiquidate);

        // 费用清算  
        if (vars.feeLiquidated > 0) {
            //if there is enough collateral to liquidate the fee, first transfer burn an equivalent amount of
            //aTokens of the user
            collateralAtoken.burnOnLiquidation(_user, vars.liquidatedCollateralForFee);

            //then liquidate the fee by transferring it to the fee collection address
            // 将借贷产生的费用发生到归集地址
            core.liquidateFee(
                _collateral,
                vars.liquidatedCollateralForFee,
                addressesProvider.getTokenDistributor()
            );

            emit OriginationFeeLiquidated(
                _collateral,
                _reserve,
                _user,
                vars.feeLiquidated,
                vars.liquidatedCollateralForFee,
                //solium-disable-next-line
                block.timestamp
            );

        }
        emit LiquidationCall(
            _collateral,
            _reserve,
            _user,
            vars.actualAmountToLiquidate,
            maxCollateralToLiquidate,
            vars.borrowBalanceIncrease,
            msg.sender,
            _receiveAToken,
            //solium-disable-next-line
            block.timestamp
        );

        return (uint256(LiquidationErrors.NO_ERROR), "No errors");
    }
```


### 计算清算抵押物calculateAvailableCollateralToLiquidate
> 计算有多少特定的抵押品可以被清算，给定一定数量的主要货币。这个函数需要在后面调用所有验证清理的检查都已执行，否则可能会失败。
```js
/**
	 * @dev calculates how much of a specific collateral can be liquidated, given
	 * a certain amount of principal currency. This function needs to be called after
	 * all the checks to validate the liquidation have been performed, otherwise it might fail.
	 * @param _collateral the collateral to be liquidated
	 * @param _principal the principal currency to be liquidated
	 * @param _purchaseAmount the amount of principal being liquidated
	 * @param _userCollateralBalance the collatera balance for the specific _collateral asset of the user being liquidated
	 * @return the maximum amount that is possible to liquidated given all the liquidation constraints (user balance, close factor) and
	 * the purchase amount
	 **/
	function calculateAvailableCollateralToLiquidate(
		address _collateral,// 抵押物
		address _principal, // 流出资产
		uint256 _purchaseAmount, // 清算数量，补充的流出资产计算。 单位 补充资产的单位
		uint256 _userCollateralBalance // 担保资产余额 单位ETH
	)
		public
		view
		returns (uint256 collateralAmount, uint256 principalAmountNeeded) // 可以清算的抵押数量, 
	{
		collateralAmount = 0;
		principalAmountNeeded = 0;
		IPriceOracleGetter oracle =
			IPriceOracleGetter(addressesProvider.getPriceOracle());

		// Usage of a memory struct of vars to avoid "Stack too deep" errors due to local variables
		AvailableCollateralToLiquidateLocalVars memory vars;

		vars.collateralPrice = oracle.getAssetPrice(_collateral); //抵押物ETH价格
		vars.principalCurrencyPrice = oracle.getAssetPrice(_principal); // 购买资产的价格
		vars.liquidationBonus = core.getReserveLiquidationBonus(_collateral); // 清算惩罚

		//this is the maximum possible amount of the selected collateral that can be liquidated, given the
        //max amount of principal currency that is available for liquidation.
        // 计算出带惩罚的 购买数量
		vars.maxAmountCollateralToLiquidate = vars
			.principalCurrencyPrice //补充资产的价格---｜
			.mul(_purchaseAmount) // 补充的数量--------｜--EHT amount
			.div(vars.collateralPrice) // = EHT/vars.collateralPriceETH
			.mul(vars.liquidationBonus) // 成分百分比 105
			.div(100);

        // 如果 用户购买数量大于 用户有的抵押数量
		if (vars.maxAmountCollateralToLiquidate > _userCollateralBalance) {
            //
			collateralAmount = _userCollateralBalance;
			principalAmountNeeded = vars
				.collateralPrice
				.mul(collateralAmount)
				.div(vars.principalCurrencyPrice)
				.mul(100)
				.div(vars.liquidationBonus);
		} else {
			collateralAmount = vars.maxAmountCollateralToLiquidate;
			principalAmountNeeded = _purchaseAmount;
		}

		return (collateralAmount, principalAmountNeeded);
	}
```