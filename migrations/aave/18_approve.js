const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPool = artifacts.require("LendingPool");
const LendingPoolCore = artifacts.require("LendingPoolCore");
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
const AToken = artifacts.require("AToken");

let BN=web3.utils.BN

let depoistToken =  async (erc20Token,lpContract,account,mintTotal)=>{ 
    let depositAmount = mintTotal.div(new BN(100));
    await lpContract.deposit(erc20Token.address, depositAmount, 0, {from:account}) 
}

let borrowToken = async (erc20Token,lpContract,account,mintTotal)=>{ 
    let borrowAmount = mintTotal.div(new BN(200));
     await lpContract.borrow(erc20Token.address, borrowAmount, 2, 0, {from:account})
}

let repayToken = async (erc20Token,lpContract,account,mintTotal)=>{ 
    let amount = mintTotal.div(new BN(400)); 
    // function repay( address _reserve, uint256 _amount, address payable _onBehalfOf)
     await lpContract.repay(erc20Token.address, amount, account, {from:account})
}

let redeemToken = async (erc20Token,lpContract,account,mintTotal)=>{  
    let amount = mintTotal.div(new BN(400));
    let reserveData = await lpContract.getReserveData(erc20Token.address) 
    let aDAI =await AToken.at(reserveData.aTokenAddress)
    await aDAI.redeem(amount,{from:account});
}
 

let depoistEth =  async (lpContract,depositAmount,account)=>{  
    let reserveAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    await lpContract.deposit(reserveAddr, depositAmount, 0, {from:account,value:depositAmount}) 
}

let borrowEth =  async (lpContract,borrowAmount,account)=>{  
    let reserveAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    await lpContract.borrow(reserveAddr, borrowAmount, 2,0, {from:account}) 
}



module.exports = async (deployer, network, accounts) => {  
    let ethDecimalBN = (new BN(10)).pow(new BN(18));
    let [backend,alice, bob, liquid] = accounts; 
    let sender =  deployer.networks[network].from;
    let lpProviderContract = await LendingPoolAddressProvider.deployed()
    let lpAddr = await lpProviderContract.getLendingPool() 
    let lpCoreAddr = await lpProviderContract.getLendingPoolCore()
    let lpContract = await LendingPool.at(lpAddr)
    let lpCoreContract = await LendingPoolCore.at(lpCoreAddr);

    let depositAmount =  new BN(10).mul(ethDecimalBN);
    await depoistEth(lpContract,depositAmount,bob)
   

    let mockToken = [TokenWBTC, TokenDAI,TokenBAT, TokenUSDT,TokenUSDC]
    for (let token of mockToken) {
        let erc20Token  = await token.deployed()  
        let symbol = await erc20Token.symbol();
        let reserveAddr = erc20Token.address;
        let decimals = await erc20Token.decimals();
        let reserveDecimals = (new BN(10)).pow(decimals);

        let mintTotal = await erc20Token.balanceOf(sender);
        await erc20Token.approve(lpCoreAddr,mintTotal, {from: sender}); 
        await erc20Token.approve(lpCoreAddr,mintTotal, {from: alice}); 
        await depoistToken(erc20Token, lpContract,sender,mintTotal);
        // borrwo need collateral balance
        await depoistToken(erc20Token, lpContract,alice,mintTotal);
        await borrowToken(erc20Token, lpContract,alice,mintTotal);

        let userReserve = await lpContract.getUserReserveData(reserveAddr, alice)
        console.log("%s alice userReserve.currentATokenBalance %s",symbol, userReserve.currentATokenBalance.div(reserveDecimals).toString())
 
        let reserveData = await lpContract.getReserveData(reserveAddr)

        console.log("%s alice getReserveData  Decimals(%s) totalLiquidity %s availableLiquidity %s totalBorrowsStable %s totalBorrowsVariable %s ", 
        symbol,
        decimals.toString(),
        reserveData.totalLiquidity.div(reserveDecimals).toString(), 
        reserveData.availableLiquidity.div(reserveDecimals).toString(), 
        reserveData.totalBorrowsStable.div(reserveDecimals).toString(), 
        reserveData.totalBorrowsVariable.div(reserveDecimals).toString())

       
  
        await redeemToken(erc20Token,lpContract,alice,mintTotal)

        await repayToken(erc20Token,lpContract,alice,mintTotal)

        let reserveConfigData = await lpContract.getReserveConfigurationData(reserveAddr)

        console.log("%s alice getReserveData  Decimals(%s) ltv %s liquidationThreshold %s liquidationBonus %s borrowingEnabled %s  \n", 
        symbol,
        decimals.toString(),
        reserveConfigData.ltv.toString(), 
        reserveConfigData.liquidationThreshold.toString(), 
        reserveConfigData.liquidationBonus.toString(), 
        reserveConfigData.borrowingEnabled.toString())
    } 

    let accountData = await lpContract.getUserAccountData(alice)
    console.log("alice getUserAccountData totalLiquidityETH %s totalCollateralETH %s totalBorrowsETH %s availableBorrowsETH %s", 
    accountData.totalLiquidityETH.div(ethDecimalBN).toString(), 
    accountData.totalCollateralETH.div(ethDecimalBN).toString(), 
    accountData.totalBorrowsETH.div(ethDecimalBN).toString(), 
    accountData.availableBorrowsETH.div(ethDecimalBN).toString())

    let availableBorrowsETH = accountData.availableBorrowsETH

    await borrowEth(lpContract,availableBorrowsETH.div(new BN(100)),alice)

    
};


