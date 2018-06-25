const BigNumber = require('bignumber.js');
const ethUtil = require('ethereumjs-util');
const ora = require('ora');
const Web3 = require('web3');

const { loadWalletFromKeystoreFile } = require('../wallet/utils');

const drainWallet = async (target, options) => {
  // Init Web3
  const web3 = new Web3(options.provider);
  const eac = require('eac.js-lib')(web3);

  if (!options.wallet || !options.password) {
    throw 'Please provide --wallet and --password flags!';
  }

  if (!ethUtil.isValidAddress(target)) {
    throw 'Please provide a valid Ethereum address as the target.';
  }

  const spinner = ora(
    'Sending the funding transactions...'
  ).start();

  const gas = '21000';
  const gasPrice = await eac.Util.getGasPrice();
  const gasCost = new BigNumber(gas).times(gasPrice);

  try {
    const wallet = loadWalletFromKeystoreFile(web3, options.wallet, options.password);
    await Promise.all(
      wallet.getAddresses().map((address) => {
        return new Promise(async (resolve, reject) => {
          const balance = new BigNumber(await eac.Util.getBalance(address));
          const amount = balance.minus(gasCost);
          try {
            const { receipt } = await wallet.sendFromIndex(
              wallet.getAddresses().indexOf(address),
              {
                to: target,
                value: amount.toString(),
                gas,
                gasPrice,
                data: '',
              }
            );

            resolve(receipt);
          } catch (e) { reject(e); }
        });
      })
    )
    spinner.succeed('Wallet drained.');
  } catch (e) { spinner.fail(e); }
}

module.exports = drainWallet;