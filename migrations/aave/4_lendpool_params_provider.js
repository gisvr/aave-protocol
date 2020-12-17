const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolParametersProvider = artifacts.require("LendingPoolParametersProvider");

module.exports = async (deployer) => {
    await deployer.deploy(LendingPoolParametersProvider)
    let lpParameterProvider = await LendingPoolParametersProvider.deployed()
    let provider = await LendingPoolAddressProvider.deployed()
    await provider.setLendingPoolParametersProviderImpl(lpParameterProvider.address);
};

