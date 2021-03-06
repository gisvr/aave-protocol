 
const {expect} = require("chai");
const AaveMarket = require("../../utils/aave");
let nodeProvider = require("../../utils/infura.provider");
let web3 = nodeProvider.getWeb3();
let aaveMarket = new  AaveMarket(web3);
const axios = require('axios');
 
let liquidData_bak = async ()=>{
  let res =await  axios.get('https://protocol-api.aave.com/liquidations?get=proto')
  let liquidationData = res.data
  let foo = liquidationData.data.filter(val=>val.reserve.decimals==18
      && Number(val.currentBorrowsUSD) > 100
      && val.reserve.symbol =="ETH") 

 
  console.dir(foo[0]) 

  foo[0].user.reservesData.map(val=>{
      console.log(val.reserve.symbol,val.reserve.decimals,
          val.reserve.usageAsCollateralEnabled,
          val.reserve.reserveLiquidationBonus);
    //   if(val.reserve.decimals != "18"){
          console.dir(val)
    //   }
  })
  return foo[0];
}

let liquidData = async ()=>{
    let res =await  axios.get('https://protocol-api.aave.com/liquidations?get=proto')
    let foo = res.data.data 
    let maxReserve = foo[0];
    foo.map(val=>{
        if(Number(val.currentBorrowsUSD)>Number(maxReserve.currentBorrowsUSD) 
        &&  val.reserve.decimals==18 && val.reserve.symbol == "DAI"){

          let _ll = val.user.reservesData.filter(res=>res.reserve.decimals == 18)
          if(_ll.length>0){
            maxReserve = val;
          } 
        } 
    })

    // console.dir(maxReserve)  
    console.log("maxReserve, %d 清算数量, %s  USD借出资产 %s",foo.length,maxReserve.currentBorrowsUSD,maxReserve.reserve.symbol)
  
    let collateralIndex =0 
    maxReserve.user.reservesData.map((val,index)=>{
        if(val.currentUnderlyingBalanceUSD == "0") return
        console.log("symbol %s, %d 位 %s USD 抵押余额 %s 是否抵押物，%s 奖励",
            val.reserve.symbol,val.reserve.decimals,
            val.currentUnderlyingBalanceUSD,
            val.reserve.usageAsCollateralEnabled, 
            val.reserve.reserveLiquidationBonus);
         if(val.reserve.decimals == 18){
            console.dir(val)
            collateralIndex = index
         }
    })
    return {maxReserve,collateralIndex};
  }


let BN=web3.utils.BN
 
describe("Aave Liquidation", function () {
    let alice, bob, liquid;
    before(async () => { 
        // let provider = await nodeProvider.getAave("LendingPoolAddressesProvider","AAVE"); 
        // let lpAddr = await provider.getLendingPool()
        // console.log(lpAddr)
        let lpAddr = "0x398eC7346DcD622eDc5ae82352F02bE94C62d119"
        this.lpContractProxy = await nodeProvider.getAave("LendingPool", lpAddr);
        // console.log(this.lpContract.address)
    });

    it('Liquidation Info', async () => {
        this.timeout(500000);
        let {maxReserve,collateralIndex} =await liquidData();
        let _liquidData = maxReserve
        let _user = _liquidData.user.id;
        this.user = _user
        
        let _reserve = _liquidData.reserve.underlyingAsset;
        let _rDecimals = _liquidData.reserve.decimals
        let _rSymbol = _liquidData.reserve.symbol 
        this.reserve = _reserve
        this.reserveSymbol = _rSymbol
 
        let colls = _liquidData.user.reservesData[collateralIndex];
        
        let _collateral = colls.reserve.underlyingAsset
        let _decimals = colls.reserve.decimals
        let _symbol = colls.reserve.symbol 

        this.collateral = _collateral
        this.collateralSymbol = _symbol

        console.log("_reserve--------")
        let userReserveData = await this.lpContractProxy.getUserReserveData(_reserve,_user);
        aaveMarket.userReserveData(_rSymbol,userReserveData,_rDecimals)

        //userReserveData.currentBorrowBalance.add(
        this.purchaseAmount  = new BN(1e18.toString())


        let userCollateralData = await this.lpContractProxy.getUserReserveData(_collateral,_user);
        let userAccountData = await this.lpContractProxy.getUserAccountData(_user);
        console.log("_collateral--------")
        aaveMarket.userReserveData(_symbol,userCollateralData,_decimals) 
        aaveMarket.userAccountData(_user,userAccountData,"600")


        this.healthFactor = userAccountData.healthFactor.div(new BN(1e18.toString()))

    }).timeout(50000);

    it('Liquidation  repay DAI', async () => {
        let liquid = "0xeA199722372dea9DF458dbb56be7721af117a9Bc"   
        console.log("collateral",this.collateral, this.collateralSymbol )
        console.log("reserve",this.reserve,this.reserveSymbol )
        console.log("user",this.user)
        console.log("purchaseAmount",this.purchaseAmount.toString() )
        console.log("liquid",liquid)

        console.log("healthFactor", this.healthFactor.toNumber())

        let _collateral = this.collateral
        let _reserve = this.reserve
        let _user = this.user
        let _purchaseAmount = this.purchaseAmount  

        let _healthFactor = this.healthFactor.toNumber()

        if(_healthFactor == 0 ){
            expect(_healthFactor).to.be.eq(0,"健康度大于1"); 
            // let tx =  await this.lpContractProxy.liquidationCall(
            //     _collateral, //_collateral
            //     _reserve, //_reserve
            //     _user, //user
            //     _purchaseAmount, // 
            //     false,
            //     {from:liquid}
            // ); 
            //  console.log(tx.tx);
 
        } 

    }).timeout(50000);

})
