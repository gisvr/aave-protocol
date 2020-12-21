/*
*  根据配置文件创建并且启用策略
*  truffle exec --network=mainnet scripts/getMarket.js
*  truffle exec --network=ropsten scripts/getMarket.js
* */


let Artifacts = require("./base")
module.exports = class getBorrow extends Artifacts {
    constructor(web3, lpArtifact) {
        super(web3)
        this.lpArtifact = lpArtifact
    }

    async init(lpAddr, userAddr, assetsPrices, ethUsd) {
        //获取lp 支持的资产
        this.lpContract = await this.lpArtifact.at(lpAddr).catch(e => {
            throw e
        })
        this.userAddr = userAddr
        this.reservesPriceEth = assetsPrices
        this.ethUsd = ethUsd

    }

    async start(conf, symbol) {
        let account = this.userAddr
        let ethUsdPrice = this.ethUsd


        let userAccountData = await this.lpContract.getUserAccountData(account)


        let totalCollateralETH = this.BN(userAccountData.totalCollateralETH).div(this.ethDecimalBN)
        // this.userAccountData(account, userAccountData,ethUsdPrice)

        // let totalEth = this.BN(userAccountData.totalLiquidityETH).div(this.ethDecimalBN).toFixed(10)
        // let totalUsd = this.BN(ethUsdPrice).multipliedBy(totalEth).toFixed(10)
        //
        // console.log("汇总余额: \n $", totalUsd, "USD", totalEth, "ETH \n",)
        //
        //
        let borrowEth = this.BN(userAccountData.totalBorrowsETH).div(this.ethDecimalBN)
        let borrowUsd = this.BN(ethUsdPrice).multipliedBy(borrowEth).toFixed(4)
        // console.log("已借贷: \n $", borrowUsd, "USD", borrowEth.toFixed(10), "ETH ")
        //
        let healthFactor = this.BN(userAccountData.healthFactor).div(this.ethDecimalBN).toFixed(3)
        console.log("健康系数:", healthFactor)


        let availableBorrowsETH = this.BN(userAccountData.availableBorrowsETH).div(this.ethDecimalBN)
        console.log("已使用的借贷能力:", borrowEth.div(borrowEth.plus(availableBorrowsETH)).multipliedBy(100).toFixed(2), "% \n")


        // let collEth = this.BN(userAccountData.totalCollateralETH).div(this.ethDecimalBN)
        // let collUsd = this.BN(ethUsdPrice).multipliedBy(collEth).toFixed(4)
        // console.log("已抵押 \n $", collUsd, "USD", collEth.toFixed(10), "ETH")
        //
        // console.log("Current LTV:", borrowEth.div(collEth).multipliedBy(100).toFixed(2), "%")
        //
        // console.log("Maximum LTV:", userAccountData.ltv.toString(), "%")
        //
        // console.log("Liquidation threshold:", userAccountData.currentLiquidationThreshold.toString(), "% \n")


        if (symbol) {
            let reserveConf = conf.tokenList.find(val => val.symbol == symbol)
            this.reservesPriceEth = this.reservesPriceEth.filter(val => val.address == reserveConf.address)
        }
        let allTokens = []
        for (let reserve of this.reservesPriceEth) {
            let reserveAddr = reserve.address
            let priceEth = reserve.priceEth
            let priceUsd = reserve.priceUsd


            let {tokenSymbol, tokenDecimals} = await this.getATokenInfo(reserveAddr)

            console.log(tokenSymbol, priceEth, "ETH", priceUsd, "USD", "ETHUSD: ", this.ethUsd)

            //获取资产信息
            let reserveData = await this.lpContract.getReserveData(reserveAddr)

            // this.reserveData(reserveData, 18, symbol)
            let marketReserveData = this.formatReserveData(reserveData, tokenDecimals, tokenSymbol, priceUsd)
            // console.log(marketReserveData)

            let totalLiquidity = this.toDecimalBN(reserveData.totalLiquidity, tokenDecimals)
            let totalLiqUsd = totalLiquidity.multipliedBy(priceUsd).toNumber()
            console.log("储备金总览", totalLiqUsd.toLocaleString(), "USD")


            let userReserveData = await this.lpContract.getUserReserveData(reserveAddr, account)

            // this.userReserveData(tokenSymbol, userReserveData, tokenDecimals)

            let formatData = this.formatUserReserveData(tokenSymbol, userReserveData, tokenDecimals, priceUsd)

            formatData["提供给您"] = availableBorrowsETH.div(priceEth).multipliedBy(0.99).toFixed(5)
            formatData ["浮动利率/年化"] = marketReserveData["浮动利率/借贷年化"]
            formatData ["固定利率/年化"] = marketReserveData["固定利率/借贷年化"]

            formatData["抵押总额"] = totalCollateralETH.toFixed(10) + "(Decimal)/" + totalCollateralETH.div(priceEth).toFixed(5) + "(USD)"

            formatData["可用流动资金"] = marketReserveData["可用流动资金"]


            formatData["利用率"] = marketReserveData["资金利用率"]


            formatData["AssetPrice"] = priceUsd

            // 可用eth的价格 / DAI总抵押的价格


            allTokens.push(formatData)
        }


        // console.log("存款")
        // let depositProperties = ["资产", "当前资产余额", "年化利率", "用做抵押" ]
        // console.table(allTokens, depositProperties)

        console.log("借款-列表")
        let borrowListProperties = ["资产", "提供给您", "浮动利率/年化", "固定利率/年化"]

        console.table(allTokens, borrowListProperties)

        console.log("借款-内容")
        let borrowProperties = ["资产", "已借贷", "抵押总额", "利用率", "可用流动资金", "AssetPrice"]
        console.table(allTokens, borrowProperties)


        return "get borrow user complete  !"

    }
}
