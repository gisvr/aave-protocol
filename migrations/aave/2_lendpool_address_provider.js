const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");

// not constructor
module.exports = async (deployer, network, accounts) => {
    let poolManager = accounts[0]
    await deployer.deploy(LendingPoolAddressProvider)
    let provider = await LendingPoolAddressProvider.deployed()
    await provider.setLendingPoolManager(poolManager);
    console.debug("poolManager", poolManager)
    console.debug("LendingPoolAddressProvider address ", provider.address)

};

