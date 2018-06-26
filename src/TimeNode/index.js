const clear = require('clear');
const { Config, StatsDB, TimeNode } = require('eac.js-client');
const fs = require('fs');
const loki = require('lokijs');

const initWeb3 = require('../initWeb3');
const Logger = require('./logger');
const Repl = require('./repl');
const { checkOptionsForWalletAndPassword } = require('../Wallet/utils');

const timenode = async (options, program) => {
  checkOptionsForWalletAndPassword(program);

  // We do the set-up first.
  clear();
  console.log('Setting Up...')

  const web3 = initWeb3(program.provider);
  const eac = require('eac.js-lib')(web3);

  if (!await eac.Util.checkNetworkID()) {
    throw 'Must be on the Ropsten or Kovan testnetworks.';
  }

  // Set up default logfile.
  if (options.logFile === 'default') {
    options.logFile = `${require('os').homedir()}/.eac.log`;
  }

  const chain = await eac.Util.getChainName();

  const requestFactory = await eac.requestFactory();

  // const analyticsOn = (options.analytics && options.analytics.toLowerCase() === 'off') ? false : true;

  // let analytics;
  // if (analyticsOn) {
  //   analytics = new analytics(web3, )
  // }

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
    maxDeposit: options.maxDeposit ? web3.toWei(options.maxDeposit) : web3.toWei('0'),
    minBalance: options.minBalance ? web3.toWei(options.minBalance) : web3.toWei('0'),
    minProfitability: options.minProfitability ? web3.toWei(options.minProfitability) : web3.toWei('0'),
  }

  // Start

  clear();
  console.log('Welcome to the Ethereum Alarm Clock TimeNode CLI\n');

  console.log('Executing from accounts:');
  config.wallet.getAddresses().forEach(async (address) => {
    console.log(`${address} | Balance: ${web3.fromWei(await eac.Util.getBalance(address))}`);
  })

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

  // if (analyticsOn) {
  //   config.wallet.getAddresses().forEach((address) => {
  //     analytics.startAnalytics(address);
  //   })
  // }
}

module.exports = timenode;