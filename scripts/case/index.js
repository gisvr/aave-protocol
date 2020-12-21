/*
 *  借贷操作
 *  truffle exec --network=ropsten scripts/case/index.js  -c mint -t ETH
 *  truffle exec --network=ropsten scripts/case/index.js  -c mint -t BAT
 */
// const argv = require('yargs').argv;
let argv = require("../../utils/argv")
const Conf = require("../../config")
const lpAddrProvider = artifacts.require("LendingPoolAddressesProvider");
let lpConf = artifacts.require("LendingPoolConfigurator");
let lp = artifacts.require("LendingPool");
let strategy = artifacts.require("DefaultReserveInterestRateStrategy");
let aToken = artifacts.require("AToken");
let LpContruct = require("./lpContruct")

const referralCode = '0'
module.exports = async (callback) => {
    // console.log(argv)

    let contract = argv.contract
    let network = argv.network
    let token = argv.token
    let account = (await web3.eth.getAccounts())[0]
    console.log("account", account)
    web3.eth.defaultAccount = account
    let contractConf = Conf[network][contract]

    let providerContract = await lpAddrProvider.at(contractConf.lpProvideAddr)
    console.log("lpProvideAddr", contractConf.lpProvideAddr)
    let lpAddr = await providerContract.getLendingPool()
    console.log("LendingPoolAddr", lpAddr)
    lp = await lp.at(lpAddr)
    let lpReserves = await lp.getReserves()
    console.log("lpReserves", lpReserves)

    let lpContruct = new LpContruct(lp, web3, contractConf)
    const amount = web3.utils.toWei("0.01", "ether")



    // let tx = await lpContruct.deposit(token, amount, referralCode).catch(e => {
    //     throw e
    // })

    // let tx = await lpContruct.borrow(token, amount, "variable", referralCode).catch(e => {
    //     throw e
    // })


    let tx = await lpContruct.setUserUseReserveAsCollateral(token, false).catch(e => {
        throw e
    })

    // await lpContruct.getUserAccountData(account)
    // await lpContruct.getReserveConf("DAI")
    // await lpContruct.getUserReserveCollateral("DAI")

    // await lpContruct.getReserveConf("BAT")
    // await lpContruct.getUserReserveCollateral("BAT")
    // await lpContruct.getUserReserveCollateral("ETH")

    callback(`${token} ${tx.tx}`)


}