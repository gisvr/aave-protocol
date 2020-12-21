//
let Web3 = require("web3")
let rpc = "http://39.102.101.142:8545"
let web3 = new Web3(rpc)
let web3Provider =web3.currentProvider; // new Web3.providers.HttpProvider(rpc); //web3.providers.HttpProvider //

const AaveMarket = require("../../utils/aave");
let nodeProvider = require("../../utils/ganache.provider");
let aaveMarket = new  AaveMarket(web3);


let contract = require("@truffle/contract");
let lendingPool = require("../../build/contracts/LendingPool")
let lpProvider = require("../../build/contracts/LendingPoolAddressesProvider")

let ERC20 = require("../../build/contracts/MockBAT")

// let lp = require("../../scripts/case/lpContruct")
let rateOracle = require("../../build/contracts/LendingRateOracle")
let priceOracle = require("../../build/contracts/PriceOracle")

describe("Init Aave", async () => {
    let accounts,lpProviderContract, lpContract, lpCoreAddr, wallet;
    before(async () => {
        accounts = await web3.eth.getAccounts();
        wallet = web3.eth.accounts.wallet

        lpProvider = contract(lpProvider)
        lpProvider.setProvider(web3Provider);
        lpProviderContract =await lpProvider.deployed();

        console.log(lpProviderContract.address)
        lpCoreAddr = await lpProviderContract.getLendingPoolCore();

        //Erc 20
        ERC20 = contract(ERC20)
        ERC20.setProvider(web3Provider);
        ERC20.setWallet(wallet)
        ERC20.defaults({
            from: accounts[0],
            gas: 8e6,
            gasPrice: 20e9
        })

        lpContract = contract(lendingPool)
        lpContract.setProvider(web3Provider);
        // lpContract.setWallet(wallet)
        lpContract.defaults({
            from: accounts[0],
            gas: 8e6,
            gasPrice: 20e9
        })
        let lpAddr = await lpProviderContract.getLendingPool()
        lpContract =await lpContract.at(lpAddr)

        this.lpDataPrivider = await lpProviderContract.getLendingPoolDataProvider();
        this.lpDataPrividerContract = await nodeProvider.getMint("LendingPoolDataProvider", this.lpDataPrivider );
    });

    it("alic deposit DAI BAT", async () => {
        let lpReserves = await lpContract.getReserves()
        console.log("lpReserves", lpReserves)
        let reserve0 = lpReserves[0];
        let bat = lpReserves[1];
        let erc20Contract = await ERC20.at(reserve0);
        let batContract = await ERC20.at(bat);

        let reserve0Name  = await erc20Contract.name();

        let [alic,bob,tom] = accounts

        let useAsCollateral = true;
        // await lpContract.setUserUseReserveAsCollateral(reserve0, useAsCollateral,{from: alic});


        let balance0 = await erc20Contract.balanceOf(alic)
        console.log(reserve0Name,balance0.toString(),erc20Contract.address)

        let batName  = await batContract.name();
        let batBalance0 = await batContract.balanceOf(alic)
        console.log(batName,batBalance0.toString(),batContract.address)

        const allowAmount = web3.utils.toWei("1000", "ether")
        await erc20Contract.approve(lpCoreAddr, allowAmount, {from: alic})
        const amount = web3.utils.toWei("600", "ether")
        let tx = await lpContract.deposit(reserve0, amount, 0, {from:alic}).catch(e => {
            console.log(e)
            throw e
        })

        await batContract.approve(lpCoreAddr, allowAmount, {from: alic})
        await lpContract.deposit(bat, amount, 0, {from:alic}).catch(e => {
            console.log(e)
            throw e
        })

        let balance1 = await erc20Contract.balanceOf(alic)
        console.log(reserve0Name,"deposit",balance1.toString())

        console.log(tx.tx)

    }).timeout(500000);

    it("bob deposit USDC", async () => {
        let lpReserves = await lpContract.getReserves()
        console.log("lpReserves", lpReserves)

        let reserve1 = lpReserves[2];
        let reserve1Contract = await ERC20.at(reserve1)
        let reserve1Name  = await reserve1Contract.name()

        let [alic,bob,tom] = accounts

        let reserve1balance0 = await reserve1Contract.balanceOf(alic)
        console.log(reserve1Name,reserve1balance0.toString())

        const mAllowAmount = web3.utils.toWei("1000", "mwei")
        const mAmount = web3.utils.toWei("600", "mwei")
        await reserve1Contract.transfer(bob, mAmount, {from: alic})
        let balance1 = await reserve1Contract.balanceOf(bob)
        console.log(balance1.toString())

        await reserve1Contract.approve(lpCoreAddr, mAllowAmount, {from: bob})
        await lpContract.deposit(reserve1, mAmount, 0, {from:bob}).catch(e => {
            console.log(e)
            throw e
        })
    }).timeout(500000);


    it("alic borrow USDC", async () => {
        let lpReserves = await lpContract.getReserves()
        console.log("lpReserves", lpReserves)
        let reserve1 = lpReserves[2];
        let reserve1Contract = await ERC20.at(reserve1);
        let reserve1Name  = await reserve1Contract.name();

        let [alic] = accounts
        let reserve1balance0 = await reserve1Contract.balanceOf(alic)
        console.log(reserve1Name,reserve1balance0.toString())


        const amount = web3.utils.toWei("100", "mwei")
        let tx = await lpContract.borrow(reserve1, amount,1, 0, {from:alic}).catch(e => {
            console.log(e)
            throw e
        })
        reserve1balance0 = await reserve1Contract.balanceOf(alic)
        console.log(reserve1Name,reserve1balance0.toString())


        console.log(this.lpDataPrividerContract.address)
        let foo = await this.lpDataPrividerContract.calculateUserGlobalData(alic);

        aaveMarket.calculateUserGlobalData(alic,foo,"300");

        // console.log(tx.tx)
    }).timeout(500000);

    it("bob borrow DAI BAT", async () => {
        let lpReserves = await lpContract.getReserves()
        console.log("lpReserves", lpReserves)
        let reserve1 = lpReserves[0];
        let bat = lpReserves[1];
        let reserve1Contract = await ERC20.at(reserve1);
        let reserve1Name  = await reserve1Contract.name();

        let [bob,alic] = accounts
        let reserve1balance0 = await reserve1Contract.balanceOf(alic)
        console.log(reserve1Name,reserve1balance0.toString())


        const amount = web3.utils.toWei("100", "ether")
        let tx = await lpContract.borrow(reserve1, amount,1, 0, {from:alic}).catch(e => {
            console.log(e)
            throw e
        })

        await lpContract.borrow(bat, amount,1, 0, {from:alic}).catch(e => {
            console.log(e)
            throw e
        })
        reserve1balance0 = await reserve1Contract.balanceOf(alic)
        console.log(reserve1Name,reserve1balance0.toString())

        // console.log(tx.tx)
    }).timeout(500000);
})

