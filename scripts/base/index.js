const Market = require("./market")

module.exports = class Artifacts extends Market {
    constructor(web3) {
        super(web3)
    }

    userAccountData(account, userAccountData, priceUsd) {
        console.log("UserAccountData----------------", account)
        for (let key in userAccountData) {
            if (key.length < 3) continue

            let userAccountVal = userAccountData[key].toString()
            let ethKeys = {
                "totalLiquidityETH": "总共流动的ETH",
                "totalCollateralETH": "总计抵押",
                "totalBorrowsETH": "总计借",
                "totalFeesETH": "Fee",
                "availableBorrowsETH": "可借的额度",

                "healthFactor": "健康系数"
            }
            let ethVal = ""
            if (ethKeys[key]) {
                let decimalNum = this.toDecimalBN(userAccountVal, 18)
                // ethVal  = decimalNum.toNumber() + "(ETH)/" + decimalNum.multipliedBy(priceUsd).toNumber().toLocaleString() + "(USD)"

                // ethVal = this.toDecimal(userAccountVal, 18)
                ethVal = " (" + decimalNum.toFixed(6) + ")ETH/" + decimalNum.multipliedBy(priceUsd).toNumber().toLocaleString() + "(USD)" + ethKeys[key]
            }

            let decimalKeys = {
                "currentLiquidationThreshold": "当前 阀值",
                "ltv": "LTV",
            }
            if (decimalKeys[key]) {
                ethVal = " (" + userAccountVal + ")Decimal" + decimalKeys[key]
            }


            console.log(ethVal, key, userAccountVal)
        }
    }

    userReserveData(tokenSymbol, userReserveData, reserveDecimals) {
        console.log(tokenSymbol, "UserReserveData---------------")
        for (let key in userReserveData) {
            if (key.length < 3) continue

            let userReserveVal = userReserveData[key].toString()
            let percent = ""
            let rayKeys = {
                "borrowRate": "借出利率",
                "liquidityRate": "年化利率",
                "variableBorrowIndex": "浮动借出指数",
            }
            if (rayKeys[key]) {
                percent = this.rayToPercent(userReserveVal)
                percent = " (" + percent + ")Ray" + rayKeys[key]
            }

            let decimalKeys = {
                "currentATokenBalance": "当前资产余额" + tokenSymbol,
                "currentBorrowBalance": "当前借出余额" + tokenSymbol,
                "principalBorrowBalance": "本金" + tokenSymbol,
                "originationFee": "融资费用" + tokenSymbol
            }
            if (decimalKeys[key]) {
                percent = this.toDecimal(userReserveVal, reserveDecimals)

                percent = " (" + percent + ")Decimal" + decimalKeys[key]
            }


            let descKeys = {
                "borrowRateMode": "借出利率模型(1:固定, 2:浮动)" + tokenSymbol,
                "usageAsCollateralEnabled": "用做抵押" + tokenSymbol,
            }
            if (descKeys[key]) {
                percent = " (" + userReserveVal + ")" + descKeys[key]
            }

            let dateKeys = {
                "lastUpdateTimestamp": "最新更新时间" + tokenSymbol,
            }
            if (dateKeys[key]) {
                let date = 0
                if (userReserveVal != "0") {
                    date = this.toTime(userReserveVal * 1000)
                }

                percent = " (" + date + ")" + dateKeys[key]
            }


            console.log(percent, key, userReserveVal)

        }
    }

    formatUserReserveData(tokenSymbol, userReserveData, reserveDecimals, priceUsd) {
        let reserveData = {"资产": tokenSymbol}
        // console.log(userReserveData)
        userReserveData.totalBorrowBalance = userReserveData.currentBorrowBalance.add(userReserveData.originationFee)
        for (let key in userReserveData) {
            if (key.length < 3) continue

            let val = userReserveData[key].toString()
            let rayKeys = {
                "borrowRate": "借出利率",
                "liquidityRate": "年化利率",
                "variableBorrowIndex": "浮动借出指数",
            }
            if (rayKeys[key]) {
                reserveData[rayKeys[key]] = this.rayToPercent(val) + "(Ray)"
            }

            // console.log(reserveData)
            let decimalKeys = {
                "currentATokenBalance": "当前资产余额",
                "currentBorrowBalance": "当前借出余额",
                "principalBorrowBalance": "本金",
                "originationFee": "融资费用",
                "totalBorrowBalance": "已借贷"
            }
            if (decimalKeys[key]) {
                let decimalNum = this.toDecimalBN(val, reserveDecimals)
                reserveData[decimalKeys[key]] = decimalNum.toNumber().toLocaleString() + "(Decimal)/" + decimalNum.multipliedBy(priceUsd).toNumber().toLocaleString() + "(USD)"


                // reserveData[decimalKeys[key]] = this.toDecimal(val, reserveDecimals) + "(Decimal)"
            }


            let descKeys = {
                "borrowRateMode": "借出利率模型",
                "usageAsCollateralEnabled": "用做抵押",
            }
            if (descKeys[key]) {
                if (key == "borrowRateMode") {
                    val = val == "1" ? "固定利率" : "浮动利率"
                }
                reserveData[descKeys[key]] = val
            }

            let dateKeys = {
                "lastUpdateTimestamp": "最新更新时间"
            }
            if (dateKeys[key]) {
                let date = 0
                if (val != "0") {
                    date = this.toTime(val * 1000)
                }
                reserveData[dateKeys[key]] = date
            }

        }
        return reserveData
    }
}