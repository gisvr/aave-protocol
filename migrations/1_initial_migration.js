const Migrations = artifacts.require("Migrations");

// not constructor
module.exports = async (deployer) => {
    await deployer.deploy(Migrations);
};
