const LendingPoolDataProvider = artifacts.require("LendingPoolDataProvider");

module.exports = async (deployer) => {
    await deployer.deploy(LendingPoolDataProvider, {overwrite: false})
};

