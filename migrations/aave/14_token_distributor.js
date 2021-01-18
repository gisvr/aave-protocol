const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const TokenDistributor = artifacts.require("TokenDistributor");
const LendingPool = artifacts.require("LendingPool");

module.exports = async (deployer, network) => {
    await deployer.deploy(TokenDistributor, {overwrite: false})
    let tokenDistributor = await TokenDistributor.deployed()

    let provider = await LendingPoolAddressProvider.deployed()
    await provider.setTokenDistributor(tokenDistributor.address);
 
    let sender =  deployer.networks[network].from;
    await provider.setLendingPoolManager(sender);

};
