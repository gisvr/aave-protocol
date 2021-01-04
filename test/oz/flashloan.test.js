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


describe("AAVE Flashloan ", function () {
    const [alice, bob, liquid] = accounts;
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

    it("alice,bob,sender depoist 1000 DAI, BAT, TUSD", async () => {
        this.timeout(50000)

        const allowAmount = web3.utils.toWei("1000", "ether")
        await this.DAI.approve(this.lpCoreAddr, allowAmount,{from:alice}) 
        await this.USDC.approve(this.lpCoreAddr, allowAmount)

        await this.lpContractProxy.deposit(this.DAI.address, allowAmount, 0,{from:alice}) 

        await this.lpContractProxy.deposit(this.USDC.address, new BN(1000).mul(usdDecimalBN), 0 )


    }).timeout(500000);

    it("Flashloan DAI 18", async () => {
        let _receiver = this.flashloanReceiver.address 
        const allowAmount = web3.utils.toWei("1", "ether")  
        await this.DAI.transfer(_receiver, allowAmount);

        let parm = web3.utils.hexToBytes('0x');
        let tokenDist =await this.lpAddressProvider.getTokenDistributor(); 
        let senderBalBefor=await this.DAI.balanceOf(_receiver);  
        let tokenDistributorBalBefor=await this.DAI.balanceOf(tokenDist);  

        let blockHigth =await web3.eth.getBlockNumber()
  
        let tx = await this.lpContractProxy.flashLoan(_receiver,this.DAI.address,allowAmount,parm); 

        await time.advanceBlockTo( new BN(blockHigth).add(new BN(10)));
        blockHigth =await web3.eth.getBlockNumber()
 
        let tokenDistributorBalAfter=await this.DAI.balanceOf(tokenDist);  
        let senderBalAfter=await this.DAI.balanceOf(_receiver);  
  
        let userFee = new BN(allowAmount).mul(new BN("35")).div(new BN("10000"))
        let senderBal = senderBalBefor.sub(senderBalAfter)
        expect(userFee).to.be.bignumber.eq(senderBal,"合约使用闪电贷款费用验证");

        let protocolFee =userFee.mul(new BN("30")).div(new BN("100")) 
        let tokenDistributorBal = tokenDistributorBalAfter.sub(tokenDistributorBalBefor); 
        expect(tokenDistributorBal).to.be.bignumber.eq(protocolFee,"协议费用");   // 

        let fee = userFee.sub(protocolFee)
       

    }).timeout(500000);
 
    it("Flashloan USDC 6", async () => {
        let reserve = this.USDC 
        let _receiver = this.flashloanReceiver.address 
        const allowAmount = usdDecimalBN
        await reserve.transfer(_receiver, allowAmount);

        let parm = web3.utils.hexToBytes('0x');
        let tokenDist =await this.lpAddressProvider.getTokenDistributor(); 
        let senderBalBefor=await reserve.balanceOf(_receiver);  
        let tokenDistributorBalBefor=await reserve.balanceOf(tokenDist);  

        let blockHigth =await web3.eth.getBlockNumber()
  
        let tx = await this.lpContractProxy.flashLoan(_receiver,reserve.address,allowAmount,parm); 

        await time.advanceBlockTo( new BN(blockHigth).add(new BN(10)));
        blockHigth =await web3.eth.getBlockNumber()
 
        let tokenDistributorBalAfter=await reserve.balanceOf(tokenDist);  
        let senderBalAfter=await reserve.balanceOf(_receiver);  
  
        let userFee = new BN(allowAmount).mul(new BN("35")).div(new BN("10000"))
        let senderBal = senderBalBefor.sub(senderBalAfter)
        expect(userFee).to.be.bignumber.eq(senderBal,"合约使用闪电贷款费用验证");

        let protocolFee =userFee.mul(new BN("30")).div(new BN("100")) 
        let tokenDistributorBal = tokenDistributorBalAfter.sub(tokenDistributorBalBefor); 
        expect(tokenDistributorBal).to.be.bignumber.eq(protocolFee,"协议费用");   // 

        let fee = userFee.sub(protocolFee)
       

    }).timeout(500000);
});


