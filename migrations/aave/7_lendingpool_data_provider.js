const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolDataProvider = artifacts.require("LendingPoolDataProvider");

module.exports = async (deployer) => {
    await deployer.deploy(LendingPoolDataProvider)
    let lpDataProvider = await LendingPoolDataProvider.deployed()
    let provider = await LendingPoolAddressProvider.deployed()
    await provider.setLendingPoolDataProviderImpl(lpDataProvider.address);
};

