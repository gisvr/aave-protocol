/*
 *  删除最新上币 创建新的reserve
 *  truffle exec --network=mainnet scripts/onToken.js
 *  truffle exec --network=ropsten scripts/onToken.js
 *
 * 1. LendingPoolAddressesProvider.getLendingPoolConfigurator获取proxy地址
 * 2. 用LendingPoolConfiguratorProxy At Address初始化 LendingPoolConfigurator合约
 * 3. 执行LendingPoolConfigurator.removeLastAddedReserve //初始化 会创建一个aToken 合约
 */

let Artifacts = require("./base")
let ethAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
module.exports = class OffToken extends Artifacts {
    constructor(web3, lpConf, lp, aToken) {
        super(web3)
        this.lp = lp
        this.lpConf = lpConf
        this.aToken = aToken
    }

    async init(lpConfAddr, lpAddr) {
        this.lpConf = await this.lpConf.at(await lpConfAddr)
        this.lp = await this.lp.at(await lpAddr)
    }

    async isExistResserve(addr) {
        let lpReserves = await this.lp.getReserves()
        return lpReserves.some(val => val == addr)
    }

    async start(conf, tokenSymbol) {
        //_reserveToRemove
        let reserveConf = conf.tokenList.find(val => val.symbol == tokenSymbol)
        let reserveAddr = reserveConf.address


        let reserveDecimals = "18"
        if (reserveAddr != ethAddr) {
            let aToken = await this.aToken.at(reserveAddr)
            reserveDecimals = (await aToken.decimals()).toString()
        }

        let isExist = await this.isExistResserve(reserveAddr)
        if (isExist) {
            let reservesConf = await this.lp.getReserveConfigurationData(reserveAddr)
            console.log(tokenSymbol, "Reserve  Rate Config Data")
            this.reserveConfData(reservesConf)
            console.log(tokenSymbol, "Reserve  Rate Data")
            let reserveData = await this.lp.getReserveData(reserveAddr)
            this.reserveData(reserveData, reserveDecimals)

            await this.lpConf.removeLastAddedReserve(reserveAddr).catch(e => {
                console.log(e)
                throw e
            })

            return reserveAddr + " Remove Success !"
        } else {
            return reserveAddr + "not exist !"
        }
    }
}
