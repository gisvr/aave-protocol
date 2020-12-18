
# [Aave Protocol](https://aave.com/) &middot; [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
 
 
## Audits report

- [Trails of Bits Smart Contracts audit](docs/audit/ToB_aave_protocol_final_report.pdf)

- [Open Zeppelin Smart Contracts](https://blog.openzeppelin.com/aave-protocol-audit/)

## Compile
```base
truffle compile
```


## Depoly
truffle migrate --reset
--f ：从number指定的迁移脚本开始运行。number指向迁移脚本文件的前缀
--to : 运行到number指定的迁移脚本


## test
truffle develop
 
## 代码分析
重入问题
[ReentrancyGuard](/Users/liyu/github/mars/aave-protocol/node_modules/openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol)

```js
pragma solidity ^0.5.0;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the `nonReentrant` modifier
 * available, which can be aplied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 */
contract ReentrancyGuard {
    /// @dev counter to allow mutex lock with only one SSTORE operation
    uint256 private _guardCounter;

    constructor () internal {
        // The counter starts at one to prevent changing it from zero to a non-zero
        // value, which is a more expensive operation.
        _guardCounter = 1;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and make it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _guardCounter += 1;
        uint256 localCounter = _guardCounter;
        _;
        require(localCounter == _guardCounter, "ReentrancyGuard: reentrant call");
    }
}
```
 
### 调试
 remixd -s ~/dev/defi/mint-protocol/contracts --remix-ide https://remix.ethereum.org
 
 ### 代理模型
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




