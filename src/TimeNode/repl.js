const BigNumber = require("bignumber.js")
const repl = require("repl")

const start = (timenode) => {
  const config = timenode.config;
  const { eac, web3, util } = config;

  console.log(" ") // blank space
  const replServer = repl.start({ prompt: ">> " })
  replServer.context.web3 = web3
  replServer.defineCommand("getBalance", {
    help: "Get the balance of your accounts.",
    async action() {
      if (config.wallet) {
        config.wallet.getAccounts().forEach(async (account) => {
          const address = account.getAddressString();
          console.log(`${address} | Balance: ${web3.fromWei(await eac.Util.getBalance(address))}`)
        })
      } else {
        const account = web3.eth.defaultAccount
        console.log(`${account} | Balance: ${web3.fromWei(await eac.Util.getBalance(account))}`)
      }
    },
  })
  replServer.defineCommand("getNow", {
    help: "Get the latest blockNum and timestamp",
    async action() {
      const block = await util.getBlock("latest")
      console.log(`BlockNum: ${block.number} | Timestamp: ${block.timestamp}`)
    },
  })
  replServer.defineCommand("dumpCache", {
    help: "Dumps your cache storage.",
    action() {
      if (config.cache.isEmpty()) {
        console.log('\nCACHE EMPTY')
      } else {
        config.cache.stored().forEach((entry) => {
          console.log(`${entry} | ${config.cache.get(entry).windowStart}`)
        })
      }
    },
  })
  replServer.defineCommand("logLevel", {
    help: "Defines the level to log, 1 - debug/cache, 2 - info, 3- error.",
    action(level) {
      if (level < 1 || level > 3) {
        console.log("Please define 1 for debug, 2 for info, 3 for error.")
        return
      }
      config.logger.logLevel = level
    },
  })
  replServer.defineCommand("getStats", {
    help: "Get some interesting stats on your executing accounts.",
    action() {
      const stats = config.statsDb.getStats()
      const claiming = config.claiming ? 'ON' : 'OFF';
      stats.forEach((accountStats) => {
        const bounties = web3.fromWei(accountStats.bounties, 'ether')
        const costs = web3.fromWei(accountStats.costs, 'ether')
        const profit = bounties - costs

        const claimedPendingExecution = timenode.getClaimedNotExecutedTransactions()
        const failedClaims = timenode.getUnsucessfullyClaimedTransactions()

        const stringToFixed = (string) => parseFloat(string).toFixed(6)

        console.log(`${accountStats.account} | Failed Claims: ${failedClaims.length} | Executed: ${
          accountStats.executed
          } | Total Claimed: ${accountStats.claimed} (${claiming}) | Claimed Pending Execution: ${claimedPendingExecution.length} | Ether gain: ${
          stringToFixed(profit)
        } (${stringToFixed(bounties)} - ${stringToFixed(costs)})`)
      })
    },
  })
  replServer.defineCommand("getClaimed", {
    help: "Get claimed transactions pending execution.",
    action() {
      const claimedPendingExecution = timenode.getClaimedNotExecutedTransactions()

      let print = `Claimed transactions pending execution (${claimedPendingExecution.length}): \n`;

      let i = 1;
      for (const address of claimedPendingExecution) {
        print += `${i}. ${address}\n`;
        i++;
      }

      console.log(print);
    },
  })
  replServer.defineCommand("getFailedClaims", {
    help: "Get unsuccessfully claimed transactions.",
    action() {
      const transactions = timenode.getUnsucessfullyClaimedTransactions();

      let print = `Unsuccessfully claimed transactions (${transactions.length}): \n`;

      let i = 1;
      for (const address of transactions) {
        print += `${i}. ${address}\n`;
        i++;
      }

      console.log(print);
    },
  })
  replServer.defineCommand("start", {
    help: "Starts the TimeNode.",
    action() {
      timenode.startScanning();
    },
  })
  replServer.defineCommand("stop", {
    help: "Stops the TimeNode.",
    action() {
      timenode.stopScanning();
    },
  })
  replServer.defineCommand("startClaiming", {
    help: "Starts the TimeNode claiming.",
    action() {
      timenode.startClaiming();
    },
  })
  replServer.defineCommand("stopClaiming", {
    help: "Stops the TimeNode claiming.",
    action() {
      timenode.stopClaiming();
    },
  })
  // No longer supported
  // replServer.defineCommand("sweepCache", {
  //   help: "Sweeps your cache of expired txRequests.",
  //   action() {
  //     console.log(config.cache)
  //     config.cache.sweepExpired()
  //   },
  // })
  replServer.defineCommand("testTx", {
    help:
      "Send a test transaction to the network (requires unlocked local account).",
    async action() {
      const ora = require("ora")
      const spinner = ora("Sending test transaction to network...").start()
      const scheduler = await eac.scheduler()

      // Set some meaningless defaults
      const windowStart = new BigNumber(await eac.Util.getBlockNumber()).add(30)
      const gasPrice = web3.toWei("100", "gwei")
      const requiredDeposit = 1
      const callGas = 1212121
      const callValue = 123454321
      const fee = 50
      const bounty = web3.toWei("500", "finney")

      const endowment = scheduler.calcEndowment(
        new BigNumber(callGas),
        new BigNumber(callValue),
        new BigNumber(gasPrice),
        new BigNumber(fee),
        new BigNumber(bounty)
      )

      scheduler.initSender({
        from: web3.eth.defaultAccount,
        gas: 3000000,
        value: endowment,
      })

      // we're using a wallet.
      if (config.wallet) {
        spinner.fail('Currently unavailable feature.')
      }

      scheduler.blockSchedule(
        "0x009f7EfeD908c05df5101DA1557b7CaaB38EE4Ce",
        web3.fromAscii("s0x".repeat(Math.floor(Math.random() * 10))),
        callGas,
        callValue,
        255, // windowSize
        windowStart,
        gasPrice,
        fee, // fee
        bounty, // bounty
        requiredDeposit
      ).then((receipt) => {
        if (receipt.status != '0x1') {
          spinner.fail("Transaction failed.")
          return
        } else {
          spinner.succeed(`Transaction mined! Hash - ${receipt.transactionHash}`)
        }
      }).catch(err => spinner.fail(err))
    },
  })
  replServer.defineCommand("requestInfo", {
    help:
      "Retrieve info about the transaction request at the passed in address.",
    async action(txRequestAddr) {
      if (!eac.Util.checkValidAddress(txRequestAddr)) {
        console.log("Must pass a valid transaction request address")
        return
      }
      const txRequest = await eac.transactionRequest(txRequestAddr)
      try {
        await txRequest.fillData()
        console.log(`
Owner: ${txRequest.owner}
Claimed By: ${txRequest.isClaimed ? txRequest.claimedBy : "not claimed"}
Claim Window Begins: ${txRequest.claimWindowStart}
Freeze Period Begins: ${txRequest.freezePeriodStart}
Execution Window Begins: ${txRequest.windowStart}
Now: ${await txRequest.now()}`)
      } catch (err) {
        console.error(err)
      }
    },
  })
}

module.exports = {
  start,
}
