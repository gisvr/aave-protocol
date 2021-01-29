const Migrations = artifacts.require("Migrations");

module.exports = async (deployer,network,accounts) => { 
    let sender = accounts[0]
    let senderBal = await web3.eth.getBalance(sender);
    // let chainId = await web3.eth.getChainId();
    console.log(`Network %s Sender %s Bal %s`,network,sender,senderBal.toString()); //
    deployer.deploy(Migrations);
};
