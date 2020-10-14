const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");

module.exports = async (deployer) => {
    await deployer.deploy(LendingPoolAddressProvider, {overwrite: false})
    let provider = await LendingPoolAddressProvider.deployed()
    // let foo =await provider.getPriceOracle();
    // console.log(foo)
};

