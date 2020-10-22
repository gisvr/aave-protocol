#!/bin/bash
truffle-flattener ../contracts/configuration/LendingPoolParametersProvider.sol  >  1.LendingPoolParametersProvider.sol
truffle-flattener ../contracts/fees/FeeProvider.sol > 2.FeeProvider.sol
truffle-flattener ../contracts/lendingpool/LendingPoolParamsProvider.sol >3.LendingPoolParamsProvider.sol