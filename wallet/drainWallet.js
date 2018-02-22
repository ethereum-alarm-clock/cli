const BigNumber = require('bignumber.js')
const fs = require('fs')
const { Wallet } = require('eac.js-client')
const { Util } = require('eac.js-lib')()

// @returns Promise<[txObjs]>
const drainWallet = async (web3, gasPrice, target, file, password) => {
    const wallet = new Wallet(web3)
    const keystore = fs.readFileSync(file, 'utf-8')
    const ks = JSON.parse(keystore)
    wallet.decrypt(ks, password)

    const gas = '21000'
    const gasCost = new BigNumber(gas).times(gasPrice)

    return Promise.all(
        wallet.getAddresses().map(address => {
            return new Promise((resolve, reject) => {
                Util.getBalance(web3, address)
                .then(bal => {
                    bal = new BigNumber(bal)
                    const amt = bal.minus(gasCost)
                    wallet.sendFromIndex(
                        wallet.getAddresses().indexOf(address),
                        {
                            to: target,
                            value: amt.toString(),
                            gas,
                            gasPrice,
                            data: ""
                        }
                    )
                    .then(txHash => {
                        Util.waitForTransactionToBeMined(web3, txHash)
                        .then(resolve) // with the receipt
                        .catch(reject)
                    })
                    .catch(reject)
                })
            })
        })
    )
}

module.exports = drainWallet