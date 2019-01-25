const BigNumber = require('bignumber.js');
const clear = require('clear');
const fs = require('fs');
const Loki = require('lokijs');
const Lfsa = require('lokijs/src/loki-fs-structured-adapter.js');
const { Config, TimeNode } = require('@ethereum-alarm-clock/timenode-core');

const Analytics = require('./analytics');
const FileLogger = require('./logger');
const Repl = require('./repl');
const { checkOptionsForWalletAndPassword, loadWalletFromKeystoreFile } = require('../Wallet/utils');

const wei = '1e18';

const timenode = async (options, program) => {
  let providerUrls = program.providers;

  if (program.config) {
    const config = JSON.parse(fs.readFileSync(program.config));
    /* eslint-disable */
    program.password = fs.readFileSync(config.password).toString() || program.password;
    program.wallet = config.wallet || program.wallet;

    // TimeNode specific configurations
    options.autostart = config.autostart || options.autostart;
    options.claiming = config.claiming || options.claiming;
    options.analyticsOff = config.analyticsOff || options.analyticsOff;

    options.logFile = config.logFile || options.logFile;
    options.logLevel = config.logLevel || options.logLevel;
    options.maxDeposit = config.maxDeposit || options.maxDeposit;
    options.minBalance = config.minBalance || options.minBalance;
    options.minProfitability = config.minProfitability || options.minProfitability;
    options.maxGasSubsidy = config.maxGasSubsidy || options.maxGasSubsidy;
    options.directTxPool = config.directTxPool || options.directTxPool;
    providerUrls = config.providers || providerUrls
    /* eslint-enable */
  }
  checkOptionsForWalletAndPassword(program);

  // We do the set-up first.
  clear();
  if (program.provider) {
    console.log('Use of --provider flag is depreciated. Use --providers instead.');
  }
  console.log('Setting Up...');
  console.log(`Using provider: ${providerUrls[0]}\n`);
  if (!options.claiming) {
    console.log(`\x1b[33mYou are not using the CLAIMING functionality. This might make your TimeNode unprofitable. Please use the '.startClaiming' command to enable CLAIMING.
For more info on claiming, see: https://blog.chronologic.network/how-to-mitigate-timenode-risks-b8551bb28f9d\n\x1b[0m`);
  }

  // Process the keystores.
  let encKeystores = [];
  // eslint-disable-next-line
  program.wallet.map((file) => {
    const keystore = fs.readFileSync(file, 'utf8');
    if (typeof JSON.parse(keystore).length !== 'undefined') {
      encKeystores = encKeystores.concat(JSON.parse(keystore));
    } else {
      encKeystores.push(keystore);
    }
  });

  const statsDb = new Loki('stats.json', {
    adapter: new Lfsa(),
    autosave: true,
    autosaveInterval: 5000,
  });

  // Economic Strategy
  const economicStrategy = {
    maxDeposit: options.maxDeposit
      ? new BigNumber(options.maxDeposit).mul(wei)
      : Config.DEFAULT_ECONOMIC_STRATEGY.maxDeposit,
    minBalance: options.minBalance
      ? new BigNumber(options.minBalance).mul(wei)
      : Config.DEFAULT_ECONOMIC_STRATEGY.minBalance,
    minProfitability: options.minProfitability
      ? new BigNumber(options.minProfitability).mul(wei)
      : Config.DEFAULT_ECONOMIC_STRATEGY.minProfitability,
    maxGasSubsidy: options.maxGasSubsidy
      ? options.maxGasSubsidy
      : Config.DEFAULT_ECONOMIC_STRATEGY.maxGasSubsidy,
    usingSmartGasEstimation: options.usingSmartGasEstimation
      ? options.usingSmartGasEstimation
      : Config.DEFAULT_ECONOMIC_STRATEGY.usingSmartGasEstimation,
    minClaimWindow: Config.DEFAULT_ECONOMIC_STRATEGY.minClaimWindow,
    minClaimWindowBlock: Config.DEFAULT_ECONOMIC_STRATEGY.minClaimWindowBlock,
    minExecutionWindow: Config.DEFAULT_ECONOMIC_STRATEGY.minExecutionWindow,
    minExecutionWindowBlock: Config.DEFAULT_ECONOMIC_STRATEGY.minExecutionWindowBlock,
  };

  // Load the config.
  const config = new Config({
    autostart: options.autostart,
    claiming: options.claiming,
    logger: new FileLogger(options.logFile, options.logLevel),
    ms: options.ms,
    password: program.password,
    providerUrls,
    scanSpread: options.scan,
    statsDb,
    walletStores: encKeystores,
    economicStrategy,
    directTxPool: options.directTxPool,
  });

  await config.statsDbLoaded;

  if (!await config.util.isNetworkSupported()) {
    throw new Error('Unsupported network');
  }

  loadWalletFromKeystoreFile(config.web3, program.wallet, program.password);

  // Set up default logfile.
  if (options.logFile === 'default') {
    // eslint-disable-next-line global-require
    // eslint-disable-next-line
    options.logFile = `${require('os').homedir()}/.eac.log`;
  }

  const chain = await config.util.getChainName();

  let analytics;
  if (!options.analyticsOff) {
    analytics = new Analytics(config.web3, {
      // eslint-disable-next-line global-require
      client: require('@ethereum-alarm-clock/timenode-core').version,
      contracts: config.eac.contracts,
      lib: config.eac.version,
    });
  }

  config.chain = chain;

  console.log('Welcome to the Ethereum Alarm Clock TimeNode CLI\n');

  console.log('Executing from accounts:');
  await Promise.all(
    config.wallet.getAddresses().map(async (address) => {
      const balance = await config.util.balanceOf(address);
      console.log(`${address} | Balance: ${config.web3.utils.fromWei(balance.toString())}`);
    }),
  );

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
  } else {
    console.log('\n\x1b[33mUse the .start command to start scanning for scheduled transactions\x1b[0m');
  }

  if (!options.analyticsOff) {
    config.logger.info('Analytics ON');
    config.wallet.getAddresses().forEach((address) => {
      analytics.startAnalytics(address);
    });
  }

  // We delay the REPL opening so that the above logic has time to run.
  console.log('\nOpening REPL...');

  setTimeout(() => {
    Repl.start(TN, options.docker);
  }, 2000);

  // Hacky way to keep the process open so we can use the REPL.
  return new Promise(() => {});
};

module.exports = timenode;
