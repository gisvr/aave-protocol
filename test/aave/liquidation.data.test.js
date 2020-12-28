

const {expect} = require("chai");
const AaveMarket = require("../../utils/aave");
let nodeProvider = require("../../utils/infura.provider");
let web3 = nodeProvider.getWeb3();
let aaveMarket = new  AaveMarket(web3);





let users=[],BN=web3.utils.BN

let sender = "0x752f6b0bc8e3ad5be605d356c03f6f42f41574fb"
describe("Aave Liquidation", function () {
    let alice, bob, liquid;
    before(async () => {


        let provider = await nodeProvider.getAave("LendingPoolAddressesProvider","AAVE");

        let lpAddr = await provider.getLendingPool()
        console.log(lpAddr)
        this.lpContractProxy = await nodeProvider.getAave("LendingPool", lpAddr);
        // console.log(this.lpContract.address)
    });

    it('Liquidation', async () => {
        this.timeout(500000);
        let _collateral = "0xdac17f958d2ee523a2206206994597c13d831ec7"
        let userReserveData = await this.lpContractProxy.getUserReserveData(_collateral,sender);
        let userAccountData = await this.lpContractProxy.getUserAccountData(sender);

        aaveMarket.userReserveData("USDT",userReserveData,"6")

        aaveMarket.userAccountData(sender,userAccountData,"600")

    }).timeout(50000);

})
