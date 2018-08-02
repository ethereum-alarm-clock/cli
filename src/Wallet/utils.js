const fs = require('fs');
const { Wallet } = require('@ethereum-alarm-clock/timenode-core');

const checkOptionsForWalletAndPassword = (options) => {
    const hasWallet = options.wallet && typeof options.wallet === 'object' && options.wallet.length;
    if (!hasWallet || !options.password) {
        const msg = 'Please provide --wallet and --password flags!';
        if (options.logger) {
            return options.logger.error(msg);
        }
        throw msg;
      }    
}

const loadWalletFromKeystoreFile = (web3, filePath, password) => {
    const file = fs.readFileSync(filePath[0], 'utf8');
    let keystore = JSON.parse(file);

    if (!Array.isArray(keystore)) {
        keystore = [keystore];
    }

    const wallet = new Wallet(web3);
    wallet.decrypt(keystore, password);

    return wallet;
}

const allPropertiesToLowerCase = (object) => {
    let newObject = {};
    Object.keys(object).forEach(key => {
        newObject[key.toLowerCase()] = object[key];
    });
    return newObject;
}

module.exports = {
    checkOptionsForWalletAndPassword,
    loadWalletFromKeystoreFile,
}