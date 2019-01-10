#!/usr/bin/env node

/**
 * To run
 *  ./tools/spamTx.js --wallet <wallet_file> --password <string> --repeat <num_txs>
 *
 * Will alternate between transactions using block number and timestamps as the
 * temporal unit. Creates transactions so that they will immediately be in the claim
 * window and that a TimeNode with `--maxDeposit 1` set will claim. Executions take
 * place in a short while.
 */

const { Config } = require('@ethereum-alarm-clock/timenode-core');
const BigNumber = require('bignumber.js');
const Bb = require('bluebird');
const fs = require('fs');

const { EAC, Util } = require('@ethereum-alarm-clock/lib');
const { checkOptionsForWalletAndPassword, loadWalletFromKeystoreFile } = require('../src/Wallet/utils');
const program = require('./program');

const getDefaultValues = async (web3) => {
  const gasPrice = await Bb.fromCallback(cb => web3.eth.getGasPrice(cb));
  return {
    callGas: 100000,
    callValue: web3.utils.toWei('10', 'gwei'),
    windowSizeBlock: 255,
    windowSizeTs: 255 * 12,
    gasPrice,
    fee: 777,
    bounty: web3.utils.toWei('10', 'gwei'),
    deposit: 999,
    recipient: '0x00360d2b7D240Ec0643B6D819ba81A09e40E5bCd',
    callData: '0x0',
  };
};

/**
 * MAIN (SPAM_TX)
 */
const main = async () => {
  // First checks,
  checkOptionsForWalletAndPassword(program);

  // Second inits,
  const web3 = Util.getWeb3FromProviderUrl(program.provider);
  const eac = new EAC(web3);
  const config = new Config({ providerUrls: [program.provider] });
  const { logger } = config;

  // Third wallet,
  const wallet = loadWalletFromKeystoreFile(web3, program.wallet, program.password);
  wallet.logger = logger;

  // Fourth logic,
  const defaultValues = await getDefaultValues(web3);

  const spam = async () => {
    let { repeat } = program;

    while (repeat) {
      const tempUnit = ((repeat % 2) === 0) ? 2 : 1;

      const getRandWindowStart = async (temporalUnit) => {
        if (temporalUnit !== 1 && temporalUnit !== 2) {
          throw new Error(`Unsupported temporal unit: ${temporalUnit}`);
        }

        const curBlock = await Bb.fromCallback(cb => web3.eth.getBlock('latest', cb));
        const rand = Math.floor(Math.random() * 30);

        if (temporalUnit === 1) {
          return program.lengthMod * (curBlock.number + 25 + rand);
        }

        return program.lengthMod * (curBlock.timestamp + (25 * 12) + (rand * 12));
      };

      const {
        recipient,
        callData,
        callGas,
        callValue,
        windowSize,
        gasPrice,
        fee,
        bounty,
        deposit,
      } = defaultValues;

      const windowStart = await getRandWindowStart(tempUnit);

      try {
        const receipt = await eac.schedule({
          from: web3.eth.accounts.wallet[0].address,
          toAddress: recipient,
          windowStart,
          callData,
          callGas,
          callValue,
          windowSize,
          gasPrice,
          fee,
          bounty,
          requiredDeposit: deposit,
          timestampScheduling: tempUnit === 2,
        });

        if (!receipt.status) {
          throw new Error('Sending transaction failed.');
        }
        const addressOf = eac.getTxRequestFromReceipt(receipt);
        console.log(
          `Address of txRequest: ${addressOf} TransactionHash: ${receipt.transactionHash}`
        );
        fs.appendFileSync('scheduled.txt', `${addressOf}\n`);
      } catch (e) {
        console.error(e);
      }

      repeat -= 1;
    }
  };

  if (program.recurrent) {
    spam();
    setInterval(async () => {
      await spam();
    }, program.recurrent * 1000);
  } else {
    await spam();
    process.exit(0);
  }
};

try {
  main();
} catch (e) {
  console.error(e);
}
