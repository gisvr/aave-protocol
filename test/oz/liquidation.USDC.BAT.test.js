const {accounts, contract, web3,defaultSender} = require("@openzeppelin/test-environment");
const {
    BN,          // Big Number support 
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");
const { tracker } = require("@openzeppelin/test-helpers/src/balance");

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
const TokenDistributor = contract.fromArtifact("TokenDistributor");

// mock
const TokenBAT = contract.fromArtifact("MockBAT");
const TokenDAI = contract.fromArtifact("MockDAI"); 
const TokenUSDC = contract.fromArtifact("MockUSDC"); //18

let sender = defaultSender; 

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

let _purchaseAmount = (new BN("300")).mul(ethDecimalBN); //374 临界值

let discount =new BN(50);// 抵押 token 的 波动 %

describe("AAVE Liquidation USDC BAT", function () {
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
       

        let tokenDistributor = await TokenDistributor.new();
        await provider.setTokenDistributor(tokenDistributor.address);
       



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

        let _aBAT =await this.lpCoreContractProxy.getReserveATokenAddress(this.BAT.address); 
        this.aBAT =  await AToken.at(_aBAT);
 
        let _fee = await provider.getFeeProvider();

       
        this.feeProvider =  await FeeProvider.at(_fee);

    });

    it("alice,bob,sender depoist 1000 DAI, BAT, USDC", async () => {
        this.timeout(50000) 
        const allowAmount = web3.utils.toWei("2000", "ether")
        await this.DAI.approve(this.lpCoreAddr, allowAmount,{from:alice})
        await this.BAT.approve(this.lpCoreAddr, allowAmount,{from:bob})
        await this.USDC.approve(this.lpCoreAddr, allowAmount)
        await this.BAT.approve(this.lpCoreAddr, allowAmount)

      
        await this.lpContractProxy.deposit(this.DAI.address, allowAmount, 0,{from:alice})
        await this.lpContractProxy.deposit(this.BAT.address, allowAmount, 0,{from:bob}) 
        await this.lpContractProxy.deposit(this.USDC.address, new BN(1000).mul(usdDecimalBN), 0 )
        await this.lpContractProxy.deposit(this.BAT.address, new BN(1000).mul(ethDecimalBN), 0 )
        

    }).timeout(500000);

    it("verfiy availableBorrowsETH includes the originationFee", async () => {
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
        expect(availableBorrowsETH).to.be.bignumber.equal(_availableBorrowsETH,"验证 可用流动性算法");  

    }).timeout(500000);
 
    it("sender borrow DAI ", async () => {
        this.timeout(50000)
        let _reserveToken = this.DAI;
        let _reserve = _reserveToken.address; 
        let _tokenBal =await this.DAI.balanceOf(sender); 
      
        let userAccountData = await this.lpContractProxy.getUserAccountData(sender);  
        // aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        let availableBorrowsETH = userAccountData.availableBorrowsETH;
        //
        let _priceEth =await this.priceOracle.getAssetPrice(_reserve);  
        // 将可借的 EHT转换成对应的资产
        let borrowAmount = availableBorrowsETH.mul(ethDecimalBN).div(_priceEth);

        // let userReserveData = await this.lpContractProxy.getUserReserveData(this.BAT.address,sender);  

        // console.log(userReserveData.originationFee.toString())

        console.log("borrow DAI",borrowAmount.div(ethDecimalBN).toString(),borrowAmount.toString(),)
  
        // 浮动率借款
        await this.lpContractProxy.borrow(_reserve, borrowAmount, 2, 0); 

        // ---------------检查用户资产数据-------
        let userReserveData = await this.lpContractProxy.getUserReserveData(_reserve,sender);  
        await timeTravel(2); 
        // 检查 借贷数据是否正确
        expect(borrowAmount).to.be.bignumber.equal(userReserveData.currentBorrowBalance);  
        expect(borrowAmount).to.be.bignumber.equal(userReserveData.principalBorrowBalance);  
        // 检查 用户得到的Token
        let tokenAmount =await _reserveToken.balanceOf(sender); 
        expect(borrowAmount).to.be.bignumber.equal(tokenAmount.sub(_tokenBal)); 
        // 检查 利率模型
        expect(userReserveData.borrowRateMode).to.be.bignumber.equal("2"); 
        // 检查 借款费用
        let borrowFee =await this.feeProvider.calculateLoanOriginationFee(sender, availableBorrowsETH);   
        // let feeAmount =  await this.lpCoreContractProxy.getUserOriginationFee(_reserve, sender);
        let feeAmount = borrowFee.mul(ethDecimalBN).div(_priceEth);
 
        expect(userReserveData.originationFee).to.be.bignumber.equal(feeAmount,"验证 originationFee");  
      
        // ---------------检查用户资产数据-------
        userAccountData = await this.lpContractProxy.getUserAccountData(sender); 
        // 借款额度
        expect(userAccountData.totalBorrowsETH).to.be.bignumber.equal(availableBorrowsETH,"借款额度"); 
        // 检查费用
        expect(userAccountData.totalFeesETH).to.be.bignumber.equal(borrowFee,"检查费用");    
 

    }).timeout(500000);
 
    it("aave asset devaluation USDC BAT", async () => { 
        this.timeout(50000)

        let _collateral = this.USDC.address; 
        let _batColl = this.BAT.address;
        let _priceEth = await this.priceOracle.getAssetPrice(_collateral);
        
        console.log("collateral USDC price", _priceEth.toString())
        await  this.priceOracle.setAssetPrice(_collateral,_priceEth.mul(discount).div(new BN(100)));

        let _newPriceEth =  await this.priceOracle.getAssetPrice(_collateral);
        let _batPriceEth =  await this.priceOracle.getAssetPrice(_batColl);
        console.log("collateral USDC price setPrice %s, reduce price %s % ", _newPriceEth.toString(),_newPriceEth.mul(new BN(100)).div(_priceEth).toString())

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
        let userCollateralBalanceETH = userCollateralBalance.div(usdDecimalBN).mul(_newPriceEth); 
 
        expect(userCollateralBalance).to.be.bignumber.eq(userReserveData.currentATokenBalance,"AToken余额");  
        
        let batCollateralBalance = await this.lpCoreContractProxy.getUserUnderlyingAssetBalance(_batColl, sender);  
        let batCollateralBalanceETH = batCollateralBalance.div(ethDecimalBN).mul(_batPriceEth); 

        expect(userCollateralBalanceETH.add(batCollateralBalanceETH)).to.be.bignumber.eq(userAccountData.totalCollateralETH,"用户总计：抵押资产"); 
 

        // aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        // aaveMarket.userReserveData("USDC",userReserveData,"6") 

    }).timeout(500000);
 
 
    it("sender calculate Available Collateral To Liquidate DAI", async () => {

        await this.lpLiquMangerContract.initialize(this.lpAddressProvider.address);  
        let _reserve = this.DAI.address; 
        let _collateral = this.USDC.address; 

        let collateralPrice = await this.priceOracle.getAssetPrice(_collateral);
        let reservePrice = await this.priceOracle.getAssetPrice(_reserve);

        let reserveData = await this.lpContractProxy.getUserReserveData(_reserve,sender);  
        let borrowBalances =  await this.lpCoreContractProxy.getUserBorrowBalances(_reserve, sender); // 借款 
        let originationFee =  await this.lpCoreContractProxy.getUserOriginationFee(_reserve, sender); // 费用
         
        // 验证费用 0.0025% 费用   originationFeePercentage = 0.0025 * 1e18; fee 是借出的资产单位
        expect(borrowBalances[0].mul(new BN("25")).div(new BN("10000"))).to.be.bignumber.equal(originationFee);   
        // 验证产生的借出费用 
        expect(originationFee).to.be.bignumber.eq(reserveData.originationFee);    
        expect(borrowBalances[1]).to.be.bignumber.eq(reserveData.currentBorrowBalance); //userCompoundedBorrowBalance
        // 借出产生的利息borrowBalances.borrowBalanceIncrease"
        expect(borrowBalances[2]).to.be.bignumber.eq(reserveData.currentBorrowBalance.sub(reserveData.principalBorrowBalance));   

         //userCompoundedBorrowBalance// 最大清算 50%
         let maxPrincipalAmountToLiquidate = reserveData.currentBorrowBalance.mul(new BN(50)).div(oneHundredBN);

         let actualAmountToLiquidate = new BN(_purchaseAmount).gt(maxPrincipalAmountToLiquidate)
             ?  maxPrincipalAmountToLiquidate
             : _purchaseAmount;

        if(new BN(_purchaseAmount).gt(maxPrincipalAmountToLiquidate)){
            expect(actualAmountToLiquidate).to.be.bignumber.eq(maxPrincipalAmountToLiquidate,"(max 实际清算金额"); 
        }else{
            reservePrice.mul(_purchaseAmount)
            expect(actualAmountToLiquidate).to.be.bignumber.eq(_purchaseAmount,"purchase 实际清算金额");   
        }
 
        await this.lpLiquMangerContract.initialize(this.lpAddressProvider.address);
 
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


       
        let bonus =   await this.lpCoreContractProxy.getReserveLiquidationBonus(_collateral);  
       
        
        // ------------- avaiableCollateral ---------
        let maxBorrowBalancesColl = await this.lpLiquMangerContract.getMaxAmountCollateralToLiquidate(
            _collateral, //_collateral
            _reserve, //_reserve
            _purchaseAmount); // 根据 reserve 的数量 计算可赎回，包含了惩罚。

        // 传入的实际清算数量能 清算出的抵押物 ETH价值
        let _maxBorrowBalancesColl = reservePrice.mul(_purchaseAmount).div(collateralPrice).mul(bonus).div(oneHundredBN);
 
        expect(maxBorrowBalancesColl).to.be.bignumber.eq(_maxBorrowBalancesColl,"最大清算");   
        // -------------- avaiableCollateral ---------

        // 赎回大于用户抵押
        if(maxBorrowBalancesColl.gt(_userCollateralBalance)){
            //
            expect(avaiableCollateral.collateralAmount).to.be.bignumber.eq(_userCollateralBalance,"获得的抵押物数量");
            
            //  需要的抵押物数量 ETH 价格
            let _purchaseAmountNeed =  collateralPrice.mul(_userCollateralBalance).div(reservePrice).mul(oneHundredBN).div(bonus);

            expect(avaiableCollateral.principalAmountNeeded).to.be.bignumber.eq(_purchaseAmountNeed,"需要提供的资产");    
        }else{
            expect(avaiableCollateral.collateralAmount).to.be.bignumber.eq(maxBorrowBalancesColl,"all 获得的抵押物数量" );    
            expect(avaiableCollateral.principalAmountNeeded).to.be.bignumber.eq(_purchaseAmount,"all 需要提供的资产");    
        } 
        // 计算fee 需要用
        this.userCollateralBalance = _userCollateralBalance.sub(avaiableCollateral.collateralAmount)
 
 
 
    }).timeout(500000);
 
    
    it("aave liquidation repay DAI, harvest USDC", async () => {
        let _collateral= this.USDC.address
        let _reserve = this.DAI.address; 
        let userAccountData = await this.lpContractProxy.getUserAccountData(sender) 
        let healthFactor =  userAccountData.healthFactor.div(ethDecimalBN).toNumber() 
        console.log("healthFactor:", healthFactor,userAccountData.healthFactor.toString())  
        expect(healthFactor).to.be.eq(0,"健康度大于1");   
 

        let liquidDai = await this.DAI.balanceOf(liquid)
        // console.log("DAI Before", liquidDai.toString())

        let borrowBal=await this.aUSDC.balanceOf(sender);
        let liquBal=await this.aUSDC.balanceOf(liquid); 
        // console.log("Borrow aUSDC Before",borrowBal.toString())
        // console.log("liquid aUSDC Before",liquBal.toString()) 

        
        await this.DAI.approve(this.lpCoreAddr, _purchaseAmount.mul(new BN(10)),{from:liquid}) 
        
          //userCompoundedBorrowBalance// 最大清算 50% 
        let reserveData = await this.lpContractProxy.getUserReserveData(_reserve,sender);  
        let maxPrincipalAmountToLiquidate = reserveData.currentBorrowBalance.mul(new BN(50)).div(oneHundredBN);

        

        await this.lpContractProxy.liquidationCall(
            _collateral, //_collateral
            _reserve, //_reserve
            sender, //user
            _purchaseAmount, // 
            true,
            {from:liquid}
        ); 

        console.log("----------liquidationCall-------------")
        let _liquidDai = await this.DAI.balanceOf(liquid)


 
        console.log("liquid DAI Before - After %s", liquidDai.sub(_liquidDai).toString()) //
 
        // 未计算费用
        let _borrowBal=await this.aUSDC.balanceOf(sender); 
        let _liquBal=await this.aUSDC.balanceOf(liquid); // 清算用户本来有的资产
        

        let _fee=  reserveData.originationFee
        

        let avaiableCollateral =  await this.lpLiquMangerContract.calculateAvailableCollateralToLiquidate(
            _collateral, //_collateral
            _reserve, //_reserve
            _fee, // 需要清算的额度 付出的 reserve 单位 .getUserBorrowBalances(_reserve, _user);
            this.userCollateralBalance // 用户抵押物- 被清算抵押物 
        ); 
 
        console.log("fee aUSDC %s,  %s",avaiableCollateral.collateralAmount.div(usdDecimalBN).toString(), avaiableCollateral.collateralAmount.toString());
        console.log("borrow aUSDC ", _borrowBal.div(usdDecimalBN).toString(),_borrowBal.toString())
        console.log("liquid aUSDC ",_liquBal.div(usdDecimalBN).toString(),_liquBal.toString());


 
        expect(borrowBal).to.be.bignumber.eq(_borrowBal.add(_liquBal).add(avaiableCollateral.collateralAmount),"清算结果=清算人+被清算人+fee");    
       
        userAccountData = await this.lpContractProxy.getUserAccountData(sender)  
        healthFactor =  userAccountData.healthFactor.div(ethDecimalBN).toNumber() 
        console.log("healthFactor:", healthFactor,userAccountData.healthFactor.toString())

        if(new BN(_purchaseAmount).gt(maxPrincipalAmountToLiquidate)){
            expect(maxPrincipalAmountToLiquidate).to.be.bignumber.eq(liquidDai.sub(_liquidDai),"全部 清算用户实际支出");
        }else{
            // expect(_purchaseAmount).to.be.bignumber.eq(liquidDai.sub(_liquidDai),"部分 清算用户实际支出");
        }

        expect(healthFactor).to.be.eq(0,"2健康度大于1");   
        let _batColl = this.BAT.address;
        await this.lpContractProxy.liquidationCall(
            _batColl, //_collateral
            _reserve, //_reserve
            sender, //user
            _purchaseAmount, // 
            true,
            {from:liquid}
        ); 

        console.log("----------liquidationCall 2-------------")
        let _liquidDai2 = await this.DAI.balanceOf(liquid)

         _borrowBal=await this.aBAT.balanceOf(sender); 
         _liquBal=await this.aBAT.balanceOf(liquid); // 清算用户本来有的资产

        console.log("liquid DAI Before - After %s", _liquidDai.sub(_liquidDai2).toString()) //
        console.log("borrow aBAT ", _borrowBal.div(ethDecimalBN).toString(),_borrowBal.toString())
        console.log("liquid aBAT ",_liquBal.div(ethDecimalBN).toString(),_liquBal.toString());

        userAccountData = await this.lpContractProxy.getUserAccountData(sender)  
        healthFactor =  userAccountData.healthFactor.div(ethDecimalBN).toNumber() 
        console.log("healthFactor:", healthFactor,userAccountData.healthFactor.toString())


        expect(healthFactor).to.be.eq(0,"3健康度大于1");   
        await this.lpContractProxy.liquidationCall(
            _batColl, //_collateral
            _reserve, //_reserve
            sender, //user
            _purchaseAmount, // 
            true,
            {from:liquid}
        ); 

        
        console.log("----------liquidationCall 3-------------")
        let _liquidDai3 = await this.DAI.balanceOf(liquid)

         _borrowBal=await this.aBAT.balanceOf(sender); 
         _liquBal=await this.aBAT.balanceOf(liquid); // 清算用户本来有的资产

        console.log("liquid DAI Before - After %s", _liquidDai2.sub(_liquidDai3).toString()) //
        console.log("borrow aBAT ", _borrowBal.div(ethDecimalBN).toString(),_borrowBal.toString())
        console.log("liquid aBAT ",_liquBal.div(ethDecimalBN).toString(),_liquBal.toString());

        userAccountData = await this.lpContractProxy.getUserAccountData(sender)  
        healthFactor =  userAccountData.healthFactor.div(ethDecimalBN).toString() 
        console.log("healthFactor:", healthFactor,userAccountData.healthFactor.toString())



    }).timeout(500000);
 
 
});


