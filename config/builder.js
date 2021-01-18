const { BN } = require('ethereumjs-util');

const newLocal = 'bignumber.js';
const BigNumber = require(newLocal);

let toRay = (num) => {
  const oneRay = new BigNumber(Math.pow(10, 27));
  return new BigNumber(num).multipliedBy(oneRay).toFixed();
};

const oneEth = new BigNumber(Math.pow(10, 18));
module.exports = {
  node: { 
    url:"http://47.75.58.188:8545", 
    network_id: '*',
    from: "" 
  }  
};
