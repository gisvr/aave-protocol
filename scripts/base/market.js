const Conf = require("../../config")

const BN = require('bignumber.js');

let mether = 1e25 // 位

module.exports = class Market {

    constructor(web3) {
        this.web3 = web3
        this.BN = BN
        this.ethDecimal = 18
        this.ethAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        this.ethDecimalBN = BN(10).pow(18)
    }

    toTime(time = +new Date()) {
        let date = new Date(time + 8 * 3600 * 1000)
        return date.toJSON().substr(0, 19).replace("T", " ")
    }

    toDecimalBN(num, decimal) {
        let _decimal = new BN(10).pow(String(decimal))
        // console.log(_decimal.toFixed(),_decimal.toFixed().length)
        return new BN(num).div(_decimal)
    }

    toDecimal(num, decimal) {
        let _decimal = new BN(10).pow(String(decimal))
        // console.log(_decimal.toFixed(),_decimal.toFixed().length)
        let ray = new BN(num).div(_decimal)
        return ray.toFixed(4, 1)
    }

    percentToRay(ratePercent) {
        let rateStr = ratePercent.replace("%", "");
        let ray = new BN(rateStr).multipliedBy(mether)
        return ray.toFixed()
    }

    rayToPercent(rayStr) {
        let rateStr = this.toDecimal(rayStr, 25)
        return BN(rateStr).toFixed(2, 1) + "%"
    }


    async deployStrategy(tokenSymbol, strategyParams) {
        console.log(tokenSymbol, "strategyParams", strategyParams)
        let from = this.web3.eth.defaultAccount
        let tokenContract = new this.web3.eth.Contract(Conf.abi.strategy.abi)
        let strategyAddr = ""
        await tokenContract.deploy({
            data: Conf.abi.strategy.bytecode,
            arguments: strategyParams
        }).send({
            from: from,
            gas: Conf.deploy.gas, // gas limit
            gasPrice: Conf.deploy.gasPrice, //10 Wei
        }).then(async function (contactInstance) {
            console.log(tokenSymbol, "Strategy deployed successfully.")
            strategyAddr = contactInstance.options.address
            // console.log(tokenSymbol, "strategyAddr", strategyAddr)
            let _reserve = await contactInstance.methods.reserve().call()
            console.log(tokenSymbol, "strategyAddr reserve", _reserve)
        }).catch(err => {
            console.log("Error: failed to deploy, detail:", err)
            throw err
        })
        return strategyAddr
    }

    async getStrategy(strategyAddr, tokenSymbol) {
        console.log(tokenSymbol, "Strategy Config Data---------------", strategyAddr)
        let strategy = new this.web3.eth.Contract(Conf.abi.strategy.abi, strategyAddr);

        console.log("strategy", "ok")
        let reserveAddr = await strategy.methods.reserve().call()
        console.log("reserveAddr ", reserveAddr)

        let addressesProvider = await strategy.methods.addressesProvider().call()
        console.log("addressesProvider", addressesProvider)

        let OPTIMAL_UTILIZATION_RATE = await strategy.methods.OPTIMAL_UTILIZATION_RATE().call()
        console.log("OPTIMAL_UTILIZATION_RATE", this.rayToPercent(OPTIMAL_UTILIZATION_RATE), OPTIMAL_UTILIZATION_RATE)

        let baseVariableBorrowRate = await strategy.methods.getBaseVariableBorrowRate().call()
        console.log("baseVariableBorrowRate", this.rayToPercent(baseVariableBorrowRate), baseVariableBorrowRate)
        let stableRateSlope1 = await strategy.methods.getStableRateSlope1().call()
        console.log("stableRateSlope1", this.rayToPercent(stableRateSlope1), stableRateSlope1)
        let stableRateSlope2 = await strategy.methods.getStableRateSlope2().call()
        console.log("stableRateSlope2", this.rayToPercent(stableRateSlope2), stableRateSlope2)

        let variableRateSlope1 = await strategy.methods.getVariableRateSlope1().call()
        console.log("variableRateSlope1", this.rayToPercent(variableRateSlope1), variableRateSlope1)
        let variableRateSlope2 = await strategy.methods.getVariableRateSlope2().call()
        console.log("variableRateSlope2", this.rayToPercent(variableRateSlope2), variableRateSlope2)
    }

    async deployAtoken(tokenSymbol, params) {
        // let params = []
        // params[0] = provider.address  // provider 地址 // 地址不能反
        // params[1] = daiToken.address // 资产地址
        // params[2] = (await daiToken.decimals.call()).toString()
        // params[3] = "DAIName"
        // params[4] = "aDAI"
        let from = this.web3.eth.defaultAccount
        let tokenContract = new this.web3.eth.Contract(Conf.abi.aToken.abi)
        let aTokenAddr = ""
        await tokenContract.deploy({
            data: Conf.abi.aToken.bytecode,
            arguments: params
        }).send({
            from: from,
            gas: Conf.deploy.gas, // gas limit
            gasPrice: Conf.deploy.gasPrice, //10 Wei
        }).then(async function (contactInstance) {
            console.log(tokenSymbol, "AToken deployed successfully.")
            aTokenAddr = contactInstance.options.address
            let _reserve = await contactInstance.methods.name().call()
            console.log(tokenSymbol, "AToken name", _reserve)
        }).catch(err => {
            console.log("Error: failed to deploy, detail:", err)
            throw err
        })
        return aTokenAddr
    }

    async getATokenInfo(aTokenAddr) {
        if (aTokenAddr.toLowerCase() == this.ethAddr.toLowerCase()) {
            return {tokenSymbol: "ETH", tokenDecimals: this.ethDecimal}
        }
        let aToken = new this.web3.eth.Contract(Conf.abi.aToken.abi, aTokenAddr)
        let tokenSymbol = await aToken.methods.symbol().call()
        let tokenName = await aToken.methods.name().call()
        let tokenDecimals = await aToken.methods.decimals().call()
        // console.log(tokenSymbol, "token info---------------", aTokenAddr)
        // console.log("tokenName", tokenName)
        // console.log("tokenSymbol", tokenSymbol)
        // console.log("tokenDecimals", tokenDecimals)

        return {tokenSymbol, tokenDecimals}
    }

    reserveConfData(reserveConfData, tokenSymbol) {
        console.log(tokenSymbol, "Reserve Config Data---------------")
        for (let key in reserveConfData) {
            if (key.length < 3) continue
            let val = reserveConfData[key].toString()
            let percent = ""
            let confKeys = {
                "isActive": "是否开放",
                "ltv": "最大LTV(特定抵押的最大借贷能力）",
                "liquidationThreshold": "清算门槛",
                "liquidationBonus": "清算罚款",
                "interestRateStrategyAddress": "利率策略地址",
                "usageAsCollateralEnabled": "用作抵押品 是否启用",
                "borrowingEnabled": "借款 是否启用",
                "stableBorrowRateEnabled": "固定利率借款 是否启用"
            }
            if (confKeys[key]) {
                percent = "(" + val + ")" + confKeys[key]
            }
            console.log(percent, key, val)
        }

        return reserveConfData.interestRateStrategyAddress
    }

    reserveData(reserveData, reserveDecimals, tokenSymbol) {
        console.log(tokenSymbol, "Reserve Data---------------")
        for (let key in reserveData) {
            if (key.length < 3) continue
            let val = reserveData[key].toString()
            // console.log(key,val)
            let percent = ""
            let rayKeys = {
                "liquidityRate": "存款年化(deposit_apy)",
                "variableBorrowRate": "浮动利率-借贷年化(borrow_apr_variable)",
                "stableBorrowRate": "固定利率-借贷年化(borrow_apr_stable)",
                "utilizationRate": "资金利用率(utilisation_rate)",
                "averageStableBorrowRate": "平均固定利率--",
                "liquidityIndex": "流动性指数--",
                "variableBorrowIndex": "浮动利率指数--"
            }
            if (rayKeys[key]) {
                percent = this.rayToPercent(val)
                percent = " (" + percent + ")Ray" + rayKeys[key]
            }

            let decimalKeys = {
                "totalLiquidity": "市场规模(total_liquidity)",
                "totalBorrowsStable": "总借入额-固定利率(total_borrowed_stable)",
                "totalBorrowsVariable": "总借入额-浮动利率(total_borrowed_variable)",
                "availableLiquidity": "可用流动资金(available_liquidity)"
            }
            if (decimalKeys[key]) {
                percent = this.toDecimal(val, reserveDecimals)

                percent = " (" + percent + ")Decimal" + decimalKeys[key]
            }

            let dateKeys = {
                "lastUpdateTimestamp": "最新更新时间" + tokenSymbol,
            }
            if (dateKeys[key]) {

                let date = 0
                if (val) {
                    date = this.toTime(val * 1000)
                }
                percent = " (" + date + ")" + dateKeys[key]
            }

            console.log(percent, key, val)
        }

        return reserveData.aTokenAddress
    }

    formatReserveData(reserveData, reserveDecimals, tokenSymbol, priceUsd) {

        let marketInfo = {"资产": tokenSymbol}
        reserveData.totalBorrows = reserveData.totalBorrowsStable.add(reserveData.totalBorrowsVariable)
        let totalBorrows = BN(reserveData.totalBorrows)
        reserveData.stableBorrowsRate = BN(reserveData.totalBorrowsStable).div(totalBorrows).toFixed(4) // 固定利率占比
        reserveData.variableBorrowsRate = BN(reserveData.totalBorrowsVariable).div(totalBorrows).toFixed(4)  // 浮动利率占比
        for (let key in reserveData) {
            if (key.length < 3) continue
            let val = reserveData[key].toString()
            // console.log(key,val)

            let rayKeys = {
                "liquidityRate": "存款年化", //list
                "variableBorrowRate": "浮动利率/借贷年化",//list
                "stableBorrowRate": "固定利率/借贷年化",//list
                "utilizationRate": "资金利用率",
                "averageStableBorrowRate": "平均固定利率--",
                "liquidityIndex": "流动性指数--",
                "variableBorrowIndex": "浮动利率指数--"
            }
            if (rayKeys[key]) {
                marketInfo[rayKeys[key]] = this.rayToPercent(val) + "(Ray)"
            }

            let decimalKeys = {
                "totalLiquidity": "市场规模", //list
                "totalBorrowsStable": "总借入额-固定利率",
                "totalBorrowsVariable": "总借入额-浮动利率",
                "totalBorrows": "总借入额", // list 固定利率+浮动利率
                "availableLiquidity": "可用流动资金"
            }
            if (decimalKeys[key]) {
                let decimalNum = this.toDecimalBN(val, reserveDecimals)
                marketInfo[decimalKeys[key]] = decimalNum.toNumber().toLocaleString() + "(Decimal)/" + decimalNum.multipliedBy(priceUsd).toNumber().toLocaleString() + "(USD)"

            }

            let dateKeys = {
                "lastUpdateTimestamp": "最新更新时间",
            }
            if (dateKeys[key]) {

                let date = 0
                if (val != "0") {
                    date = this.toTime(val * 1000)
                }
                marketInfo[dateKeys[key]] = date
            }

            let descKeys = {
                "aTokenAddress": "aToken",
                "stableBorrowsRate": "固定利率借贷占比",
                "variableBorrowsRate": "浮动利率借贷占比",
            }

            if (descKeys[key]) {
                marketInfo[descKeys[key]] = val
            }
        }

        return marketInfo
    }
}