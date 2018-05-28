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
const Logger = require("./logger")
const Repl = require("./repl")

// Client Imports
const {
  Config,
  Scanner,
  StatsDB,
} = require('eac.js-client')

// Wallet Imports
const createWallet = require('../wallet/createWallet.js')
const fundAccounts = require('../wallet/fundWallet')
const drainWallet = require('../wallet/drainWallet.js')
const { loadWalletFromKeystoreFile } = require('../wallet/utils');


// Parse the command line options using commander.
program
  .version(require('../package.json').version)
  .option(
  "--provider <string>",
  "set the HttpProvider to use",
  "http://localhost:8545"
  )
  .option("--block")
  .option("--timestamp")
  .option("--json <object>", "Uses the parameters contained in <object> to schedule a transaction.")
  .option('-w, --wallet [path...]', 'specify the path to the keyfile you would like to unlock (For multiple wallet files, pass in each file with -w option)', function (path, paths) {
    paths.push(path);
    return paths;
  }, [])
  .option("-i, --walletIndex [number]", "if not using a wallet file, choose index of web3 provider account (defaults to index 0)")
  .option('-p, --password [string]', 'the password to unlock your keystore file(s) (For multiple wallets, all wallets must have the same password')
  .option('-n, --repeat [number]', 'specify the number of transaction to send')
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
    throw new Error("Invalid temporal unit. Please use --block or --timestamp");
  }
  return temporalUnit;
}

const readRecipientAddress = () => {
  let toAddress = readlineSync.question(`Enter the recipient address: [press enter for ${web3.eth.defaultAccount}]\n`)
  if (!toAddress) {
    toAddress = web3.eth.defaultAccount
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

const readWindowStart = currentBlockNumber => {
  const defaultWindowStart = currentBlockNumber + defaultSchedulingValues.minimumPeriodBeforeSchedule + 5
  const windowStart = readlineSync.question(`Enter window start: [press enter for ${defaultWindowStart}]\n`)

  return windowStart || defaultWindowStart
}

const main = async (_) => {
  let scheduleParams = await getDefaultSchedulingValues()
  if (!await eac.Util.checkNetworkID()) {
    console.log("  error: must be running a localnode on the Ropsten or Kovan networks")
    process.exit(1)
  }
  if (!await eac.Util.checkForUnlockedAccount()) process.exit(1)
  if (program.json) scheduleParams = JSON.parse(program.json)

  const eacScheduler = await eac.scheduler()

  // Starts the scheduling wizard.
  clear()
  console.log("🧙 🧙 🧙  Schedule a transaction  🧙 🧙 🧙\n")

  const temporalUnit = scheduleParams.temporalUnit || readTemporalUnit()
  const toAddress = scheduleParams.recipient || web3.eth.defaultAccount
  const callData = scheduleParams.callData || "0x0"
  const callGas = scheduleParams.callGas
  const callValue = scheduleParams.callValue

  const currentBlockNumber = await eac.Util.getBlockNumber()

  const windowStart = scheduleParams.windowStart || currentBlockNumber + scheduleParams.minimumPeriodBeforeSchedule + 5
  const windowSize = scheduleParams.windowSize

  const gasPrice = scheduleParams.gasPrice
  const fee = scheduleParams.fee
  const bounty = scheduleParams.bounty
  const requiredDeposit = scheduleParams.deposit

  let repeat = program.repeat || 1

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

  eacScheduler.initSender({
    from: web3.eth.defaultAccount,
    gas: 1000000,
    value: endowment,
  })

  console.log("\n")
  const spinner = ora(`Sending ${repeat} transactions! Waiting for a response...`).start()

  const transactions = []
  while(repeat--) {
    let tx = temporalUnit === 1
    ? eacScheduler
      .blockSchedule(
      toAddress,
      callData,
      callGas,
      callValue,
      windowSize,
      windowStart,
      gasPrice,
      fee,
      bounty,
      requiredDeposit
      )
    : eacScheduler
      .timestampSchedule(
      toAddress,
      callData,
      callGas,
      callValue,
      windowSize,
      windowStart,
      gasPrice,
      fee,
      bounty,
      requiredDeposit
      )
    
    tx = tx.then((receipt) => {
      if (receipt.status != '0x1') {
        spinner.fail(`Transaction was mined but failed. No transaction scheduled.`)
      } else {
        spinner.succeed(`Transaction successful! Hash: ${receipt.transactionHash}, Address: ${eac.Util.getTxRequestFromReceipt(receipt)}`)
      }
    })
    .catch((err) => {
      spinner.fail(err)
    })

    transactions.push(tx)
  }
  await Promise.all(transactions)
}

main().catch((e) => {
  if (e.toString().indexOf("Invalid JSON RPC") !== -1) {
    console.log(`  error: invalid RPC response, please make sure a local node is running.`)
  } else {
    console.log(`[FATAL] ${e}`)
  }
  process.exit(1)
})
