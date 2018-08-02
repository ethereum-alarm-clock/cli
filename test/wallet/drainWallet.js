const BigNumber = require('bignumber.js')
const { Util } = require('eac.js-lib')()

// @returns Promise<[txObjs]>
const drainWallet = async (web3, gasPrice, target, wallet, util = Util) => {
    const gas = '21000'
    const gasCost = new BigNumber(gas).times(gasPrice)

    return Promise.all(
        wallet.getAddresses().map(address => {
            return new Promise(async (resolve, reject) => {
                let balance = await util.getBalance(web3, address)

                balance = new BigNumber(balance)
                const amount = balance.minus(gasCost)

                try {
                    const txHash = await wallet.sendFromIndex(
                        wallet.getAddresses().indexOf(address),
                        {
                            to: target,
                            value: amount.toString(),
                            gas,
                            gasPrice,
                            data: ''
                        }
                    )

                    const receipt = await util.waitForTransactionToBeMined(web3, txHash)
                    resolve(receipt)
                } catch (error) {
                    reject(error)
                }
            })
        })
    )
}

module.exports = drainWallet