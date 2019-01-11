const ora = require('ora');

const { EAC, Util } = require('@ethereum-alarm-clock/lib');

const {
  checkOptionsForWalletAndPassword,
  loadWalletFromKeystoreFile,
} = require('./utils');

const fund = async (amt, program) => {
  const web3 = Util.getWeb3FromProviderUrl(program.provider);
  // eslint-disable-next-line global-require
  const eac = new EAC(web3);

  checkOptionsForWalletAndPassword(program);

  if (!await eac.Util.checkForUnlockedAccount()) {
    throw new Error('Must be running a local node with unlocked account to use this command.');
  }

  const spinner = ora('Sending the funding transactions...');

  const wallet = loadWalletFromKeystoreFile(web3, program.wallet, program.password);

  const wei = web3.utils.toWei(amt, 'ether');

  try {
    const res = await Promise.all(
      wallet.getAddresses().map(address => new Promise((resolve, reject) => {
        web3.eth.sendTransaction({
          from: web3.eth.defaultAccount,
          to: address,
          value: wei,
          gas: 3000000,
          gasPrice: web3.utils.toWei('5', 'gwei'),
        }, (err, txhash) => {
          if (err) reject(err);
          else {
            eac.Util.waitForTransactionToBeMined(txhash)
              .then(receipt => resolve(receipt))
              .catch(reject);
          }
        });
      })),
    );

    const successValues = [1, '0x1', '0x01', true];

    res.forEach((receipt) => {
      if (successValues.indexOf(receipt.status) === -1) {
        spinner.fail(`Funding to ${receipt.to} failed.`);
        throw new Error('Error!');
      }
    });
    spinner.succeed('Accounts funded!');
  } catch (e) { spinner.fail(e); }
};

module.exports = fund;
