const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator");
const LendingPool = artifacts.require("LendingPool");

module.exports = async (deployer, network, accounts) => {
    await deployer.deploy(LendingPool)
    let lendingPool = await LendingPool.deployed()
    let provider = await LendingPoolAddressProvider.deployed()
    await provider.setLendingPoolImpl(lendingPool.address);

    // 使用 proxy 地址初始化
    // let lpConfAddr = await provider.getLendingPoolConfigurator()
    // let lpConfigurator = await LendingPoolConfigurator.at(lpConfAddr)
    let lpConfigurator = await LendingPoolConfigurator.deployed()
    await lpConfigurator.initialize(provider.address);

};

