#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const BigNumber = require("bignumber.js")
const Bb = require("bluebird")
const clear = require("clear")
const Web3WsProvider = require('web3-providers-ws');
const ora = require("ora")
const program = require("commander")
const cTable = require('console.table');

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
  .option('-n, --repeat [number]', 'specify the number of transaction to send', 1)
  .option('-s, --stats', 'generates stats based on tx history')
  .option('--windowStart [number]', 'define the windowStart for transactions')
  .option('--windowStartSpread [number]', 'define the block/timestamp spread between consecutive transactions', 0)
  .option('--randomizeBounty')
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
  client: require('@ethereum-alarm-clock/timenode-core').version,
  contracts: eac.contracts,
  lib: eac.version
}

let defaultSchedulingValues;
const getDefaultSchedulingValues = async () => {
  const gasPrice = await Bb.fromCallback(callback => web3.eth.getGasPrice(callback));
  return {
    callGas: 100000,
    callValue: web3.toWei("100", "gwei"),
    windowSizeBlock: 255,
    windowSizeTimestamp: 255 * 15,
    gasPrice,
    fee: web3.toWei("10", "gwei"),
    bounty: gasPrice * 100000,
    deposit: web3.toWei("20", "gwei"),
    minimumPeriodBeforeSchedule: 25,
    minimumPeriodBeforeScheduleInSeconds: 180,
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

const pick = (obj, keys) => {
  return keys.map(k => k in obj ? {[k]: obj[k]} : {})
             .reduce((res, o) => Object.assign(res, o), {});
}

const renderTable = async (transactions) => {
  const getExecutedAfter = async (executedAt, tx) => {
    const windowStart = tx.windowStart * 1
    const unit = tx.temporalUnit == 1 ? "b" : "s"

    executedAt *= 1

    if (tx.temporalUnit == 2) {
      executedAt = await eac.Util.getTimestampForBlock(executedAt)
    }

    return (executedAt - windowStart) + unit
  }

  const requests = await Promise.all(transactions.filter(t => !!t).map(async (t) => {
    const tx = eac.transactionRequest(t)
    await tx.fillData()

    const res = pick(tx, ["address", "windowStart", "claimedBy", "requiredDeposit", "bounty", "wasSuccessful"])
    const { blockNumber } = await tx.getExecutedEvent()
    const executedAfter = blockNumber ? await getExecutedAfter(blockNumber, tx) : "-"

    return Object.assign(res, { executedAfter })
  }))

  console.table(requests)
}

const getDefaultWindowStart = async (scheduleParams) => {
  if (program.block) {
    const currentBlockNumber = await eac.Util.getBlockNumber()
    return currentBlockNumber + scheduleParams.minimumPeriodBeforeSchedule + 5
  }
  else if (program.timestamp) {
    const currentTimestamp = await eac.Util.getTimestamp()
    return currentTimestamp + scheduleParams.minimumPeriodBeforeScheduleInSeconds + 180
  }
}

const getRandomBountyModifier = () => {
  const random = Math.random()
  const bounty = parseInt(random * 100000000000000)
  return random < 0.5 ? bounty * -1 : bounty
}

const main = async (_) => {
  if (program.stats) {
    let rawTx = []
    try {
      rawTx = fs.readFileSync('scheduled.txt','utf8')
    } catch (e) {
      console.log("Unable to read scheduled.txt file")
      process.exit(1)
    }

    const transactions = rawTx.split('\n')
    await renderTable(transactions)
  } else {
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

    const windowStart = (program.windowStart * 1) || scheduleParams.windowStart || await getDefaultWindowStart(scheduleParams)
    const windowStartSpread = (program.windowStartSpread * 1) || scheduleParams.windowStartSpread
    const windowSize = temporalUnit == 1 ? scheduleParams.windowSizeBlock : scheduleParams.windowSizeTimestamp

    const gasPrice = scheduleParams.gasPrice
    const fee = scheduleParams.fee
    let bounty = scheduleParams.bounty
    const requiredDeposit = scheduleParams.deposit

    let repeat = program.repeat

    console.log(`
  toAddress         - ${toAddress}
  callData          - ${callData}
  callGas           - ${callGas}
  callValue         - ${callValue}
  windowSize        - ${windowSize}
  windowStart       - ${windowStart}
  gasPrice          - ${gasPrice}
  fee               - ${fee}
  bounty            - ${bounty}
  requiredDeposit   - ${requiredDeposit}
  windowStartSpread - ${windowStartSpread}
  randomizeBounty   - ${program.randomizeBounty}

  Sending from ${web3.eth.defaultAccount}
  `)
    console.log("\n")
    const spinner = ora(`Sending ${repeat} transactions! Waiting for a response...`).start()

    const transactions = []
    const succeeded = []
    let spread = windowStartSpread

    while(repeat--) {
      if (program.randomizeBounty) {
        bounty += getRandomBountyModifier()
        console.log(bounty)
      }

      const endowment = eac.Util.calcEndowment(
        new BigNumber(callGas),
        new BigNumber(callValue),
        new BigNumber(gasPrice),
        new BigNumber(fee),
        new BigNumber(bounty)
      )

      eacScheduler.initSender({
        from: web3.eth.defaultAccount,
        gas: 1000000,
        value: endowment,
      })

      let tx = temporalUnit === 1
      ? eacScheduler
        .blockSchedule(
        toAddress,
        callData,
        callGas,
        callValue,
        windowSize,
        windowStart + spread,
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
        windowStart + spread,
        gasPrice,
        fee,
        bounty,
        requiredDeposit
        )

      tx = tx.then((receipt) => {
        if (receipt.status != '0x1') {
          spinner.fail(`Transaction was mined but failed. No transaction scheduled.`)
        } else {
          const address = eac.Util.getTxRequestFromReceipt(receipt)
          spinner.succeed(`Transaction successful! Hash: ${receipt.transactionHash}, Address: ${address}`)
          succeeded.push(address)
        }
      })
      .catch((err) => {
        spinner.fail(err)
      })

      spread += spread

      transactions.push(tx)
    }
    await Promise.all(transactions)

    fs.appendFileSync("scheduled.txt", '\n' + succeeded.join('\n'))
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
