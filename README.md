
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

## Depoly
truffle megrate --reset

## test
truffle test ./test/call.js



## 代码分析
Address Provier 管理相关的合约走的都是 可初始化的可升级管理代理
> openzplin的 InitializableAdminUpgradeabilityProxy 



