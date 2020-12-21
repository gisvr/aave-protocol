/*
*  根据配置文件创建并且启用策略
*  truffle exec --network=mainnet scripts/getMarket.js
*  truffle exec --network=ropsten scripts/getMarket.js
* */


let Artifacts = require("./base")
module.exports = class getUser extends Artifacts {
    constructor(web3, lpContract) {
        super(web3)
        this.lpContract = lpContract
    }

    async init(userAddr, assetsPrices, ethUsd) {
        this.userAddr = userAddr
        this.reservesPriceEth = assetsPrices
        this.ethUsd = ethUsd

    }

    async start(contractConf, symbol) {
        let account = this.userAddr
        let userAccountData = await this.lpContract.getUserAccountData(account)

        // this.userAccountData(account, userAccountData,this.ethUsd)

        let totalEth = this.BN(userAccountData.totalLiquidityETH).div(this.ethDecimalBN).toFixed(10)
        let totalUsd = this.BN(this.ethUsd).multipliedBy(totalEth).toFixed(10)

        console.log("汇总余额: \n $", totalUsd, "USD", totalEth, "ETH \n",)


        let borrowEth = this.BN(userAccountData.totalBorrowsETH).div(this.ethDecimalBN)
        let borrowUsd = this.BN(this.ethUsd).multipliedBy(borrowEth).toFixed(4)
        console.log("已借贷: \n $", borrowUsd, "USD", borrowEth.toFixed(10), "ETH ")

        let healthFactor = this.BN(userAccountData.healthFactor).div(this.ethDecimalBN).toFixed(3)
        console.log("健康系数:", healthFactor)


        let availableBorrowsETH = this.BN(userAccountData.availableBorrowsETH).div(this.ethDecimalBN)
        console.log("已使用的借贷能力:", borrowEth.div(borrowEth.plus(availableBorrowsETH)).multipliedBy(10).toFixed(2), "% \n")


        let collEth = this.BN(userAccountData.totalCollateralETH).div(this.ethDecimalBN)
        let collUsd = this.BN(this.ethUsd).multipliedBy(collEth).toFixed(4)
        console.log("已抵押 \n $", collUsd, "USD", collEth.toFixed(10), "ETH")

        console.log("Current LTV:", borrowEth.div(collEth).multipliedBy(100).toFixed(2), "%")

        console.log("Maximum LTV:", userAccountData.ltv.toString(), "%")

        console.log("Liquidation threshold:", userAccountData.currentLiquidationThreshold.toString(), "% \n")


        if (symbol) {
            let reserveConf = contractConf.tokenList.find(val => val.symbol == symbol)
            this.reservesPriceEth = this.reservesPriceEth.filter(val => val.address == reserveConf.address)
        }
        let allTokens = []
        if (!this.reservesPriceEth.length) {
            console.log("reservesPriceEth error")
        } else {
            // console.log(this.reservesPriceEth)
        }
        for (let reserve of this.reservesPriceEth) {
            let reserveAddr = reserve.address
            let priceEth = reserve.priceEth
            let priceUsd = reserve.priceUsd


            let {tokenSymbol, tokenDecimals} = await this.getATokenInfo(reserveAddr)

            console.log(tokenSymbol, priceEth, "ETH", priceUsd, "USD")
            console.log("提供给您:", availableBorrowsETH.div(priceEth).multipliedBy(0.99).toString(), "\n")

            let userReserveData = await this.lpContract.getUserReserveData(reserveAddr, account)

            // this.userReserveData(tokenSymbol, userReserveData, tokenDecimals)

            let formatData = this.formatUserReserveData(tokenSymbol, userReserveData, tokenDecimals, priceUsd)

            let depositBalance = this.toDecimalBN(userReserveData.currentATokenBalance, tokenDecimals)
            let borrowBalance = this.toDecimalBN(userReserveData.currentBorrowBalance, tokenDecimals)

            let depositBalancePriceEth = depositBalance.multipliedBy(priceEth)
            let borrowBalancePriceEth = borrowBalance.multipliedBy(priceEth)
            // console.log(tokenSymbol, "depositBalance", depositBalancePriceEth.toNumber(), "ETH")
            // console.log(tokenSymbol, "borrowBalance", borrowBalancePriceEth.toNumber(), "ETH")

            formatData["存款构成"] = depositBalancePriceEth.div(totalEth).multipliedBy(100).toFixed(2) + "%"

            let borrowTotalEth = borrowEth.plus(availableBorrowsETH)
            formatData["借贷构成"] = borrowBalancePriceEth.div(borrowTotalEth).multipliedBy(100).toFixed(2) + "%"

            formatData["抵押构成"] = 0
            if (userReserveData.usageAsCollateralEnabled) { // 用做抵押
                console.log("collEth", collEth.toString(), "depositBalancePriceEth", depositBalancePriceEth.toNumber())
                formatData["抵押构成"] = depositBalancePriceEth.div(collEth).multipliedBy(100).toFixed(2) + "%"
            }


            allTokens.push(formatData)
        }


        console.log("控制面板-存款")
        let depositProperties = ["资产", "当前资产余额", "年化利率", "用做抵押", "存款构成"]
        console.table(allTokens, depositProperties)

        console.log("控制面板-借款")
        let borrowProperties = ["资产", "当前借出余额", "借出利率", "借出利率模型", "借贷构成", "抵押构成"]

        console.table(allTokens, borrowProperties)


        return "get market user complete  !"

    }
}
