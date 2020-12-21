
 AAVE的利率模型 

 区块链上借贷的利率模型完全有帐本的变化来进行驱动。 存取借还，还有清算。
 1 Deposit
 2 Withdarw
 3 Borrow
 4 Repay
 5 Liquidations
 
### 利率模型
``` js
  function cumulateBalanceInternal(address _user)
        internal
        returns(uint256, uint256, uint256, uint256) {
        // 用户在AToken中的原始铸币额度 1:1 铸币
        uint256 previousPrincipalBalance = super.balanceOf(_user);
 
        //当前产生的利息
        uint256 balanceIncrease = balanceOf(_user).sub(previousPrincipalBalance);
        //将利息铸造成AToken
        _mint(_user, balanceIncrease);
        //updates the user index
        uint256 index = userIndexes[_user] = core.getReserveNormalizedIncome(underlyingAssetAddress);
        return (
            previousPrincipalBalance,
            previousPrincipalBalance.add(balanceIncrease),
            balanceIncrease,
            index
        );
    }
```

index  = core.getReserveNormalizedIncome(underlyingAssetAddress);  
``` js
/**
    * @dev returns the ongoing normalized income for the reserve.
    * a value of 1e27 means there is no income. As time passes, the income is accrued.
    * A value of 2*1e27 means that the income of the reserve is double the initial amount. 
    * @return the normalized income. expressed in ray 1e27
    **/
    function getNormalizedIncome(CoreLibrary.ReserveData storage _reserve)
        internal
        view
        returns (uint256)
    {
        uint256 cumulated = calculateLinearInterest(
            _reserve.currentLiquidityRate, // 当前利率
            _reserve.lastUpdateTimestamp // 最新一次更新
        ).rayMul(_reserve.lastLiquidityCumulativeIndex); // 乘以 最近流动资金累积指数

        return cumulated;

    }
```

## 资产时间差更新
> LendingPoolCore.sol 中的 updateReserveInterestRatesAndTimestampInternal

``` js

    /**
    * @dev Updates the reserve current stable borrow rate Rf, the current variable borrow rate Rv and the current liquidity rate Rl.
    * Also updates the lastUpdateTimestamp value. Please refer to the whitepaper for further information.
    * @param _reserve the address of the reserve to be updated
    * @param _liquidityAdded the amount of liquidity added to the protocol (deposit or repay) in the previous action
    * @param _liquidityTaken the amount of liquidity taken from the protocol (redeem or borrow)
    **/

    function updateReserveInterestRatesAndTimestampInternal(
        address _reserve,
        uint256 _liquidityAdded,
        uint256 _liquidityTaken
    ) internal {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        // 产生新利率
        (uint256 newLiquidityRate, uint256 newStableRate, uint256 newVariableRate) = IReserveInterestRateStrategy(
            reserve.interestRateStrategyAddress// 利率策略地址
        ).calculateInterestRates(
            _reserve,
            getReserveAvailableLiquidity(_reserve).add(_liquidityAdded).sub(_liquidityTaken), //可用的流动性
            reserve.totalBorrowsStable, // 总共解除的固定
            reserve.totalBorrowsVariable, // 总共借出的浮动
            reserve.currentAverageStableBorrowRate // 当前平均利率
        );

        reserve.currentLiquidityRate = newLiquidityRate;
        reserve.currentStableBorrowRate = newStableRate;
        reserve.currentVariableBorrowRate = newVariableRate;

        //solium-disable-next-line
        reserve.lastUpdateTimestamp = uint40(block.timestamp); // 资产的利率更新时间
 
    }
```

线形利率模型 calculateLinearInterest
``` js
    /**
    * @dev function to calculate the interest using a linear interest rate formula
    * @param _rate the interest rate, in ray
    * @param _lastUpdateTimestamp the timestamp of the last update of the interest
    * @return the interest rate linearly accumulated during the timeDelta, in ray
    **/

    function calculateLinearInterest(uint256 _rate, uint40 _lastUpdateTimestamp)
        internal
        view
        returns (uint256)
    {
        // 块时间和 资产的最近更新时间  单位 秒 
        uint256 timeDifference = block.timestamp.sub(uint256(_lastUpdateTimestamp));

        // 资产的时间差 / 一年的秒数
        uint256 timeDelta = timeDifference.wadToRay().rayDiv(SECONDS_PER_YEAR.wadToRay());

        // 当前年化利率 * （存款秒/年秒）+1e27
        return _rate.rayMul(timeDelta).add(WadRayMath.ray());
    }
```

 复利 模型calculateCompoundedInterest
  ``` js
    /**
    * @dev function to calculate the interest using a compounded interest rate formula
    * @param _rate the interest rate, in ray
    * @param _lastUpdateTimestamp the timestamp of the last update of the interest
    * @return the interest rate compounded during the timeDelta, in ray
    **/
    function calculateCompoundedInterest(uint256 _rate, uint40 _lastUpdateTimestamp)
        internal
        view
        returns (uint256)
    {
        //solium-disable-next-line
        uint256 timeDifference = block.timestamp.sub(uint256(_lastUpdateTimestamp));

        uint256 ratePerSecond = _rate.div(SECONDS_PER_YEAR);

        return ratePerSecond.add(WadRayMath.ray()).rayPow(timeDifference);
    }
```