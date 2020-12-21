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
        this.baseLTVasCollateral = "75" //资产抵押比率
        this.liquidationThreshold = "80" //清算的阈值
        this.liquidationBonus = "105" //清算奖励
        this.stableBorrowRateEnabled = true // 是否启用固定利率借贷
    }

    async init(lpConfAddr, lpAddr) {
        this.lpConf = await this.lpConf.at(await lpConfAddr)
        this.lp = await this.lp.at(await lpAddr)
    }

    // address _reserve,


    async isExistResserve(reserveAddr) {
        let lpReserves = await this.lp.getReserves()
        return lpReserves.includes(reserveAddr)
    }

    async start(conf, tokenSymbol) {
        //_reserveToRemove
        let tokenConf = conf.tokenList.find(val => val.symbol == tokenSymbol)
        let reserveAddr = tokenConf.address

        let isExist = await this.isExistResserve(reserveAddr)
        if (isExist) {
            let reservesConf = await this.lp.getReserveConfigurationData(reserveAddr)
            console.log(tokenSymbol, "Reserve  Rate Config Data")
            this.reserveConfData(reservesConf,tokenSymbol)

            let ltv = this.baseLTVasCollateral
            let lThreshold = this.liquidationThreshold
            let lBonus = this.liquidationBonus
            if (!reservesConf.usageAsCollateralEnabled) {
                //启用资产抵押
                await this.lpConf.enableReserveAsCollateral(reserveAddr, ltv, lThreshold, lBonus).catch(e => {
                    console.error(e)
                    throw e
                })
                console.log(tokenSymbol, `启用资产抵押, 借贷价值${ltv},清算阈值${lThreshold},清算补贴${lBonus}`,)
            }



            if (!reservesConf.borrowingEnabled) {
                //启用资产借贷
                // stableBorrowRateEnabled, 第二个参数配置 固定利率是否启用
                await this.lpConf.enableBorrowingOnReserve(reserveAddr, this.stableBorrowRateEnabled).catch(e => {
                    throw e
                })
                console.log(tokenSymbol, "启用资产借贷", this.stableBorrowRateEnabled)
            }

            reservesConf = await this.lp.getReserveConfigurationData(reserveAddr)
            console.log(tokenSymbol, "Reserve  Rate Config Data")
            this.reserveConfData(reservesConf,tokenSymbol)

            // //启用资产固定利率借贷
            // await this.lpConf.enableReserveStableBorrowRate(reserveAddr).catch(e => {
            //     console.error(e)
            //     throw e
            // })
            // console.log("启用资产固定利率借贷")

            return reserveAddr + " Set Success !"
        } else {
            return reserveAddr + "not exist !"
        }
    }
}
