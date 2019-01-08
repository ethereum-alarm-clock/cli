const BigNumber = require('bignumber.js');
const ora = require('ora');
const repl = require('repl');
const { scheduleUsingWallet } = require('../Schedule/helpers');
const { requestInfo } = require('./actions');

const makeDashboard = require('./dashboard');

const start = (timenode, docker) => {
  const { config } = timenode;
  const { eac, web3, util, gasPriceUtil } = config;

  console.log(' '); // blank space
  const replServer = repl.start({ prompt: '>> ' });
  replServer.context.web3 = web3;

  replServer.defineCommand('getBalance', {
    help: 'Get the balance of your accounts.',
    async action() {
      if (config.wallet) {
        config.wallet.getAccounts().forEach(async (account) => {
          const address = account.getAddressString();
          const balance = await util.balanceOf(address);
          console.log(`${address} | Balance: ${web3.utils.fromWei(balance.toString())}`);
        });
      } else {
        const account = web3.eth.defaultAccount;
        const balance = await util.balanceOf(account);
        console.log(`${account} | Balance: ${web3.utils.fromWei(balance.toString())}`);
      }
    },
  });

  replServer.defineCommand('network', {
    help: 'Get the current network stats',
    async action() {
      const block = await util.getBlock('latest');
      const gasPrice = await gasPriceUtil.networkGasPrice();
      const gweiGasPrice = web3.utils.fromWei(gasPrice.toString(), 'gwei');

      console.log(`BlockNum: ${block.number} | Timestamp: ${block.timestamp} | GasPrice: ${gweiGasPrice} Gwei`);
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
      console.log(makeDashboard(config, timenode).toString());
    },
  });

  replServer.defineCommand('getClaimed', {
    help: 'Get claimed transactions pending execution.',
    async action() {
      console.log(`Claimed transactions pending execution:`);
      const printPending = (address, pending) => console.log(`Account ${address}: ${pending.join(', ') || 'No transactions pending'}.`);

      const claimedPendingExecution = timenode.getClaimedNotExecutedTransactions();

      if (config.wallet) {
        const accounts = config.wallet.getAccounts();
        for (let i = 0; i < accounts.length; i++) {
          const address = accounts[i].getAddressString();
          printPending(address, claimedPendingExecution[address]);
        }
      } else {
        const account = web3.eth.defaultAccount;
        printPending(account, claimedPendingExecution[account]);
      }
    },
  });

  replServer.defineCommand('getFailedClaims', {
    help: 'Get unsuccessfully claimed transactions.',
    action() {
      console.log(`Unsuccessfully claimed transactions:`);
      const printUnsuccessful = (address, pending) => console.log(`Account ${address}: ${pending.join(', ') || 'No unsuccessfully claimed transactions'}.`);

      const unsuccessfullyClaimed = timenode.getUnsucessfullyClaimedTransactions();

      if (config.wallet) {
        const accounts = config.wallet.getAccounts();
        for (let i = 0; i < accounts.length; i++) {
          const address = accounts[i].getAddressString();
          printUnsuccessful(address, unsuccessfullyClaimed[address]);
        }
      } else {
        const account = web3.eth.defaultAccount;
        printUnsuccessful(account, unsuccessfullyClaimed[account]);
      }
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

  replServer.defineCommand('testTx', {
    help:
      'Send a test transaction to the network (requires unlocked local account).',
    async action() {
      const spinner = ora('Sending test transaction to network...').start();
      const scheduler = await eac.scheduler();

      const blockNumber = await web3.eth.getBlockNumber();

      // Set some meaningless defaults
      const recipient = '0x009f7EfeD908c05df5101DA1557b7CaaB38EE4Ce';
      const callData = web3.fromAscii('s0x'.repeat(Math.floor(Math.random() * 10)));
      const windowStart = (new BigNumber(blockNumber)).plus(30);
      const windowSize = 255;
      const gasPrice = web3.utils.toWei('5', 'gwei');
      const requiredDeposit = 1;
      const callGas = 100000;
      const callValue = 321;
      const fee = 50;
      const bounty = web3.utils.toWei('1', 'finney');
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
          }, web3, eac);

          if (success) {
            spinner.succeed(`Transaction successful. Transaction Hash: ${receipt.transactionHash}\n`);
            console.log(`Address of scheduled transaction: ${eac.getTxRequestFromReceipt(receipt)}`);
          } else {
            spinner.fail('Transaction failed.');
          }
        } catch (e) {
          spinner.fail(`Transaction failed.\n\nError: ${e}`);
        }

        return;
      }

      const endowment = util.calcEndowment(
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
      await requestInfo(config, txRequestAddr);
    },
  });

  replServer.defineCommand('resetStats', {
    help: 'Reset your TimeNode statistics.',
    action() {
      config.statsDb.clearAll();
    },
  });

  if (!docker) {
    replServer.on('exit', () => {
      console.log('Exiting! Goodbye :]');
      process.exit();
    });
  }
};

module.exports = {
  start,
};
