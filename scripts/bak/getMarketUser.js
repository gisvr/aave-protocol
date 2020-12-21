/*
*  根据配置文件创建并且启用策略
*
*  truffle exec --network=mainnet scripts/getMarketUser.js
*  truffle exec --network=ropsten scripts/getMarketUser.js
* */

const BN = require('bignumber.js');
// ============ Contracts ============
const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator");
const LendingPool = artifacts.require("LendingPool");
const AToken = artifacts.require("AToken");
const DefaultReserveInterestRateStrategy = artifacts.require("DefaultReserveInterestRateStrategy");


//  aave mainnet
const aaveMainUserAddr = "0xeA199722372dea9DF458dbb56be7721af117a9Bc"
const aaveMainLpProvideAddr = "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8"

// mint ropsten
const mintRopsUserAddr = "0x9F7A946d935c8Efc7A8329C0d894A69bA241345A"
const mintRopsLpProvideAddr = "0x58c360e4E1544cf9f6AA7cF75402B3E93620AcdA"

let toDecimal = (num, decimal) => {
    let _decimal = new BN(10).pow(String(decimal))
    // console.log(_decimal.toFixed(),_decimal.toFixed().length)
    let ray = new BN(num).div(_decimal)
    return ray.toFixed(4, 1)
}

let rayToPercent = (rayStr) => {
    // let rateStr = web3.utils.fromWei(rayStr, "mether")
    let rateStr = toDecimal(rayStr, 25)
    return BN(rateStr).toFixed(2, 1) + "%"
}


// let rayToPercent = (rayStr) => {
//     let rateStr = web3.utils.fromWei(rayStr, "mether")
//     return rateStr + "%"
// }


