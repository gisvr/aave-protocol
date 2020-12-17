const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolCore = artifacts.require("LendingPoolCore");
const CoreLibrary = artifacts.require("CoreLibrary");

// not constructor
module.exports = async (deployer) => {
    await deployer.deploy(CoreLibrary);
    await deployer.link(CoreLibrary,LendingPoolCore);
    await deployer.deploy(LendingPoolCore)
    let lpCore = await LendingPoolCore.deployed()
    let provider = await LendingPoolAddressProvider.deployed()
    await provider.setLendingPoolCoreImpl(lpCore.address);
};

