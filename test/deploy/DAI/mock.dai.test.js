let Web3 = require('web3');
let web3Provider = new Web3.providers.HttpProvider("http://127.0.0.1:9545")
let web3 = new Web3(web3Provider); // 得到接入ganache测试环境的web3对象
let contractJson = require("../../../build/contracts/MockDAI")

let abi = contractJson.abi;
let bytecode = contractJson.bytecode;


let deployContract = async () => {
    try {
        console.log("to get the accounts");
        let accounts = await web3.eth.getAccounts(); // 获取账户
        console.log(accounts[0]);
        console.log("To deploy  contract.");
        let result = await new web3.eth.Contract(abi).deploy({
                data:  bytecode, // 需要注意 字节码需要添加 '0x' 不然会有各种错误
            })
            .send({
                from: accounts[0],
                gas: '5000000'
            });
        console.log("successfully! mock DAI address: " + result.options.address);
        return result;
    } catch (error) {
        console.log("DAI 合约部署失败");
        console.error(error);
    }
};
//0xa34F2278e9475aaa8ae30223b6EAEb44a69CD814
deployContract(); // 测试
