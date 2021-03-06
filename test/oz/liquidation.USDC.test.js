const {accounts, contract, web3,defaultSender} = require("@openzeppelin/test-environment");
const {
    BN,          // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");

const {expect} = require("chai");
const AaveMarket = require("../../utils/aave");

let aaveMarket = new  AaveMarket(web3);
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
const OptimizedReserveInterestRateStrategy = contract.fromArtifact("OptimizedReserveInterestRateStrategy");

// mock
const TokenBAT = contract.fromArtifact("MockBAT");
const TokenDAI = contract.fromArtifact("MockDAI");
const TokenUSDC = contract.fromArtifact("MockUSDC");

let sender = defaultSender;
let borrowDAI ="";

//
let percentToRay = (ratePercent) => {
    let rateStr = ratePercent.replace("%", "");
    return web3.utils.toWei(rateStr, "mether") // 1e25
}

let timeTravel = async (seconds)  =>  {
   return  new Promise(resolve =>{
        setTimeout(resolve,seconds*1000);
    })
}

let usdDecimalBN = (new BN(10)).pow(new BN(6));
let ethDecimalBN = (new BN(10)).pow(new BN(18));
let rayDecimalBN = (new BN(10)).pow(new BN(27));

let eth16BN = (new BN(10)).pow(new BN(16));

let oneHundredBN = new BN(100)

//贷款及价值，清算阈值，清算惩罚
let ltv ="75", liquidationThreshold = "85", liquidationBonus ="105";
let ethUSD = "500";
let usdETH = "0.002" //1美元对应的 ETH

describe("AAVE Liquidation", function () {
    const [alice, bob, liquid] = accounts;
    before(async () => {
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
        // 特别注意这个设置 不是dataProvider 的设置
        await provider.setLendingPoolDataProviderImpl(dateProvider.address);// await lpConfigurator.initialize(provider.address); //setLendingPoolDataProviderImpl 
        

        //7
        let lpContract = await LendingPool.new();
        await provider.setLendingPoolImpl(lpContract.address);
        await lpConfigurator.initialize(provider.address);

        let lpLiquManager = await LendingPoolLiquidationManager.new();
        await provider.setLendingPoolLiquidationManager(lpLiquManager.address);
         
        this.lpLiquMangerContract  =  lpLiquManager // await LendingPoolLiquidationManager.at(lpLiquManagerAdrr)
       



        let priceOracle = await PriceOracle.new();
        let rateOracle = await LendingRateOracle.new();
        await provider.setPriceOracle(priceOracle.address);
        await provider.setLendingRateOracle(rateOracle.address);
        await priceOracle.setEthUsdPrice(ethUSD)

        let strategyParams = [
            provider.address,
            percentToRay("1%"),//"10000000000000000000000000",  //1%  基本的浮动借利率
            percentToRay("12%"),//"120000000000000000000000000", //12% 浮动利率1段斜率
            percentToRay("50%"), //50% 浮动利率2段斜率
            percentToRay("10%"), //"100000000000000000000000000", //10% 固定利率1段斜率
            percentToRay("60%") //"600000000000000000000000000"  //60% 固定利率2段斜率
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
            await _token.mint(mintTotal,{from:alice});
            await _token.mint(mintTotal,{from:bob});
            await _token.mint(mintTotal,{from:liquid});

            // console.debug(tokenSymbol, "mintTotal", mintTotal.toString())
            this[tokenSymbol] = _token;

            //借款利率
            let _borrowRay =  percentToRay("30%")//"300000000000000000000000" // 3% ray
            await rateOracle.setMarketBorrowRate(_token.address, _borrowRay);

            //资产价格 
            let _priceEth = web3.utils.toWei(usdETH,'ether')  
            if (tokenSymbol == "BAT") {
                _priceEth = web3.utils.toWei("0.001",'ether') //"1000000000000000"; //BAT 0.001eth // eth= 500USD
            }
            await priceOracle.setAssetPrice(_token.address, _priceEth);
            this.priceOracle = priceOracle

            //strategy
            let reserveAddr = _token.address;
            let strategy = await OptimizedReserveInterestRateStrategy.new(...strategyParams);

            // console.log("lpConfigurator.initReserve",symbol, reserveAddr, reserveDecimals, strategyAddr)
            await lpConfigurator.initReserve(reserveAddr, tokenDecimals.toString(), strategy.address)

            // 启用借贷抵押
            await lpConfigurator.enableReserveAsCollateral(reserveAddr, ltv, liquidationThreshold, liquidationBonus)
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
        this.lpCoreAddr = await provider.getLendingPoolCore();
        let lpDataProviderAdrr =  await provider.getLendingPoolDataProvider();



        this.lpContractProxy = await LendingPool.at(lp)
        this.lpCoreContractProxy = await LendingPoolCore.at(this.lpCoreAddr);
        this.lpDataProviderProxy = await LendingPoolDataProvider.at(lpDataProviderAdrr);

        

        let _aDai =await this.lpCoreContractProxy.getReserveATokenAddress(this.DAI.address); 
        this.aDAI =  await AToken.at(_aDai);
        let _aUSDC =await this.lpCoreContractProxy.getReserveATokenAddress(this.USDC.address); 
        this.aUSDC =  await AToken.at(_aUSDC);
 
        let _fee = await provider.getFeeProvider();
        this.feeProvider =  await FeeProvider.at(_fee);

    });

    it("alice,bob,sender depoist 600 DAI, BAT, USDC", async () => {
        this.timeout(50000)

        const allowAmount = web3.utils.toWei("1000", "ether")
        await this.DAI.approve(this.lpCoreAddr, allowAmount,{from:alice})
        await this.BAT.approve(this.lpCoreAddr, allowAmount,{from:bob})
        await this.USDC.approve(this.lpCoreAddr, allowAmount)

        await this.lpContractProxy.deposit(this.DAI.address, allowAmount, 0,{from:alice})
        await this.lpContractProxy.deposit(this.BAT.address, allowAmount, 0,{from:bob}) 
        await this.lpContractProxy.deposit(this.USDC.address, new BN(1000).mul(usdDecimalBN), 0 )


    }).timeout(500000);

    it("Verfiy availableBorrowsETH includes the originationFee", async () => {
        let userAccountData = await this.lpContractProxy.getUserAccountData(sender) 
         // aaveMarket.userAccountData(sender,userAccountData,ethUSD) 
        let availableBorrowsETH = userAccountData.availableBorrowsETH;
        let totalCollateralETH = userAccountData.totalCollateralETH;
        let ltv = userAccountData.ltv;

        //验证可用费用
        let ltvAvailableBorrowsETH = totalCollateralETH.mul(ltv).div(oneHundredBN) 
        let borrowFee =await this.feeProvider.calculateLoanOriginationFee(sender, ltvAvailableBorrowsETH); 
        let _availableBorrowsETH = ltvAvailableBorrowsETH.sub(borrowFee) 

        // console.log("borrowFee",borrowFee.toString(),)
        // console.log("availableBorrowsETH",availableBorrowsETH.toString()) 
        expect(availableBorrowsETH).to.be.bignumber.equal(_availableBorrowsETH);  

    }).timeout(500000);
 
    it("sender borrow DAI ", async () => {
        this.timeout(50000)
        let _reserve = this.DAI.address; 
        let _tokenBal =await this.DAI.balanceOf(sender); 
      
        let userAccountData = await this.lpContractProxy.getUserAccountData(sender);  
        // aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        let availableBorrowsETH = userAccountData.availableBorrowsETH;
        let _priceEth =await this.priceOracle.getAssetPrice(_reserve);  
        // 将可借的 EHT转换成对应的资产
        let borrowAmount = availableBorrowsETH.mul(ethDecimalBN).div(_priceEth);

        console.log("借出",borrowAmount.toString(),borrowAmount.div(ethDecimalBN).toString())
 
        // 浮动率借款
        await this.lpContractProxy.borrow(_reserve, borrowAmount, 2, 0); 

        // ---------------检查用户资产数据-------
        let userReserveData = await this.lpContractProxy.getUserReserveData(_reserve,sender);  
        await timeTravel(2); 
        // 检查 借贷数据是否正确
        expect(borrowAmount).to.be.bignumber.equal(userReserveData.currentBorrowBalance);  
        expect(borrowAmount).to.be.bignumber.equal(userReserveData.principalBorrowBalance);  
        // 检查 用户得到的Token
        let tokenAmount =await this.DAI.balanceOf(sender); 
        expect(borrowAmount).to.be.bignumber.equal(tokenAmount.sub(_tokenBal)); 
        // 检查 利率模型
        expect(userReserveData.borrowRateMode).to.be.bignumber.equal("2"); 
        // 检查 借款费用
        let borrowFee =await this.feeProvider.calculateLoanOriginationFee(sender, availableBorrowsETH);  
        let feeAmount = borrowFee.mul(ethDecimalBN).div(_priceEth); 
        expect(userReserveData.originationFee).to.be.bignumber.equal(feeAmount);  
      
        // ---------------检查用户资产数据-------
        userAccountData = await this.lpContractProxy.getUserAccountData(sender); 
        // 借款额度
        expect(userAccountData.totalBorrowsETH).to.be.bignumber.equal(availableBorrowsETH); 
        // 检查费用
        expect(userAccountData.totalFeesETH).to.be.bignumber.equal(borrowFee);  


        // aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        // aaveMarket.userReserveData("DAI",userReserveData,"18")

 

        // return;
        // 固定利率
        // tx = await this.lpContractProxy.borrow(this.DAI.address, borrowAmount, 1, 0); //, {from:accounts[0]}
        
        // let userReserveData = await this.lpContractProxy.getUserReserveData(this.USDC.address, sender)

        // aaveMarket.userReserveData("DAI", userReserveData, "18");

    }).timeout(500000);
 
    it("aave asset devaluation USDC", async () => { 
        this.timeout(50000)

        let _collateral = this.USDC.address; 
        let _priceEth = await this.priceOracle.getAssetPrice(_collateral);
        // 降价 50%
        await  this.priceOracle.setAssetPrice(_collateral,_priceEth.mul(new BN(85)).div(new BN(100)));

        _priceEth =  await this.priceOracle.getAssetPrice(_collateral);

        let afterUser = await this.lpDataProviderProxy.calculateUserGlobalData(sender)
 

        //检查健康度是否超过阈值
        let healthFactorBelowThreshold =  afterUser[7]
        expect(healthFactorBelowThreshold).to.be.eq(true);  

        let healthFactor = afterUser[6].div(eth16BN); 
        //健康度 小于 100
        expect(healthFactor).to.be.bignumber.lt("100");  

        //流动性阈值= 初始设置值
        let currentLiquidationThreshold = afterUser[5] ;
        expect(currentLiquidationThreshold).to.be.bignumber.eq(liquidationThreshold); 

        let userReserveData = await this.lpContractProxy.getUserReserveData(_collateral,sender);  
        let userAccountData = await this.lpContractProxy.getUserAccountData(sender); 

        let userCollateralBalance = await this.lpCoreContractProxy.getUserUnderlyingAssetBalance(_collateral, sender);  
        let userCollateralBalanceETH = userCollateralBalance.div(usdDecimalBN).mul(_priceEth);
        // 验证抵押余额
        expect(userCollateralBalance).to.be.bignumber.eq(userReserveData.currentATokenBalance); 
        // 抵押资产一种 单一资产
        expect(userCollateralBalanceETH).to.be.bignumber.equal(userAccountData.totalCollateralETH); 

        // console.log("用的抵押的余额userCollateralBalance %s ETH %s",userCollateralBalance.toString(),userCollateralBalanceETH.toString())

        // aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        // aaveMarket.userReserveData("USDC",userReserveData,"6")
 

    }).timeout(500000);
 
 
    it("Sender calculate Available Collateral To Liquidate DAI", async () => {

        await this.lpLiquMangerContract.initialize(this.lpAddressProvider.address);  
        let _reserve = this.DAI.address; 
        let reserveData = await this.lpContractProxy.getUserReserveData(_reserve,sender);  
        let borrowBalances =  await this.lpCoreContractProxy.getUserBorrowBalances(_reserve, sender); // 借款 
        let originationFee =  await this.lpCoreContractProxy.getUserOriginationFee(_reserve, sender); // 费用
         
        // 验证费用 0.0025% 费用   originationFeePercentage = 0.0025 * 1e18; fee 是借出的资产单位
        expect(borrowBalances[0].mul(new BN("25")).div(new BN("10000"))).to.be.bignumber.equal(originationFee);   
        // 验证产生的借出费用 
        expect(originationFee).to.be.bignumber.eq(reserveData.originationFee);    
        // 借出产生的利息borrowBalances.borrowBalanceIncrease"
        expect(borrowBalances[2]).to.be.bignumber.eq(reserveData.currentBorrowBalance.sub(reserveData.principalBorrowBalance));   


        let _collateral = this.USDC.address; 
        await this.lpLiquMangerContract.initialize(this.lpAddressProvider.address);

        let userAccountData = await this.lpContractProxy.getUserAccountData(sender); 
        // aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        // let totalCollateralETH = userAccountData.totalCollateralETH;
        // let collateData = await this.lpContractProxy.getUserReserveData(_collateral,sender);  
        // aaveMarket.userReserveData("USDC",collateData,"6")

        let _purchaseAmount = (new BN("1000")).mul(usdDecimalBN); // borrowBalances[1] //1e18.toString(); //reserve 的单位 

        let _userCollateralBalance =  await this.lpCoreContractProxy.getUserUnderlyingAssetBalance(
			_collateral,
			sender
		);
        let avaiableCollateral =  await this.lpLiquMangerContract.calculateAvailableCollateralToLiquidate(
            _collateral, //_collateral
            _reserve, //_reserve
            _purchaseAmount, // 需要清算的额度 付出的 reserve 单位 .getUserBorrowBalances(_reserve, _user);
            _userCollateralBalance // 用户所有的抵押  collateral 单位 userCollateralBalance = core.getUserUnderlyingAssetBalance( _collateral, _user );
        );


        let borrowBalancesColl = await this.lpLiquMangerContract.getMaxAmountCollateralToLiquidate(
            _collateral, //_collateral
            _reserve, //_reserve
            _purchaseAmount); // 根据 reserve 的数量 计算可赎回，包含了惩罚。
 
        console.log("borrowBalancesColl getMaxAmountCollateralToLiquidate",borrowBalancesColl.div(ethDecimalBN).toString(),borrowBalancesColl.toString())
 

        // vars.maxAmountCollateralToLiquidate = vars
		// 	.principalCurrencyPrice
		// 	.mul(_purchaseAmount)
		// 	.div(vars.collateralPrice)
		// 	.mul(vars.liquidationBonus)
		// 	.div(100);

        // let _collEth = await this.priceOracle.getAssetPrice(_collateral);
        console.log("清算数量 借款数量 ",_purchaseAmount.div(usdDecimalBN).toString()) //
        console.log("获得的抵押物数量 collateral 单位 " ,avaiableCollateral.collateralAmount.toString(), avaiableCollateral.collateralAmount.div(usdDecimalBN).toString())
        console.log("需要付款的 reserve",avaiableCollateral.principalAmountNeeded.toString(),avaiableCollateral.principalAmountNeeded.div(usdDecimalBN).toString())


 
    }).timeout(500000);
 
    
    it("aave liquidation USDC", async () => {
        let _collateral= this.USDC.address
        let _reserve = this.DAI.address; 
        let userAccountData = await this.lpContractProxy.getUserAccountData(sender) 
        // let healthFactor =  userAccountData.healthFactor.div(ethDecimalBN).toNumber() 
        // console.log("健康系数:", healthFactor,userAccountData.healthFactor.toString()) 
        aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        // if(healthFactor>0) return ;
 

        let liquidDai = await this.DAI.balanceOf(liquid)
        console.log("DAI Before", liquidDai.toString())
        console.log("Borrow aUSDC Before", (await  this.aUSDC.balanceOf(sender)).toString())
        console.log("liquid aUSDC Before",(await this.aUSDC.balanceOf(liquid)).toString()) 

        let _purchaseAmount = (new BN("1002")).mul(usdDecimalBN);
        const amount =  (new BN("1002")).mul(ethDecimalBN); 
        await this.DAI.approve(this.lpCoreAddr, amount.mul(new BN(10)),{from:liquid}) 
      
 
        await this.lpContractProxy.liquidationCall(
            _collateral, //_collateral
            _reserve, //_reserve
            sender, //user
            _purchaseAmount.toString(), // 
            true,
            {from:liquid}
        );
        // vars.userCollateralBalance = core.getUserUnderlyingAssetBalance(_collateral, _user);

        // const userReserveDataAfter= await this.lpContractProxy.getUserReserveData(
        //     _reserve,
        //     sender,
        // );

        // aaveMarket.userReserveData("USDC",userReserveData,"6")

        // console.log("DAI userReserveDataAfter",userReserveDataAfter.currentBorrowBalance.toString(),"\n")

        let _liquidDai = await this.DAI.balanceOf(liquid) 
        console.log("liquid DAI After",_liquidDai.toString()) 

        let _priceEth = await this.priceOracle.getAssetPrice(_reserve); 
        console.log("DAI Before - After %s, ETH Price %s, %s \n",liquidDai.sub(_liquidDai).toString()) // 
 
        console.log("borrow aUSDC After", (await this.aUSDC.balanceOf(sender)).toString())
        console.log("liquid aUSDC After",(await this.aUSDC.balanceOf(liquid)).toString())

        //
        userAccountData = await this.lpContractProxy.getUserAccountData(sender) 
        aaveMarket.userAccountData(sender,userAccountData,ethUSD)
 
        // healthFactor =  userAccountData.healthFactor.div(ethDecimalBN).toString() 
        // console.log("健康系数:", healthFactor,userAccountData.healthFactor.toString())

    }).timeout(500000);
 
 
});


