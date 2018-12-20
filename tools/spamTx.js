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
  const web3 = Util.getWeb3FromProviderUrl(program.providers[0]);
  const eac = new EAC(web3);
  const config = new Config({ providerUrls: program.providers });
  const { logger } = config;

  // Third wallet,
  const wallet = loadWalletFromKeystoreFile(web3, program.wallet, program.password);
  wallet.logger = logger;

  // Fourth logic,
  const defaultValues = await getDefaultValues(web3);

  const eacScheduler = await eac.scheduler();
  const bScheduler = eacScheduler.blockScheduler;
  const tsScheduler = eacScheduler.timestampScheduler;

  const spam = async () => {
    let data;
    let target;
    let { repeat } = program;

    while (repeat) {
      const getEndowmentFromValues = (values) => {
        return Util.calcEndowment(
          new BigNumber(values.callGas),
          new BigNumber(values.callValue),
          new BigNumber(values.gasPrice),
          new BigNumber(values.fee),
          new BigNumber(values.bounty),
        );
      };
      const endowment = getEndowmentFromValues(defaultValues);

      const tempUnit = ((repeat % 2) === 0) ? 2 : 1;

      const getRandWindowStart = async (temporalUnit) => {
        const curBlock = await Bb.fromCallback(cb => web3.eth.getBlock('latest', cb));
        const rand = Math.floor(Math.random() * 30);
        if (temporalUnit === 1) {
          return program.lengthMod * (curBlock.number + 25 + rand);
        }
        if (temporalUnit === 2) {
          return program.lengthMod * (curBlock.timestamp + (25 * 12) + (rand * 12));
        }
      };

      if (tempUnit === 1) {
        target = bScheduler.address;
        data = bScheduler.schedule.getData(
          defaultValues.recipient,
          defaultValues.callData,
          [
            defaultValues.callGas,
            defaultValues.callValue,
            defaultValues.windowSizeBlock,
            await getRandWindowStart(tempUnit),
            defaultValues.gasPrice,
            defaultValues.fee,
            defaultValues.bounty,
            defaultValues.deposit,
          ],
        );
      } else if (tempUnit === 2) {
        target = tsScheduler.address;
        data = tsScheduler.schedule.getData(
          defaultValues.recipient,
          defaultValues.callData,
          [
            defaultValues.callGas,
            defaultValues.callValue,
            defaultValues.windowSizeTs,
            await getRandWindowStart(tempUnit),
            defaultValues.gasPrice,
            defaultValues.fee,
            defaultValues.bounty,
            defaultValues.deposit,
          ],
        );
      } else {
        throw new Error('Invalid temporal unit.');
      }

      try {
        const price = Math.floor(web3.utils.toWei('6', 'gwei') * program.gasPrice);
        const { receipt } = await wallet.sendFromNext({
          to: target,
          value: endowment.toNumber(),
          gas: 3000000,
          gasPrice: price,
          data,
        });

        if (!receipt.status) {
          throw new Error('Sending transaction failed.');
        }
        const addressOf = eac.getTxRequestFromReceipt(receipt);
        console.log(
          `Address of txRequest: ${addressOf} TransactionHash: ${receipt.transactionHash}\n`
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
