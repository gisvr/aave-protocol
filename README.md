
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
  
### remixd 调试
 remixd -s ~/dev/defi/mint-protocol/contracts --remix-ide https://remix.ethereum.org
 
## Formatting Code

https://github.com/prettier-solidity/prettier-plugin-solidity