const fs = require('fs')
const { Wallet } = require('eac.js-client')

const createWallet = async (web3, num, file, password) => {
  const wallet = new Wallet(web3)
  wallet.create(num)

  console.log(`
New wallet created!
Accounts:
${wallet.getAddresses().join('\n')}
Saving encrypted file to ${file}. Don't forget your password!`)

  const encryptedKeystore = wallet.encrypt(password)
  fs.writeFileSync(file, JSON.stringify(encryptedKeystore))
}

module.exports = createWallet
