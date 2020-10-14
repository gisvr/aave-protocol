const FeeProvider = artifacts.require("FeeProvider");

module.exports = async (deployer) => {
    await deployer.deploy(FeeProvider, {overwrite: false})
};

