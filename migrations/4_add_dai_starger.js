const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const MockDAI = artifacts.require("MockDAI");
const DefaultReserveInterestRateStrategy = artifacts.require("DefaultReserveInterestRateStrategy");
const fs = require('fs')

let constructorParams = [
    {
        "internalType": "address",
        "name": "_reserve",
        "type": "address",
        "desc": "策略对应的资产地址, 策略需要资产信息 e.g 小数位",
        "val": "0xcA88187EA00A45184fC15072Bb62769A81A64344"
    },
    {
        "internalType": "contract LendingPoolAddressesProvider",
        "name": "_provider",
        "type": "address",
        "desc": "借贷池的地址, 在合约里面需要池的一些设定信息",
        "val": "0x5A81dAC577Ed3cF4aE10474b724aAC07b5Ea7F50"
    },
    {
        "internalType": "uint256",
        "name": "_baseVariableBorrowRate",
        "type": "uint256",
        "condition": "//base variable borrow rate when Utilization rate = 0. Expressed in ray",
        "desc": "基本的浮动借利率",
        "val": "10000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_variableRateSlope1",
        "type": "uint256",
        "condition": "//slope of the variable interest curve when utilization rate > 0 and <= OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "浮动利率1段斜率",
        "val": "70000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_variableRateSlope2",
        "type": "uint256",
        "condition": "slope of the variable interest curve when utilization rate > OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "浮动利率2段斜率",
        "val": "1500000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_stableRateSlope1",
        "type": "uint256",
        "condition": "slope of the stable interest curve when utilization rate > 0 and <= OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "固定利率1段斜率",
        "val": "60000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_stableRateSlope2",
        "type": "uint256",
        "condition": "slope of the stable interest curve when utilization rate > OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "固定利率2段斜率",
        "val": "1500000000000000000000000000"
    }
]


module.exports = async (deployer) => {
    // await deployer.deploy(LendingPoolAddressProvider, {overwrite: false})
    let provider = LendingPoolAddressProvider.deployed()
    // await deployer.deploy(MockDAI, {overwrite: false})
    let daiToken = MockDAI.deployed()
    let params = constructorParams.map(value => value.val)
    params[0] = daiToken.address // 资产地址
    params[1] = provider.address  // provider 地址
    await deployer.deploy(DefaultReserveInterestRateStrategy, ...params, {overwrite: false})
    // console.log(DefaultReserveInterestRateStrategy.address)
    // console.log(DefaultReserveInterestRateStrategy.source)

    // provider.

};

// 查询 资产的 策略地址 在 lp 合约中
// https://etherscan.io/address/0x398eC7346DcD622eDc5ae82352F02bE94C62d119#readProxyContract
// getReserveConfigurationData
// 0x6b175474e89094c44da98b954eedeac495271d0f

// ltv   uint256 :  75
// liquidationThreshold   uint256 :  80
// liquidationBonus   uint256 :  105
// interestRateStrategyAddress   address :  0x0c212728e3cDb57ED62DdFCa917Fe7DF17A63979
// usageAsCollateralEnabled   bool :  true
// borrowingEnabled   bool :  true
// stableBorrowRateEnabled   bool :  true
// isActive   bool :  true


// 只provide 合约中查找 config 合约
// https://etherscan.io/address/0x4965f6fa20fe9728decf5165016fc338a5a85abf#writeContract

