const BN = require('bignumber.js');
//
let toDecimalBN = (num, decimal) => {
    let _decimal = new BN(10).pow(String(decimal))
    // console.log(_decimal.toFixed(),_decimal.toFixed().length)
    return new BN(num).div(_decimal)
}

module.exports = class TokenPrices {
    static eth2Usd(ethUsd, assetWei) {
        let decimals = 18
        let priceEth = toDecimalBN(assetWei, decimals).toFixed(10)
        let priceUsd = BN(ethUsd).multipliedBy(priceEth).toFixed(2)
        return {
            priceEth, priceUsd
        }
    }

    static async getEthUsd(contacatName, priceOracleContract) {
        if (contacatName == "mint") {
            return (await priceOracleContract.getEthUsdPrice()).toString()
        } else {
            return "390"
        }
    }

    static async getAavePrices(chainLinkPriceContract, lpReserves, contractConf) {
        let contacatName = "aave"
        let ethUsd = await this.getEthUsd(contacatName)
        let assetsPrices = await chainLinkPriceContract.getAssetsPrices(lpReserves)
        let tokeAll = lpReserves.map((address, index) => {
            let assetPrice = assetsPrices[index]
            let tokenInfo = contractConf.tokenList.find(val => val.address == address)
            if (!tokenInfo) {
                tokenInfo = {
                    "address": address,
                }
            }
            let {priceEth, priceUsd} = this.eth2Usd(ethUsd, assetPrice)
            tokenInfo.priceEth = priceEth
            tokenInfo.priceUsd = priceUsd
            tokenInfo.eth = assetPrice.toString()

            delete tokenInfo.collateral
            delete tokenInfo.borrow
            delete tokenInfo.strategy

            return tokenInfo
        })

        return tokeAll.filter(val => val.symbol)
    }

    static async getMintPrices(priceOracleContract, lpReserves, contractConf) {
        let contacatName = "mint"
        let ethUsd = await this.getEthUsd(contacatName, priceOracleContract)

        let tokenList = []
        for (let address of lpReserves) {
            let assetPrice = await priceOracleContract.getAssetPrice(address)
            let tokenInfo = contractConf.tokenList.find(val => val.address == address)
            if (!tokenInfo) {
                tokenInfo = {address: address}
            }
            let {priceEth, priceUsd} = this.eth2Usd(ethUsd, assetPrice)
            tokenInfo.priceEth = priceEth
            tokenInfo.priceUsd = priceUsd
            tokenInfo.eth = assetPrice.toString()

            delete tokenInfo.collateral
            delete tokenInfo.borrow
            delete tokenInfo.strategy

            tokenList.push(tokenInfo)
        }
        return tokenList
    }
}