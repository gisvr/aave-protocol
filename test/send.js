const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const FeeProvider = artifacts.require("FeeProvider");
const tokenTable = require("../utils/readCsv")
const assert = require('assert');

//truffle test ./test/send.js
const lendingPoolManagerAddress = "0x0e4CDA4BD785346B05efb22A8905cd96B1B7A3dB"
// FeeProvider 0x10FFAa762BDa0FB4ae4e8f718d8681bf1DEc18a1
let addressProvider

contract("setLendingPoolAddressProvider", async () => {
    beforeEach(async () => {

        addressProvider = await LendingPoolAddressProvider.deployed()
    });

    it("setLendingPoolManager", async () => {
        await addressProvider.setLendingPoolManager(lendingPoolManagerAddress);
        let mangerAddr = await addressProvider.getLendingPoolManager();
        // console.log("getLendingPoolManager:", mangerAddr)
    });

    it("setFeeProviderImpl", async () => {
        let feeProvider = await FeeProvider.deployed()

        // console.log("feeProvider.address:", feeProvider.address)
        await addressProvider.setFeeProviderImpl(feeProvider.address);
        let feeProviderAddr = await addressProvider.getFeeProvider();
        console.log("getFeeProvider:", feeProviderAddr)

        // proxy 做了代理 所以设置的合约和代理合约并不一致
    });


})