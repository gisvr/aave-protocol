const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator");

// let lendingPoolManagerAddress = "0x357DE0933Dfdd80f3813654810332A92231bD092"
module.exports = async (deployer, network, accounts) => {
    let lpProvider = await LendingPoolAddressProvider.deployed()
    let lpConf = await LendingPoolConfigurator.deployed()
    await lpConf.initialize(lpProvider.address)

    await provider.setLendingPoolManager(accounts[0])

    await lpConf.enableReserveStableBorrowRate(accounts[0])



};