
const getDefaultValues = async (web3) => {
  const networkGasPrice = await new Promise((resolve) => {
    web3.eth.getGasPrice((err,res) => {
      resolve(res);
    })
  });

  return {
    bounty: gasPrice * 100000,
    callGas: 100000,
    callValue: web3.toWei('15', 'gwei'),
    deposit: web3.toWei('20', 'gwei'),
    fee: web3.toWei('12', 'gwei'),
    gasPrice,
    windowSize: 255,
  }
}

module.exports = {
  getDefaultValues,
}