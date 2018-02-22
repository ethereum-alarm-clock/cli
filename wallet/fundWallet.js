const fs = require('fs')
const { Wallet } = require('eac.js-client')
const { Util } = require('eac.js-lib')()

// TODO before mainnet - change the default gas / gasPrice
// to dynamically calculated values
const fund = (web3, recip, value) => {
    return new Promise((resolve, reject) => {
        web3.eth.sendTransaction({
            from: web3.eth.defaultAccount,
            to: recip,
            value: value,
            gas: 3000000,
            gasPrice: web3.toWei('100', 'gwei')
        },
        (err, txHash) => {
            if (err) reject(err)
            else {
                Util.waitForTransactionToBeMined(web3, txHash)
                .then(receipt => resolve(receipt))
                .catch(reject)
            }
        })
    })
}

const fundAccounts = async (web3, etherAmount, file, password) => {
    const wallet = new Wallet(web3)
    const keystore = fs.readFileSync(file, 'utf-8')
    const ks = JSON.parse(keystore)
    wallet.decrypt(ks, password)

    const amt = web3.toWei(etherAmount, 'ether')

    return Promise.all(wallet.getAddresses().map(address => {
        return fund(web3, address, amt)
    }))
}

module.exports = fundAccounts