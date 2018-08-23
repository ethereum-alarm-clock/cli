const BigNumber = require('bignumber.js');
const ora = require('ora');
const repl = require('repl');
const { scheduleUsingWallet } = require('../Schedule/helpers');

const start = (timenode) => {
  const { config } = timenode;
  const { eac, web3, util } = config;

  console.log(' '); // blank space
  const replServer = repl.start({ prompt: '>> ' });
  replServer.context.web3 = web3;
  replServer.defineCommand('getBalance', {
    help: 'Get the balance of your accounts.',
    async action() {
      if (config.wallet) {
        config.wallet.getAccounts().forEach(async (account) => {
          const address = account.getAddressString();
          console.log(`${address} | Balance: ${web3.fromWei(await eac.Util.getBalance(address))}`);
        });
      } else {
        const account = web3.eth.defaultAccount;
        console.log(`${account} | Balance: ${web3.fromWei(await eac.Util.getBalance(account))}`);
      }
    },
  });
  replServer.defineCommand('getNow', {
    help: 'Get the latest blockNum and timestamp',
    async action() {
      const block = await util.getBlock('latest');
      console.log(`BlockNum: ${block.number} | Timestamp: ${block.timestamp}`);
    },
  });
  replServer.defineCommand('dumpCache', {
    help: 'Dumps your cache storage.',
    action() {
      if (config.cache.isEmpty()) {
        console.log('\nCACHE EMPTY');
      } else {
        config.cache.stored().forEach((entry) => {
          console.log(`${entry} | ${config.cache.get(entry).windowStart}`);
        });
      }
    },
  });
  replServer.defineCommand('logLevel', {
    help: 'Defines the level to log, 1 - debug/cache, 2 - info, 3- error.',
    action(level) {
      if (level < 1 || level > 3) {
        console.log('Please define 1 for debug, 2 for info, 3 for error.');
        return;
      }
      config.logger.logLevel = level;
    },
  });
  replServer.defineCommand('getStats', {
    help: 'Get some interesting stats on your executing accounts.',
    action() {
      const addresses = config.wallet.getAddresses();
      const claiming = config.claiming ? 'ON' : 'OFF';
      addresses.forEach((address) => {
        const bounties = config.statsDb.totalBounty(address);
        const costs = config.statsDb.totalCost(address);
        const profit = bounties.minus(costs);

        const formatWeiToEther = wei => web3.fromWei(wei, 'ether').toFixed(6);

        console.log(`TimeNode address: ${address}
Ether gain: ${formatWeiToEther(profit)} (${formatWeiToEther(bounties)} bounties - ${formatWeiToEther(costs)} costs)

Discovered: ${config.statsDb.getDiscovered(address).length}
Executions: ${config.statsDb.getSuccessfulExecutions(address).length} successful, ${config.statsDb.getFailedExecutions(address).length} failed
Claiming: ${claiming}, ${config.statsDb.getSuccessfulClaims(address).length} claimed, ${config.statsDb.getFailedClaims(address).length} failed, ${timenode.getClaimedNotExecutedTransactions()[address].length} pending execution`);
      });
    },
  });
  replServer.defineCommand('getClaimed', {
    help: 'Get claimed transactions pending execution.',
    action() {
      const claimedPendingExecution = timenode.getClaimedNotExecutedTransactions();

      let print = `Claimed transactions pending execution (${claimedPendingExecution.length}): \n`;

      let i = 1;
      while (i - 1 < claimedPendingExecution.length) {
        print += `${i}. ${claimedPendingExecution[i - 1]}\n`;
        i += 1;
      }

      console.log(print);
    },
  });
  replServer.defineCommand('getFailedClaims', {
    help: 'Get unsuccessfully claimed transactions.',
    action() {
      const transactions = timenode.getUnsucessfullyClaimedTransactions();

      let print = `Unsuccessfully claimed transactions (${transactions.length}): \n`;

      let i = 1;
      while (i - 1 < transactions.length) {
        print += `${i}. ${transactions[i - 1]}\n`;
        i += 1;
      }

      console.log(print);
    },
  });
  replServer.defineCommand('start', {
    help: 'Starts the TimeNode.',
    action() {
      timenode.startScanning();
    },
  });
  replServer.defineCommand('stop', {
    help: 'Stops the TimeNode.',
    action() {
      timenode.stopScanning();
    },
  });
  replServer.defineCommand('startClaiming', {
    help: 'Starts the TimeNode claiming.',
    action() {
      timenode.startClaiming();
    },
  });
  replServer.defineCommand('stopClaiming', {
    help: 'Stops the TimeNode claiming.',
    action() {
      timenode.stopClaiming();
    },
  });
  // No longer supported
  // replServer.defineCommand("sweepCache", {
  //   help: "Sweeps your cache of expired txRequests.",
  //   action() {
  //     console.log(config.cache)
  //     config.cache.sweepExpired()
  //   },
  // })
  replServer.defineCommand('testTx', {
    help:
      'Send a test transaction to the network (requires unlocked local account).',
    async action() {
      const spinner = ora('Sending test transaction to network...').start();
      const scheduler = await eac.scheduler();

      const blockNumber = await eac.Util.getBlockNumber();

      // Set some meaningless defaults
      const recipient = '0x009f7EfeD908c05df5101DA1557b7CaaB38EE4Ce';
      const callData = web3.fromAscii('s0x'.repeat(Math.floor(Math.random() * 10)));
      const windowStart = (new BigNumber(blockNumber)).plus(30);
      const windowSize = 255;
      const gasPrice = web3.toWei('5', 'gwei');
      const requiredDeposit = 1;
      const callGas = 100000;
      const callValue = 321;
      const fee = 50;
      const bounty = web3.toWei('1', 'finney');
      const temporalUnit = 1;

      if (config.wallet) {
        try {
          const { receipt, success } = await scheduleUsingWallet({
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
          }, web3, eac, config.wallet);

          if (success) {
            spinner.succeed(`Transaction successful. Transaction Hash: ${receipt.transactionHash}\n`);
            console.log(`Address of scheduled transaction: ${eac.Util.getTxRequestFromReceipt(receipt)}`);
          } else {
            spinner.fail('Transaction failed.');
          }
        } catch (e) {
          spinner.fail(`Transaction failed.\n\nError: ${e}`);
        }

        return;
      }

      const endowment = eac.Util.calcEndowment(
        new BigNumber(callGas),
        new BigNumber(callValue),
        new BigNumber(gasPrice),
        new BigNumber(fee),
        new BigNumber(bounty),
      );

      scheduler.initSender({
        from: web3.eth.defaultAccount,
        gas: 3000000,
        value: endowment,
      });

      scheduler.blockSchedule(
        recipient,
        callData,
        callGas,
        callValue,
        windowSize,
        windowStart,
        gasPrice,
        fee, // fee
        bounty, // bounty
        requiredDeposit,
      ).then((receipt) => {
        if (receipt.status !== '0x1') {
          spinner.fail('Transaction failed.');
          return;
        }
        spinner.succeed(`Transaction mined! Hash - ${receipt.transactionHash}`);
      }).catch(err => spinner.fail(err));
    },
  });
  replServer.defineCommand('requestInfo', {
    help:
      'Retrieve info about the transaction request at the passed in address.',
    async action(txRequestAddr) {
      if (!eac.Util.checkValidAddress(txRequestAddr)) {
        console.log('Must pass a valid transaction request address');
        return;
      }
      const txRequest = await eac.transactionRequest(txRequestAddr);
      try {
        await txRequest.fillData();
        console.log(`
Owner: ${txRequest.owner}
Claimed By: ${txRequest.isClaimed ? txRequest.claimedBy : 'not claimed'}
Claim Window Begins: ${txRequest.claimWindowStart}
Freeze Period Begins: ${txRequest.freezePeriodStart}
Execution Window Begins: ${txRequest.windowStart}
Now: ${await txRequest.now()}`);
      } catch (err) {
        console.error(err);
      }
    },
  });
  replServer.defineCommand('resetStats', {
    help: 'Reset your TimeNode statistics.',
    action() {
      config.statsDb.clearAll();
    },
  });
};

module.exports = {
  start,
};
