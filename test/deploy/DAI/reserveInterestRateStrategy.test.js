let Web3 = require('web3');
let web3Provider = new Web3.providers.HttpProvider("http://127.0.0.1:9545")
let web3 = new Web3(web3Provider); // 得到接入ganache测试环境的web3对象
let contractJson = require("../../../build/contracts/DefaultReserveInterestRateStrategy")

let abi = contractJson.abi;
let bytecode = contractJson.bytecode;

// OPTIMAL_UTILIZATION_RATE = 0.8 * 1e27;
let constructorParams = [
    {
        "internalType": "address",
        "name": "_reserve",
        "type": "address",
        "desc": "策略对应的资产地址, 策略需要资产信息 e.g 小数位",
        "val": "0xa34F2278e9475aaa8ae30223b6EAEb44a69CD814"
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
        "condition":"//base variable borrow rate when Utilization rate = 0. Expressed in ray",
        "desc": "基本的浮动借利率",
        "val": "10000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_variableRateSlope1",
        "type": "uint256",
        "condition":"//slope of the variable interest curve when utilization rate > 0 and <= OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "浮动利率1段斜率",
        "val": "70000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_variableRateSlope2",
        "type": "uint256",
        "condition":"slope of the variable interest curve when utilization rate > OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "浮动利率2段斜率",
        "val": "1500000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_stableRateSlope1",
        "type": "uint256",
        "condition":"slope of the stable interest curve when utilization rate > 0 and <= OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "固定利率1段斜率",
        "val": "60000000000000000000000000"
    },
    {
        "internalType": "uint256",
        "name": "_stableRateSlope2",
        "type": "uint256",
        "condition":"slope of the stable interest curve when utilization rate > OPTIMAL_UTILIZATION_RATE. Expressed in ray",
        "desc": "固定利率2段斜率",
        "val": "1500000000000000000000000000"
    }
]

let deployContract = async () => {
    try {
        console.log("to get the accounts");
        let accounts = await web3.eth.getAccounts(); // 获取账户
        console.log(accounts[0]);
        console.log("To deploy  contract.");
        let result = await new web3.eth.Contract(abi).deploy(
            {
                data: '0x' + bytecode, // 需要注意 字节码需要添加 '0x' 不然会有各种错误
                arguments: constructorParams.map(val => val.val)  // 此处是参数列表
            })
            .send({
                from: accounts[0],
                gas: '5000000'
            });
        console.log("successfully! Team address: " + result.options.address);
        return result;
    } catch (error) {
        console.log("team 合约部署失败");
        console.error(error);
    }
};
deployContract(); // 测试
