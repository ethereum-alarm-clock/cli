/* eslint-disable */
/**
 * All options to the commandline are defined below.
 * Please sort by alphabetical order of the full command,
 * that is the `--xxxxxxx` variety.
 */

const { Config } = require('@ethereum-alarm-clock/timenode-core');
const program = require('commander');

const createWallet = require('./Wallet/create');
const drainWallet = require('./Wallet/drain');
const fundWallet = require('./Wallet/fund');
const splitWallet = require('./Wallet/split');

const schedule = require('./Schedule');
const timenode = require('./TimeNode');
const roptenNode = 'wss://abnormally-just-wombat.quiknode.io/286cd134-837e-44ce-bfd7-d6d7d01632dc/dFQbkQcp3ZCfgUjXghtXLA==/';

const walletHandle = (path, paths) => {
  paths.push(path);
  return paths;
}

const formatProviders = (providers) => {
  return providers.indexOf(',') > 0 ? providers.split(',') : [providers];
}

const catchErrors = async (asyncFunction) => {
  try {
    await asyncFunction;
  } catch (e) {
    console.error(e);
  }
  // Explicitly exit on completion.
  process.exit(0);
}

/** General Options */
program
  .version(require('../package.json').version)
  .option('--config <path>', 'Load parameters from config file.', '')
  .option('--password <string>', 'The password for the keystore')
  .option('--provider <string>', '[DEPRECATED. Use --providersUrl instead] Sets the HTTP or WebSockets provider')
  .option('--providers <providers>', 'List of providers separated by commas without spaces', formatProviders, [roptenNode])
  .option('--wallet <path>', 'Sets the path to the keystore to use', walletHandle, [])

program
  .command('test')
  .action(() => console.log(program.providers[0]))

/** Create Wallet */
program
  .command('createWallet')
  .description('Guides you through creating a wallet')
  .action(() => catchErrors(createWallet(program)))

/** Drain Wallet */
program
  .command('drainWallet <target>')
  .description('Sends target address all ether in wallet')
  .action((target) => catchErrors(drainWallet(target, program)))

/** Fund Wallet */
program
  .command('fundWallet <amt>')
  .description('Funds each account in wallet the <amt> in ether')
  .action((amt) => catchErrors(fundWallet(amt, program)))

/** Split Wallet */
program
  .command('splitWallet <target>')
  .description('Splits a wallet file created using the createWallet command into separate files.')
  .action((target) => catchErrors(splitWallet(target)))

/** Schedule */
program
  .command('schedule')
  .description('Scheduled a transaction')  
  .option('--block')
  .option('--json <object>', 'Pass a JSON object of the params')
  .option('--timestamp')
  .action((options) => catchErrors(schedule(options, program)))

/** TimeNode */
program
  .command('timenode')
  .description('Run a TimeNode')
  .option('--analyticsOff', 'Turns the analytics off (TimeNode counter, state of the network, etc.)')
  .option('--autostart', 'Sets autostart')
  .option('--claiming', 'Claiming mode')
  .option('--docker', 'Docker mode')
  .option('--logFile <path>', 'Sets the file to output logs', '.eac.log')
  .option('--logLevel <number>', 'Sets the logging level', 2)
  .option('--maxDeposit <eth>', 'Only claim transactions that require a deposit lower than', Config.DEFAULT_ECONOMIC_STRATEGY.maxDeposit.div(Math.pow(10, 18)))
  .option('--minBalance <eth>', 'Only claim transactions if balance of wallet is higher', Config.DEFAULT_ECONOMIC_STRATEGY.minBalance.div(Math.pow(10, 18)))
  .option('--minProfitability <eth>', 'Only claim transactions with a bounty higher', Config.DEFAULT_ECONOMIC_STRATEGY.minProfitability.div(Math.pow(10, 18)))
  .option('--maxGasSubsidy <eth>', 'Subsidize a percentage of gas costs on gas spikes', Config.DEFAULT_ECONOMIC_STRATEGY.maxGasSubsidy)
  .option('--ms <number>', 'Sets the scanning frequency of the TimeNode', 4000)
  .option('--scan <number>', 'Sets the scanning spread', 75)
  .action((options) => catchErrors(timenode(options, program)))


program.parse(process.argv);

module.exports = program;