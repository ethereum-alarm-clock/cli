#!/usr/bin/env node

const Bb = require("bluebird");
const initWeb3 = require('./initWeb3');
const program = require('./program');

const getDefaultValues = async (web3) => {
  const gasPrice = await Bb.fromCallback(cb => web3.eth.getGasPrice(cb));
  return {
    callGas: 100000,
    callValue: web3.toWei('10', 'gwei'),
    windowSizeBlock: 255,
    windowSizeTs: 255 * 12,
    gasPrice,
    fee: 777,
    bounty: web3.toWei('10', 'finney'),
    deposit: 999,
    recipient: '0x00360d2b7D240Ec0643B6D819ba81A09e40E5bCd',
    callData: '0x0',
  }
}

/**
 * MAIN (SPAM_TX)
 */
const main = async () => {
  // First checks,
  if (!program.wallet || !program.password) {
    throw new Error('Must pass a keystore and password arguments.');
  }

  // Second inits,
  const web3 = initWeb3(program.provider); 
  const eac = require('eac.js-lib')(web3);

  // Third wallet,
  const wallet = new Wallet(web3);
  wallet.decrypt(JSON.parse(fs.readFileSync(program.wallet[0])), program.password);

  // Fourth logic,
  const defaultValues = await getDefaultValues(web3);

  const eacScheduler = await eac.scheduler();
  const bScheduler = eacScheduler.blockScheduler;
  const tsScheduler = eacScheduler.timestampScheduler;

  let data;
  let target;
  let repeat = program.repeat;
  while(repeat--) {
    const getEndowmentFromValues = (values) => {
      eac.Util.calcEndowment(
        new BigNumber(values.callGas),
        new BigNumber(values.callValue),
        new BigNumber(values.gasPrice),
        new BigNumber(values.fee),
        new BigNumber(values.bounty),
      );
    }
    const endowment = getEndowmentFromValues(defaultValues);

    let tempUnit = ((repeat % 2) === 0)? 2 : 1;
    if (tempUnit === 1) {
      target = bScheduler.address;
      data = bScheduler.schedule.getData(
        defaultValues.recipient,
        defaultValues.callData,
        [
          defaultValues.callGas,
          defaultValues.callValue,
          defaultValues.windowSizeBlock,
          TODOWINDOWSTART,
          defaultValues.gasPrice,
          defaultValues.fee,
          defaultValues.bounty,
          defaultValues.deposit,
        ]
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
          TODOWINDOWSTART,
          defaultValues.gasPrice,
          defaultValues.fee,
          defaultValues.bounty,
          defaultValues.deposit,
        ]
      );
    }
  }
}

try { main(); } catch (e) { console.error(e); }