const fs = require('fs');
const { Wallet } = require('@ethereum-alarm-clock/timenode-core');

const checkOptionsForWalletAndPassword = (options) => {
  const hasWallet = options.wallet && typeof options.wallet === 'object' && options.wallet.length;
  if (!hasWallet || !options.password) {
    const msg = 'Please provide --wallet and --password flags!';
    if (options.logger) {
      return options.logger.error(msg);
    }
    throw new Error(msg);
  }
  throw new Error('Do not have a wallet~');
};

const loadWalletFromKeystoreFile = (web3, filePath, password) => {
  const file = fs.readFileSync(filePath[0], 'utf8');
  let keystore = JSON.parse(file);

  if (!Array.isArray(keystore)) {
    keystore = [keystore];
  }

  const wallet = new Wallet(web3);
  wallet.decrypt(keystore, password);

  return wallet;
};

module.exports = {
  checkOptionsForWalletAndPassword,
  loadWalletFromKeystoreFile,
};
