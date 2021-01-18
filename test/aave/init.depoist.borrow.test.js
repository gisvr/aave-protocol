
let nodeProvider = require("../../utils/ganache.provider");
// const { BN } = require('@openzeppelin/test-helpers');

let getTokenInfo = async (erc20Token) => {
    let symbol = await erc20Token.symbol();
    let name = await erc20Token.name();
    let address = erc20Token.address;
    let decimals = await erc20Token.decimals();
    let decimalsPow = new BN(10).pow(decimals);
    return { symbol, name, address, decimals, decimalsPow };
};

let web3 = nodeProvider.getWeb3();

let lpCoreAddr,accounts,BN = web3.utils.BN;
describe("Init Aave", async () => { 
    before(async () => {

        let provider = await nodeProvider.getAaveV1("LendingPoolAddressesProvider");
        let lpAddr = await provider.getLendingPool();
        lpCoreAddr = await provider.getLendingPoolCore();
        this.lpContractProxy = await nodeProvider.getAaveV1("LendingPool", lpAddr);
        this.ERC20 = await nodeProvider.getAaveV1("MockLINK");

        let lpReserves = await this.lpContractProxy.getReserves()
        let ethAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        for (let addr of lpReserves) {
            if (addr == ethAddr) { 
                continue;
            } 
            let erc20 = await this.ERC20.at(addr)
            let token = await getTokenInfo(erc20)
            this[token.symbol] =erc20
        }

        accounts = nodeProvider.getAccounts()
         
        this.lpDataPrivider = await provider.getLendingPoolDataProvider();
        this.lpDataPrividerContract = await nodeProvider.getAaveV1("LendingPoolDataProvider", this.lpDataPrivider );
    });

    it("alic deposit DAI BAT", async () => { 

        let [,alice,bob,tom] = accounts
 
        let daiToken = this.DAI;
        let batToken = this.BAT;
        let usdcToken = this.USDC;
        let daiBal0 = await daiToken.balanceOf(alice)  
        let batBal0 = await batToken.balanceOf(alice);
        let usdcBal0= await usdcToken.balanceOf(alice)

        const mAmount = web3.utils.toWei("60", "mwei")
        await usdcToken.transfer(bob, mAmount, {from: alice})

        console.log(`DAI %s,BAT %s USDC %`,
        daiBal0.toString(),batBal0.toString(),usdcBal0.toString())
  
        const allowAmount = web3.utils.toWei("10", "ether")
        await daiToken.approve(lpCoreAddr, allowAmount, {from: alice})
        await batToken.approve(lpCoreAddr, allowAmount, {from: alice}) 
        await this.lpContractProxy.deposit(daiToken.address, allowAmount, 0, {from:alice}); 
        await this.lpContractProxy.deposit(batToken.address, allowAmount, 0, {from:alice}) 
 
        let balance1 = await daiToken.balanceOf(alice)
        

    }).timeout(500000);

 


    it("alic borrow USDT", async () => { 

        let usdcToken = this.USDC;
        let [,alice,bob,tom] = accounts

        const amount = web3.utils.toWei("2", "mwei")
        let tx = await this.lpContractProxy.borrow(usdcToken.address, amount,2, 0, {from:alice}) 
         
        console.log(this.lpDataPrividerContract.address)
        let foo = await this.lpDataPrividerContract.calculateUserGlobalData(alice);

        // aaveMarket.calculateUserGlobalData(alice,foo,"300");

        // console.log(tx.tx)
    }).timeout(500000);
})

