const TokenBAT = artifacts.require("MockBAT");
const TokenDAI = artifacts.require("MockDAI");
const TokenLINK = artifacts.require("MockLINK");
const TokenKNC = artifacts.require("MockKNC");
const TokenLEND = artifacts.require("MockLEND");
const TokenMANA = artifacts.require("MockMANA");
const TokenMKR = artifacts.require("MockMKR");
const TokenREP = artifacts.require("MockREP");
const TokenSUSD = artifacts.require("MockSUSD");
const TokenTUSD = artifacts.require("MockTUSD");
const TokenUSDC = artifacts.require("MockUSDC");
const TokenUSDT = artifacts.require("MockUSDT");
const TokenWBTC = artifacts.require("MockWBTC");
const TokenZRX = artifacts.require("MockZRX");

let ten = web3.utils.toBN("10");

//给发行者发放代币
let tokenMint = async (Token, total, accounts) => {
    let [sender, alice, bob, liquid] = accounts;

    let erc20Token = await Token.deployed()
    let tokenDecimals = await erc20Token.decimals()
    let tokenSymbol = await erc20Token.symbol()
    let tokenName = await erc20Token.name()

    let mintTotal = total.mul(ten.pow(tokenDecimals)).toString()
    // console.debug("mintTotal", mintTotal)
    await erc20Token.mint(mintTotal, { from: sender })
    await erc20Token.mint(mintTotal, { from: alice });
    await erc20Token.mint(mintTotal, { from: bob });
    await erc20Token.mint(mintTotal, { from: liquid });

    let totalSupply = await erc20Token.totalSupply()
    console.debug(tokenSymbol, tokenName, "address:", erc20Token.address, tokenDecimals.toString(), totalSupply.toString())
}

// ============ Main Migration ============

const total = web3.utils.toBN("20000000")//2000w
module.exports = async (deployer, network, accounts) => {
    let sender = deployer.networks[network].from;
    accounts[0] = sender;
    //TokenWBTC, TokenDAI,TokenBAT, TokenUSDT,TokenUSDC,//
    let mockToken = [TokenLINK, TokenTUSD, TokenMKR, TokenZRX]
    for (let token of mockToken) {
        await deployer.deploy(token);
        await tokenMint(token, total, accounts)
    }
};
// gancahe
//LINK ChainLink address: 0xd19D06151E87F508dA8e212C586AD814f39E385C 18 80000000000000000000000000
//TUSD TrueUSD address: 0xA5EC08C329dEc2DEec39a7011005D65b5c715995 18 80000000000000000000000000
//MKR Maker address: 0x71bDc50899b367597d9bB62A15145786E9A02977 18 80000000000000000000000000
//ZRX 0x Coin address: 0x5ff81B74762C59f51Be935A079B6198F0436F44e 18 80000000000000000000000000

// geth
// LINK ChainLink address: 0x7e8d705900398b50Bf0c1F0F415ee9cEA4fCF079 18 80000000000000000000000000
// TUSD TrueUSD address: 0x35eb265e66a2EDcD2b01a0fd155546B24268571c 18 80000000000000000000000000
// MKR Maker address: 0xcFaa4Cb635b8f7f5ec892FDB6BAE9Ab2DFFa2cf7 18 80000000000000000000000000
// ZRX 0x Coin address: 0xb0cc994bDa8A8E9C8b93b60AF1277162942E328f 18 80000000000000000000000000