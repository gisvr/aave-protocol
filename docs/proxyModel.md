

LendingPoolAddressesProvider contract

Address Provier 管理相关的合约走的都是 可初始化的可升级管理代理
> openzplin的 InitializableAdminUpgradeabilityProxy 
>
创建atokend的方法在 LendingPoolConfigurator 合约的 initReserveWithData 方法。 只有LendingPoolManager 能够执行

``` js
 function initialize(LendingPoolAddressesProvider _poolAddressesProvider) public initializer {
        poolAddressesProvider = _poolAddressesProvider;
    }
```

```js
    /**
    * @dev internal function to update the implementation of a specific component of the protocol
    * @param _id the id of the contract to be updated
    * @param _newAddress the address of the new implementation
    **/
    function updateImplInternal(bytes32 _id, address _newAddress) internal {
        address payable proxyAddress = address(uint160(getAddress(_id)));

        InitializableAdminUpgradeabilityProxy proxy = InitializableAdminUpgradeabilityProxy(proxyAddress);
        bytes memory params = abi.encodeWithSignature("initialize(address)", address(this));

        if (proxyAddress == address(0)) {
            proxy = new InitializableAdminUpgradeabilityProxy();// create contract proxy
            proxy.initialize(_newAddress, address(this), params); // 初始化合约的内容
            _setAddress(_id, address(proxy)); // 在 address map 中增加id 对应的 代理地址
            emit ProxyCreated(_id, address(proxy)); // 创建事件
        } else {
            proxy.upgradeToAndCall(_newAddress, params); // 更新代理地址
        }

    }
```