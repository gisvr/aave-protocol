
let nodeProvider = require("../../utils/ganache.provider");
const { BN } = require('@openzeppelin/test-helpers');

let getTokenInfo = async (erc20Token) => {
    let symbol = await erc20Token.symbol();
    let name = await erc20Token.name();
    let address = erc20Token.address;
    let decimals = await erc20Token.decimals();
    let decimalsPow = new BN(10).pow(decimals);
    return { symbol, name, address, decimals, decimalsPow };
};

describe("Init Aave", async () => {
    let accounts, lpProviderContract, lpContract, lpCoreAddr, wallet;
    before(async () => {

        let provider = await nodeProvider.getAaveV1("LendingPoolAddressesProvider");
        let lpAddr = await provider.getLendingPool()
        this.lpContractProxy = await nodeProvider.getAaveV1("LendingPool", lpAddr);
        this.ERC20 = await nodeProvider.getAaveV1("MockLINK");
    });

    it("AAVE V1 info ", async () => {

        let providerAddr = await this.lpContractProxy.addressesProvider()

        console.log(`LendingPoolAddressesProvider %s `,providerAddr)
 
        let lpReserves = await this.lpContractProxy.getReserves()
        let ethAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        for (let addr of lpReserves) {
            if (addr == ethAddr) {
                console.log(`ETH %s 18`,ethAddr)
                continue;
            } 
            let token = await getTokenInfo(await this.ERC20.at(addr))
            console.log(token.symbol, addr, token.decimals.toString())
        }


    }).timeout(500000);
})
