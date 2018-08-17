const BigNumber = require('bignumber.js');
const clear = require('clear');
const { Config, TimeNode } = require('@ethereum-alarm-clock/timenode-core');
const fs = require('fs');
const loki = require('lokijs');

const Analytics = require('./analytics');
const FileLogger = require('./logger');
const Repl = require('./repl');
const { checkOptionsForWalletAndPassword } = require('../Wallet/utils');

const timenode = async (options, program) => {
  if (program.config) {
    const config = JSON.parse(fs.readFileSync(program.config));
    program.provider = config.provider || program.provider;
    program.password = fs.readFileSync(config.password).toString() || program.password;
    program.wallet = config.wallet || program.wallet;

    // TimeNode specific configurations
    options.autostart = config.autostart || options.autostart;
    options.claiming = config.claiming || options.claiming;
    options.logFile = config.logFile || options.logFile;
    options.logLevel = config.logLevel || options.logLevel;
    options.maxDeposit = config.maxDeposit || options.maxDeposit;
    options.minBalance = config.minBalance || options.minBalance;
    options.minProfitability = config.minProfitability || options.minProfitability;
    options.maxGasSubsidy = config.maxGasSubsidy || options.maxGasSubsidy;
  }
  checkOptionsForWalletAndPassword(program);

  // We do the set-up first.
  // clear();
  console.log('Setting Up...')
  console.log(`Using the provider: ${program.provider}`);

  // Process the keystores.
  let encKeystores = [];
  program.wallet.map((file) => {
    const keystore = fs.readFileSync(file, 'utf8');
    if (typeof JSON.parse(keystore).length !== 'undefined') {
      encKeystores = encKeystores.concat(JSON.parse(keystore));
    } else {
      encKeystores.push(keystore);
    }
  });

  // Load the config.
  let config = new Config({
    autostart: options.autostart,
    claiming: options.claiming,
    logger: new FileLogger(options.logFile, options.logLevel),
    ms: options.ms,
    password: program.password,
    providerUrl: program.provider,
    scanSpread: options.scan,
    statsDb: new loki('stats.json'),
    walletStores: encKeystores,
  });

  if (!await config.eac.Util.checkNetworkID()) {
    throw 'Must be on the Ropsten or Kovan test network.';
  }

  // Set up default logfile.
  if (options.logFile === 'default') {
    options.logFile = `${require('os').homedir()}/.eac.log`;
  }

  const chain = await config.eac.Util.getChainName();

  const analyticsOn = (options.analytics && options.analytics.toLowerCase() === 'off') ? false : true;

  let analytics;
  if (analyticsOn) {
    analytics = new Analytics(config.web3, {
      client: require('@ethereum-alarm-clock/timenode-core').version,
      contracts: config.eac.contracts,
      lib: config.eac.version,
    })
  }

  config.chain = chain;

  // Economic Strategy
  config.economicStrategy = {
    maxDeposit: options.maxDeposit ? new BigNumber(config.web3.toWei(options.maxDeposit)) : Config.DEFAULT_ECONOMIC_STRATEGY.maxDeposit,
    minBalance: options.minBalance ? new BigNumber(config.web3.toWei(options.minBalance)) : Config.DEFAULT_ECONOMIC_STRATEGY.minBalance,
    minProfitability: options.minProfitability ? new BigNumber(config.web3.toWei(options.minProfitability)) : Config.DEFAULT_ECONOMIC_STRATEGY.minProfitability,
    maxGasSubsidy: options.maxGasSubsidy ? options.maxGasSubsidy : Config.DEFAULT_ECONOMIC_STRATEGY.maxGasSubsidy
  }

  // Start
  clear();
  console.log('Welcome to the Ethereum Alarm Clock TimeNode CLI\n');

  console.log('Executing from accounts:');
  await Promise.all(
    config.wallet.getAddresses().map(async (address) => {
      console.log(`${address} | Balance: ${config.web3.fromWei(await config.eac.Util.getBalance(address))}`);
    })
  )

  const TN = new TimeNode(config);

  function warnBeforeTerminating() {
    const claimedPendingExecution = TN.getClaimedNotExecutedTransactions();

    if (claimedPendingExecution.length > 0) {
      console.log(`\nKill signal received. You have ${claimedPendingExecution.length} claimed transactions pending execution. Are you sure you want to stop the TimeNode?\n\nHINT: Use .getClaimed to find out which transactions are pending execution.`);
    } else {
      process.exit(0);
    }
  }

  process.once('SIGINT', warnBeforeTerminating);
  process.once('SIGTERM', warnBeforeTerminating);

  if (options.autostart) {
    try {
      await TN.startScanning();
    } catch (e) { throw e; }
  }

  if (analyticsOn) {
    config.logger.info('Analytics ON');
    config.wallet.getAddresses().forEach((address) => {
      analytics.startAnalytics(address);
    })
  }

  // We delay the REPL opening so that the above logic has time to run.
  console.log('\nOpening REPL...');

  setTimeout(() => {
    Repl.start(TN)
  }, 2000);
}

module.exports = timenode;