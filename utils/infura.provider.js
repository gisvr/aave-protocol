
let network = "mainnet" //ropsten mainnet
let host = `https://${network}.infura.io/v3/393758f6317645be8a1ee94a874e12d9`;
let Web3 = require("web3")
const web3 = new Web3(host)
let contract = require("@truffle/contract");
let accounts = [] 

let getArttifact = async (path,addr) =>{
    let _chainId = await web3.eth.getChainId();
    if(accounts.length == 0){
        accounts = await web3.eth.getAccounts();
    } 
     
    let _art = require(path);
    let arttifact   = contract(_art)
    arttifact.setProvider(web3.currentProvider);
    arttifact.setWallet(web3.eth.accounts.wallet);
    arttifact.defaults({
        from: "0xeA199722372dea9DF458dbb56be7721af117a9Bc",
        // gas: 125e6, // mainnet= 1e6
        // gasPrice: 200e9
    });
    if(addr){
        if(network == "mainnet" &&  _art.contractName == "LendingPoolAddressesProvider"){
            addr ="0x24a42fD28C976A61Df5D00D0599C34c4f90748c8"
        }

        if(network == "ropsten" && _art.contractName == "LendingPoolAddressesProvider") {
            addr ="0x1c8756FD2B28e9426CDBDcC7E3c4d64fa9A54728"
        }
        //
        return arttifact.at(addr);
    }
 
    if (_art.networks[_chainId]) {
        arttifact =await arttifact.at(_art.networks[_chainId].address);
    }
    return arttifact;
}

module.exports = {
    async getArttifact(name,addr=false) { 
        let path = "/Users/liyu/github/mars/mint-protocol/build/contracts/" + name + ".json";
        return getArttifact(path,addr)
    },

    async getMint(name,addr=false) {
        
        let path = "/Users/liyu/github/mars/mint-protocol/build/contracts/" + name + ".json";
        return getArttifact(path,addr)
    },

    async getEarn(name,addr=false){
        let path = "/Users/liyu/github/mars/earn-contracts/build/contracts/" + name + ".json";
        return getArttifact(path,addr);
    },

    async getAave(name,addr=false){
        let path = "/Users/liyu/github/mars/aave-protocol/build/contracts/" + name + ".json";
        return getArttifact(path,addr);
    },

    getAccounts() {
        return accounts
    },
    getWeb3() {
        return web3
    }
}
