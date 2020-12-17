const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator");
const DefaultReserveInterestRateStrategy = artifacts.require("DefaultReserveInterestRateStrategy");
const LendingPool = artifacts.require("LendingPool");
const TokenDAI = artifacts.require("MockDAI");
const TokenBAT = artifacts.require("MockBAT");
const TokenUSDC = artifacts.require("MockUSDC");
const TokenUSDT = artifacts.require("MockUSDT");
const TokenWBTC = artifacts.require("MockWBTC");

let creatStrategy = async (deployer, params) => {
    // params.push({overwrite: false})
    await deployer.deploy(DefaultReserveInterestRateStrategy, ...params)

    let strategy = await DefaultReserveInterestRateStrategy.deployed()

    return strategy

}

module.exports = async (deployer, network) => {
    let provider = await LendingPoolAddressProvider.deployed()

    // 使用 proxy 地址初始化合约
    let lpConfAddr = await provider.getLendingPoolConfigurator()


    let lpAddr = await provider.getLendingPool()
    let lpContract = await LendingPool.at(lpAddr)

    let mockToken = [TokenDAI,TokenBAT, TokenUSDT, TokenUSDC]
    for (let token of mockToken) {
        //获取可操作的Proxy对象
        let lpConfigurator = await LendingPoolConfigurator.at(lpConfAddr)
        let tokenInfo = await token.deployed();
        let symbol = await tokenInfo.symbol()
        let reserveAddr = tokenInfo.address
        let strategyParams = [
            reserveAddr,
            provider.address,
            "10000000000000000000000000",
            "120000000000000000000000000",
            "500000000000000000000000000",
            "100000000000000000000000000",
            "600000000000000000000000000"
        ]

        let reserveDecimals = (await tokenInfo.decimals()).toString()
        if (strategyParams) {
            let strategy = await creatStrategy(deployer, strategyParams)
            let strategyAddr = strategy.address
            // 初始化 策略, 会给资产创建一个对应的aToken
            if (symbol == "ETH") {
                let aTokenName = `a${symbol} name`
                let aTokenSymbol = `a${symbol}`
                await lpConfigurator.initReserveWithData(reserveAddr, aTokenName, aTokenSymbol, reserveDecimals, strategyAddr)
            } else {
                console.log("lpConfigurator.initReserve",symbol, reserveAddr, reserveDecimals, strategyAddr)
                await lpConfigurator.initReserve(reserveAddr, reserveDecimals.toString(), strategyAddr)
            }


            let reserveData = await lpContract.getReserveData(reserveAddr)
            // 启用借贷抵押
            await lpConfigurator.enableReserveAsCollateral(reserveAddr, "75", "85", "105")
            // 启用借贷
            await lpConfigurator.enableBorrowingOnReserve(reserveAddr, true)
            // 启用固定利率
            await lpConfigurator.enableReserveStableBorrowRate(reserveAddr)
            // 激活资产
            await lpConfigurator.activateReserve(reserveAddr)

            console.debug(symbol, reserveAddr, "aToken", reserveData.aTokenAddress)

        } else {
            continue
        }

        //刷新资产固定利率借贷
        await lpConfigurator.refreshLendingPoolCoreConfiguration()
    }

}
