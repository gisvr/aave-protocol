const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const FeeProvider = artifacts.require("FeeProvider");


module.exports = async (deployer) => {
    await deployer.deploy(FeeProvider)
    let feeProvider = await FeeProvider.deployed()
    let provider = await LendingPoolAddressProvider.deployed()
    await provider.setFeeProviderImpl(feeProvider.address);
};

