const BigNumber = require('bignumber.js');
const clear = require('clear');
const ora = require('ora');
const rls = require('readline-sync');
const fs = require('fs');
const { EAC, Util } = require('@ethereum-alarm-clock/lib');

const { getDefaultValues } = require('./defaultValues');
const ReadInput = require('./readInput');
const { scheduleUsingWallet } = require('./helpers');

const {
  checkOptionsForWalletAndPassword,
  loadWalletFromKeystoreFile,
} = require('../Wallet/utils');

const MINIMUM_PERIOD_BEFORE_SCHEDULE = (tempUnit) => {
  if (tempUnit === 1) {
    return 15;
  } if (tempUnit === 2) {
    return 15 * 12;
  } throw new Error(`Invalid temporal unit: ${tempUnit}`);
};

const schedule = async (options, program) => {
  const web3 = Util.getWeb3FromProviderUrl(program.providers[0]);
  // eslint-disable-next-line global-require
  const eac = new EAC(web3);
  const util = new Util(web3);

  const defaultValues = await getDefaultValues(web3);

  if (!await util.isNetworkSupported()) {
    throw new Error('Must be using the Kovan or Ropsten test network.');
  }

  checkOptionsForWalletAndPassword(program);

  const wallet = loadWalletFromKeystoreFile(web3, program.wallet, program.password);
  console.log(wallet)

  // Initiate the shedule parameters.
  let scheduleParams = {};
  if (options.json) {
    scheduleParams = JSON.parse(options.json);
  }

  // Initiate the input reader.
  const readInput = new ReadInput(web3, options, defaultValues);

  // Start the wizard.
  clear();
  console.log('Welcome to the scheduling wizard!\n');

  // See if we were provided the parameters in JSON or
  // ask the user for them interactively.

  const temporalUnit = scheduleParams.temporalUnit || readInput.readTemporalUnit();
  const toAddress = scheduleParams.recipient || readInput.readRecipientAddress();
  const callData = scheduleParams.callData || readInput.readCallData();
  const callGas = scheduleParams.callGas || readInput.readCallGas();
  const callValue = scheduleParams.callValue || readInput.readCallValue();

  const windowStart = scheduleParams.windowStart || await readInput.readWindowStart();
  const windowSize = scheduleParams.windowSize || readInput.readWindowSize(temporalUnit);

  const currentBlockNumber = await web3.eth.getBlockNumber();
  const soonestScheduleTime = currentBlockNumber + MINIMUM_PERIOD_BEFORE_SCHEDULE(temporalUnit);
  if (windowStart < soonestScheduleTime) {
    throw new Error(`Window start of ${windowStart} too soon.\nSoonest Schedule Time: ${soonestScheduleTime}`);
  }

  const gasPrice = scheduleParams.gasPrice || readInput.readGasPrice();
  const fee = scheduleParams.fee || readInput.readFee();
  const bounty = scheduleParams.bounty || readInput.readBounty();
  const requiredDeposit = scheduleParams.deposit || readInput.readDeposit();

  // Calculate the required endowment according to these params.
  const endowment = Util.calcEndowment(
    new BigNumber(callGas),
    new BigNumber(callValue),
    new BigNumber(gasPrice),
    new BigNumber(fee),
    new BigNumber(bounty),
  );

  // We have all the input we need, now we confirm with the user.
  clear();

  console.log(`Sending to: ${toAddress}`);
  console.log(`Call Data: ${callData}`);
  console.log(`Call Gas: ${callGas}`);
  console.log(`Window Size: ${windowSize}`);
  console.log(`Window Start: ${windowStart}`);
  console.log(`Gas Price: ${gasPrice}`);
  console.log(`Fee: ${fee}`);
  console.log(`Bounty: ${bounty}`);
  console.log(`Required Deposit: ${requiredDeposit}`);
  console.log('\n');
  console.log(`Sending from: ${wallet[0].address}`);
  console.log(`Endowment to send: ${web3.utils.fromWei(endowment.toString())}`);

  const confirmed = rls.question('Are the above parameters correct? [Y/n]\n');
  if (confirmed.toLowerCase() !== 'y' && confirmed !== '') {
    throw new Error('You did not confirm the parameters.');
  }

  // Set up the spinner.
  console.log('\n');
  const spinner = ora('Scheduling the transaction...').start();

  try {
    const { receipt, success } = await scheduleUsingWallet({
      toAddress,
      callData,
      callGas,
      callValue,
      windowSize,
      windowStart,
      gasPrice,
      fee,
      bounty,
      requiredDeposit,
      temporalUnit,
    }, web3, eac);
    console.log(success)
    console.log(receipt)

    if (success) {
      spinner.succeed(`Transaction successful. Transaction Hash: ${receipt.transactionHash}\n`);
      console.log(`Address of scheduled transaction: ${eac.getTxRequestFromReceipt(receipt)}`);
    } else {
      // spinner.fail('Transaction failed.');
    }
  } catch (e) {
    console.error(e)
    // spinner.fail(`Transaction failed.\n\nError: ${e}`);
  }
};

module.exports = schedule;
