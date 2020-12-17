const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator");

module.exports = async (deployer) => {
    await deployer.deploy(LendingPoolConfigurator)

    let lpConfigurator = await LendingPoolConfigurator.deployed()
    let provider = await LendingPoolAddressProvider.deployed()
    await provider.setLendingPoolConfiguratorImpl(lpConfigurator.address);

};

