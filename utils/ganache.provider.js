let conf = require("../config/index");
let host = conf[conf.network].node.url;
let Web3 = require("web3");
const web3 = new Web3(host);
let contract = require("@truffle/contract");
const HDWalletProvider = require('truffle-hdwallet-provider');
require("dotenv").config();
let HD = new HDWalletProvider(process.env.MNENOMIC, host, 11, 5);
 
let accounts = [];

let getArttifact = async (path, addr) => {
  let _chainId = await web3.eth.getChainId();
  if (accounts.length == 0) {
    accounts = HD.addresses;
    accounts.map((val) => {
      let priBuff = HD.wallets[val].privKey;
      let pri = "0x" + priBuff.toString("hex");
      web3.eth.accounts.wallet.add(pri);
    });
  }
  let sender = accounts[0]

  let _art = require(path);
  let arttifact = contract(_art);
  arttifact.setProvider(web3.currentProvider);
  arttifact.setWallet(web3.eth.accounts.wallet);
  arttifact.defaults({
    from: sender,
    gas: 8e6,
    gasPrice: 20e9,
  });
  if (addr) {
    return arttifact.at(addr);
  }

  if (_art.networks[_chainId]) {
    arttifact = await arttifact.at(_art.networks[_chainId].address);
  }
  return arttifact;
};

module.exports = {
 
  async getMint(name, addr = false) {
    let path =
      "/Users/liyu/github/mars/mint-protocol/build/contracts/" + name + ".json";
    return getArttifact(path, addr);
  },
 

  async getAave(name, addr = false) {
    let path =
      "/Users/liyu/github/mars/aave-protocol/build/contracts/" + name + ".json";
    return getArttifact(path, addr);
  },

  async getAaveV1(name, addr = false) {
    let path =
      "/Users/liyu/github/mars/aave-protocol/build/contracts/" + name + ".json";
    return getArttifact(path, addr);
  },

  getAccounts() {
    return accounts;
  },
  getWeb3() {
    return web3;
  },
  async getChainId() {
    return web3.eth.getChainId();
  },
};
