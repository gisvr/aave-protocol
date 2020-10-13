const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const MockDAI = artifacts.require("MockDAI");
const DefaultReserveInterestRateStrategy = artifacts.require("DefaultReserveInterestRateStrategy");

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
    await deployer.deploy(LendingPoolAddressProvider, {overwrite: false})
    await deployer.deploy(MockDAI, {overwrite: false})
    let params = constructorParams.map(value => value.val)
    params[0] = MockDAI.address // 资产地址
    params[1] = LendingPoolAddressProvider.address  // provider 地址
    await deployer.deploy(DefaultReserveInterestRateStrategy, ...params, {overwrite: false})
    console.log(DefaultReserveInterestRateStrategy.address)
};

