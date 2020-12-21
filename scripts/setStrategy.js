/*
*  根据配置文件创建并且启用策略
*  truffle exec --network=mainnet scripts/setStrategy.js
*  truffle exec --network=ropsten scripts/setStrategy.js
*
 * 1. LendingPoolAddressesProvider.getLendingPoolConfigurator获取proxy地址
 * 2. 用LendingPoolConfiguratorProxy At Address初始化 LendingPoolConfigurator合约
 * 3. 执行LendingPoolConfigurator.initialize //初始化 会创建一个aToken 合约
 * 4. 执行LendingPoolConfigurator.activateReserve // 激活资产
 * 5. 执行LendingPoolConfigurator.enableReserveAsCollateral // 启用可以作为抵押物
 * 6. 执行LendingPoolConfigurator.enableBorrowingOnReserve // 启用借贷
 * 7. 执行LendingPoolConfigurator.enableReserveStableBorrowRate // 启用固定利率
 * 8. 执行LendingPoolConfigurator.refreshLendingPoolCoreConfiguration // 刷新配置
* */
// ============ Contracts ============
const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator");
const LendingPool = artifacts.require("LendingPool");
const DefaultReserveInterestRateStrategy = artifacts.require("DefaultReserveInterestRateStrategy");

const AToken = artifacts.require("AToken");
let getTokenStrategy = require("../utils/getTokenStrategy")

// mint ropsten
const lpProvideAddr = "0x58c360e4E1544cf9f6AA7cF75402B3E93620AcdA"

// let reserveAddr = "0xd25532602CD97915Ad1EeD45B28167c5be160042" //DAI

// let reserveAddr = "0x11333dd4c35e89E06a785b925CaB5D97A69576C6" //BAT

// let reserveAddr = "0x02Bf5C4b79361D88Df2883b58A3926E99EeD104e" //WBTC

let reserveAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" // ETH


module.exports = async (callback) => {
    //获得
    let lpProvider = await LendingPoolAddressProvider.at(lpProvideAddr)
    let lpConfAddr = await lpProvider.getLendingPoolConfigurator()
    let lpAddr = await lpProvider.getLendingPool()
    console.log("lpAdder", lpAddr)
    console.log("lpConfAddr", lpConfAddr)

    let lpConfProxy = await LendingPoolConfigurator.at(lpConfAddr)
    let lpAdder = await lpConfProxy.poolAddressesProvider()
    console.log("Conf poolAddressesProvider", lpAdder)

    // console.log(LendingPoolAddressProvider.currentProvider.wallets)
    let currentProviderAddr = LendingPoolAddressProvider.currentProvider.addresses[0]
    console.log("currentProvider pri", currentProviderAddr)


    let tokenName = "ETH token"
    let tokenSymbol = "ETH"
    let reserveDecimals = 18
    //  eth
    if (reserveAddr != "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        const reserve = await AToken.at(reserveAddr)
        tokenName = await reserve.name()
        tokenSymbol = await reserve.symbol()
        reserveDecimals = await reserve.decimals()
    }
    console.log("tokenName", tokenName)
    console.log("tokenSymbol", tokenSymbol)
    console.log("tokenDecimals", reserveDecimals.toString())
    let lpProxy = await LendingPool.at(lpAddr)
    let lpReserves = await lpProxy.getReserves()
    console.log("lpReserves", lpReserves)
    let daiStrategyAddr = await lpProxy.getReserveConfigurationData(reserveAddr)

    console.log(tokenSymbol, "strategyAddr", daiStrategyAddr.interestRateStrategyAddress)

    let strategyParams = getTokenStrategy(tokenSymbol, reserveAddr, lpProvideAddr)
    console.log(tokenSymbol, "strategyParams", strategyParams)

    let tokenContract = new web3.eth.Contract(DefaultReserveInterestRateStrategy.abi)
    let strategyAddr = ""
    await tokenContract.deploy({
        data: DefaultReserveInterestRateStrategy.bytecode,
        arguments: strategyParams
    }).send({
        from: currentProviderAddr,
        gas: 2000000, // gas limit
        gasPrice: '10000000000', //10 Wei
    }).then(async function (contactInstance) {
        console.log("deployed successfully.")
        strategyAddr = contactInstance.options.address
        console.log("strategyAddr", strategyAddr)
        let _reserve = await contactInstance.methods.reserve().call()
        console.log("reserve", _reserve)
    }).catch(err => {
        console.log("Error: failed to deploy, detail:", err)
        throw err
    })

    let strategy = await DefaultReserveInterestRateStrategy.at(strategyAddr)

    let strategyReserveAddr = await strategy.reserve()
    console.log("strategyReserveAddr", strategyReserveAddr)
    let baseVariableBorrowRate = await strategy.getBaseVariableBorrowRate()

    let stableRateSlope1 = await strategy.getStableRateSlope1()
    console.log(strategyReserveAddr, "stableRateSlope1", stableRateSlope1.toString(), "baseVariableBorrowRate", baseVariableBorrowRate.toString())


    console.log("setReserveInterestRateStrategyAddress", reserveAddr, reserveDecimals.toString(), strategy.address)
    // 初始化 策略, 会给资产创建一个对应的aToken
    await lpConfProxy.setReserveInterestRateStrategyAddress(reserveAddr, strategy.address).catch(e => {
        console.error(e)
        throw  e
    })


    console.log("lpConfProxy.setReserveInterestRateStrategyAddress")
    //启用资产
    await lpConfProxy.activateReserve(reserveAddr)

    console.log("lpConfProxy.activateReserve")

    if (!lpReserves.includes(reserveAddr)) {
        //启用资产抵押
        // address _reserve,
        // uint256 _baseLTVasCollateral,
        // uint256 _liquidationThreshold,
        // uint256 _liquidationBonus
        await lpConfProxy.enableReserveAsCollateral(reserveAddr, "75", "80", "105").catch(e => {
            console.error(e)
            throw e
        })
        console.log("lpConfProxy.enableReserveAsCollateral")

        //启用资产借贷
        await lpConfProxy.enableBorrowingOnReserve(reserveAddr, true).catch(e => {
            console.error(e)
            throw e
        })
        console.log("lpConfProxy.enableBorrowingOnReserve")

        //启用资产固定利率借贷
        await lpConfProxy.enableReserveStableBorrowRate(reserveAddr).catch(e => {
            console.error(e)
            throw e
        })
        console.log("lpConfProxy.enableReserveStableBorrowRate")
    }


    //刷新资产固定利率借贷
    await lpConfProxy.refreshLendingPoolCoreConfiguration().catch(e => {
        console.error(e)
        throw e
    })

    console.log("lpConfProxy.refreshLendingPoolCoreConfiguration")

    let daiNewStrategyAddr = await lpProxy.getReserveConfigurationData(reserveAddr)

    console.log("New  StrategyAddr", daiNewStrategyAddr.interestRateStrategyAddress)

    callback(lpAdder)
}