module.exports = async (callback) => {

    let netId = await web3.eth.net.getId()

    console.log(netId)
    let lpProvideAddr, userAddr;

    switch (netId.toString()) {
        case "1": // mainnet
            lpProvideAddr = aaveMainLpProvideAddr
            userAddr = aaveMainUserAddr
            break;

        case "3": // ropsten
            lpProvideAddr = mintRopsLpProvideAddr
            userAddr = mintRopsUserAddr
            break

        default:
            throw "not defined provider address"
            break
    }

    console.log("lpProvideAddr", lpProvideAddr)
    console.log("userAddr", userAddr)

    let lpProvider = await LendingPoolAddressProvider.at(lpProvideAddr)
    //获取 lp地址
    let lpAddr = await lpProvider.getLendingPool()
    console.log("lpAddr", lpAddr)
    let lpProxy = await LendingPool.at(lpAddr)
    //获取lp 支持的资产
    let lpReserves = await lpProxy.getReserves()
    console.log("lpReserves", lpReserves)

    // 获取 lp config 地址
    let lpConfAddr = await lpProvider.getLendingPoolConfigurator()
    console.log("lpConfAddr", lpConfAddr)
    let lpConfProxy = await LendingPoolConfigurator.at(lpConfAddr)
    let poolAdder = await lpConfProxy.poolAddressesProvider()
    console.log("poolAddressesProvider", poolAdder)

    for (let reserveAddr of lpReserves) {
        console.log("tokenAddr", reserveAddr)
        if(reserveAddr == "0x02Bf5C4b79361D88Df2883b58A3926E99EeD104e"){
            // continue;
        }
        const reserve = await AToken.at(reserveAddr)
        let tokenName = await reserve.name()
        console.log("tokenName", tokenName)
        let tokenSymbol = await reserve.symbol()
        console.log("tokenSymbol", tokenSymbol)
        let reserveDecimals = await reserve.decimals()
        reserveDecimals = reserveDecimals.toString()
        console.log("tokenDecimals", reserveDecimals)

        let tokenConfData = await lpProxy.getReserveConfigurationData(reserveAddr)


        console.log(tokenSymbol, "Reserve Configuration Data")
        for (let key in tokenConfData) {
            if (key.length < 3) continue
            let val = tokenConfData[key].toString()
            let percent = ""
            let confKeys = {
                "isActive": "是否开放",
                "ltv": "最大LTV(特定抵押的最大借贷能力）",
                "liquidationThreshold": "清算门槛",
                "liquidationBonus": "清算罚款",
                // "interestRateStrategyAddress": "利率策略地址",
                "usageAsCollateralEnabled": "用作抵押品 是否启用",
                "borrowingEnabled": "借款 是否启用",
                "stableBorrowRateEnabled": "固定利率借款 是否启用"
            }
            if (confKeys[key]) {
                percent = "(" + val + ")" + confKeys[key]
            }
            console.log(percent, key, val)
        }


        let strategyAddr = tokenConfData.interestRateStrategyAddress;
        let strategy = await DefaultReserveInterestRateStrategy.at(strategyAddr)

        let strategyReserveAddr = await strategy.reserve()
        console.log(tokenSymbol, "strategyAddr", strategyAddr, "strategyReserveAddr ", strategyReserveAddr)

        let addressesProvider = await strategy.addressesProvider()
        console.log(tokenSymbol, "addressesProvider", addressesProvider)

        let OPTIMAL_UTILIZATION_RATE = (await strategy.OPTIMAL_UTILIZATION_RATE()).toString()
        console.log("OPTIMAL_UTILIZATION_RATE", rayToPercent(OPTIMAL_UTILIZATION_RATE), OPTIMAL_UTILIZATION_RATE)

        let baseVariableBorrowRate = (await strategy.getBaseVariableBorrowRate()).toString()
        console.log("baseVariableBorrowRate", rayToPercent(baseVariableBorrowRate), baseVariableBorrowRate)
        let stableRateSlope1 = (await strategy.getStableRateSlope1()).toString()
        console.log("stableRateSlope1", rayToPercent(stableRateSlope1), stableRateSlope1)
        let stableRateSlope2 = (await strategy.getStableRateSlope2()).toString()
        console.log("stableRateSlope2", rayToPercent(stableRateSlope2), stableRateSlope2)

        let variableRateSlope1 = (await strategy.getVariableRateSlope1()).toString()
        console.log("variableRateSlope1", rayToPercent(variableRateSlope1), variableRateSlope1)
        let variableRateSlope2 = (await strategy.getVariableRateSlope2()).toString()
        console.log("variableRateSlope2", rayToPercent(variableRateSlope2), variableRateSlope2)


        let reserveData = await lpProxy.getReserveData(reserveAddr)

        console.log(tokenSymbol, "Reserve  Rate Data")
        for (let key in reserveData) {
            if (key.length < 3) continue
            let val = reserveData[key].toString()
            let percent = ""
            let rayKeys = {
                "liquidityRate": "存款年化(deposit_apy)",
                "variableBorrowRate": "浮动利率-借贷年化(borrow_apr_variable)",
                "stableBorrowRate": "固定利率-借贷年化(borrow_apr_stable)",
                "utilizationRate": "资金利用率(utilisation_rate)",
                "averageStableBorrowRate": "平均固定利率--",
                "liquidityIndex": "流动性指数--",
                "variableBorrowIndex": "浮动利率指数--"
            }
            if (rayKeys[key]) {
                percent = rayToPercent(val)
                percent = " (" + percent + ")Ray" + rayKeys[key]
            }

            let decimalKeys = {
                "totalLiquidity": "市场规模(total_liquidity)",
                "totalBorrowsStable": "总借入额-固定利率(total_borrowed_stable)",
                "totalBorrowsVariable": "总借入额-浮动利率(total_borrowed_variable)",
                "availableLiquidity": "可用流动资金(available_liquidity)"
            }
            if (decimalKeys[key]) {
                percent = toDecimal(val, reserveDecimals)

                percent = " (" + percent + ")Decimal" + decimalKeys[key]
            }


            console.log(percent, key, val)
        }


        console.log("userAddr----------", userAddr)
        let userAccountData = await lpProxy.getUserAccountData(userAddr)
        console.log("userAccountData----------------")
        for (let key in userAccountData) {
            if (key.length < 3) continue

            let userAccountVal = userAccountData[key].toString()
            let ethKeys = {
                "totalLiquidityETH": "总共流动的ETH",
                "totalCollateralETH": "总计抵押",
                "totalBorrowsETH": "总计借",
                "totalFeesETH": "Fee",
                "availableBorrowsETH": "可借的额度",
                "currentLiquidationThreshold": "当前 阀值",
                "ltv": "LTV",
                "healthFactor": "健康系数"
            }
            let ethVal = ""
            if (ethKeys[key]) {
                ethVal = toDecimal(userAccountVal, 18)
                ethVal = " (" + ethVal + ")Eth" + ethKeys[key]
            }

            console.log(ethVal, key, userAccountVal)
        }
        let userReserveData = await lpProxy.getUserReserveData(reserveAddr, userAddr)

        console.log("userReserveData---------------")
        for (let key in userReserveData) {
            if (key.length < 3) continue

            let userReserveVal = userReserveData[key].toString()
            let percent = ""
            let rayKeys = {
                "borrowRate": "借出利率",
                "liquidityRate": "流动比率",
                "variableBorrowIndex": "浮动借出指数",
            }
            if (rayKeys[key]) {
                percent = rayToPercent(userReserveVal)
                percent = " (" + percent + ")Ray" + rayKeys[key]
            }

            let decimalKeys = {
                "currentATokenBalance": "当前资产余额" + tokenSymbol,
                "currentBorrowBalance": "当前借出余额" + tokenSymbol,
                "principalBorrowBalance": "本金" + tokenSymbol,
                "originationFee": "融资费用" + tokenSymbol
            }
            if (decimalKeys[key]) {
                percent = toDecimal(userReserveVal, reserveDecimals)

                percent = " (" + percent + ")Decimal" + decimalKeys[key]
            }


            let descKeys = {
                "borrowRateMode": "借出利率模型(1:固定, 2:浮动)" + tokenSymbol,
                "usageAsCollateralEnabled": "是否可做抵押无" + tokenSymbol,
            }
            if (descKeys[key]) {
                percent = " (" + percent + ")" + descKeys[key]
            }
            console.log(percent, key, userReserveVal)

        }


        // let aToken =await AToken.at(reserveData.aTokenAddress)
        //
        // let atokenBalance =await aToken.balanceOf(userAddr)
        // console.log("atokenBalance", atokenBalance.toString())

        console.log("\n")
    }


    callback(poolAdder)
}
