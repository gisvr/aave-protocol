// const Conf = require("../../config")
const Artifacts = require("../base")

module.exports = class Deposit extends Artifacts {
    constructor(lpContract, web3, conf) {
        super(web3)
        this.lpContract = lpContract
        this.conf = conf

    }

    async erc20Aprove() {

    }

    async deposit(symbol, amount, referralCode) {
        let tokenConf = this.conf.tokenList.find(val=>val.symbol ==symbol)
        let reserveAddr = tokenConf.address
        let account = this.web3.eth.defaultAccount
        console.log("account", account)
        let tx = ""
        console.log("lpContract.deposit", symbol, reserveAddr, amount, referralCode)
        if (symbol == "ETH") {
            let txOptions = {
                from: account, // required
                value: amount,
            }
            tx = await this.lpContract.deposit(reserveAddr, amount, referralCode, txOptions).catch(e => {
                console.log(e)
                throw e
            })
        } else {
            tx = await this.lpContract.deposit(reserveAddr, amount, referralCode).catch(e => {
                console.log(e)
                throw e
            })
        }
        return tx
    }

    async borrow(symbol, amount, interestRateMode, referralCode) {
        let rateMode = this.conf.interestRateMode[interestRateMode]
        let tokenConf = this.conf.tokenList.find(val=>val.symbol ==symbol)
        let reserveAddr = tokenConf.address
        let account = this.web3.eth.defaultAccount
        console.log("account", account)
        console.log("lpContract.borrow", symbol, reserveAddr, amount, interestRateMode, rateMode, referralCode)
        return this.lpContract.borrow(reserveAddr, amount, rateMode, referralCode).catch(e => {
            console.log(e)
            throw e
        })
    }


    async setUserUseReserveAsCollateral(symbol, useAsCollateral) {
        let tokenConf = this.conf.tokenList.find(val=>val.symbol ==symbol)
        let reserveAddr = tokenConf.address
        let account = this.web3.eth.defaultAccount
        console.log("account", account)

        // case 1 Reason given: User deposit is already being used as collateral
        //function setUserUseReserveAsCollateral(address _reserve, bool _useAsCollateral)
        console.log("lpContract.setUserUseReserveAsCollateral", symbol, reserveAddr, useAsCollateral)
        return this.lpContract.setUserUseReserveAsCollateral(reserveAddr, useAsCollateral).catch(e => {
            console.log(e.reason)
            throw e
        })
    }

    async getUserAccountData(account) {
        // let userAccountData = await lpProxy.getUserAccountData(userAddr)
        let userReserveData = await this.lpContract.getUserAccountData(account)
        this.userAccountData(account, userReserveData)
    }


    async getReserveConf(symbol) {
        let tokenConf = this.conf.tokenList.find(val=>val.symbol ==symbol)
        let reserveAddr = tokenConf.address
        let reservesConf = await this.lpContract.getReserveConfigurationData(reserveAddr)
        this.reserveConfData(reservesConf, symbol)

    }

    async getUserReserveCollateral(symbol) {
        let tokenConf = this.conf.tokenList.find(val=>val.symbol ==symbol)
        let reserveAddr = tokenConf.address
        let account = this.web3.eth.defaultAccount

        let userReserveData = await this.lpContract.getUserReserveData(reserveAddr, account)

        let {tokenDecimals} = await this.getATokenInfo(reserveAddr)
        this.userReserveData(symbol, userReserveData, tokenDecimals)
    }


}