const { GasPriceUtil } = require('@ethereum-alarm-clock/lib');

const requestInfo = async (config, txRequestAddr) => {
  const { eac, web3, util } = config;

  const gasUtil = new GasPriceUtil(web3);

  if (!util.checkValidAddress(txRequestAddr)) {
    console.log('Must pass a valid transaction request address');
    return;
  }

  const txRequest = eac.transactionRequest(txRequestAddr);

  try {
    await txRequest.fillData();
    const now = await txRequest.now();

    const networkGasPrice = await gasUtil.networkGasPrice();

    const paymentModifier = await txRequest.claimPaymentModifier();

    const executed = await txRequest.executedAt();

    const maxGasReimbursement = txRequest.callGas * txRequest.gasPrice;
    const logETH = value => `${value} (${web3.utils.fromWei(value.toString())} ETH)`;

    console.log(`
  Owner: ${txRequest.owner}
  Claimed By: ${txRequest.isClaimed ? txRequest.claimedBy : 'not claimed'}
  ---
  Unit: ${Number(txRequest.temporalUnit) === 1 ? 'block' : 'time'}
  Claim Window Begins: ${txRequest.claimWindowStart} (t=${now - txRequest.claimWindowStart})
  Freeze Period Begins: ${txRequest.freezePeriodStart} (t=${now - txRequest.freezePeriodStart})
  Execution Window Begins: ${txRequest.windowStart} (t=${now - txRequest.windowStart})
  ---
  Claim Window Size: ${txRequest.claimWindowSize}
  ---
  Bounty: ${txRequest.bounty} (${web3.utils.fromWei(txRequest.bounty.toString())} ETH)
  Bounty with modifier: ${txRequest.bounty} * ${paymentModifier} = ${txRequest.bounty * paymentModifier} (${web3.utils.fromWei((txRequest.bounty * paymentModifier / 100).toString())} ETH)
  Deposit: ${txRequest.requiredDeposit} (${web3.utils.fromWei(txRequest.requiredDeposit.toString())} ETH)
  Max Reimbursement: ${maxGasReimbursement} (${web3.utils.fromWei(maxGasReimbursement.toString())} ETH)
  ---
  Executed at: ${executed ? executed.blockNumber : '---'}
  Executed bounty sent: ${executed ? logETH(executed.args.bounty) : '---'}
  GasUsed: ${executed ? executed.args.measuredGasConsumption : '---'}
  GasUsed Reimbursement: ${executed ? logETH(executed.args.measuredGasConsumption * txRequest.gasPrice) : '---'}
  ---
  GasPrice: ${txRequest.gasPrice} (${web3.utils.fromWei(txRequest.gasPrice.toString(), 'gwei')} Gwei) | Network: ${web3.utils.fromWei(networkGasPrice.toString(), 'gwei')} Gwei
  Gas: ${txRequest.callGas}
  ---
  Now: ${now}`);
  } catch (err) {
    console.error(err);
  }
};

module.exports = { requestInfo };
