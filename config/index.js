module.exports = {
  network: 'ganache',
  builder: require('./builder'),
  ganache: require('./ganache'),
  deploy: {
    gas: 2000000, //gaslimit
    gasPrice: '10000000000', //10 Wei
  },
};
