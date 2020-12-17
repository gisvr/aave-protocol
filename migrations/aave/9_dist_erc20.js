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
let tokenMint = async (Token, total) => {
    let erc20Token = await Token.deployed()
    let tokenDecimals = await erc20Token.decimals()
    let tokenSymbol = await erc20Token.symbol()
    let tokenName = await erc20Token.name()

    let mintTotal = total.mul(ten.pow(tokenDecimals)).toString()
    // console.debug("mintTotal", mintTotal)
    await erc20Token.mint(mintTotal)

    let totalSupply = await erc20Token.totalSupply()
    console.debug(tokenSymbol, tokenName, "address:", erc20Token.address, tokenDecimals.toString(), totalSupply.toString())
}

// ============ Main Migration ============

const total = web3.utils.toBN("20000000")//2000w
module.exports = async (deployer, network, accounts) => {
    let mockToken = [TokenWBTC, TokenDAI,TokenBAT, TokenUSDT,TokenUSDC]
    for (let token of mockToken) {
        await deployer.deploy(token);
        await tokenMint(token, total)
    }
};
