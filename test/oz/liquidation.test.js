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

let usdDecimalBN = (new BN(10)).pow(new BN(6));
let ethDecimalBN = (new BN(10)).pow(new BN(18));
let rayDecimalBN = (new BN(10)).pow(new BN(27));

let eth16BN = (new BN(10)).pow(new BN(16));

let oneHundredBN = new BN(100)

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
        
        let lpLiquManagerAdrr =  await provider.getLendingPoolLiquidationManager();
        this.lpLiquMangerContract  =  lpLiquManager // await LendingPoolLiquidationManager.at(lpLiquManagerAdrr)
       



        let priceOracle = await PriceOracle.new();
        let rateOracle = await LendingRateOracle.new();
        await provider.setPriceOracle(priceOracle.address);
        await provider.setLendingRateOracle(rateOracle.address);
        await priceOracle.setEthUsdPrice("380")

        let strategyParams = [
            provider.address,
            "10000000000000000000000000",  //1%  基本的浮动借利率
            "120000000000000000000000000", //12% 浮动利率1段斜率
            "500000000000000000000000000", //50% 浮动利率2段斜率
            "100000000000000000000000000", //10% 固定利率1段斜率
            "600000000000000000000000000"  //60% 固定利率2段斜率
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

            //资产利率
            let _borrowRay = "300000000000000000000000" // 3% ray
            await rateOracle.setMarketBorrowRate(_token.address, "2");
            //资产价格
            
            let _priceEth = "2000000000000000"  //DAI 0.002eth // eth= 500USD
            if (tokenSymbol == "BAT") {
                _priceEth = "1000000000000000"; //BAT 0.001eth // eth= 500USD
            }
            await priceOracle.setAssetPrice(_token.address, _priceEth);
            this.priceOracle = priceOracle

            //strategy
            let reserveAddr = _token.address;
            let strategy = await OptimizedReserveInterestRateStrategy.new(...strategyParams);

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
        this.lpCoreAddr = await provider.getLendingPoolCore();
        let lpDataProviderAdrr =  await provider.getLendingPoolDataProvider();



        this.lpContractProxy = await LendingPool.at(lp)
        this.lpCoreContractProxy = await LendingPoolCore.at(this.lpCoreAddr);
        this.lpDataProviderProxy = await LendingPoolDataProvider.at(lpDataProviderAdrr);

        

        let _aDai =await this.lpCoreContractProxy.getReserveATokenAddress(this.DAI.address); 
        this.aDAI =  await AToken.at(_aDai);
        let _aUSDC =await this.lpCoreContractProxy.getReserveATokenAddress(this.USDC.address); 
        this.aUSDC =  await AToken.at(_aUSDC);

    });

    it("alice,bob,sender depoist 600 DAI, BAT, USDC", async () => {
        this.timeout(50000)

        const allowAmount = web3.utils.toWei("600", "ether")
        await this.DAI.approve(this.lpCoreAddr, allowAmount,{from:alice})
        await this.BAT.approve(this.lpCoreAddr, allowAmount,{from:bob})
        await this.USDC.approve(this.lpCoreAddr, allowAmount)

        await this.lpContractProxy.deposit(this.DAI.address, allowAmount, 0,{from:alice})
        await this.lpContractProxy.deposit(this.BAT.address, allowAmount, 0,{from:bob})

        await this.lpContractProxy.deposit(this.USDC.address, new BN(600).mul(usdDecimalBN), 0 )


    }).timeout(500000);
 
    it(`sender borrow DAI BAT(10)`, async () => {
        this.timeout(50000)
        let _reserve = this.DAI.address; 

        let _priceEth =await this.priceOracle.getAssetPrice(_reserve);  // console.log("_priceEth",_priceEth.toString()); //2628633891158941 

        let userAccountData = await this.lpContractProxy.getUserAccountData(sender) 
        let borrowAmount = userAccountData.availableBorrowsETH.div(_priceEth);
        console.log("borrowAmount before",borrowAmount.toString());
        
        let beforeUser = await this.lpDataProviderProxy.calculateUserGlobalData(sender)
        let beforeCurrentLiquidationThreshold = beforeUser[5].toString();
        let beforeHealthFactor = beforeUser[6].toString();  
        let beforeHealthFactorBelowThreshold = beforeUser[7].toString(); 
        console.log("healthFactor before",  "  HealthFactorBelowThreshold ",beforeCurrentLiquidationThreshold,beforeHealthFactorBelowThreshold)

        // 浮动率
         await this.lpContractProxy.borrow(_reserve, borrowAmount.sub(new BN(10)).mul(ethDecimalBN), 2, 0); //, {from:accounts[0]}

         userAccountData = await this.lpContractProxy.getUserAccountData(sender) 
         let borrowEth =  userAccountData.totalBorrowsETH //.div(ethDecimalBN)

         let availableBorrowsETH =  userAccountData.availableBorrowsETH //.div(ethDecimalBN)

         console.log("USDC 已使用的借贷能力:", borrowEth.mul(oneHundredBN).div(borrowEth.add(availableBorrowsETH)).toString(), "% ")


         await this.lpContractProxy.borrow(this.BAT.address,  (new BN(10)).mul(ethDecimalBN), 2, 0); //, {from:accounts[0]}

        let afterUserAccountData = await this.lpContractProxy.getUserAccountData(sender)

       
        let afterBorrowAmount = afterUserAccountData.availableBorrowsETH.div(_priceEth);
        console.log("borrowAmount after", afterBorrowAmount.toString())
        let afterUser = await this.lpDataProviderProxy.calculateUserGlobalData(sender)

          beforeCurrentLiquidationThreshold = afterUser[5].toString();
          beforeHealthFactor = afterUser[6].div(eth16BN).toString();  
          beforeHealthFactorBelowThreshold = afterUser[7].toString(); 
        console.log("healthFactor after",beforeHealthFactor,"  HealthFactorBelowThreshold ",beforeCurrentLiquidationThreshold,beforeHealthFactorBelowThreshold) 

        borrowEth =  afterUserAccountData.totalBorrowsETH
        console.log("BAT 已使用的借贷能力:", borrowEth.mul(oneHundredBN).div(borrowEth.add(afterBorrowAmount)).toString(), "% ")

 
        // vars.borrowFee = feeProvider.calculateLoanOriginationFee(msg.sender, _amount);

        // return;
        // 固定利率
        // tx = await this.lpContractProxy.borrow(this.DAI.address, borrowAmount, 1, 0); //, {from:accounts[0]}
        
        // let userReserveData = await this.lpContractProxy.getUserReserveData(this.USDC.address, sender)

        // aaveMarket.userReserveData("DAI", userReserveData, "18");

    }).timeout(500000);
 
    it("aave asset devaluation USDC", async () => {
      
        this.timeout(50000)

        let _priceEth = await this.priceOracle.getAssetPrice(this.USDC.address);
        // 降价 50%
        await  this.priceOracle.setAssetPrice(this.USDC.address,_priceEth.mul(new BN(8)).div(new BN(10)));

        let afterUser = await this.lpDataProviderProxy.calculateUserGlobalData(sender)

        beforeCurrentLiquidationThreshold = afterUser[5].toString();
        beforeHealthFactor = afterUser[6].div(eth16BN).toString();  
        beforeHealthFactorBelowThreshold = afterUser[7].toString(); 
        console.log("healthFactor after",beforeHealthFactor,"  HealthFactorBelowThreshold ",beforeCurrentLiquidationThreshold,beforeHealthFactorBelowThreshold,"\n") 
 
    }).timeout(500000);

    // 


    it("aave calculateAvailableCollateralToLiquidate", async () => {

        await this.lpLiquMangerContract.initialize(this.lpAddressProvider.address);


        let _user =sender;

        let _reserve = this.DAI.address;
        let _collateral = this.USDC.address
        let __reserveBAT = this.BAT.address
        // let _reserveConfData = await this.lpContractProxy.getReserveConfigurationData(_reserve);

        //  vars.userCollateralBalance = core.getUserUnderlyingAssetBalance(_collateral, _user);

        // atoken的余额
        let userCollateralBalance = await this.lpCoreContractProxy.getUserUnderlyingAssetBalance(_collateral, _user);
 
        let _priceEth =await this.priceOracle.getAssetPrice(_collateral); 

        let userCollateralBalanceETH = userCollateralBalance.div(usdDecimalBN).mul(_priceEth);

        console.log("用的抵押的余额userCollateralBalance %s ETH %s",userCollateralBalance.toString(),userCollateralBalanceETH.toString())
        let originationFee =  await this.lpCoreContractProxy.getUserOriginationFee(_reserve, _user);

        let originationFeeETH = userCollateralBalance.div(usdDecimalBN).mul(_priceEth);
        console.log("DAI 借出费用 originationFee %s ETH %s",originationFee.toString(),originationFeeETH.toString())

        let borrowBalances =  await this.lpCoreContractProxy.getUserBorrowBalances(_reserve, _user);
        console.log("DAI 借出原始 borrowBalances.principal",borrowBalances[0].toString())
        console.log("DAI 借出计算利息的借出 borrowBalances.userCompoundedBorrowBalance",borrowBalances[1].toString())
        console.log("DAI 借出产生的利息borrowBalances.borrowBalanceIncrease",borrowBalances[2].toString())

       let liquidationBonus = await this.lpCoreContractProxy.getReserveLiquidationBonus(_collateral);

        console.log("liquidationBonus",liquidationBonus.toString())


        let borrowBalancesColl = await this.lpLiquMangerContract.getMaxAmountCollateralToLiquidate(
            _collateral, //_collateral
            _reserve, //_reserve
            borrowBalances[1]);

        console.log("borrowBalancesColl getMaxAmountCollateralToLiquidate",borrowBalancesColl.toString())

        let originationFeeColl = await this.lpLiquMangerContract.getMaxAmountCollateralToLiquidate(
            _collateral, //_collateral
            _reserve, //_reserve
            originationFee);

        console.log("borrowBalances getMaxAmountCollateralToLiquidate",originationFeeColl.toString(),"\n \n calculateAvailableCollateralToLiquidate")




        let avaiableCollateral =  await this.lpLiquMangerContract.calculateAvailableCollateralToLiquidate(
            _collateral, //_collateral
            _reserve, //_reserve
            borrowBalances[1], // 需要清算的额度
            userCollateralBalance //_userCollateralBalance
        );

        console.log("borrow  _purchaseAmount",borrowBalances[1].toString())
        console.log("borrow maxCollateralToLiquidate",avaiableCollateral.collateralAmount.toString())
        console.log("borrow principalAmountNeeded",avaiableCollateral.principalAmountNeeded.toString())

        let feeAvaiableCollateral =  await this.lpLiquMangerContract.calculateAvailableCollateralToLiquidate(
            _collateral, //_collateral
            _reserve, //_reserve
            "60952380", //_purchaseAmount "60952380", //the amount of principal that the liquidator wants to repay
            userCollateralBalance //_userCollateralBalance
        );
        
        console.log("fee  _purchaseAmount",originationFee.toString())
        console.log("fee maxCollateralToLiquidate",feeAvaiableCollateral.collateralAmount.toString())
        console.log("fee principalAmountNeeded",feeAvaiableCollateral.principalAmountNeeded.toString())
 

    }).timeout(500000);



    it.skip("aave liquidation USDC", async () => {
        let reserveAddr = this.DAI.address;
        // let _reserveConfData = await this.lpContractProxy.getReserveConfigurationData(reserveAddr);
        // let strategyAddr = aaveMarket.reserveConfData(_reserveConfData, "DAI")
        // await this.getStrategy(strategyAddr, tokenSymbol)

        let userAccountData = await this.lpContractProxy.getUserAccountData(sender)
        // total.mul(ten.pow(tokenDecimals))

        console.log("healthFactor",userAccountData.healthFactor.toString());
        let healthFactor =  userAccountData.healthFactor.div(ethDecimalBN).toNumber()
        // aaveMarket.userAccountData(sender,userAccountData,"300")
        console.log("健康系数:", healthFactor)

        let borrowEth =  userAccountData.totalBorrowsETH //.div(ethDecimalBN)

        let availableBorrowsETH =  userAccountData.availableBorrowsETH //.div(ethDecimalBN)

        const userReserveDataBefore = await this.lpContractProxy.getUserReserveData(
            reserveAddr,
            sender,
        );


        // console.log(borrowEth.toString())
        // console.log(availableBorrowsETH.toString())

        // borrow/available
        console.log("已使用的借贷能力:", borrowEth.mul(oneHundredBN).div(borrowEth.add(availableBorrowsETH)).toString(), "% ")

        console.log("userReserveDataBefore",userReserveDataBefore.currentBorrowBalance.toString(),"\n")



        let _aUSDCAddr =await this.lpCoreContractProxy.getReserveATokenAddress(this.USDC.address);
        let aUSDC =await AToken.at(_aUSDCAddr);
        // let _aDAIAddr =await this.lpCoreContractProxy.getReserveATokenAddress(this.DAI.address);
        // let aDAI =await AToken.at(_aDAIAddr);

        let liquidDai = await this.BAT.balanceOf(liquid)
        console.log("DAI Before", liquidDai.toString())
        console.log("Borrow aUSDC Before", (await  aUSDC.balanceOf(sender)).toString())
        console.log("liquid aUSDC Before",(await aUSDC.balanceOf(liquid)).toString())

        // function liquidationCall(address _collateral, address _reserve, address _user, uint256 _purchaseAmount, bool _receiveaToken)

        const amount = web3.utils.toWei("3000", "ether")
        await this.BAT.approve(this.lpCoreAddr, amount,{from:liquid})
        // const amount = web3.utils.toWei("30", "ether")
        if(healthFactor>0) return ;

       // let _purchaseAmount= web3.utils.toWei("10", "ether") // new BN(10).mul(usdDecimalBN) //userReserveDataBefore.currentBorrowBalance//
        await this.lpContractProxy.liquidationCall(
            this.USDC.address, //_collateral
            this.BAT.address, //_reserve
            sender, //user
            1e20.toString(), //_purchaseAmount "47619046", //the amount of principal that the liquidator wants to repay
            true,
            {from:liquid}
        );
        // vars.userCollateralBalance = core.getUserUnderlyingAssetBalance(_collateral, _user);

        const userReserveDataAfter= await this.lpContractProxy.getUserReserveData(
            reserveAddr,
            sender,
        );

        console.log("userReserveDataAfter",userReserveDataAfter.currentBorrowBalance.toString(),"\n")

        let _liquidDai = await this.BAT.balanceOf(liquid)

        console.log("liquid DAI After",_liquidDai.toString())

        //38095237

        let _priceEth = await this.priceOracle.getAssetPrice(this.DAI.address);

        console.log("DAI Before - After %s, ETH Price %s, %s \n",liquidDai.sub(_liquidDai).toString(),_priceEth,liquidDai.sub(_liquidDai).mul(_priceEth).toString()) // 

       


        console.log("borrow aUSDC After", (await aUSDC.balanceOf(sender)).toString())
        console.log("liquid aUSDC After",(await aUSDC.balanceOf(liquid)).toString())

        //
        userAccountData = await this.lpContractProxy.getUserAccountData(sender)
        // total.mul(ten.pow(tokenDecimals))

        console.log("healthFactor",userAccountData.healthFactor.toString());
        healthFactor =  userAccountData.healthFactor.div(ethDecimalBN).toString()

        // aaveMarket.userAccountData(sender,userAccountData,"300")
        console.log("健康系数:", healthFactor)

    }).timeout(500000);
 
});


