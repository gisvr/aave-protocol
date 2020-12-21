/*
 *  上币 创建新的reserve 暂不启用
 *  truffle exec --network=mainnet scripts/onToken.js
 *  truffle exec --network=ropsten scripts/onToken.js
 *
 * 1. LendingPoolAddressesProvider.getLendingPoolConfigurator获取proxy地址
 * 2. 用LendingPoolConfiguratorProxy At Address初始化 LendingPoolConfigurator合约
 * 3. 执行LendingPoolConfigurator.initialize //初始化 会创建一个aToken 合约
 * 4. 执行LendingPoolConfigurator.activateReserve // 激活资产
 * 5. 执行LendingPoolConfigurator.enableReserveAsCollateral // 启用可以作为抵押物
 * 6. 执行LendingPoolConfigurator.enableBorrowingOnReserve // 启用借贷
 * 7. 执行LendingPoolConfigurator.enableReserveStableBorrowRate // 启用固定利率
 * 8. 执行LendingPoolConfigurator.refreshLendingPoolCoreConfiguration // 刷新配置
* */
// let getTokenConf = require("../utils/getTokenConf")
let Artifacts = require("./base")
let ethAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
module.exports = class OnToken extends Artifacts {
    constructor(web3, lpConfArtifact, lpArtifact, aToken) {
        super(web3)
        this.lpArtifact = lpArtifact
        this.lpConfArtifact = lpConfArtifact
        this.aToken = aToken
    }

    async init(lpConfAddr, lpAddr) {
        // console.log("init lpAddr", lpAddr)
        this.lpConfContract = await this.lpConfArtifact.at(await lpConfAddr).catch(e => {
            throw e
        })
        this.lpContract = await this.lpArtifact.at(await lpAddr).catch(e => {
            throw e
        })
    }

    async isExistResserve(addr) {
        let lpReserves = await this.lpContract.getReserves().catch(e => {
            throw e
        })
        return lpReserves.some(val => val == addr)
    }


    async start(conf, tokenSymbol) {
        let tokenConf = conf.tokenList.find(val => val.symbol == tokenSymbol)
        let reserveAddr = tokenConf.address
        // console.log(tokenConf)
        let lpProvideAddr = await this.lpConfContract.poolAddressesProvider().catch(e => {
            throw e
        })
        let reserveDecimals = "18"
        if (reserveAddr != ethAddr) {
            let aToken = await this.aToken.at(reserveAddr).catch(e => {
                throw e
            })
            tokenSymbol = await aToken.symbol()
            reserveDecimals = (await aToken.decimals()).toString()
        }

        console.log("reserveDecimals", tokenSymbol, reserveDecimals)


        let baseVariableBorrowRate = this.percentToRay(tokenConf.strategy.baseVariableBorrowRate)
        let variableRateSlope1 = this.percentToRay(tokenConf.strategy.variableRateSlope1)
        let variableRateSlope2 = this.percentToRay(tokenConf.strategy.variableRateSlope2)
        let stableRateSlope1 = this.percentToRay(tokenConf.strategy.stableRateSlope1)
        let stableRateSlope2 = this.percentToRay(tokenConf.strategy.stableRateSlope2)
        let strategyParams = [reserveAddr, lpProvideAddr, baseVariableBorrowRate,
            variableRateSlope1, variableRateSlope2, stableRateSlope1, stableRateSlope2]

        let isExist = await this.isExistResserve(reserveAddr)
        if (isExist) {
            let reservesConf = await this.lpContract.getReserveConfigurationData(reserveAddr)
            let strategyAddr = this.reserveConfData(reservesConf, tokenSymbol)

            await this.getStrategy(strategyAddr, tokenSymbol)

            let reserveData = await this.lpContract.getReserveData(reserveAddr)
            this.reserveData(reserveData, reserveDecimals, tokenSymbol)
            return reserveAddr + " exist !"
        }


        let strategyAddr = await this.deployStrategy(tokenSymbol, strategyParams).catch(e => {
            throw e
        })

        if (reserveAddr == ethAddr) {
            let aTokenName = "aETH Name"
            let aTokenSymbol = "aETH"
            console.log(tokenSymbol, "initReserveWithData", aTokenName, aTokenSymbol, reserveDecimals, strategyAddr)
            await this.lpConfContract.initReserveWithData(reserveAddr, aTokenName, aTokenSymbol, reserveDecimals, strategyAddr).catch(e => {
                console.log(e)
                throw e
            })
        } else {
            console.log(tokenSymbol, "initReserve", reserveAddr, reserveDecimals, strategyAddr)
            await this.lpConfContract.initReserve(reserveAddr, reserveDecimals, strategyAddr).catch(e => {
                console.log(e)
                throw e
            })
        }

        console.log("strategyAddr: " + strategyAddr + " success !")

        let collParams = tokenConf.collateral

        let usageCollEnabled = collParams.usageAsCollateralEnabled
        if (usageCollEnabled) {
            let ltv = collParams.baseLTVasCollateral
            let lThreshold = collParams.liquidationThreshold
            let lBonus = collParams.liquidationBonus
            //启用资产抵押
            await this.lpConfContract.enableReserveAsCollateral(reserveAddr, ltv, lThreshold, lBonus).catch(e => {
                console.error(e)
                throw e
            })
            console.log(tokenSymbol, `启用资产抵押, 借贷价值${ltv},清算阈值${lThreshold},清算补贴${lBonus}`,)
        }

        let borrowParams = tokenConf.borrow
        if (borrowParams.borrowingEnabled) {
            //启用资产借贷
            // stableBorrowRateEnabled, 第二个参数配置 固定利率是否启用
            await this.lpConfContract.enableBorrowingOnReserve(reserveAddr, borrowParams.stableBorrowRateEnabled).catch(e => {
                throw e
            })
            console.log(tokenSymbol, "启用资产借贷", borrowParams.stableBorrowRateEnabled)
        }

        let reservesConf = await this.lpContract.getReserveConfigurationData(reserveAddr)
        this.reserveConfData(reservesConf, tokenSymbol)
        console.log("reservesConf success")

        return "on reserve success !"
    }
}
