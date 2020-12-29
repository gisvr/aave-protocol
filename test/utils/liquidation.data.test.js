// let tokenTable = require("../../utils/readCsv")
 

// let liquidationData = require("../../config/liquidation.json");

const axios = require('axios');

axios.get('https://protocol-api.aave.com/liquidations?get=proto')
  .then(function (res) {
    // console.log(res)
    let liquidationData = res.data
    let foo = liquidationData.data.filter(val=>val.reserve.decimals==18
        && Number(val.currentBorrowsUSD) > 100
        && val.reserve.symbol =="ETH")
    // foo.map(val=>{ 
    //     console.dir(val) 
    // })

    console.dir(foo[0]) 

    foo[0].user.reservesData.map(val=>{
        console.log(val.reserve.symbol,val.reserve.decimals,
            val.reserve.usageAsCollateralEnabled,
            val.reserve.reserveLiquidationBonus);
        if(val.reserve.decimals != "18"){
            console.dir(val)
        }
    })
  })
  .catch(function (error) {
    console.log(error);
  })
  .then(function () {
    // always executed
  });  
 
// let foo = liquidationData.data.filter(val=>val.reserve.decimals==18
//     && Number(val.currentBorrowsUSD) > 500
//     && val.reserve.symbol =="ETH"
//     && val.reserve.symbol!="LEND"
//     // && val.reserve.symbol!="DAI"
//     && val.reserve.symbol!="BAT"
//     && val.reserve.symbol!="KNC" )

// //WBTC,USDT,USDC
// foo.map(val=>{
//     // if(val.reserve.decimals != "18"){
//         console.dir(val)
//     // }
   
// })

// foo[0].user.reservesData.map(val=>{
//      if(val.reserve.decimals != "18"){
//         console.dir(val)
//     }
// })

// USDT UserReserveData---------------
//     (0.0000)Decimal当前资产余额USDT currentATokenBalance 0
// (0.6281)Decimal当前借出余额USDT currentBorrowBalance 628151
// (0.6005)Decimal本金USDT principalBorrowBalance 600574
// (2)借出利率模型(1:固定, 2:浮动)USDT borrowRateMode 2
// (7.29%)Ray借出利率 borrowRate 72988819778503414243985044
// (6.20%)Ray年化利率 liquidityRate 62048370722516280889381402
// (0.0015)Decimal融资费用USDT originationFee 1501
// (101.84%)Ray浮动借出指数 variableBorrowIndex 1018417195795153583507565065
// (2020-03-12 13:43:59)最新更新时间USDT lastUpdateTimestamp 1583991839
// (false)用做抵押USDT usageAsCollateralEnabled false
// UserAccountData---------------- 0x752f6b0bc8e3ad5be605d356c03f6f42f41574fb
// (0.007698)ETH/4.619(USD)总共流动的ETH totalLiquidityETH 7697558662281975
// (0.007698)ETH/4.619(USD)总计抵押 totalCollateralETH 7697558662281975
// (0.013220)ETH/7.932(USD)总计借 totalBorrowsETH 13219597404405910
// (0.000005)ETH/0.003(USD)Fee totalFeesETH 5061543021905
// (0.000000)ETH/0(USD)可借的额度 availableBorrowsETH 0
// (80)Decimal当前 清算阀值 currentLiquidationThreshold 80
// (75)DecimalLTV ltv 75
// (0.465649)ETH/279.389(USD)健康系数