const BigNumber = require('bignumber.js');
const clear = require('clear');
const ora = require('ora');
const rls = require('readline-sync');

const { getDefaultValues } = require('./defaultValues');
const ReadInput = require('./readInput');
const { W3Util } = require('@ethereum-alarm-clock/timenode-core');
const w3Util = new W3Util();

const {
  checkOptionsForWalletAndPassword,
  loadWalletFromKeystoreFile,
} = require('../Wallet/utils');

const { scheduleUsingWallet } = require('./helpers');

const MINIMUM_PERIOD_BEFORE_SCHEDULE = (tempUnit) => {
  if (tempUnit === 1) {
    return 15;
  } if (tempUnit === 2) {
    return 15 * 12;
  } throw new Error(`Invalid temporal unit: ${tempUnit}`);
};

const schedule = async (options, program) => {
  const web3 = W3Util.getWeb3FromProviderUrl(program.provider);
  // eslint-disable-next-line global-require
  const eac = require('eac.js-lib')(web3);

  const defaultValues = await getDefaultValues(web3);

  if (!await eac.Util.checkNetworkID()) {
    throw new Error('You are not using a supported network. Please use Ethereum mainnet, ropsten, kovan or rinkeby.');
  }

  checkOptionsForWalletAndPassword(program);

  const wallet = loadWalletFromKeystoreFile(web3, program.wallet, program.password);

  // Initiate the shedule parameters.
  let jsonParams = {};
  if (options.json) {
    jsonParams = JSON.parse(options.json);
  }

  const temporalUnit = program.temporalUnit ? program.temporalUnit : jsonParams.temporalUnit;
  const to = program.to ? program.to : jsonParams.to;
  const callData = program.callData ? program.callData : jsonParams.callData;
  const callGas = program.callGas ? program.callGas : jsonParams.callGas;
  const callValue = program.callValue ? program.callValue : jsonParams.callValue;

  const windowStart = program.windowStart ? program.windowStart : jsonParams.windowStart;
  const windowSize = program.windowSize ? program.windowSize : jsonParams.windowSize;

  const gasPrice = program.gasPrice ? program.gasPrice : jsonParams.gasPrice;
  const fee = program.fee ? program.fee : jsonParams.fee;
  const bounty = program.bounty ? program.bounty : jsonParams.bounty;
  const requiredDeposit = program.requiredDeposit ? program.requiredDeposit : jsonParams.requiredDeposit;

  // Validation
  const soonestScheduleTime = currentBlockNumber + MINIMUM_PERIOD_BEFORE_SCHEDULE(temporalUnit);
  if (windowStart < soonestScheduleTime) {
    throw new Error(`Window start of ${windowStart} too soon.\nSoonest Schedule Time: ${soonestScheduleTime}`);
  }

  // Calculate the required endowment according to these params.
  const endowment = eac.Util.calcEndowment(
    new BigNumber(callGas),
    new BigNumber(callValue),
    new BigNumber(gasPrice),
    new BigNumber(fee),
    new BigNumber(bounty),
  );

  console.log('You have inputted the following parameters: ')
  console.log(`To: ${to}`);
  console.log(`Call Data: ${callData}`);
  console.log(`Call Gas: ${callGas}`);
  console.log(`Window Size: ${windowSize}`);
  console.log(`Window Start: ${windowStart}`);
  console.log(`Gas Price: ${gasPrice}`);
  console.log(`Fee: ${fee}`);
  console.log(`Bounty: ${bounty}`);
  console.log(`Required Deposit: ${requiredDeposit}`);
  console.log('\n');
  console.log(`Sending from: ${wallet.getAddresses()[0]}`);
  console.log(`Transaction will send: ${web3.fromWei(endowment.toString())} ether`);

  const confirmed = rls.question('Are the above parameters correct? [Y/n]\n');
  if (confirmed.toLowerCase() !== 'y' && confirmed !== '') {
    throw new Error('You did not confirm the parameters.');
  }

  // Set up the spinner.
  console.log('\n');
  const spinner = ora('Sending the scheduling transaction...').start();

  try {
    const { receipt, success } = await scheduleUsingWallet({
      to,
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
    }, web3, eac, wallet);

    if (success) {
      spinner.succeed(`Transaction successful. Transaction Hash: ${receipt.transactionHash}\n`);
      console.log(`Address of scheduled transaction: ${eac.Util.getTxRequestFromReceipt(receipt)}`);
    } else {
      spinner.fail('Transaction failed.');
    }
  } catch (e) {
    spinner.fail(`Transaction failed.\n\nError: ${e}`);
  }
};

module.exports = schedule;
