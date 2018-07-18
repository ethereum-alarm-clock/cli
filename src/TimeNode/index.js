const BigNumber = require('bignumber.js');
const clear = require('clear');
const { Config, TimeNode } = require('@ethereum-alarm-clock/timenode-core');
const fs = require('fs');
const loki = require('lokijs');

const Analytics = require('./analytics');
const Logger = require('./logger');
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
    logger: new Logger(options.logFile, options.logLevel),
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
  config.client = 'parity';

  // Economic Strategy
  config.economicStrategy = {
    maxDeposit: options.maxDeposit ? new BigNumber(config.web3.toWei(options.maxDeposit)) : new BigNumber(config.web3.toWei('0')),
    minBalance: options.minBalance ? new BigNumber(config.web3.toWei(options.minBalance)) : new BigNumber(config.web3.toWei('0')),
    minProfitability: options.minProfitability ? new BigNumber(config.web3.toWei(options.minProfitability)) : new BigNumber(config.web3.toWei('0')),
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