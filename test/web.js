const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const AToken = artifacts.require("AToken");
const FeeProvider = artifacts.require("FeeProvider");
const assert = require('assert');

//truffle test ./test/call.js
console.log(web3.currentProvider.host)
contract("web3 ", async (accounts) => {

    it("getBalance", async () => {
        let addr = accounts[0]
        let eth = await web3.eth.getBalance(addr)
        console.log(addr, eth)
    })

})