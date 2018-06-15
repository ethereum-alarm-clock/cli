#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const BigNumber = require("bignumber.js")
const Bb = require("bluebird")
const clear = require("clear")
const ethUtil = require("ethereumjs-util")
const Web3WsProvider = require('web3-providers-ws');
const ora = require("ora")
const program = require("commander")
const readlineSync = require("readline-sync")
const loki = require("lokijs")

// CLI Imports
const { Analytics } = require("./analytics")
// const Logger = require("./logger")
const Repl = require("./repl")

const {
  Config,
  TimeNode, 
  Wallet,
  StatsDB
} = require('eac.js-client');

// Wallet Imports
const createWallet = require('../wallet/createWallet.js')
const fundAccounts = require('../wallet/fundWallet')
const drainWallet = require('../wallet/drainWallet.js')
const { loadWalletFromKeystoreFile } = require('../wallet/utils');


// Parse the command line options using commander.
program
  .version(require('../package.json').version)
  .option(
  "--scan <spread>",
  "sets the scanning spread (ie +- from current block",
  75
  )
  .option(
  "-m, --milliseconds <ms>",
  "tells the client to scan every <ms> seconds",
  4000
  )
  .option("--logfile [path]", "specifies the output logifle", "default")
  .option("--logLevel [1,2,3]", "sets the log level", 2)
  .option(
  "--provider <string>",
  "set the HttpProvider to use",
  "https://rarely-suitable-shark.quiknode.io/87817da9-942d-4275-98c0-4176eee51e1a/aB5gwSfQdN4jmkS65F1HyA==/"
  )
  .option("-s, --schedule", "schedules a transactions")
  .option("--block")
  .option("--timestamp")
  .option("--json <object>", "Uses the parameters contained in <object> to schedule a transaction.")
  .option('-w, --wallet [path...]', 'specify the path to the keyfile you would like to unlock (For multiple wallet files, pass in each file with -w option)', function (path, paths) {
    paths.push(path);
    return paths;
  }, [])
  .option("-i, --walletIndex [number]", "if not using a wallet file, choose index of web3 provider account (defaults to index 0)")
  .option('-p, --password [string]', 'the password to unlock your keystore file(s) (For multiple wallets, all wallets must have the same password')
  .option("-c, --client", "starts the executing client")
  .option('--createWallet', 'guides you through creating a new wallet.')
  .option('--fundWallet <ether amt>', 'funds each account in wallet the <ether amt>')
  .option('--drainWallet <target>', 'sends the target address all ether in the wallet')
  .option("--autostart", "starts scanning automatically")
  .option("--analytics [on,off]", "Allow or disable network analytics")
  .option("--maxDeposit [eth]", "Only claim transactions that require a deposit lower than maxDeposit")
  .option("--minBalance [eth]", "Only claim transactions if my balance is higher than minBalance")
  .option("--minProfitability [eth]", "Only claim transactions with a bounty higher than minProfitability")
  .parse(process.argv)


// Create the web3 object by using the chosen provider, defaults to localhost:8545
const Web3 = require("web3");
const provider = (() => {
  if ( new RegExp('http://').test(program.provider) || new RegExp('https://').test(program.provider) ) {
    return new Web3.providers.HttpProvider(`${program.provider}`);
  } else if (new RegExp('ws://').test(program.provider) || new RegExp('wss://').test(program.provider) ) {
    const ws = new Web3WsProvider(`${program.provider}`);
    ws.__proto__.sendAsync = ws.__proto__.send;
    return ws;
  }
})();

const web3 = new Web3(provider)
const eac = require('eac.js-lib')(web3)
const dependencyVersions = {
  client: require('eac.js-client').version,
  contracts: eac.contracts,
  lib: eac.version
}

let defaultSchedulingValues;
const getDefaultSchedulingValues = async () => {
  const gasPrice = await Bb.fromCallback(callback => web3.eth.getGasPrice(callback));
  return {
    callGas: 100000,
    callValue: web3.toWei("100", "gwei"),
    windowSize: 255,
    gasPrice,
    fee: web3.toWei("10", "gwei"),
    bounty: gasPrice * 100000,
    deposit: web3.toWei("20", "gwei"),
    minimumPeriodBeforeSchedule: 25
  }
};

const readTemporalUnit = () => {
  let temporalUnit

  if (program.block) {
    temporalUnit = 1;
  }
  else if (program.timestamp) {
    temporalUnit = 2;
  }
  else {
    const unit = readlineSync.question("Do you want to use block or timestamps as the unit? [block/timestamp]\n");
    if (unit.toLowerCase() === "block") {
      temporalUnit = 1;
    }
    else if (unit.toLowerCase() === "timestamp") {
      temporalUnit = 2;
    }
    else {
      throw new Error("Invalid temporal unit.");
    }
  }
  return temporalUnit;
}

