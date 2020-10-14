const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const FeeProvider = artifacts.require("FeeProvider");

// let lendingPoolManagerAddress = "0x357DE0933Dfdd80f3813654810332A92231bD092"
module.exports = async (deployer) => {
    let provider = await LendingPoolAddressProvider.deployed()
    let newwork = deployer.network
    let lendingPoolManagerAddress = deployer.networks[newwork].from
    // console.log(lendingPoolManagerAddress)

};