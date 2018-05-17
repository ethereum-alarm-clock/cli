const { Wallet } = require('eac.js-client')

const loadWalletFromKeystoreFile = function(web3, fileName, password) {
    const wallet = new Wallet(web3)
    const file = fs.readFileSync(fileName, 'utf-8')
    const keystore = JSON.parse(file)
    wallet.decrypt(keystore, password)

    return wallet
}

module.exports = { loadWalletFromKeystoreFile }