const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator");

module.exports = async (deployer) => {
    await deployer.deploy(LendingPoolConfigurator, {overwrite: false})
};

