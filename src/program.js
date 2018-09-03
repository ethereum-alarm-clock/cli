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
const schedule = require('./Schedule');
const timenode = require('./TimeNode');

// const chronologicQuikNodeHttpKovan = 'https://rarely-suitable-shark.quiknode.io/87817da9-942d-4275-98c0-4176eee51e1a/aB5gwSfQdN4jmkS65F1HyA==/';
// const chronologicQuikNodeWssKovan = 'wss://rarely-suitable-shark.quiknode.io/87817da9-942d-4275-98c0-4176eee51e1a/aB5gwSfQdN4jmkS65F1HyA==/';
const chronologicQuikNodeWssRopsten = 'wss://abnormally-just-wombat.quiknode.io/286cd134-837e-44ce-bfd7-d6d7d01632dc/dFQbkQcp3ZCfgUjXghtXLA==/';

const walletHandle = (path, paths) => {
  paths.push(path);
  return paths;
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
  .option('--provider <string>', 'Sets the HTTP or WebSockets provider', chronologicQuikNodeWssRopsten)
  .option('--wallet <path>', 'Sets the path to the keystore to use', walletHandle, [])

program
  .command('test')
  .action(() => console.log(program.provider))

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

/** Schedule */
program
  .command('schedule')
  .description('Schedule a transaction')  
  .option('--json <object>', 'Pass a JSON object of the params')

  .option('--bounty', 'Sets the bounty for the scheduled transaction', '')
  .option('--callData', 'Sets the call data for the scheduled transaction', '')
  .option('--callGas', 'Sets the gas for the scheduled transaction', 0)
  .option('--callValue', 'Sets the value for the scheduled transaction', 0)
  .option('--fee', 'Sets the fee for the scheduled transaction')
  .option('--gasPrice', 'Sets the minimum gas price for the scheduled transaction', 0)
  .option('--requiredDeposit', 'Sets the required deposit', 0)
  .option('--temporalUnit', 'Sets the parameters to use unit blocks or timestamps', 0)
  .option('--to', 'Sets the recipient of the scheduled transactions', '')
  .option('--windowSize', 'Sets the size of the execution window', 0)
  .option('--windowStart', 'Sets the start of the execution window', 0)

  .action((options) => catchErrors(schedule(options, program)))

/** TimeNode */
program
  .command('timenode')
  .description('Run a TimeNode')
  .option('--analyticsOff', 'Turns the analytics off (TimeNode counter, state of the network, etc.)')
  .option('--autostart', 'Sets autostart')
  .option('--claiming', 'Claiming mode')
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