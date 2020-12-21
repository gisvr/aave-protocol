let fs = require("fs");
let path = require("path")
const BN = require('bignumber.js');
const Conf = require("../config")

// 策略配置信息
let strategyParams = [
    {
        "internalType": "address",
        "name": "_reserve",
        "type": "address",
        "desc": "策略对应的资产地址, 策略需要资产信息 e.g 小数位",
        "val": "0xcA88187EA00A45184fC15072Bb62769A81A64344"
    },
    {
        "internalType": "contract LendingPoolAddressesProvider",
        "name": "_provider",
        "type": "address",
        "desc": "借贷池的地址, 在合约里面需要池的一些设定信息",
        "val": "0x5A81dAC577Ed3cF4aE10474b724aAC07b5Ea7F50"
    },
    {
        "internalType": "uint256",
        "name": "_baseVariableBorrowRate",
        "type": "uint256",
        "condition": "//base variable borrow rate when Utilization rate = 0. Expressed in ray",
        "desc": "基本的浮动借利率",
        "val": "10000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_variableRateSlope1",
        "type": "uint256",
        "condition": "//slope of the variable interest curve when utilization rate > 0 and <= OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "浮动利率1段斜率",
        "val": "70000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_variableRateSlope2",
        "type": "uint256",
        "condition": "slope of the variable interest curve when utilization rate > OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "浮动利率2段斜率",
        "val": "1500000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_stableRateSlope1",
        "type": "uint256",
        "condition": "slope of the stable interest curve when utilization rate > 0 and <= OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "固定利率1段斜率",
        "val": "60000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_stableRateSlope2",
        "type": "uint256",
        "condition": "slope of the stable interest curve when utilization rate > OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "固定利率2段斜率",
        "val": "1500000000000000000000000000"
    }
]

let rayDecimals = 27 // 位
let mether = 1e25 // 位
let percentToRay = (ratePercent) => {
    let rateStr = ratePercent.replace("%", "");
    let ray = new BN(rateStr).multipliedBy(mether)
    return ray.toFixed()
}


let convertToMap = (data) => {
    let table = new Array();
    let rows = data.split("\r\n");
    let header = rows[0].split(",")
    for (let i = 1; i < rows.length - 1; i++) {
        let info = rows[i].split(",")
        let _obj = {}
        header.map((val, index) => {
            _obj[val] = info[index]
        })
        table.push(_obj);
    }
    return table;
}

let confPath = path.join(__dirname, "../config/token-config.csv")
// console.log(confPath)
let data = fs.readFileSync(confPath)


module.exports = {
    percentToRay,
    toDecimalBN(num, decimal) {
        let _decimal = new BN(10).pow(String(decimal))
        // console.log(_decimal.toFixed(),_decimal.toFixed().length)
        return new BN(num).div(_decimal)
    },
    toBN(num, decimal) {
        let _decimal = new BN(10).pow(String(decimal))
        // console.log(_decimal.toFixed(),_decimal.toFixed().length)
        return new BN(num).multipliedBy(_decimal)
    },
    getStrategyParams(tokenSymbol, tokenAddr, lpProviderAddr) {
        let tokenTable = convertToMap(data.toString())
        let tokenRateStrategy = tokenTable.find(val => val.Symbol == tokenSymbol);
        if (!tokenRateStrategy) return ""

        strategyParams.find(val => val.name == "_reserve").val = tokenAddr
        strategyParams.find(val => val.name == "_provider").val = lpProviderAddr
        // strategy
        strategyParams.find(val => val.name == "_baseVariableBorrowRate").val = percentToRay(tokenRateStrategy.baseVariableBorrowRate)//Base Variable Borrow Rate
        strategyParams.find(val => val.name == "_variableRateSlope1").val = percentToRay(tokenRateStrategy.variableRateSlope1) //Slope 1 Variable Rate
        strategyParams.find(val => val.name == "_variableRateSlope2").val = percentToRay(tokenRateStrategy.variableRateSlope2)//Slope 2 Variable Rate
        strategyParams.find(val => val.name == "_stableRateSlope1").val = percentToRay(tokenRateStrategy.stableRateSlope1) // Slope 1 Stable Rate
        strategyParams.find(val => val.name == "_stableRateSlope2").val = percentToRay(tokenRateStrategy.stableRateSlope2) //Slope 2 Stable Rate
        return strategyParams.map(value => value.val)
    },

    getStrategyParamsByConfig(network, contract, tokenSymbol, lpProvideAddr) {
        let conf = Conf[network][contract]
        let reserveConf = conf.tokenList.find(val => val.symbol == tokenSymbol)
        let strategy = reserveConf && reserveConf.strategy

        return strategy ? [
            reserveConf.address,
            lpProvideAddr || conf.lpProvideAddr,
            percentToRay(strategy.baseVariableBorrowRate),
            percentToRay(strategy.variableRateSlope1),
            percentToRay(strategy.variableRateSlope2),
            percentToRay(strategy.stableRateSlope1),
            percentToRay(strategy.stableRateSlope2)
        ] : undefined

    }
}
