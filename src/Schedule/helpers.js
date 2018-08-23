const BigNumber = require('bignumber.js');
const spinner = require('ora');

async function scheduleUsingWallet({
  recipient,
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
},
web3,
eac,
wallet) {
  const eacScheduler = await eac.scheduler();

  let data; // Encoded transaction data.
  let target; // The scheduler address.

  // Determine which scheduler to target based on temporal unit.
  if (temporalUnit === 1) {
    target = eacScheduler.blockScheduler.address;
    data = eacScheduler.blockScheduler.schedule.getData(
      recipient,
      callData, [
        callGas,
        callValue,
        windowSize,
        windowStart,
        gasPrice,
        fee,
        bounty,
        requiredDeposit,
      ],
    );
  } else if (temporalUnit === 2) {
    target = eacScheduler.timestampScheduler.address;
    data = eacScheduler.timestampScheduler.schedule.getData(
      recipient,
      callData, [
        callGas,
        callValue,
        windowSize,
        windowStart,
        gasPrice,
        fee,
        bounty,
        requiredDeposit,
      ],
    );
  } else {
    throw new Error('Invalid temporal unit.');
  }

  // Calculate the required endowment according to these params.
  const endowment = eac.Util.calcEndowment(
    new BigNumber(callGas),
    new BigNumber(callValue),
    new BigNumber(gasPrice),
    new BigNumber(fee),
    new BigNumber(bounty),
  );

  // Send the scheduling transaction.

  try {
    const result = await wallet.sendFromNext({
      to: target,
      value: endowment,
      gas: 3000000,
      gasPrice: web3.toWei('8', 'gwei'),
      data,
    });

    if (result.receipt && !('error' in Object.keys(result))) {
      const successValues = [1, '0x1', '0x01', true];
      if (successValues.indexOf(result.receipt.status) === -1) {
        spinner.fail('Transaction failed.');
        throw new Error(`Receipt: ${JSON.stringify(result.receipt)}`);
      }

      return {
        receipt: result.receipt,
        success: true,
      };
    }
    throw new Error(`Error: ${JSON.stringify(result.error)}`);
  } catch (e) {
    throw e;
  }
}

module.exports = {
  scheduleUsingWallet,
};
