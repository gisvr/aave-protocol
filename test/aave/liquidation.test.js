

const {expect} = require("chai");
const AaveMarket = require("../../utils/aave");
let nodeProvider = require("../../utils/ganache.provider");
let web3 = nodeProvider.getWeb3();
let aaveMarket = new  AaveMarket(web3);



let users=[]
describe("Aave Liquidation", function () {
    let alice, bob, liquid;
    before(async () => {


        this.DAI = await nodeProvider.getAave("MockDAI");
        let provider = await nodeProvider.getAave("LendingPoolAddressesProvider"); //?

        let lpAddr = await provider.getLendingPool()
        this.lpContract = await nodeProvider.getAave("LendingPool", lpAddr);

        this.lpCore = await provider.getLendingPoolCore()
        this.lpCoreContract = await nodeProvider.getAave("LendingPoolCore", this.lpCore);

        this.lpDataPrivider = await provider.getLendingPoolDataProvider();
        this.lpDataPrividerContract = await nodeProvider.getAave("LendingPoolDataProvider", this.lpDataPrivider );

        this.lpAddressProvider = provider

        let _aDaiAddr = await this.lpCoreContract.getReserveATokenAddress(this.DAI.address)
        this.aDAI = await nodeProvider.getMint("AToken", _aDaiAddr)
        users = nodeProvider.getAccounts();
        [alice, bob, liquid] = users;
    });

    it('Liquidation', async () => {
        this.timeout(500000);
        console.log(this.lpDataPrividerContract.address)
        let foo = await this.lpDataPrividerContract.calculateUserGlobalData(alice);

         aaveMarket.calculateUserGlobalData(alice,foo,"300");
        // aaveM
        // console.log(foo)
    }).timeout(50000);

})
