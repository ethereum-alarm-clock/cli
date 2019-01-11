async function scheduleUsingWallet({
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
},
web3,
eac) {
  const timestampScheduling = temporalUnit === 2;

  let receipt;

  try {
    receipt = await eac.schedule({
      from: web3.eth.accounts.wallet[0].address,
      toAddress,
      callGas,
      callData,
      callValue,
      windowSize,
      windowStart,
      gasPrice,
      fee,
      bounty,
      requiredDeposit,
      timestampScheduling,
    });
  } catch (err) {
    throw err;
  }

  return {
    receipt,
    success: true,
  };
}

module.exports = {
  scheduleUsingWallet,
};
