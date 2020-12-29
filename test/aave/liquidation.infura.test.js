 
const {expect} = require("chai");
const AaveMarket = require("../../utils/aave");
let nodeProvider = require("../../utils/infura.provider");
let web3 = nodeProvider.getWeb3();
let aaveMarket = new  AaveMarket(web3);
const axios = require('axios');

let liquidData = async ()=>{
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


let users=[],BN=web3.utils.BN
 
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

    it('Liquidation', async () => {
        this.timeout(500000);
        let _liquidData =await liquidData();
        let _user = _liquidData.user.id;
        let _reserve = _liquidData.reserve.underlyingAsset;
        let _rDecimals = _liquidData.reserve.decimals
        let _rSymbol = _liquidData.reserve.decimals 
        let colls = _liquidData.user.reservesData.filter(val=>val.usageAsCollateralEnabledOnUser && val.reserve.usageAsCollateralEnabled);
        
        let _collateral = colls[0].reserve.underlyingAsset
        let _decimals = colls[0].reserve.decimals
        let _symbol = colls[0].reserve.decimals 

        console.log("_reserve--------")
        let userReserveData = await this.lpContractProxy.getUserReserveData(_reserve,_user);
        aaveMarket.userReserveData(_rSymbol,userReserveData,_rDecimals)

        let userCollateralData = await this.lpContractProxy.getUserReserveData(_collateral,_user);
        let userAccountData = await this.lpContractProxy.getUserAccountData(_user);
        console.log("_collateral--------")
        aaveMarket.userReserveData(_symbol,userCollateralData,_decimals)

        aaveMarket.userAccountData(_user,userAccountData,"600")

    }).timeout(50000);

})