const readRecipientAddress = () => {
  let toAddress = readlineSync.question(`Enter the recipient address: [press enter for ${web3.eth.defaultAccount}]\n`)
  if (!toAddress) {
    toAddress = '0x0010f94b296A852aAac52EA6c5Ac72e03afD032D';
  }

  // Validate the address
  toAddress = ethUtil.addHexPrefix(toAddress)
  if (!eac.Util.checkValidAddress(toAddress)) {
    console.log("Not a valid address")
    console.log("[FATAL] exiting...")
    process.exit(1)
  }

  return toAddress
}

const readCallData = () => {
  let callData = readlineSync.question("Enter call data: [press enter to skip]\n")

  if (!callData) {
    callData = "0x0"
  }
  callData = web3.toHex(callData)

  return callData
}

const readCallGas = () => {
  const callGas = readlineSync.question(`Enter the call gas: [press enter for ${defaultSchedulingValues.callGas}]\n`)

  return callGas || defaultSchedulingValues.callGas
}

const readCallValue = () => {
  const callValue = readlineSync.question(`Enter call value: [press enter for ${defaultSchedulingValues.callValue}] \n`)

  return callValue || defaultSchedulingValues.callValue
}

const readWindowSize = () => {
  const windowSize = readlineSync.question(`Enter window size: [press enter for ${defaultSchedulingValues.windowSize}]\n`)

  return windowSize || defaultSchedulingValues.windowSize
}

const readWindowStart = currentBlockNumber => {
  const defaultWindowStart = currentBlockNumber + defaultSchedulingValues.minimumPeriodBeforeSchedule + 5
  const windowStart = readlineSync.question(`Enter window start: [press enter for ${defaultWindowStart}]\n`)

  return windowStart || defaultWindowStart
}

const readGasPrice = () => {
  const gasPrice = readlineSync.question(`Enter a gas price: [press enter for ${defaultSchedulingValues.gasPrice}]\n`)

  return gasPrice || defaultSchedulingValues.gasPrice
}

const readFee = () => {
  const fee = readlineSync.question(`Enter fee amount: [press enter for ${defaultSchedulingValues.fee}]\n`)

  return fee || defaultSchedulingValues.fee
}

const readBounty = () => {
  const bounty = readlineSync.question(`Enter bounty amount: [press enter for ${defaultSchedulingValues.bounty}]\n`)

  return bounty || defaultSchedulingValues.bounty
}

const readDeposit= () => {
  const deposit = readlineSync.question(`Enter deposit amount: [press enter for ${defaultSchedulingValues.deposit}]\n`)

  return deposit || defaultSchedulingValues.deposit
}

