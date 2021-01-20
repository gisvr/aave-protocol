module.exports = {
  network: 'ganache',
  builder: require('./builder'),
  ganache: require('./ganache'),
  vpsorGanache:require("./vpsorGanache"),
  deploy: {
    gas: 200e4, //gaslimit
    gasPrice: 10e9, //10 Wei
  },
};
