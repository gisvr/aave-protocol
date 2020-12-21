let tokenTable = require("../../utils/readCsv")



let tokenConfPath = "../../config/token-config.csv"
let res = tokenTable(tokenConfPath)
let baseVariableBorrowRate = res[0].variableRateSlope1
console.log(baseVariableBorrowRate)

let str=baseVariableBorrowRate.replace("%","");
// str= str/100;
 console.log(str)

let rayDecimals =27
let mether = 25
// function rateToFixedpoint(rate) {
//     return (rate * (10 ** RateDecimals)).toString();
// }
// console.log(rateToFixedpoint(10))