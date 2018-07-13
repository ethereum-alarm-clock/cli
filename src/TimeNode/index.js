const BigNumber = require('bignumber.js');
const clear = require('clear');
const { Config, StatsDB, TimeNode } = require('@ethereum-alarm-clock/timenode-core');
const fs = require('fs');
const loki = require('lokijs');

const Analytics = require('./analytics');
const initWeb3 = require('../initWeb3');
const Logger = require('./logger');
const Repl = require('./repl');
const { checkOptionsForWalletAndPassword } = require('../Wallet/utils');

const timenode = async (options, program) => {
  if (program.config) {
    const config = JSON.parse(fs.readFileSync(program.config));
    program.password = fs.readFileSync(config.password).toString() || program.password;
    program.provider = config.provider || program.provider;
    program.wallet = config.wallet || program.wallet;

    // TimeNode specific configurations
    options.autostart = config.autostart || options.autostart;
    options.claiming = config.claiming || options.claiming;
    options.logFile = config.logFile || options.logFile;
    options.logLevel = config.logLevel || options.logLevel;
    options.maxDeposit = config.maxDeposit || options.maxDeposit;
    options.minBalance = config.minBalance || options.minBalance;
    options.minProfitability = config.minProfitability || options.minProfitability;
  }
  checkOptionsForWalletAndPassword(program);

  // We do the set-up first.
  // clear();
  console.log('Setting Up...')

  const web3 = initWeb3(program.provider);
  const eac = require('eac.js-lib')(web3);

  if (!await eac.Util.checkNetworkID()) {
    throw 'Must be on the Ropsten or Kovan test network.';
  }

  // Set up default logfile.
  if (options.logFile === 'default') {
    options.logFile = `${require('os').homedir()}/.eac.log`;
  }

  const chain = await eac.Util.getChainName();

  const requestFactory = await eac.requestFactory();

  const analyticsOn = (options.analytics && options.analytics.toLowerCase() === 'off') ? false : true;

  let analytics;
  if (analyticsOn) {
    analytics = new Analytics(web3, {
      client: require('@ethereum-alarm-clock/timenode-core').version,
      contracts: eac.contracts,
      lib: eac.version,
    })
  }

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

  console.log(program.claiming);

  // Load the config.
  let config = new Config({
    autostart: options.autostart,
    claiming: options.claiming,
    eac,
    factory: requestFactory,
    logger: new Logger(options.logFile, options.logLevel),
    ms: options.ms,
    password: program.password,
    provider: program.provider,
    scanSpread: options.scan,
    statsDb: new StatsDB(web3, new loki('stats.json')),
    walletStores: encKeystores,
    web3,
  })

  config.chain = chain;
  config.client = 'parity';

  // Economic Strategy
  config.economicStrategy = {
    maxDeposit: options.maxDeposit ? new BigNumber(web3.toWei(options.maxDeposit)) : new BigNumber(web3.toWei('0')),
    minBalance: options.minBalance ? new BigNumber(web3.toWei(options.minBalance)) : new BigNumber(web3.toWei('0')),
    minProfitability: options.minProfitability ? new BigNumber(web3.toWei(options.minProfitability)) : new BigNumber(web3.toWei('0')),
  }

  // Start

  clear();
  console.log('Welcome to the Ethereum Alarm Clock TimeNode CLI\n');

  console.log('Executing from accounts:');
  await Promise.all(
    config.wallet.getAddresses().map(async (address) => {
      console.log(`${address} | Balance: ${web3.fromWei(await eac.Util.getBalance(address))}`);
    })
  )

  const TN = new TimeNode(config);

  if (options.autostart) {
    try {
      await TN.startScanning();
    } catch (e) { throw e; }
  }

  // We delay the REPL opening so that the above logic has time to run.
  console.log('\nOpening REPL...');

  setTimeout(() => {
    Repl.start(TN)
  }, 2000);

  if (analyticsOn) {
    config.wallet.getAddresses().forEach((address) => {
      analytics.startAnalytics(address);
    })
  }
}

module.exports = timenode;