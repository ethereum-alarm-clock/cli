const fs = require('fs');

const checkOptionsForWalletAndPassword = (options) => {
  const hasWallet = options.wallet && typeof options.wallet === 'object' && options.wallet.length;
  if (!hasWallet || !options.password) {
    const msg = 'Please provide --wallet and --password flags!';
    if (options.logger) {
      return options.logger.error(msg);
    }
    throw new Error(msg);
  }
  return true;
};

const loadWalletFromKeystoreFile = (web3, filePath, password) => {
  const file = fs.readFileSync(filePath[0], 'utf8');
  let keystore = JSON.parse(file);

  if (!Array.isArray(keystore)) {
    keystore = [keystore];
  }

  web3.eth.accounts.wallet.decrypt(keystore, password);

  return web3.eth.accounts.wallet;
};

module.exports = {
  checkOptionsForWalletAndPassword,
  loadWalletFromKeystoreFile,
};
