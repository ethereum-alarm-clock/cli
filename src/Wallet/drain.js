const BigNumber = require('bignumber.js');
const ethUtil = require('ethereumjs-util');
const ora = require('ora');

const { W3Util } = require('@ethereum-alarm-clock/timenode-core');
const w3Util = new W3Util();

const {
  checkOptionsForWalletAndPassword,
  loadWalletFromKeystoreFile,
} = require('./utils');

const drain = async (target, program) => {
  // Init Web3
  const web3 = W3Util.getWeb3FromProviderUrl(program.provider);
  // eslint-disable-next-line global-require
  const eac = require('eac.js-lib')(web3);

  checkOptionsForWalletAndPassword(program);

  if (!ethUtil.isValidAddress(target)) {
    throw new Error('Please provide a valid Ethereum address as the target.');
  }

  const spinner = ora(
    'Sending the funding transactions...',
  ).start();

  const gas = '21000';
  const gasPrice = await eac.Util.getGasPrice();
  const gasCost = new BigNumber(gas).times(gasPrice);

  try {
    const wallet = loadWalletFromKeystoreFile(web3, program.wallet, program.password);
    await Promise.all(
      wallet.getAddresses().map(address => new Promise(async (resolve, reject) => {
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
            },
          );

          resolve(receipt);
        } catch (e) { reject(e); }
      })),
    );
    spinner.succeed('Wallet drained.');
  } catch (e) { spinner.fail(e); }
};

module.exports = drain;
