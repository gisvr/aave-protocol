const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const MockDAI = artifacts.require("MockDAI");
const AToken = artifacts.require("AToken");

let constructorParams = [
    {
        "internalType": "contract LendingPoolAddressesProvider",
        "name": "_addressesProvider",
        "type": "address"
    },
    {
        "internalType": "address",
        "name": "_underlyingAsset",
        "type": "address"
    },
    {
        "internalType": "uint8",
        "name": "_underlyingAssetDecimals",
        "type": "uint8"
    },
    {
        "internalType": "string",
        "name": "_name",
        "type": "string"
    },
    {
        "internalType": "string",
        "name": "_symbol",
        "type": "string"
    }
]

module.exports = async (deployer) => {
    let provider = await LendingPoolAddressProvider.deployed()
    let daiToken = await MockDAI.deployed()
    let params = []
    params[0] = provider.address  // provider 地址 // 地址不能反
    params[1] = daiToken.address // 资产地址
    params[2] = (await daiToken.decimals.call()).toString()
    params[3] = "DAIName"
    params[4] = "aDAI"
    // params[5] = {overwrite: false} // migrate 参数
    // console.log("aToken Dai: ", ...params)
    await deployer.deploy(AToken, ...params) //,
};

