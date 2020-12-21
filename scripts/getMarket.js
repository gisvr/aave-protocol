
let Artifacts = require("./base")
module.exports = class getMarket extends Artifacts {
    constructor(web3, lpArtifact, rateOracle) {
        super(web3)
        this.lpArtifact = lpArtifact
        this.rateOracleArtifact = rateOracle
    }

    async init(lpAddr, oracleAddr, assetsPrices, ethUsd) {
        //获取lp 支持的资产
        this.lpContract = await this.lpArtifact.at(await lpAddr).catch(e => {
            throw e
        })
        this.rateOracleContruct = await this.rateOracleArtifact.at(oracleAddr).catch(e => {
            throw e
        })
        this.reservesPriceEth = assetsPrices
        this.ethUsd = ethUsd

    }

    async start(conf, symbol) {

        if (symbol) {
            let reserveConf = conf.tokenList.find(val => val.symbol == symbol)
            this.reservesPriceEth = this.reservesPriceEth.filter(val => val.address == reserveConf.address)
        }

        for (let reserve of this.reservesPriceEth) {
            let reserveAddr = reserve.address
            let priceEth = reserve.priceEth
            let ethUsd = this.ethUsd
            let priceUsd =reserve.priceUsd
            console.log(symbol, "priceEth", priceEth, "ethUsd", ethUsd, "tokenUsd", priceUsd)
            let {tokenSymbol, tokenDecimals} = await this.getATokenInfo(reserveAddr)
            let reserveConfData = await this.lpContract.getReserveConfigurationData(reserveAddr)
            let strategyAddr = this.reserveConfData(reserveConfData, tokenSymbol)
            await this.getStrategy(strategyAddr, tokenSymbol)

            let reserveData = await this.lpContract.getReserveData(reserveAddr)

            let listData = this.formatReserveData(reserveData, tokenDecimals, tokenSymbol, priceUsd)
            console.log(listData)
            console.table([listData], ["资产", "市场规模", "总借入额", "存款年化", "浮动利率/借贷年化", "固定利率/借贷年化"])

            let totalLiquidity = this.toDecimalBN(reserveData.totalLiquidity, tokenDecimals)
            let totalLiqUsd = totalLiquidity.multipliedBy(priceUsd).toNumber()
            console.log("储备金总览", totalLiqUsd.toLocaleString(), "USD")

            console.table([listData], ["资产", "可用流动资金", "资金利用率", "总借入额", "固定利率借贷占比", "浮动利率借贷占比"])

            //getMarketBorrowRate // getMarketLiquidityRate
            //setMarketBorrowRate // setMarketLiquidityRate
            let bRate = (await this.rateOracleContruct.getMarketBorrowRate(reserveAddr)).toString()

            console.log("MarketBorrowRate", this.rayToPercent(bRate), bRate)
            let lRate = (await this.rateOracleContruct.getMarketLiquidityRate(reserveAddr)).toString()
            console.log("MarketLiquidityRate", this.rayToPercent(lRate), lRate)

            // let price = (await this.pricePrivateContruct.getAssetPrice(reserveAddr)).toString()
            // console.log("ChainLink Asset Price (ETH)", this.toDecimal(price, 18))
            // 暂时没有设置 / 查询不到
            // let source = await this.pricePrivateContruct.getSourceOfAsset(reserveAddr)
            // console.log("ChainLink Asset Source", source)

            console.log("\n")
        }

        return "get market complete  !"

    }
}
