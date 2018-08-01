const fs = require('fs');
const { Wallet } = require('@ethereum-alarm-clock/timenode-core');

const checkOptionsForWalletAndPassword = (options) => {
    if (!options.wallet || !options.password) {
        throw 'Please provide --wallet and --password flags!';
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