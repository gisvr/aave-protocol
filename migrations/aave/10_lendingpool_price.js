const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const ChainlinkProxyPriceProvider = artifacts.require("ChainlinkProxyPriceProvider");
const PriceOracle = artifacts.require("PriceOracle");
const LendingRateOracle = artifacts.require("LendingRateOracle");
const LendingPool = artifacts.require("LendingPool");
const TokenBAT = artifacts.require("MockBAT");
const TokenDAI = artifacts.require("MockDAI");
const TokenLINK = artifacts.require("MockLINK");
const TokenKNC = artifacts.require("MockKNC");
const TokenLEND = artifacts.require("MockLEND");
const TokenMANA = artifacts.require("MockMANA");
const TokenMKR = artifacts.require("MockMKR");
const TokenREP = artifacts.require("MockREP");
const TokenSUSD = artifacts.require("MockSUSD");
const TokenTUSD = artifacts.require("MockTUSD");
const TokenUSDC = artifacts.require("MockUSDC");
const TokenUSDT = artifacts.require("MockUSDT");
const TokenWBTC = artifacts.require("MockWBTC");
const TokenZRX = artifacts.require("MockZRX");

module.exports = async (deployer) => {


    // await deployer.deploy(ChainlinkProxyPriceProvider, {overwrite: false})
    // let proxyPrice = await ChainlinkProxyPriceProvider.deployed()

    await deployer.deploy(PriceOracle)
    let priceOracle = await PriceOracle.deployed()

    await deployer.deploy(LendingRateOracle)
    let rateOracle = await LendingRateOracle.deployed()

    let provider = await LendingPoolAddressProvider.deployed()
    await provider.setPriceOracle(priceOracle.address);
    await provider.setLendingRateOracle(rateOracle.address);

    let mockToken = [TokenWBTC, TokenDAI, TokenBAT,TokenUSDT, TokenUSDC]
    for (let token of mockToken) {
        let _borrowRay = "30000000000000000000000000"
        await rateOracle.setMarketBorrowRate(token.address, _borrowRay)


        let _priceEth = "2628633891158941" //DAI

        await priceOracle.setAssetPrice(token.address, _priceEth)

        // rateOracle.setMarketLiquidityRate("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "0")
    }
    await priceOracle.setEthUsdPrice("380")

};
