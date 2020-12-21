const {accounts, contract, web3,defaultSender} = require("@openzeppelin/test-environment");
const {
    BN,          // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");

const {expect} = require("chai");

// const CToken = contract.fromArtifact("CToken"); // Loads a compiled contract

const LendingPoolAddressProvider = contract.fromArtifact("LendingPoolAddressesProvider");
const LendingPoolParametersProvider = contract.fromArtifact("LendingPoolParametersProvider");
const FeeProvider = contract.fromArtifact("FeeProvider");

const LendingPool = contract.fromArtifact("LendingPool");
const LendingPoolCore = contract.fromArtifact("LendingPoolCore");
const LendingPoolDataProvider = contract.fromArtifact("LendingPoolDataProvider");
const LendingPoolConfigurator = contract.fromArtifact("LendingPoolConfigurator");
const LendingPoolLiquidationManager = contract.fromArtifact("LendingPoolLiquidationManager");
const CoreLibrary = contract.fromArtifact("CoreLibrary");

const AToken = contract.fromArtifact("AToken");

// price rate
const PriceOracle = contract.fromArtifact("PriceOracle");
const LendingRateOracle = contract.fromArtifact("LendingRateOracle");

// strategy
const DefaultReserveInterestRateStrategy = contract.fromArtifact("DefaultReserveInterestRateStrategy");
// const OptimizedReserveInterestRateStrategy = contract.fromArtifact("OptimizedReserveInterestRateStrategy");

// mock
const TokenBAT = contract.fromArtifact("MockBAT");
const TokenDAI = contract.fromArtifact("MockDAI");
const TokenUSDC = contract.fromArtifact("MockUSDC");

let sender = defaultSender;

let percentToRay = (ratePercent) => {
    let rateStr = ratePercent.replace("%", "");
    return web3.utils.toWei(rateStr, "mether")
}

describe("AAVE Deploy", function () {
    const [alice, bob, minter] = accounts;
    before(async () => {
        this.value = new BN(60000000);
        //1
        let provider = await LendingPoolAddressProvider.new();
        await provider.setLendingPoolManager(sender);
        //2
        let fee = await FeeProvider.new();
        await provider.setFeeProviderImpl(fee.address);
        //3
        let parameters = await LendingPoolParametersProvider.new();
        await provider.setLendingPoolParametersProviderImpl(parameters.address);

        //4
        let coreLib = await CoreLibrary.new();
        await LendingPoolCore.detectNetwork();
        await LendingPoolCore.link("CoreLibrary", coreLib.address);
        let core = await LendingPoolCore.new();
        await provider.setLendingPoolCoreImpl(core.address);

        //5
        let lpConfigurator = await LendingPoolConfigurator.new();
        await provider.setLendingPoolConfiguratorImpl(lpConfigurator.address);

        //6
        let dateProvider = await LendingPoolDataProvider.new();
        await provider.setLendingPoolDataProviderImpl(dateProvider.address);

        //7
        let lpContract = await LendingPool.new();
        await provider.setLendingPoolImpl(lpContract.address);
        lpConfigurator.initialize(provider.address);

        let lpLiquManager = await LendingPoolLiquidationManager.new();
        await provider.setLendingPoolLiquidationManager(lpLiquManager.address);



        let priceOracle = await PriceOracle.new();
        let rateOracle = await LendingRateOracle.new();
        await provider.setPriceOracle(priceOracle.address);
        await provider.setLendingRateOracle(rateOracle.address);
        await priceOracle.setEthUsdPrice("380")

        let strategyParams = [
            provider.address,
            "10000000000000000000000000",
            "120000000000000000000000000",
            "500000000000000000000000000",
            "100000000000000000000000000",
            "600000000000000000000000000"
        ]

        //mock token  web3.utils.toBN
        let ten = new BN("10");
        let RAY = new BN("27");
        const total = new BN("20000000")//2000w


        let lpConfAddr = await provider.getLendingPoolConfigurator();
        lpConfigurator = await LendingPoolConfigurator.at(lpConfAddr)


        let mockToken = [TokenDAI, TokenBAT, TokenUSDC]
        for (let token of mockToken) {
            let _token = await token.new();
            let tokenSymbol = await _token.symbol()
            let tokenDecimals = await _token.decimals()
            let mintTotal = total.mul(ten.pow(tokenDecimals))
            await _token.mint(mintTotal)

            console.debug(tokenSymbol, "mintTotal", mintTotal.toString())
            this[tokenSymbol] = _token;

            //资产利率
            let _borrowRay = "30000000000000000000000000"
            await rateOracle.setMarketBorrowRate(_token.address, _borrowRay);
            //资产价格
            let _priceEth = "2628633891158941" //DAI
            if (tokenSymbol == "BAT") {
                _priceEth = "262863389115894";
            }
            await priceOracle.setAssetPrice(_token.address, _priceEth);

            //strategy
            let reserveAddr = _token.address;
            //OptimizedReserveInterestRateStrategy
            // let strategy = await OptimizedReserveInterestRateStrategy.new(...strategyParams);
            let strategy = await DefaultReserveInterestRateStrategy.new(reserveAddr,...strategyParams);

            // console.log("lpConfigurator.initReserve",symbol, reserveAddr, reserveDecimals, strategyAddr)
            await lpConfigurator.initReserve(reserveAddr, tokenDecimals.toString(), strategy.address)

            // 启用借贷抵押
            await lpConfigurator.enableReserveAsCollateral(reserveAddr, "75", "85", "105")
            // 启用借贷
            await lpConfigurator.enableBorrowingOnReserve(reserveAddr, true);
            // 启用固定利率
            await lpConfigurator.enableReserveStableBorrowRate(reserveAddr)
            // 激活资产
            await lpConfigurator.activateReserve(reserveAddr)


            // 设置 资产价格 合约利率
            // await priceOracle.setAssetPrice(reserveAddr, web3.utils.toWei("0.0002"));
            // await rateOracle.setMarketBorrowRate(reserveAddr, percentToRay("80%"))
        }



        //刷新资产固定利率借贷
        await lpConfigurator.refreshLendingPoolCoreConfiguration()



        this.lpAddressProvider = provider

        let lp = await provider.getLendingPool();
        this.lpCoreAddr = await this.lpAddressProvider.getLendingPoolCore();
        this.lpContractProxy = await LendingPool.at(lp)
        this.lpCoreContractProxy = await LendingPoolCore.at(this.lpCoreAddr)

    });

    it("aave depoist ", async () => {
        this.timeout(50000)
        let balance = await  this.DAI.balanceOf(sender)
        console.log("sender",balance.toString())

        const allowAmount = web3.utils.toWei("1000", "ether")
        await this.DAI.approve(this.lpCoreAddr, allowAmount)
        let reserveAddr = this.DAI.address;
        const amount = web3.utils.toWei("600", "ether")
        let tx = await this.lpContractProxy.deposit(reserveAddr, amount, 0 ).catch(e => {
            console.log(e)
            throw e
        })
        console.log(tx.tx)

    }).timeout(500000);

    it("aave redeem ", async () => {
        this.timeout(50000)
        let _aDaiAddr =await this.lpCoreContractProxy.getReserveATokenAddress(this.DAI.address);
        let aDAI =await AToken.at(_aDaiAddr);
        const amount = web3.utils.toWei("100", "ether")
        let tx =await aDAI.redeem(100);

        console.log("aave redeem",tx.tx)

    }).timeout(500000);

    it("aave borrow ", async () => {
        this.timeout(50000)

        let borrowAmount = web3.utils.toWei("1", "ether")
        // 浮动率
        tx = await this.lpContractProxy.borrow(this.DAI.address, borrowAmount, 2, 0); //, {from:accounts[0]}

        // 固定利率
        // tx = await this.lpContractProxy.borrow(this.DAI.address, borrowAmount, 1, 0); //, {from:accounts[0]}
        console.log("account[1] borrow %s DAI ok ", borrowAmount)
        console.log(tx.tx)

    }).timeout(500000);

    it("aave liquidation", async () => {
        let reserveAddr = await  this.DAI.address
        let lpReserves = await  this.lpContractProxy.getReserves()
        console.log(lpReserves)
        let reserveConf= await this.lpContractProxy.getReserveConfigurationData(reserveAddr)
        console.log("config",reserveConf.isActive,reserveConf.ltv.toString());
        console.log("interestRateStrategyAddress",reserveConf.interestRateStrategyAddress);

        let reserveData = await this.lpContractProxy.getReserveData(reserveAddr)
        console.debug(  reserveAddr, "aToken", reserveData.aTokenAddress)

    }).timeout(500000);


});


