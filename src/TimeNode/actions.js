const requestInfo = async (config, txRequestAddr) => {
  const { eac, web3, util } = config;
  if (!util.checkValidAddress(txRequestAddr)) {
    console.log('Must pass a valid transaction request address');
    return;
  }
  const txRequest = eac.transactionRequest(txRequestAddr);
  try {
    await txRequest.fillData();
    const now = await txRequest.now();
    const networkGasPrice = await util.networkGasPrice();
    const paymentModifier = await txRequest.claimPaymentModifier();
    const executed = await new Promise(
      resolve => txRequest.instance.Executed(null, { fromBlock: 6204398 })
        .get((err, res) => resolve(res[0])),
    );

    const maxGasReimbursement = txRequest.callGas * txRequest.gasPrice;
    const logETH = value => `${value} (${web3.utils.fromWei(value)} ETH)`;

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
  Bounty: ${txRequest.bounty} (${web3.utils.fromWei(txRequest.bounty)} ETH)
  Bounty with modifier: ${txRequest.bounty} * ${paymentModifier} = ${txRequest.bounty * paymentModifier} (${web3.utils.fromWei(txRequest.bounty * paymentModifier / 100)} ETH)
  Deposit: ${txRequest.requiredDeposit} (${web3.utils.fromWei(txRequest.requiredDeposit)} ETH)
  Max Reimbursement: ${maxGasReimbursement} (${web3.utils.fromWei(maxGasReimbursement)} ETH)
  ---
  Executed at: ${executed ? executed.blockNumber : '---'}
  Executed bounty sent: ${executed ? logETH(executed.args.bounty) : '---'}
  GasUsed: ${executed ? executed.args.measuredGasConsumption : '---'}
  GasUsed Reimbursement: ${executed ? logETH(executed.args.measuredGasConsumption * txRequest.gasPrice) : '---'}
  ---
  GasPrice: ${txRequest.gasPrice} (${web3.utils.fromWei(txRequest.gasPrice, 'gwei')} Gwei) | Network: ${web3.utils.fromWei(networkGasPrice, 'gwei')} Gwei
  Gas: ${txRequest.callGas}
  ---
  Now: ${now}`);
  } catch (err) {
    console.error(err);
  }
};

module.exports = { requestInfo };
