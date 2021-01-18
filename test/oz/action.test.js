const {accounts, contract, web3,defaultSender} = require("@openzeppelin/test-environment");
const {
    BN,      
    time,    // Big Number support
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

const MockFlashLoanReceiver = contract.fromArtifact("MockFlashLoanReceiver"); //18

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

let _receiveAToken = false;

let _purchaseAmount = (new BN("179")).mul(ethDecimalBN); //374 临界值

const [alice, bob, liquid] = accounts;

describe("AAVE action ", function () {

    before(async () => {
        //1
        let provider = await LendingPoolAddressProvider.new();
        await provider.setLendingPoolManager(sender); 
        this.flashloanReceiver = await MockFlashLoanReceiver.new(provider.address); 
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


        let mockToken = [TokenDAI, TokenUSDC]
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

    it("DAI, BAT, TUSD alice,bob,sender depoist 1000 ", async () => {
        this.timeout(50000)
 
        const allowAmount = new BN("1000").mul(ethDecimalBN)
        await this.DAI.approve(this.lpCoreAddr, allowAmount,{from:bob}) 
        await this.DAI.approve(this.lpCoreAddr, allowAmount,{from:alice}) 
        await this.USDC.approve(this.lpCoreAddr, allowAmount)

        let aTokenBal1=await this.aDAI.principalBalanceOf(alice) 
 
        await this.lpContractProxy.deposit(this.DAI.address, allowAmount.div(new BN(2)), 0,{from:bob}) 
        await this.lpContractProxy.deposit(this.DAI.address, allowAmount, 0,{from:alice}) 

        await this.lpContractProxy.deposit(this.USDC.address, new BN(1000).mul(usdDecimalBN), 0 )

        let aTokenBal2=await this.aDAI.principalBalanceOf(alice) 
 
        expect(aTokenBal2).to.be.bignumber.eq (aTokenBal1.add(allowAmount),"1 Atoken principal balance"); 


    }).timeout(500000);
  
    it("DAI sender borrow variable rate", async () => {
        this.timeout(50000)
        let _user = bob
        let _reserve = this.DAI.address; 
        let _tokenBal =await this.DAI.balanceOf(sender); 
 
        let totalSupply1 = await this.aDAI.totalSupply();
      
        let userAccountData = await this.lpContractProxy.getUserAccountData(sender);  
        // aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        let availableBorrowsETH = userAccountData.availableBorrowsETH;
        let _priceEth =await this.priceOracle.getAssetPrice(_reserve);  
        // 将可借的 EHT转换成对应的资产
        let borrowAmount = availableBorrowsETH.mul(ethDecimalBN).div(_priceEth).div(new BN(2));

        console.log("borrow DAI",borrowAmount.div(ethDecimalBN).toString(),borrowAmount.toString(),)
 
        let aTokenBal3=await this.aDAI.principalBalanceOf(_user);
        // 浮动率借款
        await this.lpContractProxy.borrow(_reserve, borrowAmount, 2, 0); 

        let aTokenBal4=await this.aDAI.principalBalanceOf(_user); 

        // console.log("aTokenBal3",aTokenBal3.toString(),aTokenBal4.toString())

        // ---------------检查用户资产数据-------
        let userReserveData = await this.lpContractProxy.getUserReserveData(_reserve,sender);  
        await timeTravel(2); 
        // 检查 借贷数据是否正确
        expect(borrowAmount).to.be.bignumber.equal(userReserveData.currentBorrowBalance,"currentBorrowBalance");  
        expect(borrowAmount).to.be.bignumber.equal(userReserveData.principalBorrowBalance,"principalBorrowBalance");  
        // 检查 用户得到的Token
        let tokenAmount =await this.DAI.balanceOf(sender); 
        expect(borrowAmount).to.be.bignumber.equal(tokenAmount.sub(_tokenBal),"user balance"); 
        // 检查 利率模型
        expect(userReserveData.borrowRateMode).to.be.bignumber.equal("2"); 
        // 检查 借款费用
        let borrowFee =await this.feeProvider.calculateLoanOriginationFee(sender, availableBorrowsETH.div(new BN(2)));  
        let feeAmount = borrowFee.mul(ethDecimalBN).div(_priceEth); 
        expect(userReserveData.originationFee).to.be.bignumber.equal(feeAmount,"Fee");  
      
        // ---------------检查用户资产数据-------
        userAccountData = await this.lpContractProxy.getUserAccountData(sender); 
        // 借款额度
        expect(userAccountData.totalBorrowsETH).to.be.bignumber.equal(availableBorrowsETH.div(new BN(2)),"totalBorrowsETH"); 
        // 检查费用
        expect(userAccountData.totalFeesETH).to.be.bignumber.equal(borrowFee);  

        let totalSupply2 = await this.aDAI.totalSupply();

        // 
        expect(totalSupply2).to.be.bignumber.eq(totalSupply1,"Atoken totalSupply"); 
 

    }).timeout(500000);

    it("DAI sender swapBorrowRateMode stable ", async () => {
        let _user = sender
        let _reserve = this.DAI.address; 
        let userReserveData1 = await this.lpContractProxy.getUserReserveData(_reserve,_user);  
        // 检查 利率模型
        expect(userReserveData1.borrowRateMode).to.be.bignumber.equal("2","rate default"); 
        await this.lpContractProxy.swapBorrowRateMode(_reserve,{from:_user})
        let userReserveData2 = await this.lpContractProxy.getUserReserveData(_reserve,_user);  
        expect(userReserveData2.borrowRateMode).to.be.bignumber.equal("1","1 variable rate"); 
    })

    it("DAI sender borrow stable rate", async () => {
        let _user = sender
        let _reserve = this.DAI.address; 

        let userAccountData1 = await this.lpContractProxy.getUserAccountData(sender);  
        // aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        let availableBorrowsETH = userAccountData1.availableBorrowsETH; 
        let _priceEth =await this.priceOracle.getAssetPrice(_reserve);  
        let borrowAmount = availableBorrowsETH.mul(ethDecimalBN).div(_priceEth).div(new BN(50));
  
        let userReserveData1 = await this.lpContractProxy.getUserReserveData(_reserve,_user); 
        expect(userReserveData1.borrowRateMode).to.be.bignumber.equal("1","1 stable rate"); 

        await this.lpContractProxy.borrow(_reserve, borrowAmount, 2, 0); 
        let userReserveData2 = await this.lpContractProxy.getUserReserveData(_reserve,_user);  
        expect(userReserveData2.borrowRateMode).to.be.bignumber.equal("2","2 variable rate"); 

        await this.lpContractProxy.borrow(_reserve, borrowAmount, 1, 0); 
        let userReserveData3 = await this.lpContractProxy.getUserReserveData(_reserve,_user);  
        expect(userReserveData3.borrowRateMode).to.be.bignumber.equal("1","2 stable rate");  

        await this.lpContractProxy.swapBorrowRateMode(_reserve,{from:_user})
        let userReserveData5 = await this.lpContractProxy.getUserReserveData(_reserve,_user);  
        expect(userReserveData5.borrowRateMode).to.be.bignumber.equal("2","3 variable rate"); 
  
    })

    it("DAI alice borrow stable rate", async () => {
        let _user = alice
        let _reserve = this.DAI.address; 

        let userAccountData1 = await this.lpContractProxy.getUserAccountData(sender);  
        // aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        let availableBorrowsETH = userAccountData1.availableBorrowsETH; 
        let _priceEth =await this.priceOracle.getAssetPrice(_reserve);  
        let borrowAmount = availableBorrowsETH.mul(ethDecimalBN).div(_priceEth).div(new BN(10));
  
        let userReserveData1 = await this.lpContractProxy.getUserReserveData(_reserve,_user); 
        expect(userReserveData1.borrowRateMode).to.be.bignumber.equal("0","0 alice variable rate"); 

        await this.lpContractProxy.borrow(_reserve, borrowAmount, 2, 0,{from: alice}); 
        await this.lpContractProxy.swapBorrowRateMode(_reserve,{from:_user})
        let userReserveData2 = await this.lpContractProxy.getUserReserveData(_reserve,_user);  
        expect(userReserveData2.borrowRateMode).to.be.bignumber.equal("1","1 variable rate"); 
 
        await this.lpContractProxy.borrow(_reserve, borrowAmount, 1, 0,{from: alice});  
    })

    it("USDC alice borrow stable rate", async () => {
        let _user = alice
        let _reserve = this.USDC.address; 

        let userAccountData1 = await this.lpContractProxy.getUserAccountData(sender);  
        // aaveMarket.userAccountData(sender,userAccountData,ethUSD)
        let availableBorrowsETH = userAccountData1.availableBorrowsETH; 
        let _priceEth =await this.priceOracle.getAssetPrice(_reserve);  
        let borrowAmount = availableBorrowsETH.mul(usdDecimalBN).div(_priceEth).div(new BN(20));
  
        let userReserveData1 = await this.lpContractProxy.getUserReserveData(_reserve,_user); 
        expect(userReserveData1.borrowRateMode).to.be.bignumber.equal("0","0 alice variable rate"); 

        await this.lpContractProxy.borrow(_reserve, borrowAmount, 2, 0,{from: alice}); 
        await this.lpContractProxy.swapBorrowRateMode(_reserve,{from:_user})
        let userReserveData2 = await this.lpContractProxy.getUserReserveData(_reserve,_user);  
        expect(userReserveData2.borrowRateMode).to.be.bignumber.equal("1","1 variable rate"); 
 
        await this.lpContractProxy.borrow(_reserve, borrowAmount, 1, 0,{from: alice});  
    })
 
    it.skip("depoist balanceOf bob",async ()=>{
        let _user = bob 

        const allowAmount = new BN("1000").mul(ethDecimalBN)
        let amount = allowAmount
        await this.DAI.approve(this.lpCoreAddr, allowAmount,{from:_user})
        let aTokenBal3=await this.aDAI.principalBalanceOf(_user);
        let tx=  await this.lpContractProxy.deposit(this.DAI.address, allowAmount, 0,{from:_user}) 
        await expectEvent(tx, 'Deposit', { _amount: amount });   
        await expectEvent.inTransaction(tx.tx, this.aDAI, "Transfer", {from:constants.ZERO_ADDRESS,to:_user,value:amount}) 
        let aTokenBal4 = await this.aDAI.principalBalanceOf(_user);  

        let tokenBal  = await this.aDAI.balanceOf(_user)

        expect(aTokenBal4).to.be.bignumber.eq(tokenBal,"bob Atoken principal = token balance"); 

        console.log(tokenBal.toString())

        let increase =  aTokenBal4.sub(aTokenBal3.add(allowAmount)) 
        await expectEvent.inTransaction(tx.tx, this.aDAI, "MintOnDeposit", {_from:_user,_value:allowAmount,_fromBalanceIncrease:increase})
 
        // return _balance
        //     .wadToRay()
        //     .rayMul(core.getReserveNormalizedIncome(underlyingAssetAddress))
        //     .rayDiv(userIndexes[_user])
        //     .rayToWad();

        // expect(aTokenBal4).to.be.bignumber.eq(aTokenBal3.add(allowAmount),"bob Atoken principal balance"); 
    }).timeout(500000);

    it.skip("depoist balanceOf alice",async ()=>{

        let _user = alice
        let totalSupply1 = await this.aDAI.totalSupply();

        const allowAmount = new BN("1000").mul(ethDecimalBN)
        await this.DAI.approve(this.lpCoreAddr, allowAmount,{from:_user})
        let aTokenBal3=await this.aDAI.principalBalanceOf(_user);
        await this.lpContractProxy.deposit(this.DAI.address, allowAmount, 0,{from:_user}) 
        let aTokenBal4=await this.aDAI.principalBalanceOf(_user);
        
        let totalSupply2 = await this.aDAI.totalSupply();
        console.log(totalSupply1.toString(),totalSupply2.sub(allowAmount).toString())

        expect(aTokenBal4).to.be.bignumber.eq (aTokenBal3.add(allowAmount),"alice Atoken principal balance"); 
    }).timeout(500000);

    it.skip("depoist balanceOf sender",async ()=>{
        let _user = sender
        const allowAmount = new BN("1000").mul(ethDecimalBN)
        await this.DAI.approve(this.lpCoreAddr, allowAmount,{from:_user})
        let aTokenBal3=await this.aDAI.principalBalanceOf(_user);
        await this.lpContractProxy.deposit(this.DAI.address, allowAmount, 0,{from:_user}) 
        let aTokenBal4=await this.aDAI.principalBalanceOf(_user); 
        expect(aTokenBal4).to.be.bignumber.eq (aTokenBal3.add(allowAmount),"sender Atoken principal balance"); 
    }).timeout(500000);
});


