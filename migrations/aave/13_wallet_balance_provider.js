const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const WalletBalanceProvider = artifacts.require("WalletBalanceProvider");
const LendingPool = artifacts.require("LendingPool");

module.exports = async (deployer, network, accounts) => {
    let provider = await LendingPoolAddressProvider.deployed()
    const isDeployed = WalletBalanceProvider.isDeployed();
    if (!isDeployed) {
        await deployer.deploy(WalletBalanceProvider, provider.address)
        let walletBalanceProvider = await WalletBalanceProvider.deployed()
    }
};
