/*
*  根据配置文件创建并且启用策略
*  truffle exec --network=ropsten utils/getStrategy.js
*  truffle exec --network=mainnet utils/getStrategy.js
* */

const BN = require('bignumber.js');
// ============ Contracts ============
const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator");
const LendingPool = artifacts.require("LendingPool");
const AToken = artifacts.require("AToken");

const DefaultReserveInterestRateStrategy = artifacts.require("DefaultReserveInterestRateStrategy");


// aave mainnet
// const lpProvideAddr = "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8"

// mint ropsten
const lpProvideAddr = "0x58c360e4E1544cf9f6AA7cF75402B3E93620AcdA"

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

let rayToDecimal = (ray) => {
    return web3.utils.toWei(ray, "mether")
}


module.exports = async (callback) => {
    let lpProvider = await LendingPoolAddressProvider.at(lpProvideAddr)
    //获取 lp地址
    let lpAddr = await lpProvider.getLendingPool()
    console.log("lpAdder", lpAddr)
    let lpProxy = await LendingPool.at(lpAddr)
    //获取lp 支持的资产
    let lpReserves = await lpProxy.getReserves()
    console.log("lpReserves", lpReserves)

    // 获取 lp config 地址
    let lpConfAddr = await lpProvider.getLendingPoolConfigurator()
    console.log("lpConfAddr", lpConfAddr)
    let lpConfProxy = await LendingPoolConfigurator.at(lpConfAddr)
    let lpAdder = await lpConfProxy.poolAddressesProvider()
    console.log("poolAddressesProvider", lpAdder)

    for (let reserveAddr of lpReserves) {
        console.log("tokenAddr", reserveAddr)
        const reserve = await AToken.at(reserveAddr)
        let tokenName = await reserve.name()
        console.log("tokenName", tokenName)
        let tokenSymbol = await reserve.symbol()
        console.log("tokenSymbol", tokenSymbol)
        let reserveDecimals = await reserve.decimals()
        reserveDecimals = reserveDecimals.toString()
        console.log("tokenDecimals", reserveDecimals)

        let tokenConfData = await lpProxy.getReserveConfigurationData(reserveAddr)

        let strategyAddr = await tokenConfData.interestRateStrategyAddress


        let strategy = await DefaultReserveInterestRateStrategy.at(strategyAddr)

        let strategyReserveAddr = await strategy.reserve()
        console.log("strategyAddr", strategyAddr, "strategyReserveAddr ", strategyReserveAddr)

        let addressesProvider = await strategy.addressesProvider()
        console.log("addressesProvider", addressesProvider)

        let OPTIMAL_UTILIZATION_RATE = await strategy.OPTIMAL_UTILIZATION_RATE()
        console.log("OPTIMAL_UTILIZATION_RATE", OPTIMAL_UTILIZATION_RATE.toString())

        let baseVariableBorrowRate = await strategy.getBaseVariableBorrowRate()
        console.log("baseVariableBorrowRate", baseVariableBorrowRate.toString())
        let stableRateSlope1 = await strategy.getStableRateSlope1()
        console.log("stableRateSlope1", stableRateSlope1.toString())
        let stableRateSlope2 = await strategy.getStableRateSlope2()
        console.log("stableRateSlope2", stableRateSlope2.toString())

        let variableRateSlope1 = await strategy.getVariableRateSlope1()
        console.log("variableRateSlope1", variableRateSlope1.toString())
        let variableRateSlope2 = await strategy.getVariableRateSlope2()
        console.log("variableRateSlope2", variableRateSlope2.toString())


        console.log("\n")
    }
}