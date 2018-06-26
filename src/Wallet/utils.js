const fs = require('fs');
const { Wallet } = require('eac.js-client');

const checkOptionsForWalletAndPassword = (options) => {
    if (!options.wallet || !options.password) {
        throw 'Please provide --wallet and --password flags!';
      }    
}

const loadWalletFromKeystoreFile = (web3, filePath, password) => {
    const file = fs.readFileSync(filePath[0], 'utf-8');
    const keystore = JSON.parse(file);
    
    const wallet = new Wallet(web3);
    wallet.decrypt(keystore, password);

    return wallet;
}

module.exports = {
    checkOptionsForWalletAndPassword,
    loadWalletFromKeystoreFile,
}