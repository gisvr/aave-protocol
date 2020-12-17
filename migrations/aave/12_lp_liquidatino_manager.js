const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolLiquidationManager = artifacts.require("LendingPoolLiquidationManager");
const LendingPool = artifacts.require("LendingPool");

module.exports = async (deployer, network, accounts) => {
    await deployer.deploy(LendingPoolLiquidationManager)
    let provider = await LendingPoolAddressProvider.deployed()
    let lpLiquidationManager = await LendingPoolLiquidationManager.deployed()
    await provider.setLendingPoolLiquidationManager(accounts[0]);

};

