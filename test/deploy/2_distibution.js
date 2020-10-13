// ============ Contracts ============

const LendingPoolAddressProvider = artifacts.require("LendingPoolAddressesProvider");
const LendingPoolParametersProvider = artifacts.require("LendingPoolParametersProvider");
const LendingPool = artifacts.require("LendingPool");
const LendingPoolCore = artifacts.require("LendingPoolCore");
const LendingPoolDataProvider = artifacts.require("LendingPoolDataProvider");
const LendingPoolConfigurator = artifacts.require("LendingPoolConfigurator");
const LendingPoolLiquidationManager = artifacts.require("LendingPoolLiquidationManager");
const CoreLibrary = artifacts.require("CoreLibrary")
const VersionedInitializable = artifacts.require("VersionedInitializable")

const FeeProvider = artifacts.require("FeeProvider");
const PriceOracle = artifacts.require("PriceOracle");
const LendingRateOracle = artifacts.require("LendingRateOracle");

const TokenDistributor = artifacts.require("TokenDistributor");


// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
  await Promise.all([
    deployDistribution(deployer, network, accounts),
  ]);
};

module.exports = migration;

// ============ Deploy Functions ============


async function deployDistribution(deployer, network, accounts) {
  console.log(network)

  // deployed first
  await deployer.deploy(LendingPoolAddressProvider);
  console.log("LendingPoolAddressProvider address", LendingPoolAddressProvider.address)

  // await deployer.deploy(CoreLibrary);
  // await deployer.link(CoreLibrary,LendingPoolCore)
  // await deployer.deploy(LendingPoolCore, LendingPoolAddressProvider.address);
  // console.log("LendingPoolCore address", LendingPoolCore.address)

  // await deployer.deploy(LendingPoolDataProvider, LendingPoolAddressProvider.address);
  // console.log("LendingPoolDataProvider address", LendingPoolDataProvider.address)

  // await deployer.deploy(LendingPoolParametersProvider, LendingPoolAddressProvider.address);
  // console.log("LendingPoolParametersProvider address", LendingPoolParametersProvider.address)

  // await deployer.deploy(LendingPool, LendingPoolAddressProvider.address);
  // console.log("LendingPool address", LendingPool.address)

  // await deployer.deploy(LendingPoolConfigurator, LendingPoolAddressProvider.address);
  // console.log("LendingPoolConfigurator address", LendingPool.address)

  // await deployer.deploy(FeeProvider, LendingPoolAddressProvider.address);
  // console.log("FeeProvider address", LendingPool.address)

  // await deployer.deploy(PriceOracle);
  // console.log("PriceOracle address", PriceOracle.address)

  // await deployer.deploy(LendingRateOracle);
  // console.log("LendingRateOracle address", LendingRateOracle.address)

  // await deployer.deploy(TokenDistributor);
  // console.log("TokenDistributor address", LendingRateOracle.address)

  // await deployer.deploy(LendingPoolLiquidationManager);
  // console.log("LendingPoolLiquidationManager address", LendingPoolLiquidationManager.address)

  // let lendingPoolAP = new web3.eth.Contract(LendingPoolAddressProvider.abi, LendingPoolAddressProvider.address);

  // await lendingPoolAP.methods.setLendingPoolManager(accounts[0]).send({from: accounts[0], gas: 100000});
  // await lendingPoolAP.methods.setLendingPoolCoreImpl(LendingPoolCore.address).send({from: accounts[0], gas: 100000});
  // await lendingPoolAP.methods.setLendingPoolDataProviderImpl(LendingPoolDataProvider.address).send({from: accounts[0], gas: 100000});
  // await lendingPoolAP.methods.setLendingPoolParametersProviderImpl(LendingPoolParametersProvider.address).send({from: accounts[0], gas: 100000});
  // await lendingPoolAP.methods.setLendingPoolImpl(LendingPool.address).send({from: accounts[0], gas: 100000});
  // await lendingPoolAP.methods.setFeeProviderImpl(FeeProvider.address).send({from: accounts[0], gas: 100000});
  // await lendingPoolAP.methods.setLendingPoolConfiguratorImpl(LendingPoolConfigurator.address).send({from: accounts[0], gas: 100000});

  // await lendingPoolAP.methods.setPriceOracle(PriceOracle.address).send({from: accounts[0], gas: 100000});
  // await lendingPoolAP.methods.setLendingRateOracle(LendingRateOracle.address).send({from: accounts[0], gas: 100000});

  // await lendingPoolAP.methods.setLendingPoolLiquidationManager(LendingPoolLiquidationManager.address).send({from: accounts[0], gas: 100000});
  // await lendingPoolAP.methods.setTokenDistributor(TokenDistributor.address).send({from: accounts[0], gas: 100000});

}


