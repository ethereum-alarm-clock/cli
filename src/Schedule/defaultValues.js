
const getDefaultValues = async (web3) => {
  let gasPrice = await new Promise((resolve) => {
    web3.eth.getGasPrice((err, res) => {
      resolve(res);
    });
  });

  if (!gasPrice) {
    gasPrice = web3.utils.toWei('10', 'gwei');
  }

  return {
    bounty: gasPrice * 1e5,
    callGas: 1e5,
    callValue: web3.utils.toWei('15', 'gwei'),
    deposit: web3.utils.toWei('20', 'gwei'),
    fee: web3.utils.toWei('12', 'gwei'),
    gasPrice,
    windowSize: 255,
  };
};

module.exports = {
  getDefaultValues,
};
