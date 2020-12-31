 
const {expect} = require("chai");
const AaveMarket = require("../../utils/aave");
let nodeProvider = require("../../utils/infura.provider");
let web3 = nodeProvider.getWeb3();
let aaveMarket = new  AaveMarket(web3);
const axios = require('axios');



let liquidData = async ()=>{
  let res =await  axios.get('https://protocol-api.aave.com/liquidations?get=proto')
  let liquidationData = res.data
//   let foo = liquidationData.data.filter(val=>val.reserve.decimals==18
//       && Number(val.currentBorrowsUSD) > 10
//       && val.reserve.symbol =="DAI") 

 let foo = liquidationData.data

  let maxReserve = foo[0];
  foo.map(val=>{
      if(Number(val.currentBorrowsUSD)>Number(maxReserve.currentBorrowsUSD) &&  val.reserve.decimals==18){
        maxReserve = val;
      } 
  })
 
  console.dir(maxReserve) 

  console.log(foo.length,maxReserve.currentBorrowsUSD)

  maxReserve.user.reservesData.map(val=>{
      console.log(val.reserve.symbol,val.reserve.decimals,
          val.reserve.usageAsCollateralEnabled,
          val.reserve.reserveLiquidationBonus);
    //   if(val.reserve.decimals != "18"){
          console.dir(val)
    //   }
  })
  return maxReserve;
}


let users=[],BN=web3.utils.BN
 
describe("Aave Liquidation", function () { 
    before(async () => { 
        let provider = await nodeProvider.getAave("LendingPoolAddressesProvider","AAVE"); 
        let lpAddr = await provider.getLendingPool()
        // console.log(lpAddr)
        // let lpAddr = "0x398eC7346DcD622eDc5ae82352F02bE94C62d119"
        this.lpContractProxy = await nodeProvider.getAave("LendingPool", lpAddr);
        // console.log(this.lpContract.address)
    });

    it('Borrow ETH', async () => {
        this.timeout(500000);
        // let _liquidData =await liquidData();
        // let _user = _liquidData.user.id;
        // let _reserve = _liquidData.reserve.underlyingAsset;
        // let _rDecimals = _liquidData.reserve.decimals
        // let _rSymbol = _liquidData.reserve.decimals 
        // let colls = _liquidData.user.reservesData.filter(val=>val.usageAsCollateralEnabledOnUser && val.reserve.usageAsCollateralEnabled);
        
        // let _collateral = colls[0].reserve.underlyingAsset
        // let _decimals = colls[0].reserve.decimals
        // let _symbol = colls[0].reserve.decimals 

        console.log("_reserve--------")

        let _reserve  = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        let _rDecimals = 18
        let _rSymbol ="ETH"

        let _collateral  = "0xa0E54Ab6AA5f0bf1D62EC3526436F3c05b3348A0";
        let _decimals = 18
        let _symbol = "WBTC"

        let _user = "0x9F7A946d935c8Efc7A8329C0d894A69bA241345A"

       let storage = await web3.eth.getStorageAt("0x3589d05a1ec4Af9f65b0E5554e645707775Ee43C", 1) ;

       console.log(storage);
       let foo = web3.utils.hexToAscii(storage)

       
       console.log(foo)

       return;
          

        let userReserveData = await this.lpContractProxy.getUserReserveData(_reserve,_user);
        // aaveMarket.userReserveData(_rSymbol,userReserveData,_rDecimals)

        let userCollateralData = await this.lpContractProxy.getUserReserveData(_collateral,_user);
        let userAccountData = await this.lpContractProxy.getUserAccountData(_user);
        console.log("_collateral--------")
        // aaveMarket.userReserveData(_symbol,userCollateralData,_decimals)

        // aaveMarket.userAccountData(_user,userAccountData,"600")

        // console.log("Borrow--------")
        // let tx =   await this.lpContractProxy.borrow(_reserve, "22160161", 2, 0,{from:_user}); 

        // console.log(tx.tx);

        // userAccountData = await this.lpContractProxy.getUserAccountData(_user);
        // aaveMarket.userAccountData(_user,userAccountData,"600")
  
    }).timeout(50000);

    it.skip('Liquidation  repay ETH', async () => {
        let liquid = "0x2E9D15d024187477F85Ac7cD7154aD8556EDb8E2"

        let _reserve  = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        let _user = "0x9F7A946d935c8Efc7A8329C0d894A69bA241345A"
        let _purchaseAmount = "22160161"

        let _collateral  = "0xa0E54Ab6AA5f0bf1D62EC3526436F3c05b3348A0";
        let _decimals = 18
        let _symbol = "WBTC"


        let userAccountData = await this.lpContractProxy.getUserAccountData(_user)  
        let healthFactor =  userAccountData.healthFactor.toString()
        console.log("healthFactor:", healthFactor,userAccountData.healthFactor.toString())


        // expect(healthFactor).to.be.eq(0,"3健康度大于1");   
        let tx =  await this.lpContractProxy.liquidationCall(
            _collateral, //_collateral
            _reserve, //_reserve
            _user, //user
            _purchaseAmount, // 
            true,
            {from:liquid}
        ); 

        console.log(tx.tx);
 

    }).timeout(50000);

})