const main = async (_) => {

  if (program.createWallet) {

    const numAccounts = readlineSync.question('How many accounts would you like in your wallet? [1 - 10]\n> ')

    function isNumber(n) { return !isNaN(parseFloat(n)) && !isNaN(n - 0) }

    if (!isNumber(numAccounts) || numAccounts > 10 || numAccounts <= 0) {
      console.error('  error: must specify a number between 1 - 10 for number of accounts')
      process.exit(1)
    }

    const file = readlineSync.question('Where would you like to save the encrypted keys? Please provide a valid filename or path.\n> ')
    const password = readlineSync.question("Please enter a password for the keyfile. Write this down!\n> ")

    createWallet(web3, numAccounts, file, password)

  } else if (program.fundWallet) {
    if (!program.wallet
      || ! program.password) {
      console.log('\n  error: must supply the `--wallet <keyfile>` and `--password <pw>` flags\n')
      process.exit(1)
      }

    if (!await eac.Util.checkForUnlockedAccount()) process.exit(1)

    const spinner = ora('Sending the funding transactions...').start()
    const wallet = loadWalletFromKeystoreFile(web3, program.wallet, program.password)
    fundAccounts(web3, program.fundWallet, wallet)
    // .then(Res => console.log(Res))
    .then(res => {
      res.forEach(txObj => {
        if (txObj.status != '0x1') {
          console.log(`\n  error: funding to ${txObj.to} failed... must retry manually\n`)
        }
      })
      spinner.succeed('Accounts funded!')
    })
    .catch(err => spinner.fail(err))

  } else if (program.drainWallet) {
    if (!program.wallet
      || !program.password) {
      console.log('\n  error: must supply the `--wallet <keyfile>` and `--password <pw>` flags\n')
      process.exit(1)
    }

    if (!ethUtil.isValidAddress(program.drainWallet)) {
      console.log(`\n  error: input ${program.drainWallet} not valid Ethereum address`)
      process.exit(1)
    }

    const spinner = ora('Sending transactions...').start()
    const gasPrice = await eac.Util.getGasPrice()

    try {
      const wallet = loadWalletFromKeystoreFile(web3, program.wallet, program.password)
      await drainWallet(web3, gasPrice, program.drainWallet, wallet)
      spinner.succeed('Wallet drained!')
    } catch (err) {
      spinner.fail(err)
    }
  } else if (program.client) {
    clear()
    console.log("⏰ ⏰ ⏰ Welcome to the Ethereum Alarm Clock client ⏰ ⏰ ⏰\n")

    if (!await eac.Util.checkNetworkID()) {
      console.log("  error: must be running a local node on the Ropsten or Kovan networks")
      process.exit(1)
    }

    if (program.logfile === "default") {
      program.logfile = `${require("os").homedir()}/.eac.log`
    }

    // Assigns chain to the name of the network ID
    const chain = await eac.Util.getChainName()

    // Loads the contracts
    const requestFactory = await eac.requestFactory()

    let analytics;
    analytics = program.analytics && program.analytics.toLowerCase() === 'off' ? false : true;

    if (analytics) {
      analytics = new Analytics(web3, dependencyVersions);
    }

    // Parses the logfile
    if (program.logfile === "console") {
      console.log("Logging to console")
    }

    // const logger = new Logger(program.logfile, program.logLevel)
    let encKeystores = [];
    program.wallet.map( file => {
      const fileStore = fs.readFileSync(file, 'utf8');
      if (typeof JSON.parse(fileStore).length !== 'undefined' ) {
        encKeystores = encKeystores.concat(JSON.parse(fileStore));
      } else {
        encKeystores.push(fileStore)
      }
    });

    // Loads conf
    let config = new Config({
      logger: false,
      ms: 4000,
      scanSpread: program.scan, // conf.scanSpread
      factory: requestFactory, // conf.factory
      web3, // conf.web3
      eac, // conf.eac
      provider: program.provider, // conf.provider
      walletStores: encKeystores, // conf.walletStore
      password: program.password, // wallet password
      autostart: program.autostart,
      // statsDb: statsDB,
    })

    config.client = "parity"
    config.chain = chain
    config.statsdb = new StatsDB(config.web3, new loki("stats.json"))

    // Determines wallet support
    if (config.wallet) {
      console.log('Wallet support: Enabled')
      console.log('\nExecuting from accounts:')
      const addressList = config.wallet.getAccounts().map(account => account.getAddressString());
      addressList.forEach(async account => {
        console.log(`${account} | Balance: ${web3.fromWei(await eac.Util.getBalance(account))}`)
      })

      // conf.statsdb.initialize(addressList)
      web3.eth.defaultAccount = config.wallet.getAccounts()[0].getAddressString()
    }

    const ethToWei = (num) => {
      if (typeof num === 'undefined') {
        num = 0;
      }
      num = new BigNumber(num);
      return web3.toWei(num, 'ether');
    }

    config.economicStrategy = {
      maxDeposit: ethToWei(program.maxDeposit),
      minBalance: ethToWei(program.minBalance),
      minProfitability: ethToWei(program.minProfitability),
    };

    const timenode = new TimeNode(config)

    timenode.startScanning();
    // setTimeout(() => Repl.start(config, program.milliseconds), 1200)

    // if (analytics && config.wallet) {
    //   const addresses = config.wallet.getAddresses()
    //   analytics.startAnalytics(addresses[0]);
    // }

  } else if (program.schedule) {
    defaultSchedulingValues = await getDefaultSchedulingValues();
    if (!await eac.Util.checkNetworkID()) {
      console.log("  error: must be running a localnode on the Ropsten or Kovan networks")
      process.exit(1)
    }
    // if (!await eac.Util.checkForUnlockedAccount()) process.exit(1)

    if (!program.wallet || !program.password) throw new Error('Use a wallet');

    const wallet = new Wallet(web3);
    // console.log(program.wallet);
    // console.log(fs.readFileSync(program.wallet[0], 'utf-8'))
    wallet.decrypt(JSON.parse(fs.readFileSync(program.wallet[0])), program.password);

    // console.log(wallet)
    // throw new Error('stop')

    let scheduleParams = {}
    if (program.json) scheduleParams = JSON.parse(program.json)

    const eacScheduler = await eac.scheduler()

    // Starts the scheduling wizard.
    clear()
    console.log("🧙 🧙 🧙  Schedule a transaction  🧙 🧙 🧙\n")

    const temporalUnit = scheduleParams.temporalUnit || readTemporalUnit()
    const toAddress = scheduleParams.recipient || readRecipientAddress()
    const callData = scheduleParams.callData || readCallData()
    const callGas = scheduleParams.callGas || readCallGas()
    const callValue = scheduleParams.callValue || readCallValue()

    const currentBlockNumber = await eac.Util.getBlockNumber()

    const windowStart = scheduleParams.windowStart || readWindowStart(currentBlockNumber)
    const windowSize = scheduleParams.windowSize || readWindowSize()

    if (windowStart < currentBlockNumber + defaultSchedulingValues.minimumPeriodBeforeSchedule) {
      console.log("That window start time is too soon!")
      process.exit(1)
    }

    const gasPrice = scheduleParams.gasPrice || readGasPrice()
    const fee = scheduleParams.fee || readFee()
    const bounty = scheduleParams.bounty ||  readBounty()
    const requiredDeposit = scheduleParams.deposit || readDeposit()

    clear()

    const endowment = eac.Util.calcEndowment(
      new BigNumber(callGas),
      new BigNumber(callValue),
      new BigNumber(gasPrice),
      new BigNumber(fee),
      new BigNumber(bounty)
    )

    console.log(`
toAddress       - ${toAddress}
callData        - ${callData}
callGas         - ${callGas}
callValue       - ${callValue}
windowSize      - ${windowSize}
windowStart     - ${windowStart}
gasPrice        - ${gasPrice}
fee             - ${fee}
bounty          - ${bounty}
requiredDeposit - ${requiredDeposit}

Sending from ${web3.eth.defaultAccount}
Endowment: ${web3.fromWei(endowment.toString())}
`)

    const confirm = readlineSync.question("Are all of these variables correct? [Y/n]\n")
    if (confirm === "" || confirm.toLowerCase() === "y") {
      // / Do nothing, just continue
    } else {
      console.log("quitting!")
      setTimeout(() => process.exit(1), 1500)
      return
    }

    console.log("\n")
    const spinner = ora("Sending transaction! Waiting for a response...").start()

    const bScheduler = eacScheduler.blockScheduler;


    const data = bScheduler.schedule.getData(
      toAddress,
      callData,
      [
        callGas,
        callValue,
        windowSize,
        windowStart,
        gasPrice,
        fee,
        bounty,
        requiredDeposit,
      ]
    );

    const { receipt } = await wallet.sendFromNext({
      to: bScheduler.address,
      value: endowment,
      gas: 3000000,
      gasPrice: web3.toWei('8', 'gwei'),
      data,
    })

    if (!receipt.status) {
      spinner.fail('Transaction mined but transaction failed');
      process.exit(1)
    }
    spinner.succeed(`Transaction successful! Hash: ${receipt.transactionHash}\n`);
    console.log(`Address of the transaction request: ${eac.Util.getTxRequestFromReceipt(receipt)}`)

    // const tx = temporalUnit === 1
    //   ? eacScheduler
    //     .blockSchedule(
    //     toAddress,
    //     callData,
    //     callGas,
    //     callValue,
    //     windowSize,
    //     windowStart,
    //     gasPrice,
    //     fee,
    //     bounty,
    //     requiredDeposit
    //     )
    //   : eacScheduler
    //     .timestampSchedule(
    //     toAddress,
    //     callData,
    //     callGas,
    //     callValue,
    //     windowSize,
    //     windowStart,
    //     gasPrice,
    //     fee,
    //     bounty,
    //     requiredDeposit
    //     )

    // tx.then((receipt) => {
    //   if (receipt.status != '0x1') {
    //     spinner.fail(`Transaction was mined but failed. No transaction scheduled.`)
    //     process.exit(1)
    //   }
    //   spinner.succeed(`Transaction successful! Hash: ${receipt.transactionHash}\n`)
    // })
    // .catch((err) => {
    //   spinner.fail(err)
    // })
  } else {
    console.log("\n  error: please start eac in either client `-c` or scheduling `-s` mode")
    process.exit(1)
  }
}

main().catch((e) => {
  if (e.toString().indexOf("Invalid JSON RPC") !== -1) {
    console.log(`  error: invalid RPC response, please make sure a local node is running.`)
  } else {
    console.log(`[FATAL] ${e}`)
  }
  process.exit(1)
})
