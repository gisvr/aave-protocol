
  
## 根据策略初始化AToken initReserve 
``` js

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

### initReserveWithData onlyLendingPoolManager
``` js
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
``` js
function initReserve(
        address _reserve,
        address _aTokenAddress,
        uint256 _decimals,
        address _interestRateStrategyAddress
    ) external onlyLendingPoolConfigurator {}
```
