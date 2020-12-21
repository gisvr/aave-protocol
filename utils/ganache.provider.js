
let host = "http://39.102.101.142:8545";
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
        from: accounts[0],
        gas: 8e6,
        gasPrice: 20e9
    });
    if(addr){
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
