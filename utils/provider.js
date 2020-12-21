let network = "ropsten" //   rinkeby
const {projectId, privateKeys, adminKey} = require('/Users/liyu/Desktop/key/secrets.json');
let host = `https://${network}.infura.io/v3/${projectId}`
let Web3 = require("web3")
const web3 = new Web3(host)
let accounts = []
privateKeys.map(val => {
    let account = web3.eth.accounts.wallet.add(val)
    accounts.push(account)
})


const {setupLoader} = require('@openzeppelin/contract-loader');
const loader = setupLoader({
    defaultSender: accounts[0].address,
    provider: web3.currentProvider,
    defaultGas: 2e6,
    defaultGasPrice: 6e9,
}).truffle;

module.exports = {
    async getArttifact(name,isAt=true) {
        let path = __dirname + "/../" + loader.artifactsDir + "/" + name + ".json";
        let contract = require(path);
        let arttifact   = loader.fromArtifact(name)
        arttifact.setWallet(web3.eth.accounts.wallet)
        if (contract.networks[3]&&isAt) {
            arttifact =await arttifact.at(contract.networks[3].address)
        }

        return arttifact;
    },
    getAccounts() {
        return accounts
    },
    getWeb3() {
        return web3
    }
}
