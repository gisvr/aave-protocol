const newLocal = 'bignumber.js';
const BigNumber = require(newLocal);

let toRay = (num) => {
  const oneRay = new BigNumber(Math.pow(10, 27));
  return new BigNumber(num).multipliedBy(oneRay).toFixed();
};

const oneEth = new BigNumber(Math.pow(10, 18));
// strategy: {
//     optimalUtilizationRate:toRay(0.65),
//     baseVariableBorrowRate: toRay(0),
//     variableRateSlope1: toRay(0.08),
//     variableRateSlope2: toRay(0.6),
//     stableRateSlope1: toRay(0.6),
//     stableRateSlope2: toRay(1),
// }
module.exports = {
  node: {
    url: "http://39.102.101.142:8555",
    network_id: '8555',
    from: ""
  }

};
