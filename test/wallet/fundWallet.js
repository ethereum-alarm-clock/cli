const { Util } = require('@ethereum-alarm-clock/lib');

// TODO before mainnet - change the default gas / gasPrice
// to dynamically calculated values
const fund = (web3, recip, value) => {
  return new Promise((resolve, reject) => {
    web3.eth.sendTransaction({
      from: web3.eth.defaultAccount,
      to: recip,
      value,
      gas: 3000000,
      gasPrice: web3.utils.toWei('100', 'gwei'),
    },
    (err, txHash) => {
      if (err) reject(err);
      else {
        Util.waitForTransactionToBeMined(web3, txHash)
          .then(receipt => resolve(receipt))
          .catch(reject);
      }
    });
  });
};

const fundAccounts = async (web3, etherAmount, wallet) => {
  const amountInWei = web3.utils.toWei(etherAmount, 'ether');

  return Promise.all(wallet.getAddresses().map(address => fund(web3, address, amountInWei)));
};

module.exports = fundAccounts;
