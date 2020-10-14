const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const AToken = artifacts.require("AToken");
const assert = require('assert');

contract("Get Info", async () => {
    it("lp Address", async () => {
        let provider = await LendingPoolAddressProvider.deployed()
        let foo = await provider.getPriceOracle();
        let address = await provider.address;
        console.log(address)
    });

    //0xE449c05E539C90E7a5846773bbF8f8792DF4E922
    it("get AToken address", async () => {
        let aToken = await AToken.deployed()
        let foo = aToken.address;
        console.log(foo)
    });
})