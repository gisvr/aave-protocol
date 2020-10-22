
# [Aave Protocol](https://aave.com/) &middot; [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Open source implementation of the Aave Decentralized Lending Pools protocol. Version 1.0


## Documentation

It is possible to find documention to integrate the Aave Protocol on [developers.aave.com](https://developers.aave.com)

For a deep explanation of the Aave Protocol, read the [White Paper](./docs/Aave_Protocol_Whitepaper_v1_0.pdf)


## Source code

The source code included is the final production version of the protocol. Eventual changes (smart contracts updates, bug fixes, etc.) will be applied through subsequent merge requests.

## Audits report

- [Trails of Bits Smart Contracts audit](docs/audit/ToB_aave_protocol_final_report.pdf)

- [Open Zeppelin Smart Contracts](https://blog.openzeppelin.com/aave-protocol-audit/)

## Compile
```base
truffle compile
truffle console
```


## Depoly
truffle migrate --reset
--f ：从number指定的迁移脚本开始运行。number指向迁移脚本文件的前缀
--to : 运行到number指定的迁移脚本


## test
truffle test ./test/call.js



## 代码分析
Address Provier 管理相关的合约走的都是 可初始化的可升级管理代理
> openzplin的 InitializableAdminUpgradeabilityProxy 
>
创建atokend的方法在 LendingPoolConfigurator 合约的 initReserveWithData 方法。 只有LendingPoolManager 能够执行

``` 
 function initialize(LendingPoolAddressesProvider _poolAddressesProvider) public initializer {
        poolAddressesProvider = _poolAddressesProvider;
    }
```

  
initReserve 
``` 

function initReserve(
        address _reserve,
        uint8 _underlyingAssetDecimals,
        address _interestRateStrategyAddress
    ) external onlyLendingPoolManager {
        ERC20Detailed asset = ERC20Detailed(_reserve);

        string memory aTokenName = string(abi.encodePacked("Aave Interest bearing ", asset.name()));
        string memory aTokenSymbol = string(abi.encodePacked("a", asset.symbol()));

        initReserveWithData(
            _reserve,
            aTokenName,
            aTokenSymbol,
            _underlyingAssetDecimals,
            _interestRateStrategyAddress
        );

    }
```

initReserveWithData onlyLendingPoolManager
``` 
function initReserveWithData(
        address _reserve,
        string memory _aTokenName,
        string memory _aTokenSymbol,
        uint8 _underlyingAssetDecimals,
        address _interestRateStrategyAddress
    ) public onlyLendingPoolManager {}
```



LendingPoolCore 合约中
initReserve  onlyLendingPoolConfigurator
``` 
function initReserve(
        address _reserve,
        address _aTokenAddress,
        uint256 _decimals,
        address _interestRateStrategyAddress
    ) external onlyLendingPoolConfigurator {}
```




