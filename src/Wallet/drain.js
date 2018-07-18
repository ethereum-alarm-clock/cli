const BigNumber = require('bignumber.js');
const ethUtil = require('ethereumjs-util');
const ora = require('ora');

const initWeb3 = require('../../tools/initWeb3');

const { 
  checkOptionsForWalletAndPassword,
  loadWalletFromKeystoreFile,
} = require('./utils');

const drain = async (target, program) => {
  // Init Web3
  const web3 = initWeb3(program.provider);
  const eac = require('eac.js-lib')(web3);

  checkOptionsForWalletAndPassword(program);

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
    const wallet = loadWalletFromKeystoreFile(web3, program.wallet, program.password);
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

module.exports = drain;