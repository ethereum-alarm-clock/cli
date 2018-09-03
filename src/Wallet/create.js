const fs = require('fs');
const rls = require('readline-sync');
const { Wallet } = require('@ethereum-alarm-clock/timenode-core');

const { W3Util } = require('timenode-core');
const w3Util = new W3Util();

const create = (program) => {
  // Create web3
  const web3 = w3Util.getWeb3FromProviderUrl(program.provider);

  let numberOfAccounts = rls.question(
    'How many accounts to create? [1 - 10]\n',
  );

  numberOfAccounts = parseInt(numberOfAccounts, 10);

  // Create array [0, ... 10]
  const acceptedValues = Array.from(Array(10).keys());
  // Take off 0
  acceptedValues.shift();

  if (acceptedValues.indexOf(numberOfAccounts) === -1) {
    throw new Error(`Incorrect input - ${numberOfAccounts}`);
  }

  const file = rls.question(
    'Provide name of the file to save the keys:\n',
  );

  const password = rls.question(
    'What is the password? Remember to write this down.\n',
  );

  const wallet = new Wallet(web3);
  wallet.create(numberOfAccounts);

  console.log('Wallet created!');
  console.log('Accounts:');
  console.log(wallet.getAddresses().join('\n'));

  console.log('\nSaving keystore...');
  const encrypted = wallet.encrypt(password);
  fs.writeFileSync(file, JSON.stringify(encrypted));
  console.log(
    `Saved encrypted keystore to ${file}. Don't forget your password.`,
  );
};

module.exports = create;
