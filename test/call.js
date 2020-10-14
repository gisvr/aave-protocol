const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const AToken = artifacts.require("AToken");
const FeeProvider = artifacts.require("FeeProvider");
const assert = require('assert');

//truffle test ./test/call.js
contract("Get Info", async (accounts) => {
    it("LendingPoolAddressProvider Address", async () => {
        let provider = await LendingPoolAddressProvider.deployed()
        let foo = await provider.getPriceOracle();
        let address = await provider.address;
        console.log("LendingPoolAddressProvider",address)
    });

    it("FeeProvider Address", async () => {
        let provider = await FeeProvider.deployed()
        let address = await provider.address;
        console.log("FeeProvider", address)
    });


    //0xE449c05E539C90E7a5846773bbF8f8792DF4E922
    it("AToken address", async () => {
        let aToken = await AToken.deployed()
        let foo = aToken.address;
        console.log("AToken",foo)
    });
})