const BigNumber = require('bignumber.js');
const clear = require('clear');
const rls = require('readline-sync');
const Web3 = require('web3');

const ReadInput = require('./readInput');

const {
  checkOptionsForWalletAndPassword,
  loadWalletFromKeystoreFile,
} = require('../Wallet/utils');

const MINIMUM_PERIOD_BEFORE_SCHEDULE = (tempUnit) => {
  if (tempUnit === 1) {
    return 15;
  } else if (tempUnit === 2) {
    return 15 * 12;
  } else { throw `Invalid temporal unit: ${tempUnit}`; }
}

const schedule = async (options, program) => {
  const web3 = new Web3(program.provider);
  const eac = require('eac.js-lib')(web3);
  const eacScheduler = await eac.scheduler();

  // TODO
  const defaultValues = await getDefaultValues();

  // TODO check network ID
  if (!await eac.Util.checkNetworkId()) {
    throw 'Must be using the Kovan or Ropsten testnetworks.';
  }

  checkOptionsForWalletAndPassword(program);
  
  const wallet = loadWalletFromKeystoreFile(web3, program.wallet, program.password);

  // Initiate the shedule parameters.
  let scheduleParams = {};
  if (options.json) {
    scheduleParams = JSON.parse(options.json);
  }

  // Initiate the input reader.
  const readInput = new ReadInput(web3, options, defaultValues);

  // Start the wizard.
  clear();
  console.log('Welcome to the scheduling wizard!');

  // See if we were provided the parameters in JSON or
  // ask the user for them interactively.

  const temporalUnit = scheduleParams.temporalUnit || readInput.readTemporalUnit()
  const recipient = scheduleParams.recipient || readInput.readRecipientAddress()
  const callData = scheduleParams.callData || readInput.readCallData()
  const callGas = scheduleParams.callGas || readInput.readCallGas()
  const callValue = scheduleParams.callValue || readInput.readCallValue()

  const currentBlockNumber = await eac.Util.getBlockNumber()

  const windowStart = scheduleParams.windowStart || readInput.readWindowStart(currentBlockNumber)
  const windowSize = scheduleParams.windowSize || readInput.readWindowSize()

  const soonestScheduleTime = currentBlockNumber + MINIMUM_PERIOD_BEFORE_SCHEDULE(temporalUnit);
  if (windowStart < soonestScheduleTime) {
    throw `Window start of ${windowStart} too soon.\nSoonest Schedule Time: ${soonestScheduleTime}`;
  }

  const gasPrice = scheduleParams.gasPrice || readInput.readGasPrice()
  const fee = scheduleParams.fee || readInput.readFee()
  const bounty = scheduleParams.bounty ||  readInput.readBounty()
  const requiredDeposit = scheduleParams.deposit || readInput.readDeposit()

  // Calculate the required endowment according to these params.
  const endowment = eac.Util.calcEndowment(
    new BigNumber(callGas),
    new BigNumber(callValue),
    new BigNumber(gasPrice),
    new BigNumber(fee),
    new BigNumber(bounty),
  )

  // We have all the input we need, now we confirm with the user.
  clear();

  console.log(`Recipient: ${recipient}`);
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
  console.log(`Endowment to send: ${web3.toWei(endowment.toString())}`);

  const confirmed = rls.question('Are the above parameters correct? [Y/n]\n');
  if (confirmed.toLowerCase() !== 'y' || confirmed !== '') {
    throw `You did not confirm the parameters.`;
  }

  // Set up the spinner.
  console.log('\n');
  const spinner = ora('Sending the scheduling transaction...');

  // Determine which scheduler to target based on temporal unit.

  let data; // Encoded transaction data.
  let target; // The scheduler address.

  if (temporalUnit === 1) {
    target = eacScheduler.blockScheduler.address;
    data = eacScheduler.blockScheduler.schedule.getData(
      recipient,
      callData,
      [
        callGas,
        callValue,
        windowSize,
        windowStart,
        gasPrice,
        fee,
        bounty,
        requiredDeposit,
      ]
    );
  } else if (temporalUnit === 2) {
    target = eacScheduler.timestampScheduler.address;
    data = eacScheduler.timestampScheduler.schedule.getData(
      recipient,
      callData,
      [
        callGas,
        callValue,
        windowSize,
        windowStart,
        gasPrice,
        fee,
        bounty,
        requiredDeposit,
      ]
    );
  } else { throw `Invalid temporal unit.`; }

  // Send the scheduling transaction.

  try {
    const { receipt } = await wallet.sendFromNext({
      to: target,
      value: endowment,
      gas: 3000000,
      gasPrice: web3.toWei('8', 'gwei'),
      data,
    })

    const successValues = [1, '0x1', '0x01', true];
    if (successValues.indexOf(receipt.status) === -1) {
      spinner.fail(`Transaction failed.`);
      throw `Receipt: ${JSON.stringify(receipt)}`;
    }

    spinner.succeed(`Transaction successful. Transaction Hash: ${receipt.transactionHash}\n`);
    console.log(`Address of scheduled transaction: ${eac.Util.getTxRequestFromReceipt(receipt)}`);
  } catch (e) { spinner.fail(e); }
}

module.exports = schedule;