/*
*  创建策略
*  truffle exec --network=mainnet utils/newStrategy.js

* */
// ============ Contracts ============
const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator");

const AToken = artifacts.require("AToken");
let getTokenStrategy = require("../../utils/getTokenStrategy")


const DefaultReserveInterestRateStrategy = artifacts.require("DefaultReserveInterestRateStrategy");

// aave
const lpProvideAddr = "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8"


module.exports = async (callback) => {
    const DAI = AToken.at("0x6B175474E89094C44Da98b954EedeAC495271d0F")
    const BAT = AToken.at("0x0D8775F648430679A709E98d2b0Cb6250d2887EF")
    const WBTC = AToken.at("0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599")

    let tokenStrategy = {}
    let tokens = await Promise.all([DAI, BAT, WBTC])
    for (let reserve of tokens) {
        let tokenAddr = reserve.address
        console.log("tokenAddr", tokenAddr)

        let totalSupply = await reserve.totalSupply()
        console.log("totalSupply", totalSupply.toString())

        let tokenName = await reserve.name()
        console.log("tokenName", tokenName)

        let tokenSymbol = await reserve.symbol()
        console.log("tokenSymbol", tokenSymbol)

        let tokenDecimals = await reserve.decimals()
        console.log("tokenDecimals", tokenDecimals.toString())

        let strategy = getTokenStrategy(tokenSymbol, tokenAddr, lpProvideAddr)
        console.log("strategy",strategy)
        tokenStrategy[tokenSymbol] = strategy
    }
    callback(tokenStrategy)
}