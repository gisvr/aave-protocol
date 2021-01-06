const LendingPoolAddressProvider = artifacts.require(
    "LendingPoolAddressesProvider"
);
const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator"); 

const OptimizedReserveInterestRateStrategy = artifacts.require("OptimizedReserveInterestRateStrategy");

const LendingPool = artifacts.require("LendingPool");
const TokenDAI = artifacts.require("MockDAI");
const TokenBAT = artifacts.require("MockBAT");
const TokenUSDC = artifacts.require("MockUSDC");
const TokenUSDT = artifacts.require("MockUSDT");
const TokenWBTC = artifacts.require("MockWBTC");

let percentToRay = (ratePercent) => {
    let rateStr = ratePercent.replace("%", "");
    return web3.utils.toWei(rateStr, "mether"); // 1e25
};

let creatStrategy = async (deployer, provider) => {
    let params = [
        provider.address,
        percentToRay("1%"), //"10000000000000000000000000",  //1%  基本的浮动借利率
        percentToRay("12%"), //"120000000000000000000000000", //12% 浮动利率1段斜率
        percentToRay("50%"), //50% 浮动利率2段斜率
        percentToRay("10%"), //"100000000000000000000000000", //10% 固定利率1段斜率
        percentToRay("60%"), //"600000000000000000000000000"  //60% 固定利率2段斜率
    ];

    // params.push({overwrite: false})
    await deployer.deploy(OptimizedReserveInterestRateStrategy, ...params);
    return OptimizedReserveInterestRateStrategy.deployed();
};


let ltv = "75", liquidationThreshold = "85", liquidationBonus = "105";

let creatEthStrategy = async (deployer, provider, lpConfigurator) => {
    let reserveAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    let symbol = "ETH";
    let aTokenName = `a${symbol} name`;
    let aTokenSymbol = `a${symbol}`;
    let strategy = await creatStrategy(deployer, provider);
    let strategyAddr = strategy.address;
    await lpConfigurator.initReserveWithData(
        reserveAddr,
        aTokenName,
        aTokenSymbol,
        18,
        strategyAddr
    );

    // 启用借贷抵押
    await lpConfigurator.enableReserveAsCollateral(reserveAddr, ltv, liquidationThreshold, liquidationBonus)

    // 启用借贷
    await lpConfigurator.enableBorrowingOnReserve(reserveAddr, true);
    // 启用固定利率
    await lpConfigurator.enableReserveStableBorrowRate(reserveAddr);
    // 激活资产
    await lpConfigurator.activateReserve(reserveAddr);

    console.debug(symbol, reserveAddr)
};

module.exports = async (deployer, network) => {
    let provider = await LendingPoolAddressProvider.deployed();

    // 使用 proxy 地址初始化合约
    let lpConfAddr = await provider.getLendingPoolConfigurator();
    let lpConfigurator = await LendingPoolConfigurator.at(lpConfAddr);

    let lpAddr = await provider.getLendingPool();
    let lpContract = await LendingPool.at(lpAddr);

    await creatEthStrategy(deployer, provider, lpConfigurator);

    let mockToken = [TokenDAI, TokenBAT, TokenWBTC, TokenUSDT, TokenUSDC];
    for (let token of mockToken) {
        let tokenInfo = await token.deployed();
        let symbol = await tokenInfo.symbol();
        let reserveAddr = tokenInfo.address;
        let reserveDecimals = await tokenInfo.decimals();
        let strategy = await creatStrategy(deployer, provider);
        let strategyAddr = strategy.address;
        // 初始化 策略, 会给资产创建一个对应的aToken 
        await lpConfigurator.initReserve(reserveAddr, reserveDecimals,strategyAddr);

        // 启用借贷抵押
        await lpConfigurator.enableReserveAsCollateral(reserveAddr, ltv, liquidationThreshold, liquidationBonus)

        // 启用借贷
        await lpConfigurator.enableBorrowingOnReserve(reserveAddr, true);
        // 启用固定利率
        await lpConfigurator.enableReserveStableBorrowRate(reserveAddr);
        // 激活资产
        await lpConfigurator.activateReserve(reserveAddr);

        let reserveData = await lpContract.getReserveData(reserveAddr);
        console.debug(symbol, reserveAddr, "aToken", reserveData.aTokenAddress);
    }
    //刷新资产固定利率借贷
    await lpConfigurator.refreshLendingPoolCoreConfiguration();
};
