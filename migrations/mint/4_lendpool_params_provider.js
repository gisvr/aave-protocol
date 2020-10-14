const LendingPoolParametersProvider = artifacts.require("LendingPoolParametersProvider");

module.exports = async (deployer) => {
    await deployer.deploy(LendingPoolParametersProvider, {overwrite: false})
};

