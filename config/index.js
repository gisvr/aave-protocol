module.exports = {
  network: 'geth',
  builder: require('./builder'),
  ganache: require('./ganache'),
  geth: require('./geth'),
  vpsorGanache:require("./vpsorGanache"),
  deploy: {
    gas: 200e4, //gaslimit
    gasPrice: 10e9, //10 Wei
  },
};
