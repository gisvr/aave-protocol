const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const TokenDistributor = artifacts.require("TokenDistributor");
const LendingPool = artifacts.require("LendingPool");

module.exports = async (deployer, network, accounts) => {
    await deployer.deploy(TokenDistributor, {overwrite: false})
    let tokenDistributor = await TokenDistributor.deployed()

    let provider = await LendingPoolAddressProvider.deployed()
    await provider.setTokenDistributor(tokenDistributor.address);

    let poolManager = accounts[0]
    await provider.setLendingPoolManager(poolManager);

};
