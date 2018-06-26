/**
 * All options to the commandline are defined below.
 * Please sort by alphabetical order of the full command,
 * that is the `--xxxxxxx` variety.
 */

const program = require('commander');

const createWallet = require('./wallet/create');
const drainWallet = require('./wallet/drain');
const fundWallet = require('./wallet/fund');

const chronologicQuikNode = 'https://rarely-suitable-shark.quiknode.io/87817da9-942d-4275-98c0-4176eee51e1a/aB5gwSfQdN4jmkS65F1HyA==/';

const walletHandle = (path, paths) => {
  paths.push(path);
  return paths;
}

/** General Options */
program
  .version(require('../package.json').version)
  .options('--password <string>', 'The password for the keystore')
  .option('--provider <string>', 'Sets the HTTP or WebSockets provider', chronologicQuikNode)
  .option('--wallet <path>', 'Sets the path to the keystore to use', walletHandle, [])
 
/** Create Wallet */
program
  .command('createWallet')
  .description('Guides you through creating a wallet')
  .action(createWallet)

/** Drain Wallet */
program
  .command('drainWallet <target>')
  .description('Sends target address all ether in wallet')
  .action(drainWallet)

/** Fund Wallet */
program
  .command('fundWallet <amt>')
  .description('Funds each account in wallet the <amt> in ether')
  .action(fundWallet)

/** Schedule */
program
  .command('schedule')
  .description('Scheduled a transaction')  
  .option('--block')
  .option('--json <object>', 'Pass a JSON object of the params')
  .option('--timestamp')
  .action((options) => {})

/** TimeNode */
program
  .command('timenode')
  .description('Run a TimeNode')
  .option('--analytics <boolean>', 'Sets the analytics on or off')
  .option('--autostart', 'Sets autostart')
  .option('--logFile <path>', 'Sets the file to output logs', 'default')
  .option('--logLevel <number>', 'Sets the logging level', 2)
  .option('--maxDeposit <eth>', 'Only claim transactions that require a deposit lower')
  .option('--minBalance <eth>', 'Only claim transactions if balance of wallet is higher')
  .option('--minProfitability <eth>', 'Only claim transactions with a bounty higher')
  .option('--ms <number>', 'Sets the scanning frequency of the TimeNode', 4000)
  .option('--scan <number>', 'Sets the scanning spread', 75)
  .action((options) => {})


program.parse(process.argv);

module.exports = program;