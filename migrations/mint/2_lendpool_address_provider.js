const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");

// not constructor
module.exports = async (deployer) => {
    await deployer.deploy(LendingPoolAddressProvider)
    // let provider = await LendingPoolAddressProvider.deployed()
    // let foo =await provider.getPriceOracle();
    // console.log(foo)
};

