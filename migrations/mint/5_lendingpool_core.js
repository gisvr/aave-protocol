const LendingPoolCore = artifacts.require("LendingPoolCore");
const CoreLibrary = artifacts.require("CoreLibrary");

// not constructor
module.exports = async (deployer) => {
    await deployer.deploy(CoreLibrary,{overwrite: false});
    await deployer.link(CoreLibrary,LendingPoolCore);
    await deployer.deploy(LendingPoolCore, {overwrite: false})
};

