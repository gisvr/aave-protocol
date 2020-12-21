/*
 *   // 开启资产借贷
 *  truffle exec --network=ropsten scripts/index.js -f onReserve -t USDT
 *  truffle exec --network=ropsten scripts/index.js -f onReserve -t ETH
 *  truffle exec --network=ropsten scripts/index.js -f onReserve -t USDC
 *
 *  // 获取目前市场的基本信息
 *  truffle exec --network=ropsten scripts/index.js -f getMarket -t DAI -c mint
 *  truffle exec --network=rinkeby scripts/index.js -f getMarket -t DAI -c mint
 *  truffle exec --network=ropsten scripts/index.js -f getMarket -c aave -t USDT
 *
 *
 *  // 查看用户的控制面板
 *  truffle exec --network=ropsten scripts/index.js -f getUser -a 0xeA199722372dea9DF458dbb56be7721af117a9Bc -t DAI
 *  truffle exec --network=ropsten scripts/index.js -f getUser  -a 0xeA199722372dea9DF458dbb56be7721af117a9Bc  -c aave -t DAI
 *  truffle exec --network=ropsten scripts/index.js -f getUser  -a 0xeA199722372dea9DF458dbb56be7721af117a9Bc  -c aave -t USDT
 *
 *  // 查看用户的借贷信息
 *  truffle exec --network=ropsten scripts/index.js -f borrow  -a 0xeA199722372dea9DF458dbb56be7721af117a9Bc -t DAI -c mint
 *
 * // 下架资产
 *  truffle exec --network=ropsten scripts/index.js mint offReserve ETH  // 下币
 *
 * // 设置资产
 *  truffle exec --network=ropsten scripts/index.js mint setReserve ETH  // 下币
 */
let argv = require("../utils/argv")
const Conf = require("../config")

let getTokenPrices = require("../utils/getTokenPrices")

const lpAddrProvider = artifacts.require("LendingPoolAddressesProvider");
const lpConf = artifacts.require("LendingPoolConfigurator");
const lp = artifacts.require("LendingPool");
const strategy = artifacts.require("DefaultReserveInterestRateStrategy");
const aToken = artifacts.require("AToken");
//oracle
const chainLinkPrice = artifacts.require("ChainlinkProxyPriceProvider")
const rateOracle = artifacts.require("LendingRateOracle")
const priceOracle = artifacts.require("PriceOracle")

// function
const onReserve = require("./onReserve")
const offReserve = require("./offReserve")
const setReserve = require("./setReserve")

const getMarket = require("./getMarket")
const getUser = require("./getUser")
const getUserBorrow = require("./getUserBorrow")


module.exports = async (callback) => {
    let contract = argv.contract
    let funcName = argv.function
    let network = argv.network
    let reserveSymbol = argv.token
    let userAddr = argv.account

    console.debug(contract, funcName, network, reserveSymbol, userAddr)

    let account = (await web3.eth.getAccounts())[0]
    web3.eth.defaultAccount = account

    let contractConf = Conf[network][contract]
    // console.debug("contractConf", contractConf)
    let providerContract = await lpAddrProvider.at(contractConf.lpProvideAddr)
    let lpAddr = await providerContract.getLendingPool()
    let lpConfAddr = await providerContract.getLendingPoolConfigurator()

    let priceOracleAddr = await providerContract.getPriceOracle()

    console.debug("priceOracleAddr", priceOracleAddr)
    let rateOracleAddr = await providerContract.getLendingRateOracle()
    // console.log("lendingRateOracle", rateOracleAddr)

    let lpContract = await lp.at(lpAddr)
    let chainLinkPriceContract = await chainLinkPrice.at(priceOracleAddr)
    let priceOracleContract = await priceOracle.at(priceOracleAddr)

    let lpReserves = await lpContract.getReserves()

    let prices = []
    let ethUsd = ""
    if (contract == "aave") {
        prices = await getTokenPrices.getAavePrices(chainLinkPriceContract, lpReserves, contractConf)
        ethUsd = await getTokenPrices.getEthUsd(contract)
    } else {
        prices = await getTokenPrices.getMintPrices(priceOracleContract, lpReserves, contractConf)
        ethUsd = await getTokenPrices.getEthUsd(contract, priceOracleContract)
    }

    // console.log(prices)
    console.log("ethUsd", ethUsd, "\n assetsPrices", prices.find(val => val.symbol == reserveSymbol))
    //
    // callback("ok")
    let func;
    switch (funcName) {
        case "getMarket":
            func = new getMarket(web3, lp, rateOracle)
            await func.init(lpAddr, rateOracleAddr, prices, ethUsd)
            break;
        case "getUser":
            func = new getUser(web3, lpContract)
            await func.init(userAddr, prices, ethUsd)
            break;
        case "borrow":
            func = new getUserBorrow(web3, lp)
            await func.init(lpAddr, userAddr, prices, ethUsd)
            break;
        case "onReserve":
            func = new onReserve(web3, lpConf, lp, aToken)
            await func.init(lpConfAddr, lpAddr)
            break;
        case "offReserve":
            func = new offReserve(web3, lpConf, lp, aToken)
            await func.init(lpConfAddr, lpAddr)
            break;
        case "setReserve":
            func = new setReserve(web3, lpConf, lp, aToken)
            await func.init(lpConfAddr, lpAddr)
            break;
        default :
            console.log("function not defind")
            break

    }
    let funcInfo = await func.start(contractConf, reserveSymbol)

    callback(`${contract} ${reserveSymbol} ${funcName}   ：` + funcInfo)

}
