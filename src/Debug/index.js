const { requestInfo } = require('../TimeNode/actions');
const { W3Util } = require('@ethereum-alarm-clock/timenode-core');

const debug = async (options, program) => {
  const web3 = W3Util.getWeb3FromProviderUrl(program.provider || 'https://mainnet.infura.io');
  const eac = require('eac.js-lib')(web3);
  const util = new W3Util(web3);

  try {
    await requestInfo({ web3, eac, util }, options);
  } catch (err) {
    console.error(err);
  }
};

module.exports = debug;