async function deployDistribution2(deployer, network, accounts) {
  console.log(network)

  // // deployed first
  // await deployer.deploy(LendingPoolAddressProvider);
  // console.log("LendingPoolAddressProvider address", LendingPoolAddressProvider.address)

  await deployer.deploy(CoreLibrary);
  await deployer.link(CoreLibrary,LendingPoolCore)
  await deployer.deploy(LendingPoolCore, LendingPoolAddressProvider.address);
  console.log("LendingPoolCore address", LendingPoolCore.address)

  await deployer.deploy(LendingPoolDataProvider, LendingPoolAddressProvider.address);
  console.log("LendingPoolDataProvider address", LendingPoolDataProvider.address)

  await deployer.deploy(LendingPoolParametersProvider, LendingPoolAddressProvider.address);
  console.log("LendingPoolParametersProvider address", LendingPoolParametersProvider.address)

  await deployer.deploy(LendingPool, LendingPoolAddressProvider.address);
  console.log("LendingPool address", LendingPool.address)

  await deployer.deploy(LendingPoolConfigurator, LendingPoolAddressProvider.address);
  console.log("LendingPoolConfigurator address", LendingPool.address)

  await deployer.deploy(FeeProvider, LendingPoolAddressProvider.address);
  console.log("FeeProvider address", LendingPool.address)

  await deployer.deploy(PriceOracle);
  console.log("PriceOracle address", PriceOracle.address)

  await deployer.deploy(LendingRateOracle);
  console.log("LendingRateOracle address", LendingRateOracle.address)

  await deployer.deploy(TokenDistributor);
  console.log("TokenDistributor address", LendingRateOracle.address)

  await deployer.deploy(LendingPoolLiquidationManager);
  console.log("LendingPoolLiquidationManager address", LendingPoolLiquidationManager.address)

  let lendingPoolAP = new web3.eth.Contract(LendingPoolAddressProvider.abi, LendingPoolAddressProvider.address);

  await lendingPoolAP.methods.setLendingPoolManager(accounts[0]).send({from: accounts[0], gas: 100000});
  await lendingPoolAP.methods.setLendingPoolCoreImpl(LendingPoolCore.address).send({from: accounts[0], gas: 100000});
  await lendingPoolAP.methods.setLendingPoolDataProviderImpl(LendingPoolDataProvider.address).send({from: accounts[0], gas: 100000});
  await lendingPoolAP.methods.setLendingPoolParametersProviderImpl(LendingPoolParametersProvider.address).send({from: accounts[0], gas: 100000});
  await lendingPoolAP.methods.setLendingPoolImpl(LendingPool.address).send({from: accounts[0], gas: 100000});
  await lendingPoolAP.methods.setFeeProviderImpl(FeeProvider.address).send({from: accounts[0], gas: 100000});
  await lendingPoolAP.methods.setLendingPoolConfiguratorImpl(LendingPoolConfigurator.address).send({from: accounts[0], gas: 100000});

  await lendingPoolAP.methods.setPriceOracle(PriceOracle.address).send({from: accounts[0], gas: 100000});
  await lendingPoolAP.methods.setLendingRateOracle(LendingRateOracle.address).send({from: accounts[0], gas: 100000});

  await lendingPoolAP.methods.setLendingPoolLiquidationManager(LendingPoolLiquidationManager.address).send({from: accounts[0], gas: 100000});
  await lendingPoolAP.methods.setTokenDistributor(TokenDistributor.address).send({from: accounts[0], gas: 100000});

}