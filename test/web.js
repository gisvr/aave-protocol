
const tokenTable = require("../utils/readCsvSync")
console.log(web3.currentProvider.host)
contract("web3 ", async (accounts) => {
    it("getBalance", async () => {
        let addr = accounts[0]
        let eth = await web3.eth.getBalance(addr)
        console.log(addr, eth)

        let tokenInfo =  tokenTable("/Users/liyu/github/mars/aave-protocol/utils/token-address.csv")
        console.dir(tokenInfo)
    })

})